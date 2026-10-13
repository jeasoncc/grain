use crate::org_clock_context::OrgClockContextSnapshot;

/// Captured local-calendar data only; no file grant, Source writer, or process execution.
#[tauri::command]
pub async fn capture_org_match_clock_context(
    calendar_times: Vec<[i32; 5]>,
) -> Result<OrgClockContextSnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || {
        crate::org_clock_context::capture_org_match_clock_context(calendar_times)
    })
    .await
    .map_err(|error| format!("Native Org clock context task failed: {error}"))?
}
