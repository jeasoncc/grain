//! Tauri commands for capability-scoped Org document filesystem access.

use crate::org_filesystem::{
    self, OrgDocument, OrgDocumentEntry, OrgMigrationArtifact, OrgMigrationArtifactSummary,
    OrgMigrationRecoveryBundle, OrgMigrationVerificationResult, OrgMigrationWriteResult,
    OrgWorkspaceSnapshot, OrgWriteResult,
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
use tauri::{Emitter, State};
use tauri_plugin_dialog::DialogExt;

const WATCH_DEBOUNCE: Duration = Duration::from_millis(150);
const ORG_WORKSPACE_CHANGED_EVENT: &str = "org-workspace-changed";

struct OrgWorkspaceWatch {
    // Keep the exact approved display key so revocation can remove only this root's watches.
    approved_root: PathBuf,
    // Keeping the watcher alive keeps the OS subscription alive.
    _watcher: RecommendedWatcher,
    cancelled: Arc<AtomicBool>,
}

impl Drop for OrgWorkspaceWatch {
    fn drop(&mut self) {
        self.cancelled.store(true, Ordering::Release);
    }
}

#[derive(Default)]
pub struct OrgWorkspaceRegistry {
    approved_roots: Mutex<HashMap<PathBuf, Arc<Dir>>>,
    watches: Mutex<HashMap<String, OrgWorkspaceWatch>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgWorkspaceSelection {
    root_path: String,
    documents: Vec<OrgDocumentEntry>,
    directories: Vec<String>,
}

impl OrgWorkspaceRegistry {
    fn approve(&self, root: &Path) -> Result<(PathBuf, Dir), String> {
        let canonical = canonical_directory(root)?;
        // Bind the selected directory before publishing approval. The returned and retained
        // handles refer to this inode even if the ambient display path is later replaced.
        let directory = Dir::open_ambient_dir(&canonical, ambient_authority())
            .map_err(|error| format!("Cannot open Org workspace: {error}"))?;
        let command_capability = directory
            .try_clone()
            .map_err(|error| format!("Cannot clone Org workspace capability: {error}"))?;
        self.approved_roots
            .lock()
            .map_err(|_| "Org workspace registry lock is poisoned".to_owned())?
            .insert(canonical.clone(), Arc::new(directory));
        Ok((canonical, command_capability))
    }

    pub(crate) fn require_approved(&self, root: &Path) -> Result<Dir, String> {
        // Clone the Arc under the mutex, then duplicate the OS handle after releasing it. No
        // filesystem IO is performed while the registry is locked.
        let approved = self
            .approved_roots
            .lock()
            .map_err(|_| "Org workspace registry lock is poisoned".to_owned())?
            .get(root)
            .cloned()
            .ok_or_else(|| "Org workspace has not been approved by the user".to_owned())?;
        approved
            .try_clone()
            .map_err(|error| format!("Cannot clone Org workspace capability: {error}"))
    }

    fn approved_display_path(&self, root: &Path) -> Result<PathBuf, String> {
        self.approved_roots
            .lock()
            .map_err(|_| "Org workspace registry lock is poisoned".to_owned())?
            .get_key_value(root)
            .map(|(approved_path, _)| approved_path.clone())
            .ok_or_else(|| "Org workspace has not been approved by the user".to_owned())
    }

    fn retain_watch(&self, token: String, watch: OrgWorkspaceWatch) -> Result<(), String> {
        // Keep the approval lock until the watch is retained. This prevents a concurrent revoke
        // from finishing between the approval check and insertion and leaving an orphaned watch.
        let approved_roots = self
            .approved_roots
            .lock()
            .map_err(|_| "Org workspace registry lock is poisoned".to_owned())?;
        if !approved_roots.contains_key(&watch.approved_root) {
            return Err("Org workspace has not been approved by the user".to_owned());
        }
        self.watches
            .lock()
            .map_err(|_| "Org workspace watch registry lock is poisoned".to_owned())?
            .insert(token, watch);
        Ok(())
    }

    fn revoke(&self, root: &Path) -> Result<(), String> {
        let (capability, watches) = {
            // Use the same lock order as retain_watch and hold the approval lock through watch
            // collection. A concurrent re-approval therefore cannot lose its newly-added watch.
            let mut approved_roots = self
                .approved_roots
                .lock()
                .map_err(|_| "Org workspace registry lock is poisoned".to_owned())?;
            let mut retained_watches = self
                .watches
                .lock()
                .map_err(|_| "Org workspace watch registry lock is poisoned".to_owned())?;
            (
                approved_roots.remove(root),
                take_watches_for_root(&mut retained_watches, root),
            )
        };

        // Capability and watcher destruction may close OS handles or wait on backend threads.
        // Perform all of it after releasing both registry mutexes.
        drop(capability);
        drop(watches);
        Ok(())
    }

    fn remove_watch(&self, token: &str) -> Result<(), String> {
        let watch = {
            let mut watches = self
                .watches
                .lock()
                .map_err(|_| "Org workspace watch registry lock is poisoned".to_owned())?;
            watches
                .remove(token)
                .ok_or_else(|| "Unknown Org workspace watch token".to_owned())?
        };
        // Drop outside the registry mutex: dropping a watcher can wait on its backend thread.
        drop(watch);
        Ok(())
    }
}

fn take_watches_for_root(
    watches: &mut HashMap<String, OrgWorkspaceWatch>,
    root: &Path,
) -> Vec<OrgWorkspaceWatch> {
    let tokens = watches
        .iter()
        .filter(|(_, watch)| watch.approved_root == root)
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

/// Watches an already-approved Org workspace. The ambient display path is given only to the OS
/// notification API; file reads and mutations continue to use the retained directory capability.
#[tauri::command]
pub fn watch_org_workspace(
    app: tauri::AppHandle,
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
) -> Result<String, String> {
    let approved_path = registry.approved_display_path(Path::new(&workspace_root))?;
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
        .watch(&approved_path, RecursiveMode::Recursive)
        .map_err(|error| format!("Cannot watch Org workspace: {error}"))?;

    let thread_cancelled = Arc::clone(&cancelled);
    let thread_token = token.clone();
    let thread_root = approved_path.clone();
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
            _watcher: watcher,
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
    token: String,
) -> Result<(), String> {
    registry.remove_watch(&token)
}

/// Revokes an approved workspace capability and all watches associated with its exact display key.
/// Releasing an already-unapproved key is intentionally a no-op.
#[tauri::command]
pub fn release_org_workspace(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
) -> Result<(), String> {
    registry.revoke(Path::new(&workspace_root))
}

fn select_approved_workspace(
    registry: &OrgWorkspaceRegistry,
    root: &Path,
) -> Result<OrgWorkspaceSelection, String> {
    let (root, capability) = registry.approve(root)?;
    let snapshot = org_filesystem::scan_org_workspace_with_capability(&capability)
        .map_err(|error| error.to_string())?;
    let root_path = root
        .to_str()
        .ok_or_else(|| "Org workspace path is not valid UTF-8".to_owned())?
        .to_owned();
    Ok(OrgWorkspaceSelection {
        root_path,
        documents: snapshot.documents,
        directories: snapshot.directories,
    })
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
pub fn select_org_workspace(
    app: tauri::AppHandle,
    registry: State<'_, OrgWorkspaceRegistry>,
) -> Result<Option<OrgWorkspaceSelection>, String> {
    let selected = app
        .dialog()
        .file()
        .set_title("选择 Org 工作区")
        .blocking_pick_folder();
    let Some(selected) = selected else {
        return Ok(None);
    };

    select_approved_workspace(&registry, Path::new(&selected.to_string())).map(Some)
}

#[tauri::command]
pub fn scan_org_workspace(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
) -> Result<OrgWorkspaceSnapshot, String> {
    let root = registry.require_approved(Path::new(&workspace_root))?;
    org_filesystem::scan_org_workspace_with_capability(&root).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn read_org_document(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    relative_path: String,
) -> Result<OrgDocument, String> {
    let root = registry.require_approved(Path::new(&workspace_root))?;
    org_filesystem::read_org_document_with_capability(&root, relative_path)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn read_org_migration_recovery_bundle(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    manifest_relative_path: String,
) -> Result<OrgMigrationRecoveryBundle, String> {
    let root = registry.require_approved(Path::new(&workspace_root))?;
    org_filesystem::read_org_migration_recovery_bundle_with_capability(
        &root,
        manifest_relative_path,
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn write_org_document(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    relative_path: String,
    content: String,
    expected_revision: String,
) -> Result<OrgWriteResult, String> {
    let root = registry.require_approved(Path::new(&workspace_root))?;
    org_filesystem::write_org_document_with_capability(
        &root,
        relative_path,
        &content,
        Some(&expected_revision),
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn write_org_migration(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    directories: Vec<String>,
    artifacts: Vec<OrgMigrationArtifact>,
) -> Result<OrgMigrationWriteResult, String> {
    let root = registry.require_approved(Path::new(&workspace_root))?;
    org_filesystem::write_org_migration_with_capability(&root, directories, artifacts)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn verify_org_migration(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    verification_path: String,
    expected_artifacts: Vec<OrgMigrationArtifactSummary>,
) -> Result<OrgMigrationVerificationResult, String> {
    let root = registry.require_approved(Path::new(&workspace_root))?;
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
    relative_path: String,
) -> Result<(), String> {
    let root = registry.require_approved(Path::new(&workspace_root))?;
    org_filesystem::create_org_directory_with_capability(&root, relative_path)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn move_org_document(
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    source_relative_path: String,
    target_relative_path: String,
    expected_source_revision: String,
) -> Result<OrgWriteResult, String> {
    let root = registry.require_approved(Path::new(&workspace_root))?;
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
    relative_path: String,
    expected_revision: String,
) -> Result<(), String> {
    let root = registry.require_approved(Path::new(&workspace_root))?;
    org_filesystem::delete_org_document_with_capability(&root, relative_path, &expected_revision)
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn test_watch(root: PathBuf) -> (OrgWorkspaceWatch, Arc<AtomicBool>) {
        let cancelled = Arc::new(AtomicBool::new(false));
        let watcher = notify::recommended_watcher(|_: notify::Result<notify::Event>| {}).unwrap();
        (
            OrgWorkspaceWatch {
                approved_root: root,
                _watcher: watcher,
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
        let (display_path, selection_capability) = registry.approve(&selected).unwrap();
        drop(selection_capability);
        fs::rename(&selected, &retained).unwrap();
        fs::create_dir(&selected).unwrap();
        fs::write(selected.join("replacement.org"), "replacement").unwrap();

        let approved = registry.require_approved(&display_path).unwrap();
        assert_eq!(approved.read_to_string("original.org").unwrap(), "original");
        assert!(approved.read_to_string("replacement.org").is_err());
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
        let (first_root, first_capability) = registry.approve(first.path()).unwrap();
        let (second_root, second_capability) = registry.approve(second.path()).unwrap();
        drop((first_capability, second_capability));

        registry.revoke(&first_root).unwrap();

        assert!(registry.require_approved(&first_root).is_err());
        assert!(registry.require_approved(&second_root).is_ok());
        // Revocation is idempotent and must not affect another approved root.
        registry.revoke(&first_root).unwrap();
        assert!(registry.require_approved(&second_root).is_ok());
    }

    #[test]
    fn registry_revoke_drops_only_watches_for_the_revoked_root() {
        let first = tempdir().unwrap();
        let second = tempdir().unwrap();
        let registry = OrgWorkspaceRegistry::default();
        let (first_root, first_capability) = registry.approve(first.path()).unwrap();
        let (second_root, second_capability) = registry.approve(second.path()).unwrap();
        drop((first_capability, second_capability));
        let (first_watch, first_cancelled) = test_watch(first_root.clone());
        let (second_watch, second_cancelled) = test_watch(second_root.clone());
        registry
            .retain_watch("first".to_owned(), first_watch)
            .unwrap();
        registry
            .retain_watch("second".to_owned(), second_watch)
            .unwrap();

        registry.revoke(&first_root).unwrap();

        assert!(first_cancelled.load(Ordering::Acquire));
        assert!(!second_cancelled.load(Ordering::Acquire));
        let watches = registry.watches.lock().unwrap();
        assert!(!watches.contains_key("first"));
        assert!(watches.contains_key("second"));
        drop(watches);

        registry.remove_watch("second").unwrap();
        assert!(second_cancelled.load(Ordering::Acquire));
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
