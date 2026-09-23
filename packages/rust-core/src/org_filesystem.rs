//! Secure filesystem access for Org documents.
//!
//! Approved operations resolve paths relative to a retained workspace directory capability.
//! Callers cannot use absolute paths, parent traversal, non-Org files, or symlinks to escape it.

use cap_std::ambient_authority;
use cap_std::fs::{Dir, OpenOptions};
#[cfg(unix)]
use cap_std::fs::{MetadataExt, OpenOptionsExt, Permissions, PermissionsExt};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
#[cfg(target_os = "linux")]
use std::ffi::CString;
use std::ffi::{OsStr, OsString};
#[cfg(test)]
use std::fs;
use std::io::{self, Read, Write};
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, MutexGuard};
#[cfg(target_os = "linux")]
use std::{os::fd::AsRawFd, os::unix::ffi::OsStrExt};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum OrgFilesystemError {
    #[error("invalid Org document path: {0}")]
    InvalidPath(String),
    #[error("path escapes the workspace root: {0}")]
    OutsideWorkspace(String),
    #[error("Org document not found: {0}")]
    NotFound(String),
    #[error("target already exists: {0}")]
    TargetExists(String),
    #[error("operation is not supported on this platform: {0}")]
    UnsupportedPlatform(String),
    #[error("Org document is not valid UTF-8: {0}")]
    InvalidUtf8(String),
    #[error("invalid migration manifest: {0}")]
    InvalidManifest(String),
    #[error("Org migration recovery file exceeds its byte limit: {0}")]
    FileTooLarge(String),
    #[error("revision conflict for {path}: expected {expected}, found {actual}")]
    RevisionConflict {
        path: String,
        expected: String,
        actual: String,
    },
    #[error("filesystem error: {0}")]
    Io(#[from] io::Error),
}

pub type OrgFilesystemResult<T> = Result<T, OrgFilesystemError>;

static ORG_WRITE_LOCK: Mutex<()> = Mutex::new(());
static ORG_MUTATION_GENERATION: AtomicU64 = AtomicU64::new(0);

pub(crate) struct OrgMutationGuard {
    _guard: MutexGuard<'static, ()>,
}

impl Drop for OrgMutationGuard {
    fn drop(&mut self) {
        ORG_MUTATION_GENERATION.fetch_add(1, Ordering::SeqCst);
    }
}

pub(crate) fn org_mutation_generation() -> u64 {
    ORG_MUTATION_GENERATION.load(Ordering::SeqCst)
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgDocumentEntry {
    pub relative_path: String,
    pub revision: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgWorkspaceSnapshot {
    pub documents: Vec<OrgDocumentEntry>,
    pub directories: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgDocument {
    pub relative_path: String,
    pub content: String,
    pub revision: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgWriteResult {
    pub relative_path: String,
    pub revision: String,
}

/// One file produced by an Org workspace migration.
///
/// Unlike normal document writes, migration artifacts may have any file extension so that
/// manifests and JSON backups can be installed alongside Org documents.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgMigrationArtifact {
    pub relative_path: String,
    pub content: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgMigrationWriteResult {
    pub written_paths: Vec<String>,
    pub verification_path: String,
    /// Deterministically ordered summaries of caller-provided artifacts (not the sidecar).
    pub artifacts: Vec<OrgMigrationArtifactSummary>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OrgMigrationArtifactSummary {
    pub relative_path: String,
    pub byte_length: u64,
    pub revision: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgMigrationVerificationResult {
    pub checked_count: usize,
    pub mismatches: Vec<OrgMigrationVerificationMismatch>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgMigrationVerificationMismatch {
    pub relative_path: String,
    pub expected_byte_length: u64,
    pub actual_byte_length: Option<u64>,
    pub expected_revision: String,
    pub actual_revision: Option<String>,
}

/// A raw legacy content record recovered from a migration bundle.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgMigrationRecoveryBackup {
    pub path: String,
    pub content_id: String,
    pub content_type: String,
    pub node_id: String,
    pub version: String,
    pub created_at: String,
    pub updated_at: String,
    pub content: String,
}

/// The lossless data needed to recover legacy content without touching SQLite.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgMigrationRecoveryBundle {
    pub manifest: String,
    pub raw_backups: Vec<OrgMigrationRecoveryBackup>,
    pub recovery_sql: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OrgMigrationRecoveryManifest {
    root_directory: String,
    raw_backups: Vec<OrgMigrationRecoveryBackupMetadata>,
    #[serde(default)]
    recovery_sql_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OrgMigrationRecoveryBackupMetadata {
    path: String,
    content_id: String,
    content_type: String,
    node_id: String,
    version: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct OrgMigrationVerificationManifest {
    artifacts: Vec<OrgMigrationArtifactSummary>,
}

const MIGRATION_VERIFICATION_FILE: &str = "migration-verification.json";
const MIGRATION_MANIFEST_FILE: &str = "migration-manifest.json";
const MIGRATION_RAW_BACKUP_DIRECTORY: &str = "_migration-raw-backups";
const MIGRATION_RECOVERY_SQL_FILE: &str = "legacy-contents-recovery.sql";
const MAX_MIGRATION_MANIFEST_BYTES: u64 = 1024 * 1024;
const MAX_MIGRATION_BACKUP_BYTES: u64 = 16 * 1024 * 1024;
const MAX_MIGRATION_RECOVERY_TOTAL_BYTES: u64 = 64 * 1024 * 1024;
const MAX_MIGRATION_RECOVERY_SQL_BYTES: u64 = 160 * 1024 * 1024;

#[cfg(unix)]
struct CreatedMigrationDirectory {
    parent: Dir,
    name: OsString,
    identity: UnixIdentity,
}

#[cfg(unix)]
struct StagedMigrationArtifact {
    parent: Dir,
    target_name: OsString,
    temporary_name: OsString,
    file: cap_std::fs::File,
    display_path: String,
}

/// Recursively lists the workspace's regular `*.org` files and non-symlink directories.
///
/// Paths are relative to the workspace root and use `/` separators. The root itself is omitted,
/// and symlinked files and directories are neither returned nor followed.
pub fn scan_org_workspace(
    workspace_root: impl AsRef<Path>,
) -> OrgFilesystemResult<OrgWorkspaceSnapshot> {
    let root = open_workspace_capability(workspace_root.as_ref())?;
    scan_org_workspace_with_capability(&root)
}

/// Recursively scans an already-approved workspace capability.
///
/// All traversal and file reads remain relative to open directory handles. Symlinks are ignored
/// rather than followed.
pub fn scan_org_workspace_with_capability(root: &Dir) -> OrgFilesystemResult<OrgWorkspaceSnapshot> {
    let mut documents = Vec::new();
    let mut directories = Vec::new();
    scan_directory_capability(root, Path::new(""), &mut documents, &mut directories)?;

    documents.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    directories.sort();
    Ok(OrgWorkspaceSnapshot {
        documents,
        directories,
    })
}

fn scan_directory_capability(
    directory: &Dir,
    relative_directory: &Path,
    documents: &mut Vec<OrgDocumentEntry>,
    directories: &mut Vec<String>,
) -> OrgFilesystemResult<()> {
    for entry in directory.entries()? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        // `file_type` does not follow symlinks. Ignore both file and directory symlinks.
        if file_type.is_symlink() {
            continue;
        }

        let entry_name = entry.file_name();
        if entry_name.to_string_lossy().starts_with(".grain-")
            && entry_name.to_string_lossy().ends_with(".tmp")
        {
            continue;
        }
        let relative = relative_directory.join(entry_name);
        if file_type.is_dir() {
            directories.push(portable_relative_path(&relative)?);
            let child = entry.open_dir()?;
            scan_directory_capability(&child, &relative, documents, directories)?;
        } else if file_type.is_file()
            && relative
                .extension()
                .and_then(|extension| extension.to_str())
                == Some("org")
        {
            let display_path = portable_relative_path(&relative)?;
            let content = read_open_file_utf8(entry.open()?, &display_path)?;
            documents.push(OrgDocumentEntry {
                relative_path: display_path,
                revision: revision(content.as_bytes()),
            });
        }
    }
    Ok(())
}

/// Compatibility wrapper that recursively lists regular `*.org` files.
pub fn scan_org_documents(
    workspace_root: impl AsRef<Path>,
) -> OrgFilesystemResult<Vec<OrgDocumentEntry>> {
    Ok(scan_org_workspace(workspace_root)?.documents)
}

/// Reads one Org document without parsing or normalizing its contents.
pub fn read_org_document(
    workspace_root: impl AsRef<Path>,
    relative_path: impl AsRef<Path>,
) -> OrgFilesystemResult<OrgDocument> {
    let root = open_workspace_capability(workspace_root.as_ref())?;
    read_org_document_with_capability(&root, relative_path)
}

/// Reads one Org document relative to an already-approved workspace capability.
pub fn read_org_document_with_capability(
    root: &Dir,
    relative_path: impl AsRef<Path>,
) -> OrgFilesystemResult<OrgDocument> {
    let relative = validate_relative_org_path(relative_path.as_ref())?;
    let display_path = portable_relative_path(&relative)?;
    let (parent, file_name) = resolve_document_parent(root, &relative, &display_path)?;
    let metadata = parent
        .symlink_metadata(&file_name)
        .map_err(|error| map_not_found(error, &display_path))?;
    if metadata.file_type().is_symlink() {
        return Err(OrgFilesystemError::OutsideWorkspace(display_path));
    }
    if !metadata.is_file() {
        return Err(OrgFilesystemError::NotFound(display_path));
    }

    let content = read_open_file_utf8(
        parent
            .open(&file_name)
            .map_err(|error| map_not_found(error, &display_path))?,
        &display_path,
    )?;
    Ok(OrgDocument {
        relative_path: display_path,
        revision: revision(content.as_bytes()),
        content,
    })
}

/// Reads a legacy migration manifest and its raw backups through a retained capability.
///
/// The manifest text is returned byte-for-byte (after UTF-8 validation), and backup order is the
/// manifest order. This read-only flow never opens or writes the application database.
pub fn read_org_migration_recovery_bundle_with_capability(
    root: &Dir,
    manifest_relative_path: impl AsRef<Path>,
) -> OrgFilesystemResult<OrgMigrationRecoveryBundle> {
    let manifest_path = validate_portable_relative_path(manifest_relative_path.as_ref())?;
    if manifest_path.file_name() != Some(OsStr::new(MIGRATION_MANIFEST_FILE)) {
        return Err(OrgFilesystemError::InvalidPath(format!(
            "path must end exactly in {MIGRATION_MANIFEST_FILE}"
        )));
    }
    let manifest_display = portable_relative_path(&manifest_path)?;
    let manifest = read_capability_file_utf8_limited(
        root,
        &manifest_path,
        &manifest_display,
        MAX_MIGRATION_MANIFEST_BYTES,
    )?;
    let parsed: OrgMigrationRecoveryManifest = serde_json::from_str(&manifest)
        .map_err(|error| OrgFilesystemError::InvalidManifest(error.to_string()))?;

    let root_directory = validate_portable_relative_path(Path::new(&parsed.root_directory))?;
    if manifest_path.parent() != Some(root_directory.as_path()) {
        return Err(OrgFilesystemError::InvalidManifest(
            "rootDirectory does not match the manifest location".to_owned(),
        ));
    }
    let backup_root = root_directory.join(MIGRATION_RAW_BACKUP_DIRECTORY);
    let mut seen = HashSet::new();
    let mut prepared = Vec::with_capacity(parsed.raw_backups.len());
    for metadata in parsed.raw_backups {
        let valid_version = metadata
            .version
            .parse::<i32>()
            .is_ok_and(|value| value.to_string() == metadata.version);
        let valid_created_at = metadata
            .created_at
            .parse::<i64>()
            .is_ok_and(|value| value.to_string() == metadata.created_at);
        let valid_updated_at = metadata
            .updated_at
            .parse::<i64>()
            .is_ok_and(|value| value.to_string() == metadata.updated_at);
        if !valid_version
            || !valid_created_at
            || !valid_updated_at
            || !matches!(
                metadata.content_type.as_str(),
                "lexical" | "excalidraw" | "text"
            )
        {
            return Err(OrgFilesystemError::InvalidManifest(format!(
                "invalid raw backup metadata for content {}",
                metadata.content_id
            )));
        }
        let path = validate_portable_relative_path(Path::new(&metadata.path))?;
        if path.parent().is_none()
            || !path.starts_with(&backup_root)
            || path == backup_root
            || !seen.insert(path.clone())
        {
            return Err(OrgFilesystemError::InvalidManifest(format!(
                "raw backup path must be unique and strictly below {}/{}: {}",
                parsed.root_directory, MIGRATION_RAW_BACKUP_DIRECTORY, metadata.path
            )));
        }
        prepared.push((path, metadata));
    }

    let mut total_bytes = manifest.len() as u64;
    let mut raw_backups = Vec::with_capacity(prepared.len());
    for (path, metadata) in prepared {
        let display = portable_relative_path(&path)?;
        let remaining = MAX_MIGRATION_RECOVERY_TOTAL_BYTES
            .checked_sub(total_bytes)
            .ok_or_else(|| OrgFilesystemError::FileTooLarge(display.clone()))?;
        let content = read_capability_file_utf8_limited(
            root,
            &path,
            &display,
            MAX_MIGRATION_BACKUP_BYTES.min(remaining),
        )?;
        total_bytes += content.len() as u64;
        raw_backups.push(OrgMigrationRecoveryBackup {
            path: metadata.path,
            content_id: metadata.content_id,
            content_type: metadata.content_type,
            node_id: metadata.node_id,
            version: metadata.version,
            created_at: metadata.created_at,
            updated_at: metadata.updated_at,
            content,
        });
    }

    let recovery_sql = if let Some(sql_path) = parsed.recovery_sql_path {
        let path = validate_portable_relative_path(Path::new(&sql_path))?;
        let expected_path = root_directory.join(MIGRATION_RECOVERY_SQL_FILE);
        if path != expected_path {
            return Err(OrgFilesystemError::InvalidManifest(
                "recoverySqlPath must identify the recovery SQL beside the manifest".to_owned(),
            ));
        }
        let display = portable_relative_path(&path)?;
        Some(read_capability_file_utf8_limited(
            root,
            &path,
            &display,
            MAX_MIGRATION_RECOVERY_SQL_BYTES,
        )?)
    } else {
        None
    };

    Ok(OrgMigrationRecoveryBundle {
        manifest,
        raw_backups,
        recovery_sql,
    })
}

/// Atomically writes one Org document after optionally checking its current revision.
///
/// The temporary file is created through the destination directory capability, synced, and
/// installed with a no-clobber hard link.
pub fn write_org_document(
    workspace_root: impl AsRef<Path>,
    relative_path: impl AsRef<Path>,
    content: &str,
    expected_revision: Option<&str>,
) -> OrgFilesystemResult<OrgWriteResult> {
    let root = open_workspace_capability(workspace_root.as_ref())?;
    write_org_document_with_capability(&root, relative_path, content, expected_revision)
}

/// Writes one Org document relative to an already-approved workspace capability.
pub fn write_org_document_with_capability(
    root: &Dir,
    relative_path: impl AsRef<Path>,
    content: &str,
    expected_revision: Option<&str>,
) -> OrgFilesystemResult<OrgWriteResult> {
    let _mutation_guard = lock_org_mutations()?;
    let relative = validate_relative_org_path(relative_path.as_ref())?;
    let display_path = portable_relative_path(&relative)?;
    let (parent, file_name) = resolve_document_parent(&root, &relative, &display_path)?;

    let (current_revision, _) = current_file_state(&parent, &file_name, &display_path)?;
    if let Some(expected) = expected_revision {
        let actual = current_revision.as_deref().unwrap_or("<missing>");
        if expected != actual {
            return Err(OrgFilesystemError::RevisionConflict {
                path: display_path,
                expected: expected.to_owned(),
                actual: actual.to_owned(),
            });
        }
    }

    let new_revision = revision(content.as_bytes());
    let (temporary_name, mut temporary) = create_temporary_file(&parent)?;
    if let Err(error) = (|| -> io::Result<()> {
        temporary.write_all(content.as_bytes())?;
        temporary.flush()?;
        temporary.sync_all()
    })() {
        let _ = parent.remove_file(&temporary_name);
        return Err(error.into());
    }

    // Capture the old directory entry relative to the already-open parent. Parent path renames or
    // symlink swaps cannot redirect any operation performed through this capability.
    let captured_name = if current_revision.is_some() {
        let tombstone = match vacant_temporary_name(&parent) {
            Ok(name) => name,
            Err(error) => {
                let _ = parent.remove_file(&temporary_name);
                return Err(error.into());
            }
        };
        if let Err(error) = parent.rename(&file_name, &parent, &tombstone) {
            let _ = parent.remove_file(&temporary_name);
            return Err(error.into());
        }
        let (captured_revision, captured_permissions) =
            match current_file_state(&parent, &tombstone, &display_path) {
                Ok(state) => state,
                Err(error) => {
                    restore_captured_file(&parent, &tombstone, &parent, &file_name)?;
                    let _ = parent.remove_file(&temporary_name);
                    return Err(error);
                }
            };
        if captured_revision != current_revision {
            restore_captured_file(&parent, &tombstone, &parent, &file_name)?;
            let _ = parent.remove_file(&temporary_name);
            return Err(OrgFilesystemError::RevisionConflict {
                path: display_path,
                expected: current_revision.unwrap_or_else(|| "<missing>".to_owned()),
                actual: captured_revision.unwrap_or_else(|| "<missing>".to_owned()),
            });
        }
        if let Some(permissions) = captured_permissions {
            if let Err(error) = temporary.set_permissions(permissions) {
                restore_captured_file(&parent, &tombstone, &parent, &file_name)?;
                let _ = parent.remove_file(&temporary_name);
                return Err(error.into());
            }
            if let Err(error) = temporary.sync_all() {
                restore_captured_file(&parent, &tombstone, &parent, &file_name)?;
                let _ = parent.remove_file(&temporary_name);
                return Err(error.into());
            }
        }
        Some(tombstone)
    } else {
        None
    };

    if let Err(error) = parent.hard_link(&temporary_name, &parent, &file_name) {
        if let Some(captured) = captured_name.as_deref() {
            restore_captured_file(&parent, captured, &parent, &file_name)?;
        }
        let _ = parent.remove_file(&temporary_name);
        let (actual_revision, _) = current_file_state(&parent, &file_name, &display_path)?;
        return Err(if error.kind() == io::ErrorKind::AlreadyExists {
            OrgFilesystemError::RevisionConflict {
                path: display_path,
                expected: current_revision.unwrap_or_else(|| "<missing>".to_owned()),
                actual: actual_revision.unwrap_or_else(|| "<missing>".to_owned()),
            }
        } else {
            OrgFilesystemError::Io(error)
        });
    }
    parent.remove_file(&temporary_name)?;
    sync_directory(&parent)?;
    if let Some(captured) = captured_name {
        parent.remove_file(captured)?;
        sync_directory(&parent)?;
    }

    Ok(OrgWriteResult {
        relative_path: portable_relative_path(&relative)?,
        revision: new_revision,
    })
}

/// Installs a batch of migration artifacts relative to an already-approved workspace.
///
/// The operation validates the complete target graph, creates requested directories through
/// retained directory handles, stages and syncs every file, and uses hard links for no-clobber
/// installation. Until the entire batch is durable, rollback removes only entries whose Unix
/// device/inode identity still matches an object created by this call; replacements are retained.
pub fn write_org_migration_with_capability(
    root: &Dir,
    directories: Vec<String>,
    artifacts: Vec<OrgMigrationArtifact>,
) -> OrgFilesystemResult<OrgMigrationWriteResult> {
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = (root, directories, artifacts);
        return Err(OrgFilesystemError::UnsupportedPlatform(
            "atomic no-clobber batch migration is unavailable on this platform".to_owned(),
        ));
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        write_org_migration_unix_atomic(root, directories, artifacts)
    }
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn write_org_migration_unix_atomic(
    root: &Dir,
    directories: Vec<String>,
    artifacts: Vec<OrgMigrationArtifact>,
) -> OrgFilesystemResult<OrgMigrationWriteResult> {
    use std::collections::{BTreeSet, HashMap};

    let _mutation_guard = lock_org_mutations()?;
    let (migration_root, directory_paths, mut prepared_artifacts) =
        validate_migration_targets(directories, artifacts)?;
    let root_display = portable_relative_path(&migration_root)?;
    let backup_root = migration_root.join(MIGRATION_RAW_BACKUP_DIRECTORY);
    let recovery_sql_path = migration_root.join(MIGRATION_RECOVERY_SQL_FILE);
    let mut backup_bytes = 0_u64;
    for (relative, display, content) in &prepared_artifacts {
        if relative == &recovery_sql_path && content.len() as u64 > MAX_MIGRATION_RECOVERY_SQL_BYTES
        {
            return Err(OrgFilesystemError::InvalidManifest(
                "legacy recovery SQL exceeds recovery limit".to_owned(),
            ));
        }
        if relative.starts_with(&backup_root) {
            let bytes = content.len() as u64;
            if bytes > MAX_MIGRATION_BACKUP_BYTES {
                return Err(OrgFilesystemError::InvalidManifest(format!(
                    "raw backup exceeds recovery limit: {display}"
                )));
            }
            backup_bytes = backup_bytes.checked_add(bytes).ok_or_else(|| {
                OrgFilesystemError::InvalidManifest("raw backup size overflow".to_owned())
            })?;
            if backup_bytes > MAX_MIGRATION_RECOVERY_TOTAL_BYTES {
                return Err(OrgFilesystemError::InvalidManifest(
                    "raw backups exceed aggregate recovery limit".to_owned(),
                ));
            }
        }
    }
    let manifest_relative = migration_root.join(MIGRATION_MANIFEST_FILE);
    if let Some(manifest_bytes) = prepared_artifacts
        .iter()
        .find(|(relative, _, _)| relative == &manifest_relative)
        .map(|(_, _, content)| content.len() as u64)
    {
        if manifest_bytes > MAX_MIGRATION_MANIFEST_BYTES {
            return Err(OrgFilesystemError::InvalidManifest(
                "migration manifest exceeds recovery limit".to_owned(),
            ));
        }
        if backup_bytes
            .checked_add(manifest_bytes)
            .map_or(true, |total| total > MAX_MIGRATION_RECOVERY_TOTAL_BYTES)
        {
            return Err(OrgFilesystemError::InvalidManifest(
                "manifest and raw backups exceed aggregate recovery limit".to_owned(),
            ));
        }
    } else if backup_bytes > 0 {
        return Err(OrgFilesystemError::InvalidManifest(
            "raw backups require a migration manifest artifact".to_owned(),
        ));
    }
    let verification_relative = migration_root.join(MIGRATION_VERIFICATION_FILE);
    let verification_path = portable_relative_path(&verification_relative)?;
    let mut artifact_summaries: Vec<_> = prepared_artifacts
        .iter()
        .map(|(_, relative_path, content)| OrgMigrationArtifactSummary {
            relative_path: relative_path.clone(),
            byte_length: content.len() as u64,
            revision: revision(content.as_bytes()),
        })
        .collect();
    artifact_summaries.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));
    let mut verification_content =
        serde_json::to_string_pretty(&OrgMigrationVerificationManifest {
            artifacts: artifact_summaries.clone(),
        })
        .map_err(|error| OrgFilesystemError::InvalidManifest(error.to_string()))?;
    verification_content.push('\n');
    prepared_artifacts.push((
        verification_relative,
        verification_path.clone(),
        verification_content,
    ));
    let root_name = migration_root
        .file_name()
        .ok_or_else(|| OrgFilesystemError::InvalidPath(root_display.clone()))?;
    match root.symlink_metadata(root_name) {
        Ok(_) => return Err(OrgFilesystemError::TargetExists(root_display.clone())),
        Err(error) if error.kind() == io::ErrorKind::NotFound => {}
        Err(error) => return Err(error.into()),
    }
    let staging_name = vacant_temporary_name(root)?;

    let mut created_directories = Vec::new();
    let mut staged_artifacts = Vec::new();
    let mut installed_artifacts = 0;
    let operation = (|| -> OrgFilesystemResult<OrgMigrationWriteResult> {
        // mkdir is the authority on vacancy. The helper captures the new entry's identity before
        // opening, cloning, chmodding, syncing, or recording it, and safely cleans up if any of
        // those steps fail.
        let migration_dir = create_migration_directory(
            root,
            &staging_name,
            &root_display,
            &mut created_directories,
        )?;

        let mut nested_paths = BTreeSet::new();
        for directory in &directory_paths {
            let relative = directory.strip_prefix(&migration_root).map_err(|_| {
                OrgFilesystemError::InvalidPath(
                    portable_relative_path(directory).unwrap_or_default(),
                )
            })?;
            let mut ancestor = PathBuf::new();
            for component in relative.components() {
                ancestor.push(component.as_os_str());
                nested_paths.insert(ancestor.clone());
            }
        }

        let mut directory_handles = HashMap::new();
        directory_handles.insert(PathBuf::new(), migration_dir.try_clone()?);
        for relative in nested_paths {
            let parent_path = relative.parent().unwrap_or_else(|| Path::new(""));
            let name = relative.file_name().ok_or_else(|| {
                OrgFilesystemError::InvalidPath(
                    portable_relative_path(&relative).unwrap_or_default(),
                )
            })?;
            let parent = directory_handles.get(parent_path).ok_or_else(|| {
                OrgFilesystemError::InvalidPath(
                    portable_relative_path(&relative).unwrap_or_default(),
                )
            })?;
            let display = format!("{root_display}/{}", portable_relative_path(&relative)?);
            let directory =
                create_migration_directory(parent, name, &display, &mut created_directories)?;
            directory_handles.insert(relative, directory);
        }

        for (relative, display_path, content) in &prepared_artifacts {
            let below_root = relative
                .strip_prefix(&migration_root)
                .map_err(|_| OrgFilesystemError::InvalidPath(display_path.clone()))?;
            let parent_path = below_root.parent().unwrap_or_else(|| Path::new(""));
            let target_name = below_root
                .file_name()
                .ok_or_else(|| OrgFilesystemError::InvalidPath(display_path.clone()))?;
            let parent = directory_handles
                .get(parent_path)
                .ok_or_else(|| OrgFilesystemError::NotFound(display_path.clone()))?
                .try_clone()?;
            match parent.symlink_metadata(target_name) {
                Ok(metadata) if metadata.file_type().is_symlink() => {
                    return Err(OrgFilesystemError::OutsideWorkspace(display_path.clone()));
                }
                Ok(_) => return Err(OrgFilesystemError::TargetExists(display_path.clone())),
                Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                Err(error) => return Err(error.into()),
            }

            let (temporary_name, mut temporary) = create_temporary_file(&parent)?;
            let write_result = (|| -> io::Result<()> {
                set_migration_file_permissions(&temporary)?;
                temporary.write_all(content.as_bytes())?;
                temporary.flush()?;
                temporary.sync_all()
            })();
            staged_artifacts.push(StagedMigrationArtifact {
                parent,
                target_name: target_name.to_os_string(),
                temporary_name,
                file: temporary,
                display_path: display_path.clone(),
            });
            write_result?;
        }

        for staged in &staged_artifacts {
            if let Err(error) =
                staged
                    .parent
                    .hard_link(&staged.temporary_name, &staged.parent, &staged.target_name)
            {
                return Err(if error.kind() == io::ErrorKind::AlreadyExists {
                    OrgFilesystemError::TargetExists(staged.display_path.clone())
                } else {
                    OrgFilesystemError::Io(error)
                });
            }
            installed_artifacts += 1;
        }

        // Directory syncs are part of the transaction: a sync failure still removes every link.
        for staged in &staged_artifacts {
            sync_directory(&staged.parent)?;
        }
        for staged in &staged_artifacts {
            if !remove_file_if_identity(
                &staged.parent,
                &staged.temporary_name,
                file_identity(&staged.file)?,
            )? {
                return Err(io::Error::other(format!(
                    "staged migration file was replaced: {}",
                    staged.display_path
                ))
                .into());
            }
        }
        for staged in &staged_artifacts {
            sync_directory(&staged.parent)?;
        }

        // Publish the complete tree with one atomic no-clobber namespace operation. A crash before
        // this point leaves only an ignored .grain-*.tmp staging directory; readers can never see
        // a partially populated final migration root.
        rename_noreplace(root, &staging_name, root, root_name).map_err(|error| {
            if error.raw_os_error() == Some(libc::EEXIST) {
                OrgFilesystemError::TargetExists(root_display.clone())
            } else {
                OrgFilesystemError::Io(error)
            }
        })?;
        if let Err(sync_error) = sync_directory(root) {
            return Err(
                match rename_noreplace(root, root_name, root, &staging_name) {
                    Ok(()) => OrgFilesystemError::Io(sync_error),
                    Err(rollback_error) => OrgFilesystemError::Io(io::Error::other(format!(
                        "{sync_error}; published migration root rollback failed: {rollback_error}"
                    ))),
                },
            );
        }

        Ok(OrgMigrationWriteResult {
            written_paths: prepared_artifacts
                .iter()
                .map(|(_, display_path, _)| display_path.clone())
                .collect(),
            verification_path,
            artifacts: artifact_summaries,
        })
    })();

    match operation {
        Ok(result) => Ok(result),
        Err(operation_error) => {
            if let Err(rollback_error) =
                rollback_migration(&staged_artifacts, installed_artifacts, &created_directories)
            {
                Err(OrgFilesystemError::Io(io::Error::other(format!(
                    "{operation_error}; migration rollback failed: {rollback_error}"
                ))))
            } else {
                Err(operation_error)
            }
        }
    }
}

/// Verifies migration artifacts against a generated verification sidecar.
pub fn verify_org_migration(
    workspace_root: impl AsRef<Path>,
    verification_path: impl AsRef<Path>,
    expected_artifacts: Vec<OrgMigrationArtifactSummary>,
) -> OrgFilesystemResult<OrgMigrationVerificationResult> {
    let root = open_workspace_capability(workspace_root.as_ref())?;
    verify_org_migration_with_capability(&root, verification_path, expected_artifacts)
}

/// Verifies a migration using only the retained workspace directory capability.
pub fn verify_org_migration_with_capability(
    root: &Dir,
    verification_path: impl AsRef<Path>,
    expected_artifacts: Vec<OrgMigrationArtifactSummary>,
) -> OrgFilesystemResult<OrgMigrationVerificationResult> {
    let verification_relative = validate_relative_directory_path(verification_path.as_ref())?;
    if verification_relative.file_name() != Some(OsStr::new(MIGRATION_VERIFICATION_FILE)) {
        return Err(OrgFilesystemError::InvalidPath(
            verification_path.as_ref().display().to_string(),
        ));
    }
    let verification_display = portable_relative_path(&verification_relative)?;
    let manifest_bytes =
        read_required_regular_file(root, &verification_relative, &verification_display)?;
    let manifest: OrgMigrationVerificationManifest = serde_json::from_slice(&manifest_bytes)
        .map_err(|error| OrgFilesystemError::InvalidManifest(error.to_string()))?;
    if manifest.artifacts != expected_artifacts {
        return Err(OrgFilesystemError::InvalidManifest(
            "verification artifacts do not match the write result".to_owned(),
        ));
    }
    let migration_root = verification_relative
        .parent()
        .unwrap_or_else(|| Path::new(""));
    let mut seen = HashSet::new();

    for artifact in &manifest.artifacts {
        let path =
            validate_relative_directory_path(Path::new(&artifact.relative_path)).map_err(|_| {
                OrgFilesystemError::InvalidManifest(format!(
                    "invalid artifact path: {}",
                    artifact.relative_path
                ))
            })?;
        if !path.starts_with(migration_root)
            || path == verification_relative
            || !seen.insert(path.clone())
        {
            return Err(OrgFilesystemError::InvalidManifest(format!(
                "artifact path is outside the migration root, reserved, or duplicated: {}",
                artifact.relative_path
            )));
        }
        if artifact.revision.len() != 64
            || !artifact
                .revision
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        {
            return Err(OrgFilesystemError::InvalidManifest(format!(
                "invalid SHA-256 revision for {}",
                artifact.relative_path
            )));
        }
    }

    let mut mismatches = Vec::new();
    for artifact in &manifest.artifacts {
        let path = Path::new(&artifact.relative_path);
        let actual = read_optional_regular_file(root, path, &artifact.relative_path)?;
        let (actual_byte_length, actual_revision) = match actual {
            Some(bytes) => (Some(bytes.len() as u64), Some(revision(&bytes))),
            None => (None, None),
        };
        if actual_byte_length != Some(artifact.byte_length)
            || actual_revision.as_deref() != Some(artifact.revision.as_str())
        {
            mismatches.push(OrgMigrationVerificationMismatch {
                relative_path: artifact.relative_path.clone(),
                expected_byte_length: artifact.byte_length,
                actual_byte_length,
                expected_revision: artifact.revision.clone(),
                actual_revision,
            });
        }
    }

    Ok(OrgMigrationVerificationResult {
        checked_count: manifest.artifacts.len(),
        mismatches,
    })
}

fn read_required_regular_file(
    root: &Dir,
    relative: &Path,
    display_path: &str,
) -> OrgFilesystemResult<Vec<u8>> {
    read_optional_regular_file(root, relative, display_path)?
        .ok_or_else(|| OrgFilesystemError::NotFound(display_path.to_owned()))
}

fn read_optional_regular_file(
    root: &Dir,
    relative: &Path,
    display_path: &str,
) -> OrgFilesystemResult<Option<Vec<u8>>> {
    let (parent, file_name) = match resolve_document_parent(root, relative, display_path) {
        Ok(resolved) => resolved,
        Err(OrgFilesystemError::NotFound(_)) => return Ok(None),
        Err(error) => return Err(error),
    };
    let metadata = match parent.symlink_metadata(&file_name) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    };
    if metadata.file_type().is_symlink() {
        return Err(OrgFilesystemError::OutsideWorkspace(
            display_path.to_owned(),
        ));
    }
    if !metadata.is_file() {
        return Err(OrgFilesystemError::InvalidManifest(format!(
            "listed artifact is not a regular file: {display_path}"
        )));
    }
    let mut file = match parent.open(&file_name) {
        Ok(file) => file,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    };
    #[cfg(unix)]
    if metadata_identity(&metadata) != metadata_identity(&file.metadata()?) {
        return Err(OrgFilesystemError::Io(io::Error::other(format!(
            "file changed while being opened: {display_path}"
        ))));
    }
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)?;
    Ok(Some(bytes))
}

fn validate_migration_targets(
    directories: Vec<String>,
    artifacts: Vec<OrgMigrationArtifact>,
) -> OrgFilesystemResult<(PathBuf, Vec<PathBuf>, Vec<(PathBuf, String, String)>)> {
    let mut directory_paths = Vec::with_capacity(directories.len());
    let mut all_targets = HashSet::new();
    for directory in directories {
        let path = validate_relative_directory_path(Path::new(&directory))?;
        let display = portable_relative_path(&path)?;
        if !all_targets.insert(path.clone()) {
            return Err(OrgFilesystemError::InvalidPath(format!(
                "duplicate migration target: {display}"
            )));
        }
        directory_paths.push(path);
    }

    let mut prepared_artifacts = Vec::with_capacity(artifacts.len());
    let mut file_paths = Vec::with_capacity(artifacts.len());
    for artifact in artifacts {
        let path = validate_relative_directory_path(Path::new(&artifact.relative_path))?;
        let display = portable_relative_path(&path)?;
        if !all_targets.insert(path.clone()) {
            return Err(OrgFilesystemError::InvalidPath(format!(
                "duplicate or file/directory migration target: {display}"
            )));
        }
        file_paths.push(path.clone());
        prepared_artifacts.push((path, display, artifact.content));
    }

    let top_level_directories: Vec<_> = directory_paths
        .iter()
        .filter(|path| path.components().count() == 1)
        .collect();
    let [migration_root] = top_level_directories.as_slice() else {
        return Err(OrgFilesystemError::InvalidPath(
            "migration must request exactly one top-level directory".to_owned(),
        ));
    };
    let verification_path = migration_root.join(MIGRATION_VERIFICATION_FILE);
    if all_targets.contains(&verification_path) {
        return Err(OrgFilesystemError::InvalidPath(format!(
            "reserved migration target: {}",
            portable_relative_path(&verification_path)?
        )));
    }
    if all_targets
        .iter()
        .any(|target| !target.starts_with(migration_root))
    {
        return Err(OrgFilesystemError::InvalidPath(format!(
            "all migration targets must be below {}",
            portable_relative_path(migration_root)?
        )));
    }

    // A regular file can never be an ancestor of another requested target.
    for file_path in &file_paths {
        if all_targets
            .iter()
            .any(|target| target != file_path && target.starts_with(file_path))
        {
            return Err(OrgFilesystemError::InvalidPath(format!(
                "migration file target collides with a descendant: {}",
                portable_relative_path(file_path)?
            )));
        }
    }

    Ok((
        (*migration_root).clone(),
        directory_paths,
        prepared_artifacts,
    ))
}

#[cfg(unix)]
fn create_migration_directory(
    parent: &Dir,
    name: &OsStr,
    display_path: &str,
    created: &mut Vec<CreatedMigrationDirectory>,
) -> OrgFilesystemResult<Dir> {
    parent.create_dir(name).map_err(|error| {
        if error.kind() == io::ErrorKind::AlreadyExists {
            OrgFilesystemError::TargetExists(display_path.to_owned())
        } else {
            OrgFilesystemError::Io(error)
        }
    })?;

    // Capture from the pathname immediately after mkdir. If even this metadata read fails there is
    // no identity with which to authorize removal, so the entry is deliberately preserved.
    let identity = entry_identity(parent, name)?.ok_or_else(|| {
        OrgFilesystemError::Io(io::Error::new(
            io::ErrorKind::NotFound,
            format!("new migration directory disappeared: {display_path}"),
        ))
    })?;

    let setup = (|| -> io::Result<(Dir, CreatedMigrationDirectory)> {
        let directory = parent.open_dir(name)?;
        if metadata_identity(&directory.dir_metadata()?) != identity {
            return Err(io::Error::other(format!(
                "new migration directory was replaced: {display_path}"
            )));
        }
        let parent = parent.try_clone()?;
        set_migration_directory_permissions(&directory)?;
        sync_directory(&parent)?;
        Ok((
            directory,
            CreatedMigrationDirectory {
                parent,
                name: name.to_os_string(),
                identity,
            },
        ))
    })();

    match setup {
        Ok((directory, record)) => {
            created.push(record);
            Ok(directory)
        }
        Err(operation_error) => match rollback_created_directory(parent, name, identity) {
            Ok(()) => Err(operation_error.into()),
            Err(rollback_error) => Err(OrgFilesystemError::Io(io::Error::other(format!(
                "{operation_error}; directory rollback failed: {rollback_error}"
            )))),
        },
    }
}

#[cfg(unix)]
fn rollback_migration(
    staged: &[StagedMigrationArtifact],
    installed_artifacts: usize,
    created_directories: &[CreatedMigrationDirectory],
) -> io::Result<()> {
    let mut first_error = None;
    for artifact in staged[..installed_artifacts].iter().rev() {
        record_rollback_error(remove_installed_artifact(artifact), &mut first_error);
    }
    for artifact in staged.iter().rev() {
        let identity = match file_identity(&artifact.file) {
            Ok(identity) => identity,
            Err(error) => {
                record_rollback_error(Err(error), &mut first_error);
                continue;
            }
        };
        record_rollback_error(
            remove_file_if_identity(&artifact.parent, &artifact.temporary_name, identity)
                .map(|_| ()),
            &mut first_error,
        );
        record_rollback_error(sync_directory(&artifact.parent), &mut first_error);
    }
    for directory in created_directories.iter().rev() {
        record_rollback_error(remove_directory_if_identity(directory), &mut first_error);
        record_rollback_error(sync_directory(&directory.parent), &mut first_error);
    }
    first_error.map_or(Ok(()), Err)
}

#[cfg(unix)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct UnixIdentity {
    device: u64,
    inode: u64,
}

#[cfg(unix)]
fn metadata_identity(metadata: &cap_std::fs::Metadata) -> UnixIdentity {
    UnixIdentity {
        device: metadata.dev(),
        inode: metadata.ino(),
    }
}

#[cfg(unix)]
fn file_identity(file: &cap_std::fs::File) -> io::Result<UnixIdentity> {
    file.metadata().map(|metadata| metadata_identity(&metadata))
}

#[cfg(unix)]
fn entry_identity(parent: &Dir, name: &OsStr) -> io::Result<Option<UnixIdentity>> {
    match parent.symlink_metadata(name) {
        Ok(metadata) => Ok(Some(metadata_identity(&metadata))),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error),
    }
}

#[cfg(unix)]
fn remove_installed_artifact(artifact: &StagedMigrationArtifact) -> io::Result<()> {
    remove_file_if_identity(
        &artifact.parent,
        &artifact.target_name,
        file_identity(&artifact.file)?,
    )
    .map(|_| ())
}

/// Atomically captures a pathname and only unlinks the captured entry after its Unix identity has
/// been checked again. A replacement is restored with a no-clobber hard link.
#[cfg(unix)]
fn remove_file_if_identity(parent: &Dir, name: &OsStr, expected: UnixIdentity) -> io::Result<bool> {
    if entry_identity(parent, name)? != Some(expected) {
        return Ok(false);
    }
    let captured_name = vacant_temporary_name(parent)?;
    match parent.rename(name, parent, &captured_name) {
        Ok(()) => {}
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(false),
        Err(error) => return Err(error),
    }
    if entry_identity(parent, &captured_name)? == Some(expected) {
        parent.remove_file(&captured_name)?;
        Ok(true)
    } else {
        // If the original name was concurrently occupied, hard_link fails without replacing it.
        // Even after a successful restore, retain the captured link: its inode is a replacement,
        // not one created by this transaction, so rollback must never unlink that pathname.
        parent.hard_link(&captured_name, parent, name)?;
        Ok(false)
    }
}

#[cfg(unix)]
fn remove_directory_if_identity(directory: &CreatedMigrationDirectory) -> io::Result<()> {
    remove_directory_entry_if_identity(&directory.parent, &directory.name, directory.identity)
}

#[cfg(unix)]
fn rollback_created_directory(
    parent: &Dir,
    name: &OsStr,
    expected: UnixIdentity,
) -> io::Result<()> {
    let mut first_error = None;
    record_rollback_error(
        remove_directory_entry_if_identity(parent, name, expected),
        &mut first_error,
    );
    record_rollback_error(sync_directory(parent), &mut first_error);
    first_error.map_or(Ok(()), Err)
}

#[cfg(unix)]
fn remove_directory_entry_if_identity(
    parent: &Dir,
    name: &OsStr,
    expected: UnixIdentity,
) -> io::Result<()> {
    if entry_identity(parent, name)? != Some(expected) {
        return Ok(());
    }
    let captured_name = vacant_temporary_name(parent)?;
    match parent.rename(name, parent, &captured_name) {
        Ok(()) => {}
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error),
    }
    if entry_identity(parent, &captured_name)? == Some(expected) {
        parent.remove_dir(&captured_name)
    } else {
        // Directory hard links are unavailable. Restore only while the original name is vacant;
        // otherwise retain the captured replacement under its private name.
        if entry_identity(parent, name)?.is_none() {
            parent.rename(&captured_name, parent, name)?;
        }
        Ok(())
    }
}

#[cfg(unix)]
fn set_migration_directory_permissions(directory: &Dir) -> io::Result<()> {
    directory.set_permissions(".", Permissions::from_mode(0o700))
}

#[cfg(unix)]
fn set_migration_file_permissions(file: &cap_std::fs::File) -> io::Result<()> {
    file.set_permissions(Permissions::from_mode(0o600))
}

#[cfg(unix)]
fn record_rollback_error(result: io::Result<()>, first_error: &mut Option<io::Error>) {
    if let Err(error) = result {
        if first_error.is_none() {
            *first_error = Some(error);
        }
    }
}

/// Creates a directory (and any missing ancestors) below the workspace root.
///
/// Existing directories make this operation idempotent. Existing symlinks are never followed,
/// including symlinks that happen to point back inside the workspace.
pub fn create_org_directory(
    workspace_root: impl AsRef<Path>,
    relative_path: impl AsRef<Path>,
) -> OrgFilesystemResult<()> {
    let root = open_workspace_capability(workspace_root.as_ref())?;
    create_org_directory_with_capability(&root, relative_path)
}

/// Creates a directory relative to an already-approved workspace capability.
pub fn create_org_directory_with_capability(
    root: &Dir,
    relative_path: impl AsRef<Path>,
) -> OrgFilesystemResult<()> {
    let _mutation_guard = lock_org_mutations()?;
    let relative = validate_relative_directory_path(relative_path.as_ref())?;
    let display_path = portable_relative_path(&relative)?;
    let mut parent = root.try_clone()?;

    for component in relative.components() {
        let Component::Normal(name) = component else {
            return Err(OrgFilesystemError::InvalidPath(display_path));
        };
        match parent.symlink_metadata(name) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() {
                    return Err(OrgFilesystemError::OutsideWorkspace(display_path));
                }
                if !metadata.is_dir() {
                    return Err(OrgFilesystemError::InvalidPath(display_path));
                }
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => {
                parent.create_dir(name)?;
                sync_directory(&parent)?;
            }
            Err(error) => return Err(error.into()),
        }
        // `open_dir` resolves against the pinned parent handle. Even if `name` is exchanged after
        // the metadata check, cap-std cannot follow the replacement outside this capability tree.
        parent = parent.open_dir(name)?;
    }

    Ok(())
}

/// Moves an Org document after checking its source revision, without replacing a target.
///
/// A hard link followed by source removal provides no-clobber behavior on all supported platforms:
/// creating the destination fails if any filesystem entry already has that name.
pub fn move_org_document(
    workspace_root: impl AsRef<Path>,
    source_relative_path: impl AsRef<Path>,
    target_relative_path: impl AsRef<Path>,
    expected_source_revision: &str,
) -> OrgFilesystemResult<OrgWriteResult> {
    let root = open_workspace_capability(workspace_root.as_ref())?;
    move_org_document_with_capability(
        &root,
        source_relative_path,
        target_relative_path,
        expected_source_revision,
    )
}

#[cfg(target_os = "linux")]
fn rename_noreplace(
    source_parent: &Dir,
    source_name: &OsStr,
    target_parent: &Dir,
    target_name: &OsStr,
) -> io::Result<()> {
    let source = CString::new(source_name.as_bytes())
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "source contains NUL"))?;
    let target = CString::new(target_name.as_bytes())
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "target contains NUL"))?;
    // Linux renameat2 with RENAME_NOREPLACE is one atomic no-clobber namespace operation. Unlike
    // check-then-unlink rollback, it can never remove a concurrently installed replacement.
    let result = unsafe {
        libc::syscall(
            libc::SYS_renameat2,
            source_parent.as_raw_fd(),
            source.as_ptr(),
            target_parent.as_raw_fd(),
            target.as_ptr(),
            libc::RENAME_NOREPLACE,
        )
    };
    if result == 0 {
        Ok(())
    } else {
        Err(io::Error::last_os_error())
    }
}

#[cfg(target_os = "macos")]
fn rename_noreplace(
    source_parent: &Dir,
    source_name: &OsStr,
    target_parent: &Dir,
    target_name: &OsStr,
) -> io::Result<()> {
    let source = CString::new(source_name.as_bytes())
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "source contains NUL"))?;
    let target = CString::new(target_name.as_bytes())
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "target contains NUL"))?;
    // Darwin's renameatx_np(RENAME_EXCL) is the atomic no-clobber equivalent of renameat2.
    let result = unsafe {
        libc::renameatx_np(
            source_parent.as_raw_fd(),
            source.as_ptr(),
            target_parent.as_raw_fd(),
            target.as_ptr(),
            libc::RENAME_EXCL,
        )
    };
    if result == 0 {
        Ok(())
    } else {
        Err(io::Error::last_os_error())
    }
}

#[cfg(target_os = "linux")]
fn move_org_document_linux(
    root: &Dir,
    source_relative_path: &Path,
    target_relative_path: &Path,
    expected_source_revision: &str,
) -> OrgFilesystemResult<OrgWriteResult> {
    let _mutation_guard = lock_org_mutations()?;
    let source_relative = validate_relative_org_path(source_relative_path)?;
    let target_relative = validate_relative_org_path(target_relative_path)?;
    let source_display = portable_relative_path(&source_relative)?;
    let target_display = portable_relative_path(&target_relative)?;
    let (source_parent, source_name) =
        resolve_document_parent(root, &source_relative, &source_display)?;
    let (target_parent, target_name) =
        resolve_document_parent(root, &target_relative, &target_display)?;

    let (source_revision, _) = current_file_state(&source_parent, &source_name, &source_display)?;
    let actual =
        source_revision.ok_or_else(|| OrgFilesystemError::NotFound(source_display.clone()))?;
    if actual != expected_source_revision {
        return Err(OrgFilesystemError::RevisionConflict {
            path: source_display,
            expected: expected_source_revision.to_owned(),
            actual,
        });
    }

    if let Err(error) = rename_noreplace(&source_parent, &source_name, &target_parent, &target_name)
    {
        return Err(if error.raw_os_error() == Some(libc::EEXIST) {
            OrgFilesystemError::TargetExists(target_display)
        } else if error.raw_os_error() == Some(libc::ENOENT) {
            OrgFilesystemError::NotFound(source_display)
        } else {
            OrgFilesystemError::Io(error)
        });
    }

    let (moved_revision, _) = current_file_state(&target_parent, &target_name, &target_display)?;
    let moved = moved_revision.unwrap_or_else(|| "<missing>".to_owned());
    if moved != expected_source_revision {
        // Never move the target back by pathname: an external process may already have replaced
        // it. The atomic forward rename remains visible at the requested target for recovery.
        return Err(OrgFilesystemError::RevisionConflict {
            path: source_display,
            expected: expected_source_revision.to_owned(),
            actual: moved,
        });
    }

    if let Err(sync_error) =
        sync_directory(&target_parent).and_then(|_| sync_directory(&source_parent))
    {
        // The rename already completed atomically. A pathname rollback here could relocate an
        // unrelated concurrent replacement, so preserve the visible target and report failure.
        return Err(OrgFilesystemError::Io(sync_error));
    }

    Ok(OrgWriteResult {
        relative_path: target_display,
        revision: moved,
    })
}

/// Moves one Org document relative to an already-approved workspace capability.
pub fn move_org_document_with_capability(
    root: &Dir,
    source_relative_path: impl AsRef<Path>,
    target_relative_path: impl AsRef<Path>,
    expected_source_revision: &str,
) -> OrgFilesystemResult<OrgWriteResult> {
    #[cfg(target_os = "linux")]
    return move_org_document_linux(
        root,
        source_relative_path.as_ref(),
        target_relative_path.as_ref(),
        expected_source_revision,
    );

    #[cfg(not(target_os = "linux"))]
    return Err(OrgFilesystemError::UnsupportedPlatform(
        "identity-safe document moves currently require Linux renameat2".to_owned(),
    ));
}

/// Deletes an Org document after checking its current revision.
pub fn delete_org_document(
    workspace_root: impl AsRef<Path>,
    relative_path: impl AsRef<Path>,
    expected_revision: &str,
) -> OrgFilesystemResult<()> {
    let root = open_workspace_capability(workspace_root.as_ref())?;
    delete_org_document_with_capability(&root, relative_path, expected_revision)
}

/// Deletes one Org document relative to an already-approved workspace capability.
pub fn delete_org_document_with_capability(
    root: &Dir,
    relative_path: impl AsRef<Path>,
    expected_revision: &str,
) -> OrgFilesystemResult<()> {
    let _mutation_guard = lock_org_mutations()?;
    let relative = validate_relative_org_path(relative_path.as_ref())?;
    let display_path = portable_relative_path(&relative)?;
    let (parent, target_name) = resolve_document_parent(&root, &relative, &display_path)?;
    let (current_revision, _) = current_file_state(&parent, &target_name, &display_path)?;
    let actual =
        current_revision.ok_or_else(|| OrgFilesystemError::NotFound(display_path.clone()))?;
    if expected_revision != actual {
        return Err(OrgFilesystemError::RevisionConflict {
            path: display_path,
            expected: expected_revision.to_owned(),
            actual,
        });
    }

    let tombstone_name = vacant_temporary_name(&parent)?;
    parent.rename(&target_name, &parent, &tombstone_name)?;
    let (captured_revision, _) = match current_file_state(&parent, &tombstone_name, &display_path) {
        Ok(state) => state,
        Err(error) => {
            restore_captured_file(&parent, &tombstone_name, &parent, &target_name)?;
            return Err(error);
        }
    };
    let captured = captured_revision.unwrap_or_else(|| "<missing>".to_owned());
    if captured != expected_revision {
        restore_captured_file(&parent, &tombstone_name, &parent, &target_name)?;
        return Err(OrgFilesystemError::RevisionConflict {
            path: display_path,
            expected: expected_revision.to_owned(),
            actual: captured,
        });
    }

    parent.remove_file(tombstone_name)?;
    sync_directory(&parent)?;
    Ok(())
}

fn create_temporary_file(parent: &Dir) -> io::Result<(OsString, cap_std::fs::File)> {
    loop {
        let name = random_temporary_name();
        let options = OpenOptions::new().write(true).create_new(true).clone();
        match parent.open_with(&name, &options) {
            Ok(file) => return Ok((name, file)),
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error),
        }
    }
}

fn vacant_temporary_name(parent: &Dir) -> io::Result<OsString> {
    loop {
        let name = random_temporary_name();
        match parent.symlink_metadata(&name) {
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(name),
            Ok(_) => continue,
            Err(error) => return Err(error),
        }
    }
}

fn random_temporary_name() -> OsString {
    OsString::from(format!(".grain-{}.tmp", uuid::Uuid::new_v4()))
}

/// Restores a captured inode without replacing an entry created concurrently at `target`.
fn restore_captured_file(
    captured_dir: &Dir,
    captured: &OsStr,
    target_dir: &Dir,
    target: &OsStr,
) -> OrgFilesystemResult<()> {
    captured_dir.hard_link(captured, target_dir, target)?;
    captured_dir.remove_file(captured)?;
    Ok(())
}

fn lock_org_mutations() -> OrgFilesystemResult<OrgMutationGuard> {
    let guard = ORG_WRITE_LOCK
        .lock()
        .map_err(|_| io::Error::other("Org filesystem mutation lock is poisoned"))?;
    ORG_MUTATION_GENERATION.fetch_add(1, Ordering::SeqCst);
    Ok(OrgMutationGuard { _guard: guard })
}

fn open_workspace_capability(root: &Path) -> OrgFilesystemResult<Dir> {
    Dir::open_ambient_dir(root, ambient_authority()).map_err(OrgFilesystemError::Io)
}

fn read_capability_file_utf8_limited(
    root: &Dir,
    relative: &Path,
    display_path: &str,
    byte_limit: u64,
) -> OrgFilesystemResult<String> {
    let (parent, file_name) = resolve_no_symlink_parent(root, relative, display_path)?;
    let metadata = parent
        .symlink_metadata(&file_name)
        .map_err(|error| map_not_found(error, display_path))?;
    if metadata.file_type().is_symlink() {
        return Err(OrgFilesystemError::OutsideWorkspace(
            display_path.to_owned(),
        ));
    }
    if !metadata.is_file() {
        return Err(OrgFilesystemError::NotFound(display_path.to_owned()));
    }

    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    options.custom_flags(libc::O_NOFOLLOW);
    let mut file = parent
        .open_with(&file_name, &options)
        .map_err(|error| map_not_found(error, display_path))?;
    let opened_metadata = file.metadata()?;
    if !opened_metadata.is_file() {
        return Err(OrgFilesystemError::InvalidPath(display_path.to_owned()));
    }
    if opened_metadata.len() > byte_limit {
        return Err(OrgFilesystemError::FileTooLarge(display_path.to_owned()));
    }

    let mut bytes = Vec::with_capacity(opened_metadata.len() as usize);
    Read::by_ref(&mut file)
        .take(byte_limit.saturating_add(1))
        .read_to_end(&mut bytes)?;
    if bytes.len() as u64 > byte_limit {
        return Err(OrgFilesystemError::FileTooLarge(display_path.to_owned()));
    }
    String::from_utf8(bytes).map_err(|_| OrgFilesystemError::InvalidUtf8(display_path.to_owned()))
}

fn resolve_no_symlink_parent(
    root: &Dir,
    relative: &Path,
    display_path: &str,
) -> OrgFilesystemResult<(Dir, OsString)> {
    let mut parent = root.try_clone()?;
    let parent_path = relative
        .parent()
        .ok_or_else(|| OrgFilesystemError::InvalidPath(display_path.to_owned()))?;
    for component in parent_path.components() {
        let Component::Normal(name) = component else {
            return Err(OrgFilesystemError::InvalidPath(display_path.to_owned()));
        };
        let metadata = parent
            .symlink_metadata(name)
            .map_err(|error| map_not_found(error, display_path))?;
        if metadata.file_type().is_symlink() {
            return Err(OrgFilesystemError::OutsideWorkspace(
                display_path.to_owned(),
            ));
        }
        if !metadata.is_dir() {
            return Err(OrgFilesystemError::InvalidPath(display_path.to_owned()));
        }

        #[cfg(unix)]
        {
            let mut options = OpenOptions::new();
            options
                .read(true)
                .custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW);
            let directory = parent
                .open_with(name, &options)
                .map_err(|error| map_not_found(error, display_path))?;
            parent = Dir::from_std_file(directory.into_std());
        }
        #[cfg(not(unix))]
        {
            parent = parent
                .open_dir(name)
                .map_err(|error| map_not_found(error, display_path))?;
        }
    }
    let file_name = relative
        .file_name()
        .ok_or_else(|| OrgFilesystemError::InvalidPath(display_path.to_owned()))?
        .to_os_string();
    Ok((parent, file_name))
}

fn resolve_document_parent(
    root: &Dir,
    relative: &Path,
    display_path: &str,
) -> OrgFilesystemResult<(Dir, OsString)> {
    let mut parent = root.try_clone()?;
    let parent_path = relative
        .parent()
        .ok_or_else(|| OrgFilesystemError::InvalidPath(display_path.to_owned()))?;
    for component in parent_path.components() {
        let Component::Normal(name) = component else {
            return Err(OrgFilesystemError::InvalidPath(display_path.to_owned()));
        };
        match parent.symlink_metadata(name) {
            Ok(metadata) if metadata.file_type().is_symlink() => {
                return Err(OrgFilesystemError::OutsideWorkspace(
                    display_path.to_owned(),
                ));
            }
            Ok(metadata) if metadata.is_dir() => {}
            Ok(_) => return Err(OrgFilesystemError::InvalidPath(display_path.to_owned())),
            Err(error) => return Err(map_not_found(error, display_path)),
        }
        parent = parent.open_dir(name).map_err(OrgFilesystemError::Io)?;
    }
    let file_name = relative
        .file_name()
        .ok_or_else(|| OrgFilesystemError::InvalidPath(display_path.to_owned()))?
        .to_os_string();
    Ok((parent, file_name))
}

fn current_file_state(
    parent: &Dir,
    target: &OsStr,
    display_path: &str,
) -> OrgFilesystemResult<(Option<String>, Option<Permissions>)> {
    match parent.symlink_metadata(target) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() {
                return Err(OrgFilesystemError::InvalidPath(format!(
                    "{} is a symlink",
                    display_path
                )));
            }
            if !metadata.is_file() {
                return Err(OrgFilesystemError::InvalidPath(display_path.to_owned()));
            }
            let bytes = parent.read(target)?;
            std::str::from_utf8(&bytes)
                .map_err(|_| OrgFilesystemError::InvalidUtf8(display_path.to_owned()))?;
            Ok((Some(revision(&bytes)), Some(metadata.permissions())))
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok((None, None)),
        Err(error) => Err(error.into()),
    }
}

#[cfg(unix)]
fn sync_directory(directory: &Dir) -> io::Result<()> {
    directory.open(".")?.sync_all()
}

#[cfg(not(unix))]
fn sync_directory(_directory: &Dir) -> io::Result<()> {
    Ok(())
}

pub(crate) fn validate_relative_org_path(path: &Path) -> OrgFilesystemResult<PathBuf> {
    let path = validate_relative_directory_path(path)?;
    if path.extension().and_then(|extension| extension.to_str()) != Some("org") {
        return Err(OrgFilesystemError::InvalidPath(format!(
            "only .org documents are allowed: {}",
            path.display()
        )));
    }
    Ok(path)
}

fn validate_relative_directory_path(path: &Path) -> OrgFilesystemResult<PathBuf> {
    if path.as_os_str().is_empty()
        || path.is_absolute()
        || path
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(OrgFilesystemError::InvalidPath(path.display().to_string()));
    }
    // Validate that command payload paths can be represented by the portable API format.
    portable_relative_path(path)?;
    Ok(path.to_path_buf())
}

/// Validates the portable path spelling as well as its platform path components. In particular,
/// checking the original string prevents `Path::components` from normalizing away `.` or repeated
/// separators before they can be rejected.
fn validate_portable_relative_path(path: &Path) -> OrgFilesystemResult<PathBuf> {
    let display = path
        .to_str()
        .ok_or_else(|| OrgFilesystemError::InvalidPath("path is not valid UTF-8".to_owned()))?;
    let first_component = display.split('/').next().unwrap_or_default();
    let has_windows_drive_prefix = first_component.as_bytes().get(1) == Some(&b':')
        && first_component
            .as_bytes()
            .first()
            .is_some_and(u8::is_ascii_alphabetic);
    if display.contains('\\')
        || display.starts_with('/')
        || display.ends_with('/')
        || has_windows_drive_prefix
        || display
            .split('/')
            .any(|component| component.is_empty() || component == "." || component == "..")
    {
        return Err(OrgFilesystemError::InvalidPath(display.to_owned()));
    }
    validate_relative_directory_path(path)
}

fn read_open_file_utf8(
    mut file: cap_std::fs::File,
    relative_path: &str,
) -> OrgFilesystemResult<String> {
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)?;
    String::from_utf8(bytes).map_err(|_| OrgFilesystemError::InvalidUtf8(relative_path.to_owned()))
}

fn revision(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

fn portable_relative_path(path: &Path) -> OrgFilesystemResult<String> {
    let mut parts = Vec::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => parts.push(part.to_str().ok_or_else(|| {
                OrgFilesystemError::InvalidPath("path is not valid UTF-8".to_owned())
            })?),
            _ => return Err(OrgFilesystemError::InvalidPath(path.display().to_string())),
        }
    }
    Ok(parts.join("/"))
}

fn map_not_found(error: io::Error, path: &str) -> OrgFilesystemError {
    if error.kind() == io::ErrorKind::NotFound {
        OrgFilesystemError::NotFound(path.to_owned())
    } else {
        OrgFilesystemError::Io(error)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn recovery_manifest(root: &str, mut backups: serde_json::Value) -> String {
        if let Some(items) = backups.as_array_mut() {
            for item in items {
                if let Some(metadata) = item.as_object_mut() {
                    metadata
                        .entry("version".to_owned())
                        .or_insert_with(|| serde_json::json!("1"));
                    metadata
                        .entry("createdAt".to_owned())
                        .or_insert_with(|| serde_json::json!("1"));
                    metadata
                        .entry("updatedAt".to_owned())
                        .or_insert_with(|| serde_json::json!("2"));
                }
            }
        }
        format!(
            "{}\n",
            serde_json::to_string_pretty(&serde_json::json!({
                "rootDirectory": root,
                "rawBackups": backups,
                "version": 1,
                "ignored": { "largeSchemaNotRequired": true }
            }))
            .unwrap()
        )
    }

    #[test]
    fn recovery_bundle_preserves_manifest_order_and_exact_empty_content() {
        let workspace = tempdir().unwrap();
        let migration_root = workspace.path().join("Book");
        let backup_root = migration_root.join(MIGRATION_RAW_BACKUP_DIRECTORY);
        fs::create_dir_all(&backup_root).unwrap();
        fs::write(backup_root.join("empty.text.txt"), "").unwrap();
        fs::write(backup_root.join("drawing.json"), "{\n  \"x\": 1\n}\n").unwrap();
        let manifest_without_sql = recovery_manifest(
            "Book",
            serde_json::json!([
                {
                    "path": "Book/_migration-raw-backups/empty.text.txt",
                    "contentId": "empty",
                    "contentType": "text",
                    "nodeId": "node-2"
                },
                {
                    "path": "Book/_migration-raw-backups/drawing.json",
                    "contentId": "drawing",
                    "contentType": "excalidraw",
                    "nodeId": "node-1"
                }
            ]),
        );
        let mut manifest_value: serde_json::Value =
            serde_json::from_str(&manifest_without_sql).unwrap();
        manifest_value["recoverySqlPath"] = serde_json::json!("Book/legacy-contents-recovery.sql");
        let manifest = format!(
            "{}\n",
            serde_json::to_string_pretty(&manifest_value).unwrap()
        );
        fs::write(migration_root.join(MIGRATION_MANIFEST_FILE), &manifest).unwrap();
        fs::write(
            migration_root.join("legacy-contents-recovery.sql"),
            "BEGIN;\nCOMMIT;\n",
        )
        .unwrap();
        let capability = open_workspace_capability(workspace.path()).unwrap();

        let bundle = read_org_migration_recovery_bundle_with_capability(
            &capability,
            "Book/migration-manifest.json",
        )
        .unwrap();

        assert_eq!(bundle.manifest, manifest);
        assert_eq!(bundle.raw_backups.len(), 2);
        assert_eq!(bundle.raw_backups[0].content_id, "empty");
        assert_eq!(bundle.raw_backups[0].content, "");
        assert_eq!(bundle.raw_backups[1].content, "{\n  \"x\": 1\n}\n");
        assert_eq!(bundle.recovery_sql.as_deref(), Some("BEGIN;\nCOMMIT;\n"));
    }

    #[test]
    fn recovery_bundle_rejects_unsafe_manifest_paths() {
        let workspace = tempdir().unwrap();
        let capability = open_workspace_capability(workspace.path()).unwrap();
        for path in [
            "../migration-manifest.json",
            "Book/./migration-manifest.json",
            "Book//migration-manifest.json",
            "Book\\migration-manifest.json",
            "C:/Book/migration-manifest.json",
            "Book/not-migration-manifest.json",
        ] {
            assert!(matches!(
                read_org_migration_recovery_bundle_with_capability(&capability, path),
                Err(OrgFilesystemError::InvalidPath(_))
            ));
        }
        let absolute = workspace.path().join(MIGRATION_MANIFEST_FILE);
        assert!(matches!(
            read_org_migration_recovery_bundle_with_capability(&capability, absolute),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
    }

    #[test]
    fn recovery_bundle_rejects_wrong_root_duplicate_traversal_and_malformed_manifest() {
        let workspace = tempdir().unwrap();
        let migration_root = workspace.path().join("Book");
        fs::create_dir_all(&migration_root).unwrap();
        let manifest_path = migration_root.join(MIGRATION_MANIFEST_FILE);
        let capability = open_workspace_capability(workspace.path()).unwrap();

        fs::write(
            &manifest_path,
            recovery_manifest("Other", serde_json::json!([])),
        )
        .unwrap();
        assert!(matches!(
            read_org_migration_recovery_bundle_with_capability(
                &capability,
                "Book/migration-manifest.json"
            ),
            Err(OrgFilesystemError::InvalidManifest(_))
        ));

        let duplicate = serde_json::json!([{
            "path": "Book/_migration-raw-backups/a.txt",
            "contentId": "a",
            "contentType": "text",
            "nodeId": "n"
        }, {
            "path": "Book/_migration-raw-backups/a.txt",
            "contentId": "b",
            "contentType": "text",
            "nodeId": "n"
        }]);
        fs::write(&manifest_path, recovery_manifest("Book", duplicate)).unwrap();
        assert!(matches!(
            read_org_migration_recovery_bundle_with_capability(
                &capability,
                "Book/migration-manifest.json"
            ),
            Err(OrgFilesystemError::InvalidManifest(_))
        ));

        let traversal = serde_json::json!([{
            "path": "Book/_migration-raw-backups/../../secret",
            "contentId": "a",
            "contentType": "text",
            "nodeId": "n"
        }]);
        fs::write(&manifest_path, recovery_manifest("Book", traversal)).unwrap();
        assert!(matches!(
            read_org_migration_recovery_bundle_with_capability(
                &capability,
                "Book/migration-manifest.json"
            ),
            Err(OrgFilesystemError::InvalidPath(_))
        ));

        fs::write(&manifest_path, "{not json").unwrap();
        assert!(matches!(
            read_org_migration_recovery_bundle_with_capability(
                &capability,
                "Book/migration-manifest.json"
            ),
            Err(OrgFilesystemError::InvalidManifest(_))
        ));
    }

    #[cfg(unix)]
    #[test]
    fn recovery_bundle_rejects_symlink_components_and_files() {
        use std::os::unix::fs::symlink;

        let workspace = tempdir().unwrap();
        let migration_root = workspace.path().join("Book");
        let real_backups = migration_root.join("real-backups");
        fs::create_dir_all(&real_backups).unwrap();
        fs::write(real_backups.join("backup.txt"), "secret").unwrap();
        symlink(
            &real_backups,
            migration_root.join(MIGRATION_RAW_BACKUP_DIRECTORY),
        )
        .unwrap();
        let backup = serde_json::json!([{
            "path": "Book/_migration-raw-backups/backup.txt",
            "contentId": "a",
            "contentType": "text",
            "nodeId": "n"
        }]);
        fs::write(
            migration_root.join(MIGRATION_MANIFEST_FILE),
            recovery_manifest("Book", backup),
        )
        .unwrap();
        let capability = open_workspace_capability(workspace.path()).unwrap();
        assert!(matches!(
            read_org_migration_recovery_bundle_with_capability(
                &capability,
                "Book/migration-manifest.json"
            ),
            Err(OrgFilesystemError::OutsideWorkspace(_))
        ));

        fs::remove_file(migration_root.join(MIGRATION_RAW_BACKUP_DIRECTORY)).unwrap();
        fs::create_dir(migration_root.join(MIGRATION_RAW_BACKUP_DIRECTORY)).unwrap();
        symlink(
            real_backups.join("backup.txt"),
            migration_root
                .join(MIGRATION_RAW_BACKUP_DIRECTORY)
                .join("backup.txt"),
        )
        .unwrap();
        assert!(matches!(
            read_org_migration_recovery_bundle_with_capability(
                &capability,
                "Book/migration-manifest.json"
            ),
            Err(OrgFilesystemError::OutsideWorkspace(_))
        ));
    }

    #[test]
    fn recovery_bundle_rejects_oversized_manifest() {
        let workspace = tempdir().unwrap();
        let migration_root = workspace.path().join("Book");
        fs::create_dir_all(&migration_root).unwrap();
        fs::write(
            migration_root.join(MIGRATION_MANIFEST_FILE),
            vec![b' '; MAX_MIGRATION_MANIFEST_BYTES as usize + 1],
        )
        .unwrap();
        let capability = open_workspace_capability(workspace.path()).unwrap();
        assert!(matches!(
            read_org_migration_recovery_bundle_with_capability(
                &capability,
                "Book/migration-manifest.json"
            ),
            Err(OrgFilesystemError::FileTooLarge(_))
        ));
    }

    #[test]
    fn roundtrip_preserves_raw_content_and_revision() {
        let workspace = tempdir().unwrap();
        let content = "#+title: Notes\r\n* Heading\r\n  exact whitespace  \r\n";

        let written = write_org_document(workspace.path(), "notes.org", content, None).unwrap();
        let read = read_org_document(workspace.path(), "notes.org").unwrap();

        assert_eq!(read.content, content);
        assert_eq!(read.relative_path, "notes.org");
        assert_eq!(read.revision, written.revision);
    }

    #[test]
    fn unknown_org_syntax_is_preserved() {
        let workspace = tempdir().unwrap();
        let content = "#+future_extension: ☃\n* TODO [#A] Strange :tag:\n:PROPERTIES:\n:X-UNKNOWN: a\\tb\n:END:\n";
        write_org_document(workspace.path(), "unknown.org", content, None).unwrap();

        let document = read_org_document(workspace.path(), "unknown.org").unwrap();
        assert_eq!(document.content.as_bytes(), content.as_bytes());
    }

    #[test]
    fn traversal_and_absolute_paths_are_rejected() {
        let workspace = tempdir().unwrap();
        for path in ["../escape.org", "nested/../../escape.org"] {
            assert!(matches!(
                read_org_document(workspace.path(), path),
                Err(OrgFilesystemError::InvalidPath(_))
            ));
            assert!(matches!(
                write_org_document(workspace.path(), path, "bad", None),
                Err(OrgFilesystemError::InvalidPath(_))
            ));
        }

        let absolute = workspace.path().join("absolute.org");
        assert!(matches!(
            write_org_document(workspace.path(), absolute, "bad", None),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
    }

    #[test]
    fn non_org_paths_are_rejected() {
        let workspace = tempdir().unwrap();
        assert!(matches!(
            write_org_document(workspace.path(), "notes.txt", "bad", None),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
        fs::write(workspace.path().join("notes.txt"), "text").unwrap();
        assert!(matches!(
            read_org_document(workspace.path(), "notes.txt"),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
    }

    #[test]
    fn stale_revision_causes_conflict_without_changing_file() {
        let workspace = tempdir().unwrap();
        let first = write_org_document(workspace.path(), "notes.org", "first", None).unwrap();
        write_org_document(
            workspace.path(),
            "notes.org",
            "second",
            Some(&first.revision),
        )
        .unwrap();

        assert!(matches!(
            write_org_document(
                workspace.path(),
                "notes.org",
                "stale write",
                Some(&first.revision)
            ),
            Err(OrgFilesystemError::RevisionConflict { .. })
        ));
        assert_eq!(
            read_org_document(workspace.path(), "notes.org")
                .unwrap()
                .content,
            "second"
        );
    }

    #[test]
    fn concurrent_writes_with_same_revision_allow_only_one_commit() {
        use std::sync::{Arc, Barrier};
        use std::thread;

        let workspace = tempdir().unwrap();
        let initial = write_org_document(workspace.path(), "notes.org", "initial", None).unwrap();
        let root = Arc::new(workspace.path().to_path_buf());
        let barrier = Arc::new(Barrier::new(3));

        let handles: Vec<_> = ["first", "second"]
            .into_iter()
            .map(|content| {
                let root = Arc::clone(&root);
                let barrier = Arc::clone(&barrier);
                let expected = initial.revision.clone();
                thread::spawn(move || {
                    barrier.wait();
                    write_org_document(root.as_path(), "notes.org", content, Some(&expected))
                })
            })
            .collect();
        barrier.wait();

        let results: Vec<_> = handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .collect();
        assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
        assert_eq!(
            results
                .iter()
                .filter(|result| matches!(result, Err(OrgFilesystemError::RevisionConflict { .. })))
                .count(),
            1
        );
    }

    #[test]
    fn workspace_scan_returns_sorted_documents_and_directories_including_empty_ones() {
        let workspace = tempdir().unwrap();
        fs::create_dir_all(workspace.path().join("z-empty")).unwrap();
        fs::create_dir_all(workspace.path().join("deep/nested")).unwrap();
        fs::create_dir_all(workspace.path().join("alpha")).unwrap();
        fs::write(workspace.path().join("z-last.org"), "last").unwrap();
        fs::write(workspace.path().join("alpha/first.org"), "first").unwrap();
        fs::write(workspace.path().join("deep/nested/middle.org"), "middle").unwrap();
        fs::write(workspace.path().join("deep/ignored.txt"), "ignored").unwrap();

        let snapshot = scan_org_workspace(workspace.path()).unwrap();
        let document_paths: Vec<_> = snapshot
            .documents
            .iter()
            .map(|document| document.relative_path.as_str())
            .collect();

        assert_eq!(
            document_paths,
            ["alpha/first.org", "deep/nested/middle.org", "z-last.org"]
        );
        assert_eq!(
            snapshot.directories,
            ["alpha", "deep", "deep/nested", "z-empty"]
        );
        assert_eq!(
            scan_org_documents(workspace.path()).unwrap(),
            snapshot.documents
        );
    }

    #[cfg(unix)]
    #[test]
    fn workspace_scan_ignores_symlink_directories() {
        use std::os::unix::fs::symlink;

        let workspace = tempdir().unwrap();
        let outside = tempdir().unwrap();
        fs::create_dir_all(workspace.path().join("real/nested")).unwrap();
        fs::write(workspace.path().join("real/nested/visible.org"), "visible").unwrap();
        fs::write(outside.path().join("hidden.org"), "hidden").unwrap();
        symlink(outside.path(), workspace.path().join("linked-outside")).unwrap();
        symlink(
            workspace.path().join("real"),
            workspace.path().join("linked-inside"),
        )
        .unwrap();

        let snapshot = scan_org_workspace(workspace.path()).unwrap();
        let document_paths: Vec<_> = snapshot
            .documents
            .into_iter()
            .map(|document| document.relative_path)
            .collect();

        assert_eq!(document_paths, ["real/nested/visible.org"]);
        assert_eq!(snapshot.directories, ["real", "real/nested"]);
    }

    #[test]
    fn lifecycle_operations_create_move_and_delete() {
        let workspace = tempdir().unwrap();
        create_org_directory(workspace.path(), "projects/draft").unwrap();
        assert!(workspace.path().join("projects/draft").is_dir());

        let written = write_org_document(
            workspace.path(),
            "projects/draft/notes.org",
            "content",
            None,
        )
        .unwrap();
        let moved = move_org_document(
            workspace.path(),
            "projects/draft/notes.org",
            "projects/notes.org",
            &written.revision,
        )
        .unwrap();
        assert_eq!(moved.relative_path, "projects/notes.org");
        assert_eq!(moved.revision, written.revision);
        assert!(!workspace.path().join("projects/draft/notes.org").exists());

        delete_org_document(workspace.path(), "projects/notes.org", &moved.revision).unwrap();
        assert!(!workspace.path().join("projects/notes.org").exists());
    }

    #[test]
    fn lifecycle_operations_reject_stale_revisions() {
        let workspace = tempdir().unwrap();
        let written = write_org_document(workspace.path(), "notes.org", "first", None).unwrap();
        let current = write_org_document(
            workspace.path(),
            "notes.org",
            "second",
            Some(&written.revision),
        )
        .unwrap();

        assert!(matches!(
            move_org_document(
                workspace.path(),
                "notes.org",
                "moved.org",
                &written.revision
            ),
            Err(OrgFilesystemError::RevisionConflict { .. })
        ));
        assert!(matches!(
            delete_org_document(workspace.path(), "notes.org", &written.revision),
            Err(OrgFilesystemError::RevisionConflict { .. })
        ));
        assert_eq!(
            read_org_document(workspace.path(), "notes.org")
                .unwrap()
                .revision,
            current.revision
        );
    }

    #[test]
    fn lifecycle_operations_reject_traversal() {
        let workspace = tempdir().unwrap();
        let written = write_org_document(workspace.path(), "notes.org", "content", None).unwrap();

        assert!(matches!(
            create_org_directory(workspace.path(), "../outside"),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
        assert!(matches!(
            move_org_document(
                workspace.path(),
                "notes.org",
                "../outside.org",
                &written.revision
            ),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
        assert!(matches!(
            delete_org_document(workspace.path(), "../outside.org", &written.revision),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
    }

    #[test]
    fn move_does_not_overwrite_an_existing_target() {
        let workspace = tempdir().unwrap();
        let source = write_org_document(workspace.path(), "source.org", "source", None).unwrap();
        write_org_document(workspace.path(), "target.org", "target", None).unwrap();

        assert!(matches!(
            move_org_document(
                workspace.path(),
                "source.org",
                "target.org",
                &source.revision
            ),
            Err(OrgFilesystemError::TargetExists(_))
        ));
        assert_eq!(
            read_org_document(workspace.path(), "source.org")
                .unwrap()
                .content,
            "source"
        );
        assert_eq!(
            read_org_document(workspace.path(), "target.org")
                .unwrap()
                .content,
            "target"
        );
    }

    #[cfg(unix)]
    #[test]
    fn workspace_capability_survives_ambient_root_swap() {
        let parent = tempdir().unwrap();
        let selected = parent.path().join("selected");
        let retained = parent.path().join("retained");
        fs::create_dir(&selected).unwrap();
        fs::write(selected.join("original.org"), "original").unwrap();
        let capability = open_workspace_capability(&selected).unwrap();

        fs::rename(&selected, &retained).unwrap();
        fs::create_dir(&selected).unwrap();
        fs::write(selected.join("replacement.org"), "replacement").unwrap();

        let snapshot = scan_org_workspace_with_capability(&capability).unwrap();
        assert_eq!(snapshot.documents[0].relative_path, "original.org");
        assert_eq!(
            read_org_document_with_capability(&capability, "original.org")
                .unwrap()
                .content,
            "original"
        );
        write_org_document_with_capability(&capability, "created.org", "safe", None).unwrap();
        assert_eq!(
            fs::read_to_string(retained.join("created.org")).unwrap(),
            "safe"
        );
        assert!(!selected.join("created.org").exists());
    }

    #[cfg(unix)]
    #[test]
    fn opened_parent_capability_is_not_redirected_by_symlink_swap() {
        use std::os::unix::fs::symlink;

        let workspace = tempdir().unwrap();
        let outside = tempdir().unwrap();
        fs::create_dir(workspace.path().join("parent")).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let (parent, name) =
            resolve_document_parent(&root, Path::new("parent/notes.org"), "parent/notes.org")
                .unwrap();

        fs::rename(
            workspace.path().join("parent"),
            workspace.path().join("original-parent"),
        )
        .unwrap();
        symlink(outside.path(), workspace.path().join("parent")).unwrap();

        parent.write(&name, "safe").unwrap();
        assert_eq!(
            fs::read_to_string(workspace.path().join("original-parent/notes.org")).unwrap(),
            "safe"
        );
        assert!(!outside.path().join("notes.org").exists());
    }

    #[cfg(unix)]
    #[test]
    fn migration_writes_nested_artifacts_byte_exactly() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let org_content = "#+title: Exact\r\n* heading  \r\n";
        let json_content = "{\n  \"version\": 1,\n  \"note\": \"☃\"\n}\n";

        let result = write_org_migration_with_capability(
            &root,
            vec!["migration".to_owned(), "migration/nested".to_owned()],
            vec![
                OrgMigrationArtifact {
                    relative_path: "migration/nested/document.org".to_owned(),
                    content: org_content.to_owned(),
                },
                OrgMigrationArtifact {
                    relative_path: "migration/manifest.json".to_owned(),
                    content: json_content.to_owned(),
                },
            ],
        )
        .unwrap();

        assert_eq!(
            result.written_paths,
            [
                "migration/nested/document.org",
                "migration/manifest.json",
                "migration/migration-verification.json"
            ]
        );
        assert_eq!(
            result.verification_path,
            "migration/migration-verification.json"
        );
        assert_eq!(
            fs::read(workspace.path().join("migration/nested/document.org")).unwrap(),
            org_content.as_bytes()
        );
        assert_eq!(
            fs::read(workspace.path().join("migration/manifest.json")).unwrap(),
            json_content.as_bytes()
        );
        assert_eq!(
            result.artifacts,
            [
                OrgMigrationArtifactSummary {
                    relative_path: "migration/manifest.json".to_owned(),
                    byte_length: json_content.len() as u64,
                    revision: revision(json_content.as_bytes()),
                },
                OrgMigrationArtifactSummary {
                    relative_path: "migration/nested/document.org".to_owned(),
                    byte_length: org_content.len() as u64,
                    revision: revision(org_content.as_bytes()),
                },
            ]
        );
        let sidecar: OrgMigrationVerificationManifest = serde_json::from_slice(
            &fs::read(workspace.path().join(&result.verification_path)).unwrap(),
        )
        .unwrap();
        assert_eq!(sidecar.artifacts, result.artifacts);
        assert_eq!(
            verify_org_migration_with_capability(
                &root,
                &result.verification_path,
                result.artifacts.clone(),
            )
            .unwrap(),
            OrgMigrationVerificationResult {
                checked_count: 2,
                mismatches: vec![],
            }
        );
    }

    #[cfg(unix)]
    #[test]
    fn migration_verification_reports_modified_and_deleted_artifacts() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let result = write_org_migration_with_capability(
            &root,
            vec!["migration".to_owned()],
            vec![
                OrgMigrationArtifact {
                    relative_path: "migration/modified.json".to_owned(),
                    content: "original".to_owned(),
                },
                OrgMigrationArtifact {
                    relative_path: "migration/deleted.org".to_owned(),
                    content: "delete me".to_owned(),
                },
            ],
        )
        .unwrap();
        fs::write(workspace.path().join("migration/modified.json"), "changed").unwrap();
        fs::remove_file(workspace.path().join("migration/deleted.org")).unwrap();

        let verification =
            verify_org_migration_with_capability(&root, result.verification_path, result.artifacts)
                .unwrap();
        assert_eq!(verification.checked_count, 2);
        assert_eq!(verification.mismatches.len(), 2);
        let modified = verification
            .mismatches
            .iter()
            .find(|mismatch| mismatch.relative_path.ends_with("modified.json"))
            .unwrap();
        assert_eq!(modified.actual_byte_length, Some(7));
        assert_eq!(modified.actual_revision, Some(revision(b"changed")));
        let deleted = verification
            .mismatches
            .iter()
            .find(|mismatch| mismatch.relative_path.ends_with("deleted.org"))
            .unwrap();
        assert_eq!(deleted.actual_byte_length, None);
        assert_eq!(deleted.actual_revision, None);
    }

    #[cfg(unix)]
    #[test]
    fn migration_verification_rejects_a_replaced_empty_sidecar() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let result = write_org_migration_with_capability(
            &root,
            vec!["migration".to_owned()],
            vec![OrgMigrationArtifact {
                relative_path: "migration/document.org".to_owned(),
                content: "* Original\n".to_owned(),
            }],
        )
        .unwrap();
        fs::write(
            workspace.path().join(&result.verification_path),
            b"{\"artifacts\":[]}",
        )
        .unwrap();

        assert!(matches!(
            verify_org_migration_with_capability(
                &root,
                result.verification_path,
                result.artifacts,
            ),
            Err(OrgFilesystemError::InvalidManifest(message))
                if message.contains("do not match the write result")
        ));
    }

    #[test]
    fn migration_verification_rejects_malformed_and_escaping_manifests() {
        let workspace = tempdir().unwrap();
        fs::create_dir(workspace.path().join("migration")).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let sidecar = workspace
            .path()
            .join("migration/migration-verification.json");
        for malformed in [b"".as_slice(), b"{\"artifacts\":[".as_slice()] {
            fs::write(&sidecar, malformed).unwrap();
            assert!(matches!(
                verify_org_migration_with_capability(
                    &root,
                    "migration/migration-verification.json",
                    vec![],
                ),
                Err(OrgFilesystemError::InvalidManifest(_))
            ));
        }

        let escaping_artifact = OrgMigrationArtifactSummary {
            relative_path: "outside.json".to_owned(),
            byte_length: 0,
            revision: revision(b""),
        };
        fs::write(
            sidecar,
            serde_json::to_vec(&OrgMigrationVerificationManifest {
                artifacts: vec![escaping_artifact.clone()],
            })
            .unwrap(),
        )
        .unwrap();
        assert!(matches!(
            verify_org_migration_with_capability(
                &root,
                "migration/migration-verification.json",
                vec![escaping_artifact],
            ),
            Err(OrgFilesystemError::InvalidManifest(_))
        ));
        assert!(matches!(
            verify_org_migration_with_capability(&root, "migration/other.json", vec![]),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
    }

    #[cfg(unix)]
    #[test]
    fn migration_rejects_reserved_verification_path_collision() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        assert!(matches!(
            write_org_migration_with_capability(
                &root,
                vec!["migration".to_owned()],
                vec![OrgMigrationArtifact {
                    relative_path: "migration/migration-verification.json".to_owned(),
                    content: "caller content".to_owned(),
                }],
            ),
            Err(OrgFilesystemError::InvalidPath(message)) if message.contains("reserved")
        ));
        assert!(fs::read_dir(workspace.path()).unwrap().next().is_none());
    }

    #[cfg(unix)]
    #[test]
    fn migration_rejects_an_existing_empty_root_without_merging() {
        let workspace = tempdir().unwrap();
        fs::create_dir(workspace.path().join("migration")).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();

        assert!(matches!(
            write_org_migration_with_capability(
                &root,
                vec!["migration".to_owned(), "migration/nested".to_owned()],
                vec![OrgMigrationArtifact {
                    relative_path: "migration/nested/backup.json".to_owned(),
                    content: "new".to_owned(),
                }],
            ),
            Err(OrgFilesystemError::TargetExists(path)) if path == "migration"
        ));
        assert!(fs::read_dir(workspace.path().join("migration"))
            .unwrap()
            .next()
            .is_none());
    }

    #[cfg(unix)]
    #[test]
    fn migration_root_creation_is_atomic_no_clobber() {
        use std::sync::{Arc, Barrier};
        use std::thread;

        let workspace = tempdir().unwrap();
        let workspace_path = Arc::new(workspace.path().to_path_buf());
        let barrier = Arc::new(Barrier::new(2));
        let contenders: Vec<_> = ["first", "second"]
            .into_iter()
            .map(|content| {
                let workspace_path = Arc::clone(&workspace_path);
                let barrier = Arc::clone(&barrier);
                thread::spawn(move || {
                    let root = open_workspace_capability(&*workspace_path).unwrap();
                    barrier.wait();
                    write_org_migration_with_capability(
                        &root,
                        vec!["migration".to_owned()],
                        vec![OrgMigrationArtifact {
                            relative_path: "migration/winner.json".to_owned(),
                            content: content.to_owned(),
                        }],
                    )
                })
            })
            .collect();
        let results: Vec<_> = contenders
            .into_iter()
            .map(|contender| contender.join().unwrap())
            .collect();

        assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
        assert_eq!(
            results
                .iter()
                .filter(|result| matches!(result, Err(OrgFilesystemError::TargetExists(path)) if path == "migration"))
                .count(),
            1
        );
        let winner = fs::read_to_string(workspace.path().join("migration/winner.json")).unwrap();
        assert!(winner == "first" || winner == "second");
    }

    #[cfg(unix)]
    #[test]
    fn migration_rejects_duplicate_and_colliding_targets() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let artifact = |path: &str| OrgMigrationArtifact {
            relative_path: path.to_owned(),
            content: String::new(),
        };

        assert!(matches!(
            write_org_migration_with_capability(
                &root,
                vec!["same".to_owned(), "same".to_owned()],
                vec![],
            ),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
        assert!(matches!(
            write_org_migration_with_capability(
                &root,
                vec!["same".to_owned()],
                vec![artifact("same")],
            ),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
        assert!(matches!(
            write_org_migration_with_capability(
                &root,
                vec!["file/child".to_owned()],
                vec![artifact("file")],
            ),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
        assert!(matches!(
            write_org_migration_with_capability(
                &root,
                vec!["one".to_owned(), "two".to_owned()],
                vec![artifact("one/a.org"), artifact("two/b.org")],
            ),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
        assert!(fs::read_dir(workspace.path()).unwrap().next().is_none());
    }

    #[cfg(unix)]
    #[test]
    fn migration_uses_owner_only_permissions() {
        use std::os::unix::fs::PermissionsExt as _;

        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        write_org_migration_with_capability(
            &root,
            vec!["migration".to_owned(), "migration/nested".to_owned()],
            vec![OrgMigrationArtifact {
                relative_path: "migration/nested/artifact.json".to_owned(),
                content: "secret".to_owned(),
            }],
        )
        .unwrap();

        assert_eq!(
            fs::metadata(workspace.path().join("migration"))
                .unwrap()
                .permissions()
                .mode()
                & 0o777,
            0o700
        );
        assert_eq!(
            fs::metadata(workspace.path().join("migration/nested"))
                .unwrap()
                .permissions()
                .mode()
                & 0o777,
            0o700
        );
        assert_eq!(
            fs::metadata(workspace.path().join("migration/nested/artifact.json"))
                .unwrap()
                .permissions()
                .mode()
                & 0o777,
            0o600
        );
    }

    #[cfg(unix)]
    #[test]
    fn migration_rollback_does_not_delete_a_replaced_target() {
        let workspace = tempdir().unwrap();
        let parent = open_workspace_capability(workspace.path()).unwrap();
        let (temporary_name, mut temporary) = create_temporary_file(&parent).unwrap();
        temporary.write_all(b"staged").unwrap();
        temporary.sync_all().unwrap();
        parent
            .hard_link(&temporary_name, &parent, "target.json")
            .unwrap();

        parent.remove_file("target.json").unwrap();
        parent.write("target.json", b"replacement").unwrap();
        let staged = vec![StagedMigrationArtifact {
            parent,
            target_name: OsString::from("target.json"),
            temporary_name,
            file: temporary,
            display_path: "target.json".to_owned(),
        }];

        rollback_migration(&staged, 1, &[]).unwrap();
        assert_eq!(
            fs::read_to_string(workspace.path().join("target.json")).unwrap(),
            "replacement"
        );
    }

    #[cfg(unix)]
    #[test]
    fn migration_rollback_does_not_delete_a_replaced_directory() {
        let workspace = tempdir().unwrap();
        let parent = open_workspace_capability(workspace.path()).unwrap();
        parent.create_dir("migration").unwrap();
        let identity = entry_identity(&parent, OsStr::new("migration"))
            .unwrap()
            .unwrap();
        let directories = vec![CreatedMigrationDirectory {
            parent: parent.try_clone().unwrap(),
            name: OsString::from("migration"),
            identity,
        }];

        parent.rename("migration", &parent, "original").unwrap();
        parent.create_dir("migration").unwrap();
        parent
            .open_dir("migration")
            .unwrap()
            .write("replacement.txt", b"keep")
            .unwrap();

        rollback_migration(&[], 0, &directories).unwrap();
        assert_eq!(
            fs::read_to_string(workspace.path().join("migration/replacement.txt")).unwrap(),
            "keep"
        );
        assert!(workspace.path().join("original").is_dir());
    }

    #[cfg(unix)]
    #[test]
    fn created_directory_helper_removes_only_the_captured_identity() {
        let workspace = tempdir().unwrap();
        let parent = open_workspace_capability(workspace.path()).unwrap();
        parent.create_dir("matching").unwrap();
        let matching_identity = entry_identity(&parent, OsStr::new("matching"))
            .unwrap()
            .unwrap();

        rollback_created_directory(&parent, OsStr::new("matching"), matching_identity).unwrap();
        assert!(!workspace.path().join("matching").exists());

        parent.create_dir("replacement").unwrap();
        let old_identity = entry_identity(&parent, OsStr::new("replacement"))
            .unwrap()
            .unwrap();
        parent.rename("replacement", &parent, "old").unwrap();
        parent.create_dir("replacement").unwrap();
        parent
            .open_dir("replacement")
            .unwrap()
            .write("keep.txt", b"keep")
            .unwrap();

        rollback_created_directory(&parent, OsStr::new("replacement"), old_identity).unwrap();
        assert_eq!(
            fs::read_to_string(workspace.path().join("replacement/keep.txt")).unwrap(),
            "keep"
        );
    }

    #[cfg(unix)]
    #[test]
    fn migration_rejects_traversal() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        assert!(matches!(
            write_org_migration_with_capability(
                &root,
                vec!["safe".to_owned()],
                vec![OrgMigrationArtifact {
                    relative_path: "../escape.json".to_owned(),
                    content: "bad".to_owned(),
                }],
            ),
            Err(OrgFilesystemError::InvalidPath(_))
        ));
        assert!(!workspace.path().join("safe").exists());
    }

    #[cfg(not(unix))]
    #[test]
    fn migration_is_rejected_before_creation_on_non_unix() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let error = write_org_migration_with_capability(
            &root,
            vec!["migration".to_owned()],
            vec![OrgMigrationArtifact {
                relative_path: "migration/file.json".to_owned(),
                content: "secret".to_owned(),
            }],
        )
        .unwrap_err();

        assert!(matches!(error, OrgFilesystemError::UnsupportedPlatform(_)));
        assert!(fs::read_dir(workspace.path()).unwrap().next().is_none());
    }

    #[cfg(unix)]
    #[test]
    fn migration_rejects_symlink_components() {
        use std::os::unix::fs::symlink;

        let workspace = tempdir().unwrap();
        let outside = tempdir().unwrap();
        symlink(outside.path(), workspace.path().join("linked")).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();

        assert!(matches!(
            write_org_migration_with_capability(
                &root,
                vec!["linked".to_owned(), "linked/nested".to_owned()],
                vec![OrgMigrationArtifact {
                    relative_path: "linked/nested/escape.json".to_owned(),
                    content: "bad".to_owned(),
                }],
            ),
            Err(OrgFilesystemError::TargetExists(path)) if path == "linked"
        ));
        assert!(!outside.path().join("nested").exists());
    }

    #[cfg(unix)]
    #[test]
    fn symlink_escape_is_rejected() {
        use std::os::unix::fs::symlink;

        let workspace = tempdir().unwrap();
        let outside = tempdir().unwrap();
        fs::write(outside.path().join("secret.org"), "secret").unwrap();
        symlink(outside.path(), workspace.path().join("outside")).unwrap();

        assert!(matches!(
            read_org_document(workspace.path(), "outside/secret.org"),
            Err(OrgFilesystemError::OutsideWorkspace(_))
        ));
        assert!(matches!(
            write_org_document(workspace.path(), "outside/new.org", "bad", None),
            Err(OrgFilesystemError::OutsideWorkspace(_))
        ));
        assert!(matches!(
            create_org_directory(workspace.path(), "outside/new"),
            Err(OrgFilesystemError::OutsideWorkspace(_))
        ));
        assert!(matches!(
            move_org_document(
                workspace.path(),
                "outside/secret.org",
                "moved.org",
                &revision(b"secret")
            ),
            Err(OrgFilesystemError::OutsideWorkspace(_))
        ));
        assert!(matches!(
            delete_org_document(workspace.path(), "outside/secret.org", &revision(b"secret")),
            Err(OrgFilesystemError::OutsideWorkspace(_))
        ));
        assert!(scan_org_documents(workspace.path()).unwrap().is_empty());
    }
}
