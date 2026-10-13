//! One-shot native request -> consent -> execution. No reusable execution token.

use super::org_document_commands::OrgWorkspaceRegistry;
use super::org_window_commands::authorize_org_window_command;
use crate::tauri::org_execution::{
    cwd_consent_binding, finish_started, prepare_command, require_supported_platform, ExecutionOutcome,
    OrgExecutionOutputPage, OrgExecutionRegistry, OrgExternalExecutionRequest,
    OrgExternalExecutionResult, OutputFiles, OutputStream,
};
use std::path::Path;
use tauri::{AppHandle, Manager, State, Webview};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

fn require_live_main(app: &AppHandle, caller: &Webview) -> Result<(), String> {
    authorize_org_window_command(caller, "execute_org_external")?;
    if caller.label() != "main" || caller.window_ref().label() != "main"
        || app.get_webview("main").is_none()
    {
        return Err("Only the live main native window can consent to external execution".into());
    }
    // Query the captured dispatcher, not a newly looked-up replacement's handle.
    caller.window_ref().inner_size().map_err(|_| "The execution caller window has retired")?;
    caller.url().map_err(|_| "The execution caller webview has retired")?;
    Ok(())
}

#[tauri::command]
pub fn get_org_execution_enabled(
    app: AppHandle, caller: Webview, registry: State<'_, OrgExecutionRegistry>,
) -> Result<bool, String> {
    require_live_main(&app, &caller)?;
    registry.enabled()
}

#[tauri::command]
pub fn set_org_execution_enabled(
    app: AppHandle, caller: Webview, registry: State<'_, OrgExecutionRegistry>, enabled: bool,
) -> Result<(), String> {
    require_live_main(&app, &caller)?;
    registry.set_enabled(enabled)
}

fn after_consent<T>(approved: bool, start: impl FnOnce() -> Result<T, String>) -> Result<Option<T>, String> {
    if approved { start().map(Some) } else { Ok(None) }
}

fn execute_once(app: &AppHandle, caller: &Webview, request: OrgExternalExecutionRequest) -> Result<OrgExternalExecutionResult, String> {
    require_live_main(app, caller)?;
    require_supported_platform()?;
    let execution = app.state::<OrgExecutionRegistry>();
    execution.require_enabled()?;
    let workspace = app.state::<OrgWorkspaceRegistry>();
    // Reject old/unknown grants before even showing the native execution prompt.
    let retained = workspace.require_approved(Path::new(&request.workspace_root), &request.capability_token)?;
    let expected_url = caller.url().map_err(|error| error.to_string())?;
    let message = format!("{}\n\nExact retained cwd identity:\n{}", request.consent_message()?, cwd_consent_binding(&retained)?);
    let id = execution.reserve()?;
    let parent = caller.window();
    let approved = app.dialog().message(message)
        .title("Grain — high-privilege external execution (one run)")
        .kind(MessageDialogKind::Warning)
        .buttons(MessageDialogButtons::OkCancelCustom("Run exactly once".into(), "Deny — start nothing".into()))
        .parent(&parent)
        .blocking_show();
    let start = after_consent(approved, || {
        require_live_main(app, caller)?;
        if caller.url().map_err(|error| error.to_string())? != expected_url {
            return Err("Execution caller navigated while consent was pending".into());
        }
        execution.with_enabled_start(|| {
            let files = OutputFiles::new()?;
            // Reauthorize G1, never look up G2 by root alone. Hold both the permission
            // fence and registry lease lock through spawn; neither disable nor revoke
            // can finish before an unauthorized process starts.
            workspace.with_approved(Path::new(&request.workspace_root), &request.capability_token, |cwd| {
                let mut command = prepare_command(&request, cwd)?;
                Ok((command.spawn(), files))
            })
        })
    });
    let (child, files) = match start {
        Ok(Some((Ok(child), files))) => (child, files),
        Ok(Some((Err(error), _files))) => {
            execution.discard_reservation(&id);
            let mut result = OrgExternalExecutionResult::before_start(Some(format!("Could not start approved executable: {error}")));
            result.outcome = ExecutionOutcome::Failed;
            return Ok(result);
        }
        Ok(None) => {
            execution.discard_reservation(&id);
            return Ok(OrgExternalExecutionResult::before_start(None));
        }
        Err(error) => {
            execution.discard_reservation(&id);
            return Ok(OrgExternalExecutionResult::before_start(Some(error)));
        }
    };
    // No source/window/lease freshness checks after start: drain even if the owner retires.
    let (mut result, files) = finish_started(child, &request, files, id.clone());
    if let Err(error) = execution.retain(&id, files) {
        result.outcome = ExecutionOutcome::Failed;
        result.error = Some(format!("Output retention failed: {error}"));
        result.execution_id = None;
        execution.discard_reservation(&id);
    }
    Ok(result)
}

#[tauri::command]
pub async fn execute_org_external(
    app: AppHandle, caller: Webview, request: OrgExternalExecutionRequest,
) -> Result<OrgExternalExecutionResult, String> {
    // The native worker is independent of the IPC awaiter. Dropping the frontend invoke
    // does not cancel consent, kill a started process, close its pipes or lose its receipt.
    tauri::async_runtime::spawn_blocking(move || execute_once(&app, &caller, request))
        .await.map_err(|error| format!("Native execution worker failed: {error}"))?
}

#[tauri::command]
pub fn read_org_execution_output(
    app: AppHandle, caller: Webview, registry: State<'_, OrgExecutionRegistry>,
    execution_id: String, stream: OutputStream, offset: String, limit: usize,
) -> Result<OrgExecutionOutputPage, String> {
    require_live_main(&app, &caller)?;
    // Read-only tool data, not new workspace/body authority. Source retirement is not
    // grounds for destroying otherwise copyable output.
    registry.read(&execution_id, stream, &offset, limit)
}

#[tauri::command]
pub fn release_org_execution_output(
    app: AppHandle, caller: Webview, registry: State<'_, OrgExecutionRegistry>, execution_id: String,
) -> Result<(), String> {
    require_live_main(&app, &caller)?;
    registry.release(&execution_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn denied_native_consent_never_reauthorizes_or_starts() {
        let started = std::cell::Cell::new(false);
        let result = after_consent(false, || { started.set(true); Ok(()) }).unwrap();
        assert!(result.is_none());
        assert!(!started.get());
    }
    #[test]
    fn failed_post_consent_boundary_does_not_continue_to_start() {
        let result = after_consent(true, || Err::<(), _>("G1 was revoked".into()));
        assert_eq!(result.unwrap_err(), "G1 was revoked");
    }
}
