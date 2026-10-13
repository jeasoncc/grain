use crate::org_collation::OrgCollationSnapshot;

/// Read-only native locale comparison. No grant, Source, filesystem, or process authority.
#[tauri::command]
pub async fn collate_org_match_strings(strings: Vec<String>) -> Result<OrgCollationSnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || {
        crate::org_collation::collate_org_match_strings(strings)
    })
    .await
    .map_err(|error| format!("Native Org collation task failed: {error}"))?
}
