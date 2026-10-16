//! Tauri commands for capability-scoped Org document filesystem access.

use crate::org_filesystem::{
    self, OrgDocument, OrgDocumentEntry, OrgMigrationArtifact, OrgMigrationArtifactSummary,
    OrgMigrationRecoveryBundle, OrgMigrationVerificationResult, OrgMigrationWriteResult,
    OrgOriginalRecoveryEntry, OrgWorkspaceSnapshot, OrgWriteResult,
};
use cap_std::ambient_authority;
use cap_std::fs::Dir;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::{BTreeSet, HashMap};
use std::fs;
use std::io::ErrorKind;
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

const WATCH_DEBOUNCE: Duration = Duration::from_millis(150);
const ORG_WORKSPACE_CHANGED_EVENT: &str = "org-workspace-changed";

struct OrgWorkspaceWatch {
    // Associate each subscription with its exact display root and parent approval lease.
    approved_root: PathBuf,
    capability_token: String,
    // Keeping the watcher alive keeps the OS subscription alive.
    _watcher: RecommendedWatcher,
    // Linux subscriptions use /proc/self/fd, including for newly discovered descendants.
    // Keep that descriptor alive until the watcher has been destroyed.
    _directory: Option<Dir>,
    cancelled: Arc<AtomicBool>,
}

impl Drop for OrgWorkspaceWatch {
    fn drop(&mut self) {
        self.cancelled.store(true, Ordering::Release);
    }
}

struct ApprovedOrgRoot {
    directory: Arc<Dir>,
    leases: BTreeSet<String>,
}

// Compare only metadata of the open descriptors, never the ambient display path.
#[cfg(unix)]
fn same_directory_capability(first: &Dir, second: &Dir) -> Result<bool, String> {
    use cap_std::fs::MetadataExt;
    let first = first.dir_metadata().map_err(|error| error.to_string())?;
    let second = second.dir_metadata().map_err(|error| error.to_string())?;
    Ok(first.dev() == second.dev() && first.ino() == second.ino())
}

#[cfg(not(unix))]
fn same_directory_capability(_first: &Dir, _second: &Dir) -> Result<bool, String> {
    // Fail closed where stable descriptor identity is not available.
    Ok(false)
}

fn require_watch_path_identity(path: &Path, directory: &Dir) -> Result<(), String> {
    let current = Dir::open_ambient_dir(path, ambient_authority())
        .map_err(|error| format!("Cannot verify Org workspace watch path: {error}"))?;
    if !same_directory_capability(directory, &current)? {
        return Err(
            "Org workspace watch path no longer identifies the retained directory".to_owned(),
        );
    }
    Ok(())
}

#[cfg(target_os = "linux")]
fn descriptor_watch_path(display_path: &Path, directory: &Dir) -> Result<PathBuf, String> {
    use std::os::fd::AsRawFd;
    require_watch_path_identity(display_path, directory)?;
    let path = PathBuf::from(format!("/proc/self/fd/{}", directory.as_raw_fd()));
    // Do not fall back to ambient authority if procfs is unavailable.
    require_watch_path_identity(&path, directory)?;
    Ok(path)
}

#[cfg(not(target_os = "linux"))]
fn descriptor_watch_path(display_path: &Path, directory: &Dir) -> Result<PathBuf, String> {
    require_watch_path_identity(display_path, directory)?;
    // Pre/post ambient identity checks alone cannot exclude a swap-and-restore race.
    // Refuse setup unless the backend can be addressed through a pinned descriptor.
    Err("Descriptor-bound Org workspace watching is unavailable on this platform".to_owned())
}

#[derive(Default)]
pub struct OrgWorkspaceRegistry {
    approved_roots: Mutex<HashMap<PathBuf, ApprovedOrgRoot>>,
    watches: Mutex<HashMap<String, OrgWorkspaceWatch>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgWorkspaceSelection {
    root_path: String,
    capability_token: String,
    documents: Vec<OrgDocumentEntry>,
    directories: Vec<String>,
    original_recoveries: Vec<OrgOriginalRecoveryEntry>,
}

impl OrgWorkspaceRegistry {
    fn approve(&self, root: &Path) -> Result<(PathBuf, Dir, String), String> {
        let canonical = canonical_directory(root)?;
        // Bind the selected directory before publishing approval. The returned and retained
        // handles refer to this inode even if the ambient display path is later replaced.
        let directory = Dir::open_ambient_dir(&canonical, ambient_authority())
            .map_err(|error| format!("Cannot open Org workspace: {error}"))?;
        let token = uuid::Uuid::new_v4().to_string();
        let mut roots = self
            .approved_roots
            .lock()
            .map_err(|_| "Org workspace registry lock is poisoned".to_owned())?;
        let command_capability = if let Some(retained) = roots.get_mut(&canonical) {
            if !same_directory_capability(&retained.directory, &directory)? {
                return Err(
                    "Org workspace path no longer identifies the retained directory".to_owned(),
                );
            }
            let capability = retained
                .directory
                .try_clone()
                .map_err(|error| format!("Cannot clone Org workspace capability: {error}"))?;
            retained.leases.insert(token.clone());
            capability
        } else {
            let capability = directory
                .try_clone()
                .map_err(|error| format!("Cannot clone Org workspace capability: {error}"))?;
            roots.insert(
                canonical.clone(),
                ApprovedOrgRoot {
                    directory: Arc::new(directory),
                    leases: BTreeSet::from([token.clone()]),
                },
            );
            capability
        };
        Ok((canonical, command_capability, token))
    }

    pub(crate) fn require_approved(
        &self,
        root: &Path,
        capability_token: &str,
    ) -> Result<Dir, String> {
        self.with_approved(root, capability_token, |directory| {
            directory.try_clone()
                .map_err(|error| format!("Cannot clone Org workspace capability: {error}"))
        })
    }

    /// The exact live lease remains locked through a process-start boundary. Revocation
    /// cannot slip between the final authorization and spawn; already-started work drains.
    pub(crate) fn with_approved<T>(
        &self,
        root: &Path,
        capability_token: &str,
        operation: impl FnOnce(&Dir) -> Result<T, String>,
    ) -> Result<T, String> {
        let roots = self.approved_roots.lock()
            .map_err(|_| "Org workspace registry lock is poisoned".to_owned())?;
        let approved = roots.get(root)
            .filter(|approved| approved.leases.contains(capability_token))
            .ok_or_else(|| "Invalid or released Org workspace capability token".to_owned())?;
        operation(&approved.directory)
    }

    fn approved_display_path(
        &self,
        root: &Path,
        capability_token: &str,
    ) -> Result<PathBuf, String> {
        let roots = self
            .approved_roots
            .lock()
            .map_err(|_| "Org workspace registry lock is poisoned".to_owned())?;
        let (approved_path, approved) = roots
            .get_key_value(root)
            .filter(|(_, approved)| approved.leases.contains(capability_token))
            .ok_or_else(|| "Invalid or released Org workspace capability token".to_owned())?;
        require_watch_path_identity(approved_path, &approved.directory)?;
        Ok(approved_path.clone())
    }

    fn retain_watch(&self, token: String, watch: OrgWorkspaceWatch) -> Result<(), String> {
        // Keep the approval lock until the watch is retained. This prevents a concurrent revoke
        // from finishing between the approval check and insertion and leaving an orphaned watch.
        let approved_roots = self
            .approved_roots
            .lock()
            .map_err(|_| "Org workspace registry lock is poisoned".to_owned())?;
        if !approved_roots
            .get(&watch.approved_root)
            .is_some_and(|approved| approved.leases.contains(&watch.capability_token))
        {
            return Err("Org workspace has not been approved by the user".to_owned());
        }
        self.watches
            .lock()
            .map_err(|_| "Org workspace watch registry lock is poisoned".to_owned())?
            .insert(token, watch);
        Ok(())
    }

    fn revoke(&self, root: &Path, capability_token: &str) -> Result<(), String> {
        let (capability, watches) = {
            // Use the same lock order as retain_watch and hold the approval lock through watch
            // collection. A concurrent re-approval therefore cannot lose its newly-added watch.
            let mut approved_roots = self
                .approved_roots
                .lock()
                .map_err(|_| "Org workspace registry lock is poisoned".to_owned())?;
            let Some(approved) = approved_roots.get_mut(root) else {
                return Ok(());
            };
            if !approved.leases.contains(capability_token) {
                return Ok(());
            }
            let mut retained_watches = self
                .watches
                .lock()
                .map_err(|_| "Org workspace watch registry lock is poisoned".to_owned())?;
            approved.leases.remove(capability_token);
            let capability = if approved.leases.is_empty() {
                approved_roots.remove(root)
            } else {
                None
            };
            (
                capability,
                take_watches_for_lease(&mut retained_watches, root, capability_token),
            )
        };

        // Capability and watcher destruction may close OS handles or wait on backend threads.
        // Perform all of it after releasing both registry mutexes.
        drop(capability);
        drop(watches);
        Ok(())
    }

    fn remove_watch(&self, root: &Path, capability_token: &str, token: &str) -> Result<(), String> {
        let roots = self
            .approved_roots
            .lock()
            .map_err(|_| "Org workspace registry lock is poisoned".to_owned())?;
        if !roots
            .get(root)
            .is_some_and(|approved| approved.leases.contains(capability_token))
        {
            return Err("Invalid or released Org workspace capability token".to_owned());
        }
        let watch = {
            let mut watches = self
                .watches
                .lock()
                .map_err(|_| "Org workspace watch registry lock is poisoned".to_owned())?;
            if !watches.get(token).is_some_and(|watch| {
                watch.approved_root == root && watch.capability_token == capability_token
            }) {
                return Err("Unknown Org workspace watch token for this grant".to_owned());
            }
            watches
                .remove(token)
                .ok_or_else(|| "Unknown Org workspace watch token".to_owned())?
        };
        // Drop outside the registry mutexes: watcher destruction may wait on its backend.
        drop(roots);
        drop(watch);
        Ok(())
    }
}

fn take_watches_for_lease(
    watches: &mut HashMap<String, OrgWorkspaceWatch>,
    root: &Path,
    capability_token: &str,
) -> Vec<OrgWorkspaceWatch> {
    let tokens = watches
        .iter()
        .filter(|(_, watch)| {
            watch.approved_root == root && watch.capability_token == capability_token
        })
        .map(|(token, _)| token.clone())
        .collect::<Vec<_>>();
    tokens
        .into_iter()
        .filter_map(|token| watches.remove(&token))
        .collect()
}

fn canonical_directory(root: &Path) -> Result<PathBuf, String> {
    let canonical = root
        .canonicalize()
        .map_err(|error| format!("Cannot resolve Org workspace: {error}"))?;
    if canonical.is_dir() {
        Ok(canonical)
    } else {
        Err("Org workspace root is not a directory".to_owned())
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OrgWorkspaceChangedPayload {
    workspace_root: String,
    token: String,
    paths: Vec<String>,
}

/// Converts notification paths to a deterministic, de-duplicated list of portable relative
/// paths. Notification paths are untrusted hints: paths outside the approved display root,
/// non-UTF-8 paths, the root itself, and paths containing non-normal components are omitted.
fn coalesce_workspace_paths(
    workspace_root: &Path,
    paths: impl IntoIterator<Item = PathBuf>,
) -> Vec<String> {
    paths
        .into_iter()
        .filter_map(|path| {
            let relative = path.strip_prefix(workspace_root).ok()?;
            let mut parts = Vec::new();
            for component in relative.components() {
                let Component::Normal(part) = component else {
                    return None;
                };
                parts.push(part.to_str()?);
            }
            (!parts.is_empty()).then(|| parts.join("/"))
        })
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

fn forward_watch_events(
    app: tauri::AppHandle,
    workspace_root: PathBuf,
    workspace_root_display: String,
    token: String,
    receiver: mpsc::Receiver<Vec<PathBuf>>,
    cancelled: Arc<AtomicBool>,
) {
    while let Ok(first_paths) = receiver.recv() {
        let mut paths = first_paths;
        let deadline = Instant::now() + WATCH_DEBOUNCE;
        let mut disconnected = false;

        loop {
            let Some(remaining) = deadline.checked_duration_since(Instant::now()) else {
                break;
            };
            match receiver.recv_timeout(remaining) {
                Ok(more_paths) => paths.extend(more_paths),
                Err(mpsc::RecvTimeoutError::Timeout) => break,
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    disconnected = true;
                    break;
                }
            }
        }

        if cancelled.load(Ordering::Acquire) {
            break;
        }

        let payload = OrgWorkspaceChangedPayload {
            workspace_root: workspace_root_display.clone(),
            token: token.clone(),
            paths: coalesce_workspace_paths(&workspace_root, paths),
        };
        if let Err(error) = app.emit(ORG_WORKSPACE_CHANGED_EVENT, payload) {
            tracing::warn!(%error, "failed to emit Org workspace invalidation");
        }

        if disconnected {
            break;
        }
    }
}

/// Watches an already-approved Org workspace through its retained descriptor. Fail closed
/// when the display path changed or the backend cannot watch a descriptor-bound path.
#[tauri::command]
pub fn watch_org_workspace(
    app: tauri::AppHandle,
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
) -> Result<String, String> {
    let approved_path =
        registry.approved_display_path(Path::new(&workspace_root), &capability_token)?;
    let directory = registry.require_approved(&approved_path, &capability_token)?;
    let watch_path = descriptor_watch_path(&approved_path, &directory)?;
    let approved_display = approved_path
        .to_str()
        .ok_or_else(|| "Org workspace path is not valid UTF-8".to_owned())?
        .to_owned();
    let token = uuid::Uuid::new_v4().to_string();
    let cancelled = Arc::new(AtomicBool::new(false));
    let (sender, receiver) = mpsc::channel::<Vec<PathBuf>>();

    let mut watcher = notify::recommended_watcher(move |result: notify::Result<notify::Event>| {
        let paths = match result {
            Ok(event) => event.paths,
            Err(error) => {
                // An empty-path event still invalidates the workspace for consumers.
                tracing::warn!(%error, "Org workspace watcher backend error");
                Vec::new()
            }
        };
        let _ = sender.send(paths);
    })
    .map_err(|error| format!("Cannot create Org workspace watcher: {error}"))?;
    watcher
        .watch(&watch_path, RecursiveMode::Recursive)
        .map_err(|error| format!("Cannot watch Org workspace: {error}"))?;
    // Fail closed if the display path changed during backend setup. In particular, never
    // publish a subscription for a replacement directory under an existing grant.
    require_watch_path_identity(&approved_path, &directory)?;

    let thread_cancelled = Arc::clone(&cancelled);
    let thread_token = token.clone();
    // Backend event paths are relative to the descriptor path on Linux; the public event
    // continues to carry the selected display root.
    let thread_root = watch_path;
    std::thread::Builder::new()
        .name(format!("org-watch-{token}"))
        .spawn(move || {
            forward_watch_events(
                app,
                thread_root,
                approved_display,
                thread_token,
                receiver,
                thread_cancelled,
            );
        })
        .map_err(|error| format!("Cannot start Org workspace watcher worker: {error}"))?;

    if let Err(error) = registry.retain_watch(
        token.clone(),
        OrgWorkspaceWatch {
            approved_root: approved_path,
            capability_token,
            _watcher: watcher,
            _directory: Some(directory),
            cancelled: Arc::clone(&cancelled),
        },
    ) {
        cancelled.store(true, Ordering::Release);
        return Err(error);
    }

    Ok(token)
}

#[tauri::command]
pub fn unwatch_org_workspace(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
    token: String,
) -> Result<(), String> {
    registry.remove_watch(Path::new(&workspace_root), &capability_token, &token)
}

/// Releases only the exact grant and its watches. The last live grant removes the root.
/// Unknown or already-released grants are intentionally no-ops.
#[tauri::command]
pub fn release_org_workspace(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
) -> Result<(), String> {
    registry.revoke(Path::new(&workspace_root), &capability_token)
}

fn recover_and_scan_workspace(root: &Dir) -> Result<OrgWorkspaceSnapshot, String> {
    org_filesystem::recover_org_document_writes_with_capability(root)
        .map_err(|error| error.to_string())?;
    org_filesystem::scan_org_workspace_with_capability(root).map_err(|error| error.to_string())
}

fn select_approved_workspace(
    registry: &OrgWorkspaceRegistry,
    root: &Path,
) -> Result<OrgWorkspaceSelection, String> {
    let (root, capability, capability_token) = registry.approve(root)?;
    let selection = (|| {
        let snapshot = recover_and_scan_workspace(&capability)?;
        let root_path = root
            .to_str()
            .ok_or_else(|| "Org workspace path is not valid UTF-8".to_owned())?
            .to_owned();
        Ok(OrgWorkspaceSelection {
            root_path,
            capability_token: capability_token.clone(),
            documents: snapshot.documents,
            directories: snapshot.directories,
            original_recoveries: snapshot.original_recoveries,
        })
    })();
    if selection.is_err() {
        registry.revoke(&root, &capability_token)?;
    }
    selection
}

fn default_org_workspace_path() -> Result<PathBuf, String> {
    let documents = dirs::document_dir()
        .or_else(|| dirs::home_dir().map(|home| home.join("Documents")))
        .ok_or_else(|| "Cannot determine the user Documents directory".to_owned())?;
    Ok(documents.join("Grain"))
}

fn inspect_default_org_workspace(root: &Path) -> Result<bool, String> {
    match fs::symlink_metadata(root) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            Err("Default Org workspace must not be a symbolic link".to_owned())
        }
        Ok(metadata) if !metadata.is_dir() => {
            Err("Default Org workspace path exists but is not a directory".to_owned())
        }
        Ok(_) => Ok(true),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(false),
        Err(error) => Err(format!("Cannot inspect default Org workspace: {error}")),
    }
}

fn ensure_default_org_workspace(root: &Path) -> Result<(), String> {
    if inspect_default_org_workspace(root)? {
        return Ok(());
    }
    let parent = root
        .parent()
        .ok_or_else(|| "Default Org workspace has no parent directory".to_owned())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Cannot create Documents directory: {error}"))?;
    fs::create_dir(root)
        .map_err(|create_error| format!("Cannot create default Org workspace: {create_error}"))
}

/// Creates (only when absent), approves, and scans the visible Documents/Grain workspace.
/// This fixed path is the only ambient path that may be opened without a native picker.
#[tauri::command]
pub fn open_default_org_workspace(
    registry: State<'_, OrgWorkspaceRegistry>,
) -> Result<OrgWorkspaceSelection, String> {
    let root = default_org_workspace_path()?;
    ensure_default_org_workspace(&root)?;
    select_approved_workspace(&registry, &root)
}

/// Reopens the fixed default workspace only when it still exists. It never recreates a directory
/// that the user removed between application sessions.
#[tauri::command]
pub fn reopen_default_org_workspace(
    registry: State<'_, OrgWorkspaceRegistry>,
) -> Result<Option<OrgWorkspaceSelection>, String> {
    let root = default_org_workspace_path()?;
    if !inspect_default_org_workspace(&root)? {
        return Ok(None);
    }
    select_approved_workspace(&registry, &root).map(Some)
}

/// Opens a native directory picker and records the selected canonical root as an approved
/// capability for subsequent Org commands in this application process.
#[tauri::command]
pub async fn select_org_workspace(
    app: tauri::AppHandle,
) -> Result<Option<OrgWorkspaceSelection>, String> {
    // The picker queues its UI on GTK's main thread. Waiting there deadlocks before
    // the dialog can open; keep both the blocking picker and workspace scan off it.
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app
            .dialog()
            .file()
            .set_title("选择 Org 工作区")
            .blocking_pick_folder();
        let Some(selected) = selected else {
            return Ok(None);
        };

        select_approved_workspace(&app.state::<OrgWorkspaceRegistry>(), Path::new(&selected.to_string())).map(Some)
    })
    .await
    .map_err(|error| format!("Native Org workspace picker worker failed: {error}"))?
}

#[tauri::command]
pub fn scan_org_workspace(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
) -> Result<OrgWorkspaceSnapshot, String> {
    let root = registry.require_approved(Path::new(&workspace_root), &capability_token)?;
    recover_and_scan_workspace(&root)
}

fn reveal_approved_workspace_path(
    registry: &OrgWorkspaceRegistry,
    workspace_root: &Path,
    capability_token: &str,
    relative_path: Option<&Path>,
    reveal: impl FnOnce(&Path) -> Result<(), String>,
) -> Result<(), String> {
    let approved_path = registry.approved_display_path(workspace_root, capability_token)?;
    registry.with_approved(&approved_path, capability_token, |directory| {
        let handoff = |relative: &Path| {
            // The opener consumes a named path, not a process-local descriptor. Verify
            // the selected root immediately before handing it off, while holding its lease.
            // External file managers resolve the named path themselves; their later lookup
            // cannot be made atomic with these descriptor checks by the opener API.
            if fs::symlink_metadata(&approved_path).map_err(|error| error.to_string())?
                .file_type().is_symlink()
            {
                return Err("Org workspace reveal root must not be a symbolic link".to_owned());
            }
            require_watch_path_identity(&approved_path, directory)?;
            reveal(&approved_path.join(relative))
        };
        match relative_path {
            Some(relative) => org_filesystem::with_org_reveal_target(directory, relative, handoff),
            None => handoff(Path::new("")),
        }
    })
}

#[tauri::command]
pub fn reveal_org_workspace_path(
    app: tauri::AppHandle,
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
    relative_path: Option<String>,
) -> Result<(), String> {
    reveal_approved_workspace_path(
        &registry, Path::new(&workspace_root), &capability_token,
        relative_path.as_deref().map(Path::new),
        |target| app.opener().reveal_item_in_dir(target)
            .map_err(|error| format!("Cannot reveal Org workspace target in the file manager: {error}")),
    )
}

#[tauri::command]
pub fn read_org_document(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
    relative_path: String,
) -> Result<OrgDocument, serde_json::Value> {
    let root = registry.require_approved(Path::new(&workspace_root), &capability_token)
        .map_err(serde_json::Value::String)?;
    org_filesystem::read_org_document_with_capability(&root, relative_path)
        .map_err(|error| match error {
            org_filesystem::OrgFilesystemError::ProvenAbsent(path) => serde_json::json!({
                "kind": "document-path-absent",
                "relativePath": path,
                "authorizedObservation": true,
                "message": format!("Org document path is absent: {path}"),
            }),
            other => serde_json::Value::String(other.to_string()),
        })
}

#[tauri::command]
pub fn read_org_migration_recovery_bundle(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
    manifest_relative_path: String,
) -> Result<OrgMigrationRecoveryBundle, String> {
    let root = registry.require_approved(Path::new(&workspace_root), &capability_token)?;
    org_filesystem::read_org_migration_recovery_bundle_with_capability(
        &root,
        manifest_relative_path,
    )
    .map_err(|error| error.to_string())
}

fn document_write_command_error(error: org_filesystem::OrgFilesystemError) -> serde_json::Value {
    let message = error.to_string();
    match error {
        org_filesystem::OrgFilesystemError::CreationCollision(path) => {
            serde_json::json!({
                "kind": "creation-collision",
                "relativePath": path,
                "noWrite": true,
                "message": message,
            })
        }
        _ => serde_json::Value::String(message),
    }
}

#[tauri::command]
pub fn write_org_document(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
    relative_path: String,
    content: String,
    expected_revision: String,
) -> Result<OrgWriteResult, serde_json::Value> {
    let root = registry
        .require_approved(Path::new(&workspace_root), &capability_token)
        .map_err(serde_json::Value::String)?;
    org_filesystem::write_org_document_with_capability(
        &root,
        relative_path,
        &content,
        Some(&expected_revision),
    )
    .map_err(document_write_command_error)
}

#[tauri::command]
pub fn write_org_migration(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
    directories: Vec<String>,
    artifacts: Vec<OrgMigrationArtifact>,
) -> Result<OrgMigrationWriteResult, String> {
    let root = registry.require_approved(Path::new(&workspace_root), &capability_token)?;
    org_filesystem::write_org_migration_with_capability(&root, directories, artifacts)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn verify_org_migration(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
    verification_path: String,
    expected_artifacts: Vec<OrgMigrationArtifactSummary>,
) -> Result<OrgMigrationVerificationResult, String> {
    let root = registry.require_approved(Path::new(&workspace_root), &capability_token)?;
    org_filesystem::verify_org_migration_with_capability(
        &root,
        verification_path,
        expected_artifacts,
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_org_directory(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
    relative_path: String,
) -> Result<(), String> {
    let root = registry.require_approved(Path::new(&workspace_root), &capability_token)?;
    org_filesystem::create_org_directory_with_capability(&root, relative_path)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn move_org_document(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
    source_relative_path: String,
    target_relative_path: String,
    expected_source_revision: String,
) -> Result<OrgWriteResult, String> {
    let root = registry.require_approved(Path::new(&workspace_root), &capability_token)?;
    org_filesystem::move_org_document_with_capability(
        &root,
        source_relative_path,
        target_relative_path,
        &expected_source_revision,
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_org_document(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    capability_token: String,
    relative_path: String,
    expected_revision: String,
) -> Result<OrgOriginalRecoveryEntry, String> {
    let root = registry.require_approved(Path::new(&workspace_root), &capability_token)?;
    org_filesystem::delete_org_document_with_capability(&root, relative_path, &expected_revision)
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn write_errors_expose_only_preflight_creation_collisions_as_no_write() {
        let collision = document_write_command_error(org_filesystem::OrgFilesystemError::CreationCollision(
            "diary.org".to_owned(),
        ));
        assert_eq!(collision["kind"], "creation-collision");
        assert_eq!(collision["relativePath"], "diary.org");
        assert_eq!(collision["noWrite"], true);
        for error in [
            org_filesystem::OrgFilesystemError::RevisionConflict {
                path: "notes.org".to_owned(), expected: "old".to_owned(), actual: "new".to_owned(),
            },
            org_filesystem::OrgFilesystemError::RevisionConflict {
                path: "notes.org".to_owned(), expected: "<missing>".to_owned(), actual: "<missing>".to_owned(),
            },
            org_filesystem::OrgFilesystemError::RevisionConflict {
                path: "notes.org".to_owned(), expected: "<missing>".to_owned(), actual: "foreign".to_owned(),
            },
            org_filesystem::OrgFilesystemError::WriteRecoveryConflict("retained".to_owned()),
            org_filesystem::OrgFilesystemError::Io(std::io::Error::other("lost confirmation")),
        ] {
            assert!(document_write_command_error(error).is_string());
        }
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn approved_reopen_recovers_captured_body_before_returning_documents() {
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("interrupted.org"), "* Original\r\n").unwrap();
        let directory = Dir::open_ambient_dir(workspace.path(), ambient_authority()).unwrap();
        org_filesystem::prepare_interrupted_org_write(
            &directory, "interrupted.org", "* Pending\n", false,
        ).unwrap();
        assert!(!workspace.path().join("interrupted.org").exists());

        let registry = OrgWorkspaceRegistry::default();
        let selection = select_approved_workspace(&registry, workspace.path()).unwrap();
        assert_eq!(selection.documents.len(), 1);
        assert_eq!(selection.documents[0].relative_path, "interrupted.org");
        assert_eq!(fs::read_to_string(workspace.path().join("interrupted.org")).unwrap(), "* Original\r\n");
        let capability = registry.require_approved(
            Path::new(&selection.root_path), &selection.capability_token,
        ).unwrap();
        assert_eq!(recover_and_scan_workspace(&capability).unwrap().documents.len(), 1);
        registry.revoke(Path::new(&selection.root_path), &selection.capability_token).unwrap();
        assert!(registry.require_approved(
            Path::new(&selection.root_path), &selection.capability_token,
        ).is_err());
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn approved_refresh_finishes_published_recovery_before_scan() {
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("interrupted.org"), "* Original\n").unwrap();
        let registry = OrgWorkspaceRegistry::default();
        let (root, capability, token) = registry.approve(workspace.path()).unwrap();
        org_filesystem::prepare_interrupted_org_write(
            &capability, "interrupted.org", "* Published\r\n", true,
        ).unwrap();
        let approved = registry.require_approved(&root, &token).unwrap();
        let snapshot = recover_and_scan_workspace(&approved).unwrap();
        assert_eq!(snapshot.documents.len(), 1);
        assert_eq!(approved.read_to_string("interrupted.org").unwrap(), "* Published\r\n");
        assert_eq!(recover_and_scan_workspace(&approved).unwrap().documents.len(), 1);
    }

    fn test_watch(root: PathBuf, capability_token: &str) -> (OrgWorkspaceWatch, Arc<AtomicBool>) {
        let cancelled = Arc::new(AtomicBool::new(false));
        let watcher = notify::recommended_watcher(|_: notify::Result<notify::Event>| {}).unwrap();
        (
            OrgWorkspaceWatch {
                approved_root: root,
                capability_token: capability_token.to_owned(),
                _watcher: watcher,
                _directory: None,
                cancelled: Arc::clone(&cancelled),
            },
            cancelled,
        )
    }

    #[cfg(unix)]
    #[test]
    fn registry_retains_selected_directory_after_root_swap() {
        let parent = tempdir().unwrap();
        let selected = parent.path().join("selected");
        let retained = parent.path().join("retained");
        fs::create_dir(&selected).unwrap();
        fs::write(selected.join("original.org"), "original").unwrap();

        let registry = OrgWorkspaceRegistry::default();
        let (display_path, selection_capability, token) = registry.approve(&selected).unwrap();
        drop(selection_capability);
        fs::rename(&selected, &retained).unwrap();
        fs::create_dir(&selected).unwrap();
        fs::write(selected.join("replacement.org"), "replacement").unwrap();

        assert!(registry.approve(&selected).is_err());
        assert!(registry
            .approved_display_path(&display_path, &token)
            .is_err());
        assert!(descriptor_watch_path(
            &display_path,
            &registry.require_approved(&display_path, &token).unwrap()
        )
        .is_err());
        assert_eq!(
            registry.approved_roots.lock().unwrap()[&display_path]
                .leases
                .len(),
            1
        );
        let approved = registry.require_approved(&display_path, &token).unwrap();
        assert_eq!(approved.read_to_string("original.org").unwrap(), "original");
        assert!(approved.read_to_string("replacement.org").is_err());
        approved
            .write("original.org", "updated through retained descriptor")
            .unwrap();
        assert_eq!(
            fs::read_to_string(retained.join("original.org")).unwrap(),
            "updated through retained descriptor"
        );
        assert_eq!(
            fs::read_to_string(selected.join("replacement.org")).unwrap(),
            "replacement"
        );
        assert!(!selected.join("original.org").exists());
        assert!(registry.require_approved(&retained, &token).is_err());
        registry.revoke(&display_path, &token).unwrap();
        assert!(registry.require_approved(&display_path, &token).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn released_generation_rejects_queued_work_but_retains_acquired_descriptor_after_root_swap() {
        let parent = tempdir().unwrap();
        let selected = parent.path().join("selected");
        let retained = parent.path().join("retained");
        let original = "* Identical document\n";
        fs::create_dir(&selected).unwrap();
        fs::write(selected.join("document.org"), original).unwrap();

        let registry = OrgWorkspaceRegistry::default();
        let (display_g1, selection_g1, token_g1) = registry.approve(&selected).unwrap();
        drop(selection_g1);
        // Work already authorized under G1 retains its descriptor before release.
        let captured_g1 = registry.require_approved(&display_g1, &token_g1).unwrap();
        registry.revoke(&display_g1, &token_g1).unwrap();
        fs::rename(&selected, &retained).unwrap();
        fs::create_dir(&selected).unwrap();
        fs::write(selected.join("document.org"), original).unwrap();

        let (display_g2, selection_g2, token_g2) = registry.approve(&selected).unwrap();
        drop(selection_g2);
        assert_eq!(display_g1, display_g2);
        assert_ne!(token_g1, token_g2);
        let authorized_g2 = registry.require_approved(&display_g2, &token_g2).unwrap();
        assert!(!same_directory_capability(&captured_g1, &authorized_g2).unwrap());
        assert_eq!(
            captured_g1.read_to_string("document.org").unwrap(),
            original
        );
        assert_eq!(
            authorized_g2.read_to_string("document.org").unwrap(),
            original
        );

        // Queued G1 work must authorize again: identical paths and bytes do not revive its lease.
        assert!(registry.require_approved(&display_g1, &token_g1).is_err());
        captured_g1
            .write("document.org", "* Written through captured G1\n")
            .unwrap();
        assert_eq!(
            fs::read_to_string(retained.join("document.org")).unwrap(),
            "* Written through captured G1\n"
        );
        assert_eq!(
            fs::read_to_string(selected.join("document.org")).unwrap(),
            original
        );
        assert_eq!(
            registry
                .require_approved(&display_g2, &token_g2)
                .unwrap()
                .read_to_string("document.org")
                .unwrap(),
            original
        );
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn descriptor_watch_stays_on_retained_root_during_setup_swap() {
        let parent = tempdir().unwrap();
        let selected = parent.path().join("selected");
        let retained = parent.path().join("retained");
        fs::create_dir(&selected).unwrap();
        let registry = OrgWorkspaceRegistry::default();
        let (display, directory, token) = registry.approve(&selected).unwrap();
        let watch_path = descriptor_watch_path(&display, &directory).unwrap();

        fs::rename(&selected, &retained).unwrap();
        fs::create_dir(&selected).unwrap();
        let (sender, receiver) = mpsc::channel();
        let mut watcher =
            notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
                if let Ok(event) = event {
                    let _ = sender.send(event.paths);
                }
            })
            .unwrap();
        watcher
            .watch(&watch_path, RecursiveMode::Recursive)
            .unwrap();
        fs::write(selected.join("replacement.org"), "replacement").unwrap();
        fs::write(retained.join("original.org"), "original").unwrap();
        let deadline = Instant::now() + Duration::from_secs(3);
        let mut observed_original = false;
        while let Some(remaining) = deadline.checked_duration_since(Instant::now()) {
            let paths = receiver.recv_timeout(remaining).unwrap();
            let paths = coalesce_workspace_paths(&watch_path, paths);
            assert!(!paths.iter().any(|path| path == "replacement.org"));
            if paths.iter().any(|path| path == "original.org") {
                observed_original = true;
                break;
            }
        }
        assert!(observed_original);
        // The backend path is still the original inode even when setup races replacement.
        require_watch_path_identity(&watch_path, &directory).unwrap();
        let replacement = Dir::open_ambient_dir(&selected, ambient_authority()).unwrap();
        assert!(!same_directory_capability(&directory, &replacement).unwrap());
        assert!(require_watch_path_identity(&display, &directory).is_err());
        assert!(registry.approved_display_path(&display, &token).is_err());
        assert!(registry.watches.lock().unwrap().is_empty());
    }

    #[cfg(unix)]
    #[test]
    fn reveal_rejects_unsafe_targets_and_propagates_opener_failure() {
        let workspace = tempdir().unwrap();
        let outside = tempdir().unwrap();
        fs::write(workspace.path().join("notes.org"), "* Notes").unwrap();
        fs::write(workspace.path().join("unsupported.txt"), "text").unwrap();
        fs::create_dir(workspace.path().join("folder")).unwrap();
        fs::create_dir(workspace.path().join(".grain-write-private.tmp")).unwrap();
        std::os::unix::fs::symlink(outside.path(), workspace.path().join("linked")).unwrap();
        std::os::unix::fs::symlink("notes.org", workspace.path().join("linked.org")).unwrap();
        let registry = OrgWorkspaceRegistry::default();
        let (path, _, token) = registry.approve(workspace.path()).unwrap();
        for target in ["", "../notes.org", "/notes.org", "folder/../notes.org", "missing.org",
            "unsupported.txt", "linked", "linked.org", "linked/notes.org", ".grain-write-private.tmp"] {
            let result = reveal_approved_workspace_path(&registry, &path, &token,
                Some(Path::new(target)), |_| panic!("unsafe target reached opener: {target}"));
            assert!(result.is_err(), "{target}");
        }
        for target in [None, Some(Path::new("notes.org")), Some(Path::new("folder"))] {
            let result = reveal_approved_workspace_path(&registry, &path, &token, target,
                |named| {
                    assert_eq!(named, path.join(target.unwrap_or_else(|| Path::new(""))));
                    Err("file manager unavailable".to_owned())
                });
            assert_eq!(result.unwrap_err(), "file manager unavailable");
        }
        assert!(reveal_approved_workspace_path(&registry, &path, "unknown", None,
            |_| panic!("unknown lease reached opener")).is_err());
        registry.revoke(&path, &token).unwrap();
        assert!(reveal_approved_workspace_path(&registry, &path, &token, None,
            |_| panic!("released lease reached opener")).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn reveal_rejects_replaced_named_root_before_opener() {
        let parent = tempdir().unwrap();
        let selected = parent.path().join("selected");
        fs::create_dir(&selected).unwrap();
        let registry = OrgWorkspaceRegistry::default();
        let (path, _, token) = registry.approve(&selected).unwrap();
        fs::rename(&selected, parent.path().join("retained")).unwrap();
        fs::create_dir(&selected).unwrap();
        assert!(reveal_approved_workspace_path(&registry, &path, &token, None,
            |_| panic!("replacement root reached opener")).is_err());
        fs::remove_dir(&selected).unwrap();
        std::os::unix::fs::symlink(parent.path().join("retained"), &selected).unwrap();
        assert!(reveal_approved_workspace_path(&registry, &path, &token, None,
            |_| panic!("symbolic-link root reached opener")).is_err());
    }

    #[test]
    fn watch_path_rejects_unknown_wrong_and_released_leases() {
        let first = tempdir().unwrap();
        let second = tempdir().unwrap();
        let registry = OrgWorkspaceRegistry::default();
        let (first_path, _, first_token) = registry.approve(first.path()).unwrap();
        let (second_path, _, second_token) = registry.approve(second.path()).unwrap();
        assert!(registry
            .approved_display_path(&first_path, "unknown")
            .is_err());
        assert!(registry
            .approved_display_path(&first_path, &second_token)
            .is_err());
        assert!(registry
            .approved_display_path(&second_path, &first_token)
            .is_err());
        #[cfg(unix)]
        assert_eq!(
            registry
                .approved_display_path(&first_path, &first_token)
                .unwrap(),
            first_path
        );
        registry.revoke(&first_path, &first_token).unwrap();
        registry.revoke(&first_path, &first_token).unwrap();
        registry.revoke(&first_path, "unknown").unwrap();
        assert!(registry
            .approved_display_path(&first_path, &first_token)
            .is_err());
    }

    #[cfg(unix)]
    #[test]
    fn same_root_grants_release_independently_and_preserve_watches() {
        let root = tempdir().unwrap();
        let registry = OrgWorkspaceRegistry::default();
        let active = select_approved_workspace(&registry, root.path()).unwrap();
        let serialized = serde_json::to_value(&active).unwrap();
        assert_eq!(serialized["capabilityToken"], active.capability_token);
        assert!(serialized.get("rootPath").is_some());
        assert!(serialized.get("documents").is_some());
        assert!(serialized.get("directories").is_some());
        let display = Path::new(&active.root_path);
        let scan = org_filesystem::scan_org_workspace_with_capability(
            &registry
                .require_approved(display, &active.capability_token)
                .unwrap(),
        )
        .unwrap();
        assert!(serde_json::to_value(scan)
            .unwrap()
            .get("capabilityToken")
            .is_none());
        assert_eq!(
            registry.approved_roots.lock().unwrap()[display]
                .leases
                .len(),
            1
        );
        let retained = Arc::clone(&registry.approved_roots.lock().unwrap()[display].directory);
        let pending = select_approved_workspace(&registry, root.path()).unwrap();
        assert_ne!(active.capability_token, pending.capability_token);
        assert!(Arc::ptr_eq(
            &retained,
            &registry.approved_roots.lock().unwrap()[display].directory
        ));
        let (watch, cancelled) = test_watch(display.to_owned(), &active.capability_token);
        let (pending_watch, pending_cancelled) =
            test_watch(display.to_owned(), &pending.capability_token);
        registry.retain_watch("watch".to_owned(), watch).unwrap();
        registry
            .retain_watch("pending".to_owned(), pending_watch)
            .unwrap();
        assert!(registry
            .remove_watch(display, &pending.capability_token, "watch")
            .is_err());

        registry.revoke(display, &pending.capability_token).unwrap();
        registry.revoke(display, &pending.capability_token).unwrap();
        registry.revoke(display, "unknown").unwrap();
        assert!(registry
            .require_approved(display, &pending.capability_token)
            .is_err());
        assert!(registry
            .approved_display_path(display, &pending.capability_token)
            .is_err());
        assert!(pending_cancelled.load(Ordering::Acquire));
        assert!(registry
            .require_approved(display, &active.capability_token)
            .is_ok());
        assert!(!cancelled.load(Ordering::Acquire));
        let (stale_watch, stale_cancelled) =
            test_watch(display.to_owned(), &pending.capability_token);
        assert!(registry
            .retain_watch("stale".to_owned(), stale_watch)
            .is_err());
        assert!(stale_cancelled.load(Ordering::Acquire));
        let next_pending = select_approved_workspace(&registry, root.path()).unwrap();
        registry.revoke(display, &pending.capability_token).unwrap();
        registry.revoke(display, &active.capability_token).unwrap();
        assert!(registry
            .require_approved(display, &active.capability_token)
            .is_err());
        assert!(registry
            .require_approved(display, &next_pending.capability_token)
            .is_ok());
        assert!(cancelled.load(Ordering::Acquire));
        registry
            .revoke(display, &next_pending.capability_token)
            .unwrap();
        assert!(registry
            .require_approved(display, &next_pending.capability_token)
            .is_err());

        let fresh = select_approved_workspace(&registry, root.path()).unwrap();
        registry
            .revoke(display, &next_pending.capability_token)
            .unwrap();
        assert!(registry
            .require_approved(display, &next_pending.capability_token)
            .is_err());
        assert!(registry
            .require_approved(display, &fresh.capability_token)
            .is_ok());
        registry.revoke(display, &fresh.capability_token).unwrap();
        assert!(registry
            .require_approved(display, &fresh.capability_token)
            .is_err());
    }

    #[cfg(unix)]
    #[test]
    fn failed_selection_releases_its_unpublished_grant() {
        use std::os::unix::ffi::OsStringExt;
        let parent = tempdir().unwrap();
        let root = parent.path().join(std::ffi::OsString::from_vec(vec![0xff]));
        fs::create_dir(&root).unwrap();
        let registry = OrgWorkspaceRegistry::default();
        assert!(select_approved_workspace(&registry, &root).is_err());
        assert!(registry.approved_roots.lock().unwrap().is_empty());
    }

    #[test]
    fn default_workspace_creation_is_idempotent() {
        let parent = tempdir().unwrap();
        let root = parent.path().join("Documents").join("Grain");

        ensure_default_org_workspace(&root).unwrap();
        ensure_default_org_workspace(&root).unwrap();

        assert!(root.is_dir());
    }

    #[test]
    fn default_workspace_inspection_does_not_create_a_missing_directory() {
        let parent = tempdir().unwrap();
        let root = parent.path().join("Documents").join("Grain");

        assert!(!inspect_default_org_workspace(&root).unwrap());
        assert!(!root.exists());
        assert!(!root.parent().unwrap().exists());
    }

    #[test]
    fn default_workspace_rejects_an_existing_file() {
        let parent = tempdir().unwrap();
        let root = parent.path().join("Grain");
        fs::write(&root, "not a directory").unwrap();

        assert_eq!(
            ensure_default_org_workspace(&root).unwrap_err(),
            "Default Org workspace path exists but is not a directory"
        );
    }

    #[cfg(unix)]
    #[test]
    fn default_workspace_rejects_a_symbolic_link() {
        use std::os::unix::fs::symlink;

        let parent = tempdir().unwrap();
        let target = parent.path().join("target");
        let root = parent.path().join("Grain");
        fs::create_dir(&target).unwrap();
        symlink(&target, &root).unwrap();

        assert_eq!(
            ensure_default_org_workspace(&root).unwrap_err(),
            "Default Org workspace must not be a symbolic link"
        );
    }

    #[test]
    fn registry_revoke_removes_only_the_exact_approved_root() {
        let first = tempdir().unwrap();
        let second = tempdir().unwrap();
        let registry = OrgWorkspaceRegistry::default();
        let (first_root, first_capability, first_token) = registry.approve(first.path()).unwrap();
        let (second_root, second_capability, second_token) =
            registry.approve(second.path()).unwrap();
        drop((first_capability, second_capability));

        assert!(registry
            .require_approved(&first_root, &second_token)
            .is_err());
        assert!(registry
            .require_approved(&second_root, &first_token)
            .is_err());
        assert!(registry.require_approved(&first_root, "").is_err());
        assert!(registry.require_approved(&first_root, "unknown").is_err());
        assert!(registry
            .approved_display_path(&first_root, &second_token)
            .is_err());
        let (wrong_watch, _) = test_watch(first_root.clone(), &second_token);
        assert!(registry
            .retain_watch("wrong".to_owned(), wrong_watch)
            .is_err());
        registry.revoke(&first_root, &second_token).unwrap();
        assert!(registry.require_approved(&first_root, &first_token).is_ok());
        registry.revoke(&first_root, &first_token).unwrap();

        assert!(registry
            .require_approved(&first_root, &first_token)
            .is_err());
        assert!(registry
            .require_approved(&second_root, &second_token)
            .is_ok());
        // Revocation is idempotent and must not affect another approved root.
        registry.revoke(&first_root, &first_token).unwrap();
        assert!(registry
            .require_approved(&second_root, &second_token)
            .is_ok());
    }

    #[test]
    fn registry_revoke_drops_only_watches_for_the_revoked_root() {
        let first = tempdir().unwrap();
        let second = tempdir().unwrap();
        let registry = OrgWorkspaceRegistry::default();
        let (first_root, first_capability, first_token) = registry.approve(first.path()).unwrap();
        let (second_root, second_capability, second_token) =
            registry.approve(second.path()).unwrap();
        drop((first_capability, second_capability));
        let (first_watch, first_cancelled) = test_watch(first_root.clone(), &first_token);
        let (second_watch, second_cancelled) = test_watch(second_root.clone(), &second_token);
        registry
            .retain_watch("first".to_owned(), first_watch)
            .unwrap();
        registry
            .retain_watch("second".to_owned(), second_watch)
            .unwrap();

        registry.revoke(&first_root, &first_token).unwrap();

        assert!(first_cancelled.load(Ordering::Acquire));
        assert!(!second_cancelled.load(Ordering::Acquire));
        let watches = registry.watches.lock().unwrap();
        assert!(!watches.contains_key("first"));
        assert!(watches.contains_key("second"));
        drop(watches);

        registry
            .remove_watch(&second_root, &second_token, "second")
            .unwrap();
        assert!(second_cancelled.load(Ordering::Acquire));
    }

    #[test]
    fn execution_start_boundary_rejects_retired_grant_even_after_same_root_reapproval() {
        let root = tempdir().unwrap();
        let registry = OrgWorkspaceRegistry::default();
        let (display, _directory, g1) = registry.approve(root.path()).unwrap();
        registry.revoke(&display, &g1).unwrap();
        let (_, _directory, g2) = registry.approve(root.path()).unwrap();
        let started = std::cell::Cell::new(false);
        assert!(registry.with_approved(&display, &g1, |_| {
            started.set(true);
            Ok(())
        }).is_err());
        assert!(!started.get());
        registry.with_approved(&display, &g2, |_| {
            assert!(registry.approved_roots.try_lock().is_err(), "lease lock must cover the start callback");
            started.set(true);
            Ok(())
        }).unwrap();
        assert!(started.get());
    }

    #[test]
    fn notification_paths_are_relative_portable_sorted_and_coalesced() {
        let root = PathBuf::from("/approved/workspace");
        let paths = vec![
            root.join("z.org"),
            root.join("notes").join("one.org"),
            root.join("z.org"),
        ];

        assert_eq!(
            coalesce_workspace_paths(&root, paths),
            vec!["notes/one.org".to_owned(), "z.org".to_owned()]
        );
    }

    #[test]
    fn notification_path_filter_omits_root_outside_and_traversal_paths() {
        let root = PathBuf::from("/approved/workspace");
        let paths = vec![
            root.clone(),
            PathBuf::from("/approved/outside.org"),
            root.join("..").join("outside.org"),
            root.join("inside.org"),
        ];

        assert_eq!(
            coalesce_workspace_paths(&root, paths),
            vec!["inside.org".to_owned()]
        );
    }
}
