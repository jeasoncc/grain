//! Native picker-only Org export saving. No frontend destination path or reusable save grant.

use super::org_document_commands::OrgWorkspaceRegistry;
use super::org_window_commands::authorize_org_window_command;
use crate::org_filesystem::export::{self, OrgExportFormat, OrgExportOutcome};
use std::path::Path;
use tauri::{AppHandle, Manager, Webview};
use tauri_plugin_dialog::{DialogExt, FilePath, MessageDialogButtons, MessageDialogKind};

fn require_live_main(app: &AppHandle, caller: &Webview) -> Result<(), String> {
    authorize_org_window_command(caller, "save_org_export")?;
    if caller.label() != "main" || caller.window_ref().label() != "main"
        || app.get_webview("main").is_none()
    {
        return Err("Only the live main native window can choose an Org export destination".into());
    }
    caller.window_ref().inner_size().map_err(|_| "The export caller window has retired")?;
    caller.url().map_err(|_| "The export caller webview has retired")?;
    Ok(())
}

fn save_once(
    app: &AppHandle,
    caller: &Webview,
    format: OrgExportFormat,
    suggested_name: String,
    content: String,
    workspace_root: String,
    capability_token: String,
) -> Result<OrgExportOutcome, String> {
    require_live_main(app, caller)?;
    export::require_supported_platform()?;
    export::validate_suggested_name(&suggested_name, format)?;
    let registry = app.state::<OrgWorkspaceRegistry>();
    // Validate the exact existing lease before showing a picker. Never approve a new root.
    let _retained_workspace = registry.require_approved(Path::new(&workspace_root), &capability_token)?;
    let expected_url = caller.url().map_err(|error| error.to_string())?;
    let parent = caller.window();
    let picked = app.dialog().file()
        .set_title(format!("Save Org {} export", format.label()))
        .set_file_name(suggested_name)
        .add_filter(format.label(), &[format.extension()])
        .set_parent(&parent)
        .blocking_save_file();
    let Some(picked) = picked else {
        return Ok(OrgExportOutcome::Cancelled);
    };
    let FilePath::Path(path) = picked else {
        return Err("Org export picker returned a non-filesystem URI; no file was written".into());
    };
    let selected = export::select_destination(path, format)?;
    if let Some(message) = selected.replacement_prompt() {
        let approved = app.dialog().message(message)
            .title("Grain — replace one existing export")
            .kind(MessageDialogKind::Warning)
            .buttons(MessageDialogButtons::OkCancelCustom("Replace this export".into(), "Cancel — write nothing".into()))
            .parent(&parent)
            .blocking_show();
        if !approved {
            return Ok(OrgExportOutcome::Cancelled);
        }
    }
    require_live_main(app, caller)?;
    if caller.url().map_err(|error| error.to_string())? != expected_url {
        return Err("Export caller navigated while the native picker or confirmation was pending".into());
    }
    // Acceptance is linearized under the exact workspace lease lock. There are no further
    // source/window/grant freshness checks: accepted native publication drains to its receipt.
    let selected = registry.with_approved(Path::new(&workspace_root), &capability_token, |_| Ok(selected))?;
    export::publish(selected, &content)
}

#[tauri::command]
pub async fn save_org_export(
    app: AppHandle,
    caller: Webview,
    format: OrgExportFormat,
    suggested_name: String,
    content: String,
    workspace_root: String,
    capability_token: String,
) -> Result<OrgExportOutcome, String> {
    // This owned blocking worker outlives a dropped IPC awaiter. It never acquires source/body
    // history ownership, executes programs, retries, or uses the legacy ambient file writers.
    tauri::async_runtime::spawn_blocking(move || {
        save_once(&app, &caller, format, suggested_name, content, workspace_root, capability_token)
    }).await.map_err(|error| format!("Native Org export worker failed: {error}"))?
}
