//! Native windows are projections, never holders of workspace or database authority.

use serde::Serialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::sync::{Arc, Mutex, MutexGuard};
use tauri::{AppHandle, Emitter, EventTarget, Manager, State, Webview, WebviewUrl, WindowEvent};
use super::org_document_commands::OrgWorkspaceRegistry;

const MAIN_LABEL: &str = "main";
const INTENT_TOPIC: &str = "grain:org-window-intent";
const PROJECTION_TOPIC: &str = "grain:org-window-projection";
const MAX_REQUEST_ID: u64 = 9_007_199_254_740_991;

#[derive(Default)]
pub struct OrgDetachedWindowRegistry(Mutex<WindowRegistry>);

#[derive(Default)]
struct WindowRegistry {
    windows: HashMap<String, WindowEntry>,
    // A retired binding must never authorize a later incarnation, even at the same label.
    issued_bindings: HashSet<String>,
}

struct WindowEntry {
    identity: Arc<WindowIdentity>,
    closing: bool,
    projection_generation: Option<u64>,
}

struct WindowIdentity {
    label: String,
    window_id: String,
    binding: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgDetachedWindowCreated {
    window_id: String,
    label: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowIntent<'a> {
    label: &'a str,
    window_id: &'a str,
    binding: &'a str,
    request_id: u64,
    payload: &'a Value,
}

impl WindowIdentity {
    fn intent<'a>(&'a self, request_id: u64, payload: &'a Value) -> WindowIntent<'a> {
        WindowIntent {
            label: &self.label,
            window_id: &self.window_id,
            binding: &self.binding,
            request_id,
            payload,
        }
    }
}

impl OrgDetachedWindowRegistry {
    fn lock(&self) -> Result<MutexGuard<'_, WindowRegistry>, String> {
        self.0.lock().map_err(|_| "Native window registry is unavailable".into())
    }
}

fn safe_component(value: &str, min: usize, max: usize) -> bool {
    (min..=max).contains(&value.len())
        && value.bytes().all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
}

fn is_main(webview_label: &str, window_label: &str) -> bool {
    webview_label == MAIN_LABEL && window_label == MAIN_LABEL
}

fn require_main(caller: &Webview) -> Result<(), String> {
    if is_main(caller.label(), caller.window_ref().label()) {
        Ok(())
    } else {
        Err("Only the main native window owns this operation".into())
    }
}

fn validate_intent(request_id: u64, payload: &Value) -> Result<(), String> {
    if request_id == 0
        || request_id > MAX_REQUEST_ID
        || !matches!(
            payload.get("kind").and_then(Value::as_str),
            Some("ready" | "transactions" | "undo" | "redo" | "attach" | "close-window" | "save" | "workflow" | "workflow-cancel" | "clock-context")
        )
    {
        return Err("Invalid bridge intent or reserved lifecycle request".into());
    }
    if payload.get("kind").and_then(Value::as_str) == Some("workflow-cancel") {
        if !wire_integer(payload.get("generation"), 1)
            || !wire_integer(payload.get("workflowRequestId"), 1) {
            return Err("Invalid native workflow cancellation identity".into());
        }
    }
    if payload.get("kind").and_then(Value::as_str) == Some("workflow") {
        validate_workflow(payload)?;
    }
    if payload.get("kind").and_then(Value::as_str) == Some("clock-context")
        && (!wire_integer(payload.get("generation"), 1)
            || !wire_integer(payload.get("revision"), 0)
            || !wire_integer(payload.get("sequence"), 0)) {
        return Err("Invalid native clock context identity".into());
    }
    Ok(())
}

fn wire_integer(value: Option<&Value>, minimum: u64) -> bool {
    value.and_then(Value::as_u64).is_some_and(|value| (minimum..=MAX_REQUEST_ID).contains(&value))
}

fn validate_workflow(payload: &Value) -> Result<(), String> {
    let command = payload.get("command").and_then(Value::as_str);
    let commands = ["capture", "agenda", "diary", "roam-find", "roam-insert", "roam-new", "link", "refile", "archive",
        "export-html", "export-markdown", "babel-execute", "table-recalculate", "clock-in", "clock-out", "cancel-clock", "clock-report", "remark-mark", "remark-line", "remark-important",
        "remark-idea", "remark-question", "remark-revise", "remark-quote", "remark-change", "remark-open",
        "remark-previous", "remark-next", "remark-remove", "remark-delete"];
    let capture = payload.get("capture").ok_or("Missing native workflow capture")?;
    let selection = capture.get("selection").ok_or("Missing native workflow selection")?;
    let ranges = selection.get("ranges").and_then(Value::as_array).ok_or("Invalid native workflow ranges")?;
    let valid_range = |range: &Value| wire_integer(range.get("from"), 0) && wire_integer(range.get("to"), 0)
        && range.get("from").and_then(Value::as_u64) <= range.get("to").and_then(Value::as_u64);
    let valid_selection = !ranges.is_empty()
        && selection.get("main").and_then(Value::as_u64).is_some_and(|main| main < ranges.len() as u64)
        && ranges.iter().all(|range| {
            wire_integer(range.get("anchor"), 0) && wire_integer(range.get("head"), 0)
                && matches!(range.get("assoc").and_then(Value::as_i64), Some(-1..=1))
                && range.get("undirectional").and_then(Value::as_bool).is_some()
                && range.get("bidiLevel").is_some_and(|value| value.is_null() || wire_integer(Some(value), 0))
                && range.get("goalColumn").is_some_and(|value| value.is_null() || value.as_f64().is_some_and(|value| value.is_finite() && value >= 0.0))
        });
    if !wire_integer(payload.get("generation"), 1) || !wire_integer(payload.get("revision"), 0)
        || !wire_integer(payload.get("sequence"), 0) || !command.is_some_and(|command| commands.contains(&command))
        || !valid_selection
        || capture.get("linkPosition").is_some_and(|position| command != Some("link") || !wire_integer(Some(position), 0))
        || !["inputConfiguration", "behaviorConfiguration"].iter().all(|key| capture.get(key).and_then(Value::as_str).is_some())
        || !["scrollTop", "scrollLeft"].iter().all(|key| capture.get(key).and_then(Value::as_f64).is_some_and(|value| value.is_finite() && value >= 0.0))
        || !["folds", "visibleRanges"].iter().all(|key| capture.get(key).and_then(Value::as_array).is_some_and(|ranges| ranges.iter().all(valid_range))) {
        return Err("Invalid native workflow identity, command, selection or presentation codec".into());
    }
    Ok(())
}

impl WindowRegistry {
    fn reserve(&mut self, window_id: String, binding: String) -> Result<Arc<WindowIdentity>, String> {
        if !safe_component(&window_id, 1, 96) || !safe_component(&binding, 16, 128) {
            return Err("Invalid native window identity or binding".into());
        }
        let label = format!("org-detached-{window_id}");
        if self.windows.contains_key(&label) || self.issued_bindings.contains(&binding) {
            return Err("Native window identity or binding has already been issued".into());
        }
        self.issued_bindings.insert(binding.clone());
        let identity = Arc::new(WindowIdentity { label, window_id, binding });
        self.windows.insert(identity.label.clone(), WindowEntry {
            identity: Arc::clone(&identity),
            closing: false,
            projection_generation: None,
        });
        Ok(identity)
    }

    fn owned(&self, label: &str, binding: &str) -> Result<&WindowIdentity, String> {
        let entry = self.windows.get(label)
            .filter(|entry| !entry.closing && entry.identity.binding == binding)
            .ok_or_else(|| "Native window binding is not active".to_string())?;
        Ok(&entry.identity)
    }

    fn caller(&self, webview_label: &str, window_label: &str, binding: &str) -> Result<&WindowIdentity, String> {
        if webview_label != window_label {
            return Err("Bridge caller is not the registered native webview window".into());
        }
        self.owned(webview_label, binding)
    }

    fn current(&self, identity: &Arc<WindowIdentity>) -> bool {
        self.windows.get(&identity.label)
            .is_some_and(|entry| Arc::ptr_eq(&entry.identity, identity))
    }

    fn retire(&mut self, identity: &Arc<WindowIdentity>) -> bool {
        if !self.current(identity) {
            return false;
        }
        self.windows.remove(&identity.label);
        true
    }

    fn authorize_focus(&self, label: &str, binding: &str, generation: u64) -> Result<&WindowIdentity, String> {
        let identity = self.owned(label, binding)?;
        if self.windows.get(label).and_then(|entry| entry.projection_generation) != Some(generation) {
            return Err("Native focus origin projection has retired or rebound".into());
        }
        Ok(identity)
    }

    fn authorize_command(&self, webview_label: &str, window_label: &str, command: &str) -> Result<(), String> {
        if is_main(webview_label, window_label) {
            return Ok(());
        }
        if webview_label == window_label
            && self.windows.get(webview_label).is_some_and(|entry| !entry.closing)
            && matches!(command, "post_org_window_intent" | "set_org_main_window_visible" | "close_org_detached_window" | "collate_org_match_strings" | "capture_org_match_clock_context" | "read_configuration_file")
        {
            return Ok(());
        }
        Err("Custom command is not authorized for this native window".into())
    }

    fn authorize_close(&self, webview_label: &str, window_label: &str, label: &str, binding: &str) -> Result<(), String> {
        if is_main(webview_label, window_label) {
            self.owned(label, binding)?;
        } else {
            if label != webview_label {
                return Err("Detached windows can destroy only their own native view".into());
            }
            self.caller(webview_label, window_label, binding)?;
        }
        Ok(())
    }

    fn authorize_visibility(&self, webview_label: &str, window_label: &str, visible: bool, binding: Option<&str>) -> Result<(), String> {
        if is_main(webview_label, window_label) {
            return Ok(());
        }
        if !visible {
            return Err("Detached windows cannot hide the canonical main owner".into());
        }
        self.caller(webview_label, window_label, binding.ok_or("Native binding is required")?)?;
        Ok(())
    }
}

/// Runs before all application command handlers, including legacy-mode handlers.
pub(crate) fn authorize_org_window_command(caller: &Webview, command: &str) -> Result<(), String> {
    if is_main(caller.label(), caller.window_ref().label()) {
        return Ok(());
    }
    let registry = caller.state::<OrgDetachedWindowRegistry>();
    let windows = registry.lock()?;
    windows.authorize_command(caller.label(), caller.window_ref().label(), command)
}

/// Invalidate only registered Source webviews through their existing confined DOM bridge.
/// Children keep zero core/plugin privileges and always reread the fixed native file.
#[tauri::command]
pub fn notify_configuration_reload(
    app: AppHandle,
    caller: Webview,
    registry: State<'_, OrgDetachedWindowRegistry>,
) -> Result<(), String> {
    require_main(&caller)?;
    let windows = registry.lock()?;
    let mut failures = Vec::new();
    for (label, entry) in &windows.windows {
        if entry.closing {
            continue;
        }
        if let Some(window) = app.get_webview_window(label) {
            if let Err(error) = window.eval("window.dispatchEvent(new Event('grain:configuration-reload'))") {
                failures.push(format!("{label}: {error}"));
            }
        }
    }
    if failures.is_empty() {
        Ok(())
    } else {
        Err(format!("Could not invalidate native Source configuration: {}", failures.join("; ")))
    }
}

#[tauri::command]
pub async fn create_org_detached_window(
    app: AppHandle,
    caller: Webview,
    registry: State<'_, OrgDetachedWindowRegistry>,
    window_id: String,
    binding: String,
) -> Result<OrgDetachedWindowCreated, String> {
    require_main(&caller)?;
    let identity = registry.lock()?.reserve(window_id, binding)?;
    let internal_path = format!("index.html?orgWindow={}&binding={}", identity.window_id, identity.binding);
    // Tauri resolves App paths against the same internal origin as main (including devUrl).
    let expected_url = match caller.url().map(|mut url| {
        url.set_path("/index.html");
        url.set_query(internal_path.split_once('?').map(|(_, query)| query));
        url.set_fragment(None);
        url
    }) {
        Ok(url) => url,
        Err(error) => {
            registry.lock()?.retire(&identity);
            return Err(error.to_string());
        }
    };
    let result = tauri::WebviewWindowBuilder::new(&app, &identity.label, WebviewUrl::App(internal_path.into()))
        .title("Grain — detached Org")
        .inner_size(1000.0, 760.0)
        .visible(false)
        .on_navigation(move |url| url == &expected_url)
        .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
        .build();
    let window = match result {
        Ok(window) => window,
        Err(error) => {
            registry.lock()?.retire(&identity);
            return Err(error.to_string());
        }
    };
    let event_app = app.clone();
    let event_identity = Arc::clone(&identity);
    window.on_window_event(move |event| {
        // Prevention is synchronous; main decides when to issue the controlled destroy.
        let kind = match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                "close-window"
            }
            WindowEvent::Destroyed => "window-destroyed",
            _ => return,
        };
        let registry = event_app.state::<OrgDetachedWindowRegistry>();
        let Ok(mut windows) = registry.lock() else { return; };
        if !windows.current(&event_identity) {
            return;
        }
        let payload = serde_json::json!({ "kind": kind });
        if let Err(error) = event_app.emit_to(
            EventTarget::webview_window(MAIN_LABEL), INTENT_TOPIC, event_identity.intent(0, &payload),
        ) {
            tracing::error!(%error, kind, "Failed to deliver native window lifecycle");
        }
        if matches!(event, WindowEvent::Destroyed) {
            // This callback is authoritative; close requests alone never remove a window.
            windows.retire(&event_identity);
        }
    });
    if let Err(error) = window.show() {
        if let Some(entry) = registry.lock()?.windows.get_mut(&identity.label) {
            entry.closing = true;
        }
        if let Err(destroy_error) = window.destroy() {
            let mut windows = registry.lock()?;
            if windows.current(&identity) {
                if let Some(entry) = windows.windows.get_mut(&identity.label) {
                    entry.closing = false;
                }
            }
            return Err(format!(
                "Detached window {} could not be shown ({error}) or destroyed ({destroy_error})",
                identity.label,
            ));
        }
        return Err(error.to_string());
    }
    Ok(OrgDetachedWindowCreated {
        window_id: identity.window_id.clone(),
        label: identity.label.clone(),
    })
}

#[tauri::command]
pub fn post_org_window_intent(
    app: AppHandle,
    caller: Webview,
    registry: State<'_, OrgDetachedWindowRegistry>,
    binding: String,
    request_id: u64,
    payload: Value,
) -> Result<(), String> {
    validate_intent(request_id, &payload)?;
    let windows = registry.lock()?;
    let identity = windows.caller(caller.label(), caller.window_ref().label(), &binding)?;
    app.emit_to(EventTarget::webview_window(MAIN_LABEL), INTENT_TOPIC, identity.intent(request_id, &payload))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn post_org_window_projection(
    app: AppHandle,
    caller: Webview,
    registry: State<'_, OrgDetachedWindowRegistry>,
    label: String,
    binding: String,
    payload: Value,
) -> Result<(), String> {
    require_main(&caller)?;
    let mut windows = registry.lock()?;
    windows.owned(&label, &binding)?;
    if let Some(entry) = windows.windows.get_mut(&label) {
        match payload.get("kind").and_then(Value::as_str) {
            Some("initial") => {
                let generation = payload.get("generation").and_then(Value::as_u64)
                    .filter(|generation| (1..=MAX_REQUEST_ID).contains(generation))
                    .ok_or("Invalid native projection generation")?;
                entry.projection_generation = Some(generation);
            }
            Some("retired") => { entry.projection_generation = None; }
            _ => {}
        }
    }
    let identity = windows.owned(&label, &binding)?;
    let window = app.get_webview_window(&identity.label)
        .ok_or("Registered native window is unavailable")?;
    // Tauri's core event listeners can choose Any/another window's target. Deliver only
    // inside the registered webview instead, and grant children no core event access.
    // JSON.parse preserves JSON object-key semantics; the entire JSON document is
    // serialized again as one JavaScript string literal, never interpolated as code.
    let document = serde_json::to_string(&payload).map_err(|error| error.to_string())?;
    let expression = serde_json::to_string(&document).map_err(|error| error.to_string())?;
    window.eval(&format!(
        "window.dispatchEvent(new CustomEvent(\"{PROJECTION_TOPIC}\",{{detail:JSON.parse({expression})}}));"
    )).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn close_org_detached_window(
    app: AppHandle,
    caller: Webview,
    registry: State<'_, OrgDetachedWindowRegistry>,
    label: String,
    binding: String,
) -> Result<(), String> {
    let (identity, window) = {
        let mut windows = registry.lock()?;
        windows.authorize_close(caller.label(), caller.window_ref().label(), &label, &binding)?;
        let window = app.get_webview_window(&label).ok_or("Registered native window is unavailable")?;
        let entry = windows.windows.get_mut(&label).ok_or("Native window binding is not active")?;
        entry.closing = true;
        (Arc::clone(&entry.identity), window)
    };
    if let Err(error) = window.destroy() {
        let mut windows = registry.lock()?;
        if windows.current(&identity) {
            if let Some(entry) = windows.windows.get_mut(&label) {
                entry.closing = false;
            }
        }
        return Err(error.to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn set_org_main_window_visible(
    app: AppHandle,
    caller: Webview,
    registry: State<'_, OrgDetachedWindowRegistry>,
    visible: bool,
    binding: Option<String>,
) -> Result<(), String> {
    let windows = registry.lock()?;
    windows.authorize_visibility(
        caller.label(), caller.window_ref().label(), visible, binding.as_deref(),
    )?;
    let main = app.get_webview_window(MAIN_LABEL).ok_or("Canonical main owner is unavailable")?;
    if visible { main.show() } else { main.hide() }.map_err(|error| error.to_string())
}

/// Focus handoff only between the exact live child and its Root workflow owner.
/// A third native window/application's focus is never taken by a delayed callback.
#[tauri::command]
pub fn focus_org_detached_window(
    app: AppHandle,
    caller: Webview,
    registry: State<'_, OrgDetachedWindowRegistry>,
    workspace_registry: State<'_, OrgWorkspaceRegistry>,
    label: String,
    binding: String,
    generation: u64,
    to_main: bool,
    root_path: String,
    capability_token: String,
) -> Result<(), String> {
    require_main(&caller)?;
    let windows = registry.lock()?;
    let identity = windows.authorize_focus(&label, &binding, generation)?;
    let child = app.get_webview_window(&identity.label).ok_or("Native workflow origin is unavailable")?;
    let main = app.get_webview_window(MAIN_LABEL).ok_or("Root workflow owner is unavailable")?;
    let (origin, destination) = if to_main { (&child, &main) } else { (&main, &child) };
    workspace_registry.with_approved(Path::new(&root_path), &capability_token, |_| {
        if !origin.is_focused().map_err(|error| error.to_string())? {
            return Ok(());
        }
        destination.show().map_err(|error| error.to_string())?;
        destination.set_focus().map_err(|error| error.to_string())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn binding() -> String { "01234567-89ab-cdef-0123-456789abcdef".into() }

    #[test]
    fn internal_components_cannot_escape_url_or_label() {
        for window_id in ["", "../main", "main?binding=x", "x&orgWindow=main", "x/y", "x%2fmain", "窗口"] {
            assert!(WindowRegistry::default().reserve(window_id.into(), binding()).is_err());
        }
        assert!(WindowRegistry::default().reserve("x".repeat(97), binding()).is_err());
        for value in ["short", "0123456789abcdef&orgWindow=main", "0123456789abcdef/secret"] {
            assert!(WindowRegistry::default().reserve("source".into(), value.into()).is_err());
        }
    }

    #[test]
    fn bridge_cannot_forge_native_destruction_or_forward_data_commands() {
        for kind in ["window-destroyed", "write_org_document", "grant", "unknown"] {
            assert!(validate_intent(1, &serde_json::json!({ "kind": kind })).is_err());
        }
        assert!(validate_intent(1, &Value::Null).is_err());
        assert!(validate_intent(0, &serde_json::json!({ "kind": "close-window" })).is_err());
        assert!(validate_intent(MAX_REQUEST_ID + 1, &serde_json::json!({ "kind": "ready" })).is_err());
        for kind in ["ready", "transactions", "undo", "redo", "attach", "close-window", "save"] {
            assert!(validate_intent(1, &serde_json::json!({ "kind": kind })).is_ok());
        }
    }
    #[test]
    fn readonly_clock_context_still_requires_an_exact_native_source_identity() {
        assert!(validate_intent(1, &serde_json::json!({"kind":"clock-context","generation":1,"revision":0,"sequence":2})).is_ok());
        for payload in [
            serde_json::json!({"kind":"clock-context"}),
            serde_json::json!({"kind":"clock-context","generation":0,"revision":0,"sequence":2}),
            serde_json::json!({"kind":"clock-context","generation":1,"revision":-1,"sequence":2}),
            serde_json::json!({"kind":"clock-context","generation":1,"revision":0,"sequence":"2"}),
        ] { assert!(validate_intent(1, &payload).is_err()); }
    }


    #[test]
    fn workflow_codec_refuses_malformed_context_and_never_forwards_arbitrary_commands() {
        let valid = serde_json::json!({
            "kind": "workflow", "generation": 1, "revision": 0, "sequence": 2, "command": "capture",
            "capture": { "selection": { "main": 0, "ranges": [{
                "anchor": 7, "head": 2, "assoc": -1, "bidiLevel": null, "goalColumn": null, "undirectional": false
            }] }, "folds": [{"from": 0, "to": 12}], "visibleRanges": [{"from": 0, "to": 12}],
            "scrollTop": 12.5, "scrollLeft": 0, "inputConfiguration": "", "behaviorConfiguration": "" }
        });
        assert!(validate_intent(1, &valid).is_ok());
        for (pointer, malformed) in [
            ("/command", serde_json::json!("write_org_document")),
            ("/generation", serde_json::json!(0)),
            ("/revision", serde_json::json!(-1)),
            ("/sequence", serde_json::json!(0.5)),
            ("/capture/selection/main", serde_json::json!(1)),
            ("/capture/selection/ranges", serde_json::json!([])),
            ("/capture/selection/ranges/0/anchor", serde_json::json!("7")),
            ("/capture/selection/ranges/0/assoc", serde_json::json!(2)),
            ("/capture/selection/ranges/0/bidiLevel", serde_json::json!(-1)),
            ("/capture/selection/ranges/0/goalColumn", serde_json::json!(-1)),
            ("/capture/selection/ranges/0/undirectional", Value::Null),
            ("/capture/folds/0/to", serde_json::json!(-1)),
            ("/capture/visibleRanges/0/from", serde_json::json!(13)),
            ("/capture/scrollTop", serde_json::json!(-1)),
            ("/capture/inputConfiguration", serde_json::json!({ "capabilityToken": "forged" })),
        ] {
            let mut invalid = valid.clone();
            *invalid.pointer_mut(pointer).unwrap() = malformed;
            assert!(validate_intent(1, &invalid).is_err(), "{pointer}");
        }
        let mut clicked = valid.clone();
        clicked["command"] = serde_json::json!("link");
        clicked["capture"]["linkPosition"] = serde_json::json!(7);
        assert!(validate_intent(1, &clicked).is_ok());
        clicked["capture"]["linkPosition"] = serde_json::json!(-1);
        assert!(validate_intent(1, &clicked).is_err());
        clicked["capture"]["linkPosition"] = serde_json::json!(7);
        clicked["command"] = serde_json::json!("capture");
        assert!(validate_intent(1, &clicked).is_err());
        assert!(validate_intent(1, &serde_json::json!({"kind":"workflow-cancel","generation":1,"workflowRequestId":2})).is_ok());
        for payload in [
            serde_json::json!({"kind":"workflow-cancel","generation":1}),
            serde_json::json!({"kind":"workflow-cancel","generation":0,"workflowRequestId":2}),
            serde_json::json!({"kind":"workflow-cancel","generation":1,"workflowRequestId":0}),
        ] { assert!(validate_intent(1, &payload).is_err()); }
    }

    #[test]
    fn native_focus_requires_original_binding_and_live_projection_generation() {
        let mut windows = WindowRegistry::default();
        let child = windows.reserve("source".into(), binding()).unwrap();
        assert!(windows.authorize_focus(&child.label, &child.binding, 1).is_err());
        windows.windows.get_mut(&child.label).unwrap().projection_generation = Some(1);
        assert!(windows.authorize_focus(&child.label, &child.binding, 1).is_ok());
        assert!(windows.authorize_focus("main", &child.binding, 1).is_err());
        assert!(windows.authorize_focus(&child.label, "wrong-binding", 1).is_err());
        windows.windows.get_mut(&child.label).unwrap().projection_generation = Some(2);
        assert!(windows.authorize_focus(&child.label, &child.binding, 1).is_err());
        assert!(windows.authorize_focus(&child.label, &child.binding, 2).is_ok());
        windows.windows.get_mut(&child.label).unwrap().projection_generation = None;
        assert!(windows.authorize_focus(&child.label, &child.binding, 2).is_err());
        windows.retire(&child);
        let new = windows.reserve("source".into(), "new-focus-binding-identity".into()).unwrap();
        windows.windows.get_mut(&new.label).unwrap().projection_generation = Some(1);
        assert!(windows.authorize_focus(&new.label, &child.binding, 1).is_err());
        assert!(windows.authorize_focus(&new.label, &new.binding, 1).is_ok());
    }

    #[test]
    fn only_main_can_hide_owner_and_only_live_child_binding_can_return_to_it() {
        let mut windows = WindowRegistry::default();
        let child = windows.reserve("source".into(), binding()).unwrap();
        assert!(windows.authorize_visibility("main", "main", false, None).is_ok());
        assert!(windows.authorize_visibility(&child.label, &child.label, false, Some(&child.binding)).is_err());
        assert!(windows.authorize_visibility(&child.label, &child.label, true, None).is_err());
        assert!(windows.authorize_visibility(&child.label, &child.label, true, Some("wrong-binding")).is_err());
        assert!(windows.authorize_visibility(&child.label, &child.label, true, Some(&child.binding)).is_ok());
        windows.retire(&child);
        assert!(windows.authorize_visibility(&child.label, &child.label, true, Some(&child.binding)).is_err());
    }

    #[test]
    fn child_cannot_acquire_main_data_authority_or_impersonate_another_native_window() {
        let mut windows = WindowRegistry::default();
        let child = windows.reserve("source".into(), binding()).unwrap();
        for command in ["read_org_document", "write_org_document", "select_org_workspace", "get_legacy_migration_snapshot", "save_content", "query_logs", "future_data_command", "create_org_detached_window", "post_org_window_projection", "focus_org_detached_window"] {
            assert!(windows.authorize_command(&child.label, &child.label, command).is_err(), "{command}");
            assert!(windows.authorize_command("main", "main", command).is_ok(), "{command}");
        }
        assert!(windows.authorize_command(&child.label, &child.label, "post_org_window_intent").is_ok());
        assert!(windows.authorize_command(&child.label, &child.label, "close_org_detached_window").is_ok());
        assert!(windows.authorize_command("main", &child.label, "write_org_document").is_err());
        assert!(windows.authorize_command("unregistered", "unregistered", "post_org_window_intent").is_err());
        assert!(windows.caller(&child.label, "main", &child.binding).is_err());
        assert!(windows.caller(&child.label, &child.label, "wrong-binding").is_err());
    }

    #[test]
    fn configuration_access_is_read_only_for_registered_live_detached_views() {
        let mut windows = WindowRegistry::default();
        let child = windows.reserve("source".into(), binding()).unwrap();
        assert!(windows.authorize_command(&child.label, &child.label, "read_configuration_file").is_ok());
        for command in ["create_configuration_file", "open_configuration_file", "notify_configuration_reload"] {
            assert!(windows.authorize_command(&child.label, &child.label, command).is_err());
            assert!(windows.authorize_command("main", "main", command).is_ok());
        }
        assert!(windows.authorize_command("unregistered", "unregistered", "read_configuration_file").is_err());
        assert!(windows.authorize_command("main", &child.label, "read_configuration_file").is_err());
        windows.retire(&child);
        assert!(windows.authorize_command(&child.label, &child.label, "read_configuration_file").is_err());
    }

    #[test]
    fn child_self_close_cannot_destroy_peer_main_or_an_old_incarnation() {
        let mut windows = WindowRegistry::default();
        let child = windows.reserve("source".into(), binding()).unwrap();
        let peer = windows.reserve("peer".into(), "another-unique-binding".into()).unwrap();
        assert!(windows.authorize_close(&child.label, &child.label, &child.label, &child.binding).is_ok());
        assert!(windows.authorize_close("main", "main", &peer.label, &peer.binding).is_ok());
        assert!(windows.authorize_close(&child.label, &child.label, &peer.label, &peer.binding).is_err());
        assert!(windows.authorize_close(&child.label, &child.label, "main", &child.binding).is_err());
        assert!(windows.authorize_close(&child.label, "main", &child.label, &child.binding).is_err());
        assert!(windows.authorize_close(&child.label, &child.label, &child.label, &peer.binding).is_err());
        windows.windows.get_mut(&child.label).unwrap().closing = true;
        assert!(windows.authorize_close(&child.label, &child.label, &child.label, &child.binding).is_err());
        assert!(windows.authorize_command(&child.label, &child.label, "close_org_detached_window").is_err());
        windows.retire(&child);
        let new = windows.reserve("source".into(), "new-source-unique-binding".into()).unwrap();
        assert!(windows.authorize_close(&new.label, &new.label, &new.label, &child.binding).is_err());
        assert!(windows.authorize_close(&new.label, &new.label, &new.label, &new.binding).is_ok());
    }

    #[test]
    fn destroyed_incarnation_and_binding_cannot_revive_at_reused_label() {
        let mut windows = WindowRegistry::default();
        let old = windows.reserve("source".into(), binding()).unwrap();
        assert!(windows.reserve("source".into(), "another-unique-binding".into()).is_err());
        windows.windows.get_mut(&old.label).unwrap().closing = true;
        assert!(windows.owned(&old.label, &old.binding).is_err());
        assert!(windows.authorize_command(&old.label, &old.label, "post_org_window_intent").is_err());
        assert!(windows.current(&old));
        assert!(windows.retire(&old));
        assert!(windows.reserve("source".into(), binding()).is_err());
        let new = windows.reserve("source".into(), "another-unique-binding".into()).unwrap();
        assert!(!windows.current(&old));
        assert!(!windows.retire(&old));
        assert!(windows.owned(&old.label, &old.binding).is_err());
        assert!(windows.caller(&new.label, &new.label, &new.binding).is_ok());
    }
}
