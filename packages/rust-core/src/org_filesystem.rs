//! Secure filesystem access for Org documents.
//!
//! Approved operations resolve paths relative to a retained workspace directory capability.
//! Callers cannot use absolute paths, parent traversal, non-Org files, or symlinks to escape it.

use cap_std::ambient_authority;
use cap_std::fs::{Dir, OpenOptions, Permissions};
#[cfg(unix)]
use cap_std::fs::{MetadataExt, OpenOptionsExt, PermissionsExt};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
#[cfg(any(target_os = "linux", target_os = "macos"))]
use std::ffi::CString;
use std::ffi::{OsStr, OsString};
#[cfg(test)]
use std::fs;
use std::io::{self, Read, Write};
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, MutexGuard};
#[cfg(any(target_os = "linux", target_os = "macos"))]
use std::{os::fd::AsRawFd, os::unix::ffi::OsStrExt};
use thiserror::Error;

#[cfg(any(target_os = "linux", target_os = "macos"))]
#[path = "org_document_write.rs"]
mod document_write;
#[cfg(any(target_os = "linux", target_os = "macos"))]
use document_write::{
    capture_org_write, finish_org_write, prepare_org_write, publish_org_write, quarantine_org_document,
    scan_retained_original,
};
#[cfg(all(test, any(target_os = "linux", target_os = "macos")))]
pub(crate) use document_write::prepare_interrupted_org_write;

#[path = "org_export.rs"]
pub(crate) mod export;

#[derive(Debug, Error)]
pub enum OrgFilesystemError {
    #[error("invalid Org document path: {0}")]
    InvalidPath(String),
    #[error("path escapes the workspace root: {0}")]
    OutsideWorkspace(String),
    #[error("Org document not found: {0}")]
    NotFound(String),
    /// Authorized no-symlink observation found no terminal entry or parent.
    #[error("Org document path is absent: {0}")]
    ProvenAbsent(String),
    #[error("target already exists: {0}")]
    TargetExists(String),
    /// The terminal entry was occupied before any write transaction or stage existed.
    #[error("creation target already exists before publication: {0}")]
    CreationCollision(String),
    #[error("operation is not supported on this platform: {0}")]
    UnsupportedPlatform(String),
    #[error("Org document is not valid UTF-8: {0}")]
    InvalidUtf8(String),
    #[error("Org file changed while its observed bytes were being inspected: {0}")]
    InspectionChanged(String),
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
    #[error("ambiguous interrupted Org write; recovery artifacts retained: {0}")]
    WriteRecoveryConflict(String),
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
    pub original_recoveries: Vec<OrgOriginalRecoveryEntry>,
}

/// A mutable retained recovery object; never an immutable snapshot or canonical body owner.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgOriginalRecoveryEntry {
    pub relative_path: String,
    pub source_relative_path: String,
    pub kind: OrgOriginalRecoveryKind,
    pub object: OrgRecoveryObjectKind,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OrgOriginalRecoveryKind {
    Save,
    Delete,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OrgRecoveryObjectKind {
    Original,
    Staged,
    Journal,
    PublicationProbe,
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
    pub original_recovery: Option<OrgOriginalRecoveryEntry>,
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
#[serde(rename_all = "camelCase", deny_unknown_fields)]
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

fn required_nullable_text<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<Option<String>, D::Error> {
    Option::<String>::deserialize(deserializer)
}

/// Exact selected legacy workspace and node tuples. Integer columns are canonical i64 decimals.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sea_orm::FromQueryResult)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LegacyRecoveryWorkspace {
    pub id: String,
    pub name: String,
    #[serde(deserialize_with = "required_nullable_text")]
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sea_orm::FromQueryResult)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LegacyRecoveryNode {
    pub id: String,
    pub workspace_id: String,
    #[serde(deserialize_with = "required_nullable_text")]
    pub parent_id: Option<String>,
    pub title: String,
    pub node_type: String,
    pub is_collapsed: String,
    pub sort_order: String,
    #[serde(deserialize_with = "required_nullable_text")]
    pub tags: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LegacyRecoveryGraph {
    pub workspace: LegacyRecoveryWorkspace,
    pub nodes: Vec<LegacyRecoveryNode>,
}

/// Lossless selected-workspace recovery, not a backup of unrelated database tables.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OrgMigrationRecoveryBundle {
    pub manifest: String,
    pub graph: LegacyRecoveryGraph,
    pub raw_backups: Vec<OrgMigrationRecoveryBackup>,
    pub recovery_sql: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct OrgMigrationRecoveryManifest {
    version: serde_json::Number,
    root_directory: String,
    graph: LegacyRecoveryGraph,
    raw_backups: Vec<OrgMigrationRecoveryBackupMetadata>,
    recovery_sql_path: String,
    #[serde(rename = "directories")]
    _directories: Vec<serde::de::IgnoredAny>,
    #[serde(rename = "documents")]
    _documents: Vec<serde::de::IgnoredAny>,
    #[serde(rename = "nodes")]
    _nodes: Vec<serde::de::IgnoredAny>,
    #[serde(rename = "warnings")]
    _warnings: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
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
const MIGRATION_RECOVERY_SQL_FILE: &str = "legacy-workspace-recovery.sql";
const MAX_MIGRATION_MANIFEST_BYTES: u64 = 1024 * 1024;
const MAX_MIGRATION_BACKUP_BYTES: u64 = 16 * 1024 * 1024;
const MAX_MIGRATION_RECOVERY_TOTAL_BYTES: u64 = 64 * 1024 * 1024;
const MAX_MIGRATION_RECOVERY_SQL_BYTES: u64 = 160 * 1024 * 1024;

#[cfg(unix)]
struct StagedMigrationArtifact<'a> {
    parent: Dir,
    target_name: OsString,
    temporary_name: OsString,
    file: cap_std::fs::File,
    display_path: String,
    below_root: PathBuf,
    expected_byte_length: u64,
    expected_revision: &'a str,
    observed: cap_std::fs::Metadata,
    installed_file: Option<cap_std::fs::File>,
    installed_observed: Option<cap_std::fs::Metadata>,
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
    let mut original_recoveries = Vec::new();
    scan_directory_capability(root, Path::new(""), &mut documents, &mut directories, &mut original_recoveries)?;

    documents.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    directories.sort();
    original_recoveries.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    Ok(OrgWorkspaceSnapshot {
        documents,
        directories,
        original_recoveries,
    })
}

fn scan_directory_capability(
    directory: &Dir,
    relative_directory: &Path,
    documents: &mut Vec<OrgDocumentEntry>,
    directories: &mut Vec<String>,
    original_recoveries: &mut Vec<OrgOriginalRecoveryEntry>,
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
            #[cfg(any(target_os = "linux", target_os = "macos"))]
            if file_type.is_dir() {
                original_recoveries.extend(scan_retained_original(directory, &entry_name, relative_directory)?);
            }
            continue;
        }
        let relative = relative_directory.join(&entry_name);
        if file_type.is_dir() {
            directories.push(portable_relative_path(&relative)?);
            let child = entry.open_dir()?;
            scan_directory_capability(&child, &relative, documents, directories, original_recoveries)?;
        } else if file_type.is_file()
            && relative
                .extension()
                .and_then(|extension| extension.to_str())
                == Some("org")
        {
            let display_path = portable_relative_path(&relative)?;
            let mut options = OpenOptions::new();
            options.read(true);
            #[cfg(unix)]
            options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
            let mut file = directory.open_with(&entry_name, &options)?;
            let observed = file.metadata()?;
            let revision = read_open_file_revision_utf8(&mut file, &display_path)?;
            require_unchanged_file(&observed, &directory.symlink_metadata(&entry_name)?, &display_path)?;
            documents.push(OrgDocumentEntry { relative_path: display_path, revision });
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
    let (parent, file_name) = resolve_no_symlink_parent(root, &relative, &display_path)
        .map_err(|error| match error {
            #[cfg(unix)]
            OrgFilesystemError::NotFound(path) => OrgFilesystemError::ProvenAbsent(path),
            other => other,
        })?;
    let metadata = parent.symlink_metadata(&file_name).map_err(|error| {
        #[cfg(unix)]
        if error.kind() == io::ErrorKind::NotFound {
            return OrgFilesystemError::ProvenAbsent(display_path.clone());
        }
        OrgFilesystemError::Io(error)
    })?;
    if metadata.file_type().is_symlink() {
        return Err(OrgFilesystemError::OutsideWorkspace(display_path));
    }
    if !metadata.is_file() {
        return Err(OrgFilesystemError::InvalidPath(display_path));
    }

    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
    let file = parent.open_with(&file_name, &options)
        .map_err(|error| map_not_found(error, &display_path))?;
    require_unchanged_file(&metadata, &file.metadata()?, &display_path)?;
    let content = read_open_file_utf8(file, &display_path)?;
    require_unchanged_file(&metadata, &parent.symlink_metadata(&file_name)?, &display_path)?;
    Ok(OrgDocument {
        relative_path: display_path,
        revision: revision(content.as_bytes()),
        content,
    })
}

fn canonical_i64(value: &str) -> bool {
    value.parse::<i64>().is_ok_and(|parsed| parsed.to_string() == value)
}

fn validate_recovery_graph(graph: &LegacyRecoveryGraph) -> OrgFilesystemResult<()> {
    let workspace = &graph.workspace;
    let mut ids = HashSet::new();
    if !canonical_i64(&workspace.created_at) || !canonical_i64(&workspace.updated_at)
        || graph.nodes.iter().any(|node| {
            node.workspace_id != workspace.id || !ids.insert(&node.id)
                || !canonical_i64(&node.is_collapsed) || !canonical_i64(&node.sort_order)
                || !canonical_i64(&node.created_at) || !canonical_i64(&node.updated_at)
        })
    {
        return Err(OrgFilesystemError::InvalidManifest("invalid lossless workspace graph".to_owned()));
    }
    // Missing parents and cycles are historical data, not grounds to fabricate or discard rows.
    Ok(())
}

fn workspace_recovery_sql(graph: &LegacyRecoveryGraph, backups: &[OrgMigrationRecoveryBackup]) -> String {
    use std::fmt::Write;
    struct SqlText<'a>(Option<&'a str>);
    impl std::fmt::Display for SqlText<'_> {
        fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            let Some(value) = self.0 else { return formatter.write_str("NULL"); };
            formatter.write_str("CAST(X'")?;
            for byte in value.as_bytes() {
                write!(formatter, "{byte:02x}")?;
            }
            formatter.write_str("' AS TEXT)")
        }
    }
    fn text(value: &str) -> SqlText<'_> { SqlText(Some(value)) }
    fn nullable(value: &Option<String>) -> SqlText<'_> { SqlText(value.as_deref()) }
    let mut sql = concat!(
        "-- Selected legacy workspace graph and raw contents only; not a whole-database backup.\n",
        "PRAGMA foreign_keys=OFF;\nBEGIN IMMEDIATE;\n",
        "CREATE TABLE workspaces (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);\n",
        "CREATE TABLE nodes (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, parent_id TEXT, title TEXT NOT NULL, node_type TEXT NOT NULL, is_collapsed INTEGER NOT NULL, sort_order INTEGER NOT NULL, tags TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);\n",
        "CREATE INDEX idx_nodes_workspace ON nodes(workspace_id);\nCREATE INDEX idx_nodes_parent ON nodes(parent_id);\n",
        "CREATE TABLE contents (id TEXT PRIMARY KEY NOT NULL, node_id TEXT NOT NULL, content TEXT NOT NULL, version INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);\n",
        "CREATE INDEX idx_contents_node ON contents(node_id);\n",
        "CREATE TABLE grain_recovery_content_types (content_id TEXT PRIMARY KEY NOT NULL, content_type TEXT NOT NULL);\n",
    ).to_owned();
    let workspace = &graph.workspace;
    writeln!(&mut sql, "INSERT INTO workspaces (id,name,description,created_at,updated_at) VALUES ({},{},{},{},{});",
        text(&workspace.id), text(&workspace.name), nullable(&workspace.description), workspace.created_at, workspace.updated_at).unwrap();
    for node in &graph.nodes {
        writeln!(&mut sql, "INSERT INTO nodes (id,workspace_id,parent_id,title,node_type,is_collapsed,sort_order,tags,created_at,updated_at) VALUES ({},{},{},{},{},{},{},{},{},{});",
            text(&node.id), text(&node.workspace_id), nullable(&node.parent_id), text(&node.title), text(&node.node_type),
            node.is_collapsed, node.sort_order, nullable(&node.tags), node.created_at, node.updated_at).unwrap();
    }
    for backup in backups {
        writeln!(&mut sql, "INSERT INTO contents (id,node_id,content,version,created_at,updated_at) VALUES ({},{},{},{},{},{});",
            text(&backup.content_id), text(&backup.node_id), text(&backup.content), backup.version, backup.created_at, backup.updated_at).unwrap();
        writeln!(&mut sql, "INSERT INTO grain_recovery_content_types (content_id,content_type) VALUES ({},{});",
            text(&backup.content_id), text(&backup.content_type)).unwrap();
    }
    sql.push_str("COMMIT;\n");
    sql
}

/// Capability-read version-2 graph/raw bundle, with exact tuple/SQL agreement.
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
    if parsed.version.as_f64() != Some(2.0) {
        return Err(OrgFilesystemError::InvalidManifest("unsupported migration format".to_owned()));
    }
    validate_recovery_graph(&parsed.graph)?;

    let root_directory = validate_portable_relative_path(Path::new(&parsed.root_directory))?;
    if manifest_path.parent() != Some(root_directory.as_path()) {
        return Err(OrgFilesystemError::InvalidManifest(
            "rootDirectory does not match the manifest location".to_owned(),
        ));
    }
    let backup_root = root_directory.join(MIGRATION_RAW_BACKUP_DIRECTORY);
    let mut seen = HashSet::new();
    let mut content_ids = HashSet::with_capacity(parsed.raw_backups.len());
    for metadata in &parsed.raw_backups {
        if !canonical_i64(&metadata.version)
            || !canonical_i64(&metadata.created_at)
            || !canonical_i64(&metadata.updated_at)
            || !content_ids.insert(&metadata.content_id)
        {
            return Err(OrgFilesystemError::InvalidManifest(format!(
                "invalid raw backup metadata for content {}",
                metadata.content_id
            )));
        }
    }
    drop(content_ids);
    let mut prepared = Vec::with_capacity(parsed.raw_backups.len());
    for metadata in parsed.raw_backups {
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

    let path = validate_portable_relative_path(Path::new(&parsed.recovery_sql_path))?;
    if path != root_directory.join(MIGRATION_RECOVERY_SQL_FILE) {
        return Err(OrgFilesystemError::InvalidManifest(
            "recoverySqlPath must identify the recovery SQL beside the manifest".to_owned(),
        ));
    }
    let display = portable_relative_path(&path)?;
    let recovery_sql = read_capability_file_utf8_limited(
        root, &path, &display, MAX_MIGRATION_RECOVERY_SQL_BYTES,
    )?;
    if recovery_sql != workspace_recovery_sql(&parsed.graph, &raw_backups) {
        return Err(OrgFilesystemError::InvalidManifest("recovery SQL differs from lossless tuples".to_owned()));
    }

    Ok(OrgMigrationRecoveryBundle {
        manifest,
        graph: parsed.graph,
        raw_backups,
        recovery_sql,
    })
}

/// Durably writes one Org document after optionally checking its current revision.
///
/// A synced identity-bound journal precedes capture of the old entry. Publication is no-clobber,
/// and interrupted transactions are reconciled on the next approved workspace open.
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
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        let _mutation_guard = lock_org_mutations()?;
        let transaction = prepare_org_write(root, relative_path.as_ref(), content, expected_revision)?;
        capture_org_write(&transaction)?;
        publish_org_write(&transaction)?;
        let staged = transaction.journal.staged.as_ref()
            .ok_or_else(|| OrgFilesystemError::WriteRecoveryConflict(transaction.display_path.clone()))?;
        // finish_org_write owns the final observations and durable terminal resolution. No
        // rejecting revalidation may follow it: successful retentions permit later external edits.
        let original_recovery = finish_org_write(&transaction)?;
        Ok(OrgWriteResult {
            relative_path: transaction.display_path,
            revision: staged.revision.clone(),
            original_recovery,
        })
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = (root, relative_path, content, expected_revision);
        Err(OrgFilesystemError::UnsupportedPlatform(
            "durable no-clobber Org writes".to_owned(),
        ))
    }
}

/// Reconciles manifested ordinary saves before scanning an approved workspace.
///
/// Unidentified older temporary files are never removed. Foreign identities or changed bytes
/// fail closed and retain the journal and all surviving objects for explicit human recovery.
pub fn recover_org_document_writes_with_capability(root: &Dir) -> OrgFilesystemResult<()> {
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        let _mutation_guard = lock_org_mutations()?;
        document_write::recover_directory(root)
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        reject_unrecoverable_org_write_journals(root)
    }
}

#[cfg(any(test, not(any(target_os = "linux", target_os = "macos"))))]
fn reject_unrecoverable_org_write_journals(root: &Dir) -> OrgFilesystemResult<()> {
    for entry in root.entries()? {
        let entry = entry?;
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with(".grain-retaining-") && name.ends_with(".tmp") {
            return Err(OrgFilesystemError::UnsupportedPlatform(
                "unresolved retained Org write requires explicit recovery".to_owned(),
            ));
        }
        if name.starts_with(".grain-resolved-") {
            return Err(OrgFilesystemError::UnsupportedPlatform(
                "resolved Org retention requires directory-identity validation".to_owned(),
            ));
        }
        let kind = entry.file_type()?;
        let active = name.starts_with(".grain-write-") && name.ends_with(".tmp");
        if active && (!kind.is_dir() || kind.is_symlink()) {
            return Err(OrgFilesystemError::UnsupportedPlatform(
                "active Org write marker no longer identifies its journal directory".to_owned(),
            ));
        }
        if !kind.is_dir() || kind.is_symlink() {
            continue;
        }
        let directory = entry.open_dir()?;
        if active {
            for journal in ["journal.json", "journal.gc"] {
                match directory.symlink_metadata(journal) {
                    Ok(_) => {
                        return Err(OrgFilesystemError::UnsupportedPlatform(
                            "interrupted Org write requires safe no-clobber recovery primitives"
                                .to_owned(),
                        ));
                    }
                    Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                    Err(error) => return Err(error.into()),
                }
            }
        } else {
            reject_unrecoverable_org_write_journals(&directory)?;
        }
    }
    Ok(())
}

/// Installs a batch of migration artifacts relative to an already-approved workspace.
///
/// The operation validates the complete target graph, creates owner-only directories through
/// retained handles, and syncs staged files. Linux publishes held file descriptors by no-clobber
/// links; Darwin copies held descriptors into fresh no-clobber targets. Expected bytes, entry
/// identities and the reachable tree are observed before acknowledgement, not atomically locked.
/// Stages, installed links and uncertain published trees are retained; no destructive rollback.
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

    // Retain every stage and uncertain installed object: identity checks cannot authorize
    // a later unlink, rmdir, overwriting rename, or reverse publication.
    let verification_revision = revision(prepared_artifacts.last().unwrap().2.as_bytes());
    let expected_revisions: HashMap<_, _> = artifact_summaries
        .iter()
        .map(|summary| (summary.relative_path.as_str(), summary.revision.as_str()))
        .chain(std::iter::once((verification_path.as_str(), verification_revision.as_str())))
        .collect();
    let migration_dir = create_migration_directory(root, &staging_name, &root_display)?;
    let mut staged_artifacts = Vec::new();

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
            let directory = create_migration_directory(parent, name, &display)?;
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
            set_migration_file_permissions(&temporary)?;
            temporary.write_all(content.as_bytes())?;
            temporary.flush()?;
            temporary.sync_all()?;
            let observed = temporary.metadata()?;
            staged_artifacts.push(StagedMigrationArtifact {
                parent,
                target_name: target_name.to_os_string(),
                temporary_name,
                file: temporary,
                display_path: display_path.clone(),
                below_root: below_root.to_path_buf(),
                expected_byte_length: content.len() as u64,
                expected_revision: expected_revisions[display_path.as_str()],
                observed,
                installed_file: None,
                installed_observed: None,
            });
            #[cfg(test)]
            migration_race(MigrationRacePoint::AfterStage, &staged_artifacts.last().unwrap().parent,
                &staged_artifacts.last().unwrap().temporary_name)?;
        }

        for staged in &mut staged_artifacts {
            #[cfg(test)]
            migration_race(MigrationRacePoint::BeforeFilePublication, &staged.parent, &staged.temporary_name)?;
            require_migration_stage(staged)?;
            publish_migration_artifact(staged).map_err(|error| match error {
                OrgFilesystemError::Io(error) if error.kind() == io::ErrorKind::AlreadyExists =>
                    OrgFilesystemError::TargetExists(staged.display_path.clone()),
                other => other,
            })?;
            #[cfg(test)]
            migration_race(MigrationRacePoint::AfterFilePublication, &staged.parent, &staged.temporary_name)?;
            require_migration_artifact(staged)?;
            sync_directory(&staged.parent)?;
        }
        for directory in directory_handles.values() {
            sync_directory(directory)?;
        }
        require_migration_tree(root, &staging_name, &migration_dir, &directory_handles, &mut staged_artifacts)?;
        #[cfg(test)]
        migration_race(MigrationRacePoint::BeforeRootPublication, root, &staging_name)?;
        // A held directory cannot be renamed by descriptor. Check its named source and then
        // the installed tree against that same held directory before acknowledging.
        require_migration_root(root, &staging_name, &migration_dir)?;
        #[cfg(test)]
        migration_race(MigrationRacePoint::AfterRootSourceCheck, root, &staging_name)?;

        // One no-clobber operation publishes the tree. The installed entry remains untrusted
        // until its identity, reachable parents, and held-file bytes have been observed again.
        rename_noreplace(root, &staging_name, root, root_name).map_err(|error| {
            if error.raw_os_error() == Some(libc::EEXIST) {
                OrgFilesystemError::TargetExists(root_display.clone())
            } else {
                OrgFilesystemError::Io(error)
            }
        })?;
        #[cfg(test)]
        migration_race(MigrationRacePoint::BeforeRootSync, root, root_name)?;
        sync_directory(root)?;
        #[cfg(test)]
        migration_race(MigrationRacePoint::BeforeAcknowledgement, root, root_name)?;
        require_migration_tree(root, root_name, &migration_dir, &directory_handles, &mut staged_artifacts)?;
        // These are bounded observations, not an atomic snapshot or CAS against an already-open
        // writer. A physical change after the final observation remains possible.
        drop(staged_artifacts);
        drop(expected_revisions);
        Ok(OrgMigrationWriteResult {
            written_paths: prepared_artifacts
                .iter()
                .map(|(_, display_path, _)| display_path.clone())
                .collect(),
            verification_path,
            artifacts: artifact_summaries,
        })
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
    // The generated sidecar's bound scales with the caller's exact expected metadata; it does
    // not impose an artifact-count or Org-body limit.
    let manifest_limit = verification_manifest_byte_limit(&expected_artifacts)?;
    let manifest_text = read_capability_file_utf8_limited(
        root, &verification_relative, &verification_display, manifest_limit,
    )?;
    let manifest: OrgMigrationVerificationManifest = serde_json::from_str(&manifest_text)
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
            Some((length, revision)) => (Some(length), Some(revision)),
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

fn verification_manifest_byte_limit(
    artifacts: &[OrgMigrationArtifactSummary],
) -> OrgFilesystemResult<u64> {
    #[derive(Serialize)]
    struct ExpectedManifest<'a> {
        artifacts: &'a [OrgMigrationArtifactSummary],
    }
    struct ByteCount(u64);
    impl Write for ByteCount {
        fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
            self.0 = self.0.checked_add(bytes.len() as u64)
                .ok_or_else(|| io::Error::other("verification metadata length overflow"))?;
            Ok(bytes.len())
        }
        fn flush(&mut self) -> io::Result<()> { Ok(()) }
    }
    let mut count = ByteCount(0);
    serde_json::to_writer_pretty(&mut count, &ExpectedManifest { artifacts })
        .map_err(|error| OrgFilesystemError::InvalidManifest(error.to_string()))?;
    // write_org_migration appends exactly one newline to the pretty JSON.
    count.0.checked_add(1)
        .ok_or_else(|| OrgFilesystemError::InvalidManifest("verification metadata length overflow".to_owned()))
}

fn read_optional_regular_file(
    root: &Dir,
    relative: &Path,
    display_path: &str,
) -> OrgFilesystemResult<Option<(u64, String)>> {
    let (parent, file_name) = match resolve_no_symlink_parent(root, relative, display_path) {
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
        return Err(OrgFilesystemError::OutsideWorkspace(display_path.to_owned()));
    }
    if !metadata.is_file() {
        return Err(OrgFilesystemError::InvalidManifest(format!(
            "listed artifact is not a regular file: {display_path}"
        )));
    }
    let mut file = match acquire_observed_regular_file(&parent, &file_name, &metadata, display_path) {
        Ok(file) => file,
        Err(OrgFilesystemError::NotFound(_)) => return Ok(None),
        Err(error) => return Err(error),
    };
    let summary = observe_open_file_raw(&mut file, display_path)?;
    require_unchanged_file(&metadata, &file.metadata()?, display_path)?;
    require_current_regular_entry(&parent, &file_name, &metadata, display_path)?;
    Ok(Some(summary))
}

fn acquire_observed_regular_file(
    parent: &Dir,
    file_name: &OsStr,
    before: &cap_std::fs::Metadata,
    display_path: &str,
) -> OrgFilesystemResult<cap_std::fs::File> {
    #[cfg(not(unix))]
    return Err(OrgFilesystemError::UnsupportedPlatform(
        "nonblocking no-symlink regular-file observation requires Unix".to_owned(),
    ));
    #[cfg(unix)]
    {
        #[cfg(test)]
        tests::run_acquisition_hook();
        let mut options = OpenOptions::new();
        options.read(true).custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
        let file = parent.open_with(file_name, &options)
            .map_err(|error| map_not_found(error, display_path))?;
        // Reject a FIFO, device, symlink, or foreign inode before reading any bytes.
        require_unchanged_file(before, &file.metadata()?, display_path)?;
        require_current_regular_entry(parent, file_name, before, display_path)?;
        Ok(file)
    }
}

fn require_current_regular_entry(
    parent: &Dir,
    file_name: &OsStr,
    before: &cap_std::fs::Metadata,
    display_path: &str,
) -> OrgFilesystemResult<()> {
    let current = parent.symlink_metadata(file_name)
        .map_err(|error| map_not_found(error, display_path))?;
    if current.file_type().is_symlink() {
        return Err(OrgFilesystemError::OutsideWorkspace(display_path.to_owned()));
    }
    require_unchanged_file(before, &current, display_path)
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

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn create_migration_directory(
    parent: &Dir,
    name: &OsStr,
    display_path: &str,
) -> OrgFilesystemResult<Dir> {
    let native_name = CString::new(name.as_bytes())
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "directory contains NUL"))?;
    // Set mode at creation, never chmod a pathname-reopened replacement. mkdirat returns no
    // descriptor: the initial identity capture is an observation, not an atomic snapshot.
    if unsafe { libc::mkdirat(parent.as_raw_fd(), native_name.as_ptr(), 0o700) } != 0 {
        let error = io::Error::last_os_error();
        return Err(if error.kind() == io::ErrorKind::AlreadyExists {
            OrgFilesystemError::TargetExists(display_path.to_owned())
        } else {
            error.into()
        });
    }
    #[cfg(test)]
    migration_race(MigrationRacePoint::AfterDirectoryCreation, parent, name)?;
    let metadata = parent.symlink_metadata(name)?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err(OrgFilesystemError::InspectionChanged(display_path.to_owned()));
    }
    let mut options = OpenOptions::new();
    options.read(true).custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW);
    let directory = Dir::from_std_file(parent.open_with(name, &options)?.into_std());
    if metadata_identity(&metadata) != metadata_identity(&directory.dir_metadata()?)
        || entry_identity(parent, name)? != Some(metadata_identity(&metadata)) {
        return Err(OrgFilesystemError::InspectionChanged(display_path.to_owned()));
    }
    sync_directory(parent)?;
    Ok(directory)
}

#[cfg(unix)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
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
fn set_migration_file_permissions(file: &cap_std::fs::File) -> io::Result<()> {
    file.set_permissions(Permissions::from_mode(0o600))
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn require_migration_stage(staged: &mut StagedMigrationArtifact<'_>) -> OrgFilesystemResult<()> {
    require_unchanged_file(&staged.observed, &staged.file.metadata()?, &staged.display_path)?;
    let named = staged.parent.symlink_metadata(&staged.temporary_name)?;
    require_unchanged_file(&staged.observed, &named, &staged.display_path)?;
    require_migration_bytes(&mut staged.file, staged.expected_byte_length, staged.expected_revision, &staged.display_path)?;
    require_unchanged_file(&named, &staged.parent.symlink_metadata(&staged.temporary_name)?, &staged.display_path)?;
    require_unchanged_file(&staged.observed, &staged.file.metadata()?, &staged.display_path)
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn require_migration_bytes(
    file: &mut cap_std::fs::File,
    expected_length: u64,
    expected_revision: &str,
    path: &str,
) -> OrgFilesystemResult<()> {
    let (length, revision) = observe_open_file_raw(file, path)?;
    if length != expected_length || revision != expected_revision {
        return Err(OrgFilesystemError::InspectionChanged(path.to_owned()));
    }
    Ok(())
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn publish_migration_artifact(staged: &mut StagedMigrationArtifact<'_>) -> OrgFilesystemResult<()> {
    #[cfg(test)]
    migration_race(MigrationRacePoint::BeforeDescriptorPublication, &staged.parent, &staged.temporary_name)?;
    #[cfg(target_os = "linux")]
    {
        #[cfg(test)]
        if MIGRATION_COPY_PUBLICATION.with(|copy| copy.get()) {
            return copy_migration_artifact(staged);
        }
        document_write::link_open_file(&staged.file, &staged.parent, &staged.temporary_name,
            &staged.parent, &staged.target_name)?;
        // linkat necessarily changes ctime; establish a new observed baseline, but require the
        // expected bytes and installed identity before accepting it. No source pathname is used.
        staged.observed = staged.file.metadata()?;
        staged.installed_observed = Some(staged.observed.clone());
        Ok(())
    }
    #[cfg(target_os = "macos")]
    {
        copy_migration_artifact(staged)
    }
}

// Darwin lacks a qualified descriptor hard-link primitive. Copy from the retained descriptor
// into a fresh no-clobber target, then retain and inspect that target descriptor. The copy is
// bounded by the staged length and does not allocate an artifact-sized buffer.
#[cfg(any(target_os = "macos", all(test, target_os = "linux")))]
fn copy_migration_artifact(staged: &mut StagedMigrationArtifact<'_>) -> OrgFilesystemResult<()> {
    use std::io::{Seek, SeekFrom};
    let mut options = OpenOptions::new();
    options.read(true).write(true).create_new(true)
        .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK).mode(0o600);
    let mut target = staged.parent.open_with(&staged.target_name, &options)?;
    staged.file.seek(SeekFrom::Start(0))?;
    let copied = io::copy(&mut Read::by_ref(&mut staged.file).take(staged.expected_byte_length), &mut target)?;
    let mut extra = [0u8; 1];
    if copied != staged.expected_byte_length || staged.file.read(&mut extra)? != 0 {
        return Err(OrgFilesystemError::InspectionChanged(staged.display_path.clone()));
    }
    target.flush()?;
    target.sync_all()?;
    require_migration_stage(staged)?;
    require_migration_bytes(&mut target, staged.expected_byte_length, staged.expected_revision, &staged.display_path)?;
    staged.installed_observed = Some(target.metadata()?);
    staged.installed_file = Some(target);
    Ok(())
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn require_migration_artifact(staged: &mut StagedMigrationArtifact<'_>) -> OrgFilesystemResult<()> {
    require_migration_stage(staged)?;
    let observed = staged.installed_observed.as_ref()
        .ok_or_else(|| OrgFilesystemError::InspectionChanged(staged.display_path.clone()))?;
    let separate_copy = staged.installed_file.is_some();
    let file = staged.installed_file.as_mut().unwrap_or(&mut staged.file);
    require_unchanged_file(observed, &file.metadata()?, &staged.display_path)?;
    let named = staged.parent.symlink_metadata(&staged.target_name)?;
    require_unchanged_file(observed, &named, &staged.display_path)?;
    // Linux's installed link names the already-inspected stage fd; only Darwin's separate
    // target inode needs a second byte observation.
    if separate_copy {
        require_migration_bytes(file, staged.expected_byte_length, staged.expected_revision, &staged.display_path)?;
    }
    require_unchanged_file(observed, &file.metadata()?, &staged.display_path)?;
    require_unchanged_file(&named, &staged.parent.symlink_metadata(&staged.target_name)?, &staged.display_path)
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn require_migration_root(root: &Dir, name: &OsStr, held: &Dir) -> OrgFilesystemResult<()> {
    let metadata = root.symlink_metadata(name)?;
    if !metadata.is_dir() || metadata.file_type().is_symlink()
        || metadata_identity(&metadata) != metadata_identity(&held.dir_metadata()?) {
        return Err(OrgFilesystemError::InspectionChanged(name.to_string_lossy().into_owned()));
    }
    let mut options = OpenOptions::new();
    options.read(true).custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW);
    let named = root.open_with(name, &options)?;
    if file_identity(&named)? != metadata_identity(&held.dir_metadata()?) {
        return Err(OrgFilesystemError::InspectionChanged(name.to_string_lossy().into_owned()));
    }
    Ok(())
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn require_migration_tree(
    root: &Dir,
    root_name: &OsStr,
    migration_dir: &Dir,
    directory_handles: &std::collections::HashMap<PathBuf, Dir>,
    staged: &mut [StagedMigrationArtifact<'_>],
) -> OrgFilesystemResult<()> {
    require_migration_root(root, root_name, migration_dir)?;
    for (relative, held) in directory_handles {
        // Resolving the parent of a sentinel traverses every directory component with nofollow.
        let (reachable, _) = resolve_no_symlink_parent(migration_dir, &relative.join("_"), "migration directory")?;
        if metadata_identity(&reachable.dir_metadata()?) != metadata_identity(&held.dir_metadata()?) {
            return Err(OrgFilesystemError::InspectionChanged(relative.display().to_string()));
        }
    }
    for artifact in staged {
        let (reachable, _) = resolve_no_symlink_parent(migration_dir, &artifact.below_root, &artifact.display_path)?;
        if metadata_identity(&reachable.dir_metadata()?) != metadata_identity(&artifact.parent.dir_metadata()?) {
            return Err(OrgFilesystemError::InspectionChanged(artifact.display_path.clone()));
        }
        require_migration_artifact(artifact)?;
        let (reachable_after, _) = resolve_no_symlink_parent(migration_dir, &artifact.below_root, &artifact.display_path)?;
        if metadata_identity(&reachable_after.dir_metadata()?) != metadata_identity(&artifact.parent.dir_metadata()?) {
            return Err(OrgFilesystemError::InspectionChanged(artifact.display_path.clone()));
        }
    }
    require_migration_root(root, root_name, migration_dir)
}

#[cfg(all(test, any(target_os = "linux", target_os = "macos")))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum MigrationRacePoint {
    AfterDirectoryCreation,
    AfterStage,
    BeforeFilePublication,
    BeforeDescriptorPublication,
    AfterFilePublication,
    BeforeRootPublication,
    AfterRootSourceCheck,
    BeforeRootSync,
    BeforeAcknowledgement,
}

#[cfg(all(test, any(target_os = "linux", target_os = "macos")))]
type MigrationRaceHook = Box<dyn FnMut(MigrationRacePoint, &Dir, &OsStr) -> io::Result<()>>;

#[cfg(all(test, any(target_os = "linux", target_os = "macos")))]
thread_local! {
    static MIGRATION_RACE_HOOK: std::cell::RefCell<Option<MigrationRaceHook>> = const { std::cell::RefCell::new(None) };
    static MIGRATION_COPY_PUBLICATION: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
}

#[cfg(all(test, any(target_os = "linux", target_os = "macos")))]
fn migration_race(point: MigrationRacePoint, parent: &Dir, name: &OsStr) -> io::Result<()> {
    MIGRATION_RACE_HOOK.with(|hook| match hook.borrow_mut().as_mut() {
        Some(hook) => hook(point, parent, name),
        None => Ok(()),
    })
}

#[cfg(all(test, any(target_os = "linux", target_os = "macos")))]
fn with_migration_race<T>(hook: MigrationRaceHook, copy_publication: bool, operation: impl FnOnce() -> T) -> T {
    struct Reset;
    impl Drop for Reset {
        fn drop(&mut self) {
            MIGRATION_RACE_HOOK.with(|hook| *hook.borrow_mut() = None);
            MIGRATION_COPY_PUBLICATION.with(|copy| copy.set(false));
        }
    }
    MIGRATION_RACE_HOOK.with(|slot| {
        assert!(slot.borrow().is_none());
        *slot.borrow_mut() = Some(hook);
    });
    MIGRATION_COPY_PUBLICATION.with(|copy| copy.set(copy_publication));
    let _reset = Reset;
    operation()
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
        original_recovery: None,
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
) -> OrgFilesystemResult<OrgOriginalRecoveryEntry> {
    let root = open_workspace_capability(workspace_root.as_ref())?;
    delete_org_document_with_capability(&root, relative_path, expected_revision)
}

/// Removes the live pathname while durably retaining the original inode for manual recovery.
pub fn delete_org_document_with_capability(
    root: &Dir,
    relative_path: impl AsRef<Path>,
    expected_revision: &str,
) -> OrgFilesystemResult<OrgOriginalRecoveryEntry> {
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        let _mutation_guard = lock_org_mutations()?;
        quarantine_org_document(root, relative_path.as_ref(), expected_revision)
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = (root, relative_path, expected_revision);
        Err(OrgFilesystemError::UnsupportedPlatform(
            "durable no-clobber Org deletion quarantine".to_owned(),
        ))
    }
}

fn create_temporary_file(parent: &Dir) -> io::Result<(OsString, cap_std::fs::File)> {
    loop {
        let name = random_temporary_name();
        let options = OpenOptions::new().read(true).write(true).create_new(true).clone();
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

    let mut file = acquire_observed_regular_file(&parent, &file_name, &metadata, display_path)?;
    let opened_metadata = file.metadata()?;
    if opened_metadata.len() > byte_limit {
        return Err(OrgFilesystemError::FileTooLarge(display_path.to_owned()));
    }

    let capacity = usize::try_from(opened_metadata.len())
        .map_err(|_| OrgFilesystemError::FileTooLarge(display_path.to_owned()))?;
    let mut bytes = Vec::with_capacity(capacity);
    Read::by_ref(&mut file).take(opened_metadata.len()).read_to_end(&mut bytes)?;
    let mut extra = [0u8; 1];
    if bytes.len() as u64 != opened_metadata.len() || file.read(&mut extra)? != 0 {
        return Err(OrgFilesystemError::InspectionChanged(display_path.to_owned()));
    }
    require_unchanged_file(&metadata, &file.metadata()?, display_path)?;
    require_current_regular_entry(&parent, &file_name, &metadata, display_path)?;
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
            let mut options = OpenOptions::new();
            options.read(true);
            #[cfg(unix)]
            options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
            let mut file = parent.open_with(target, &options)?;
            let opened = file.metadata()?;
            require_unchanged_file(&metadata, &opened, display_path)?;
            let revision = read_open_file_revision_utf8(&mut file, display_path)?;
            require_unchanged_file(&opened, &parent.symlink_metadata(target)?, display_path)?;
            Ok((Some(revision), Some(opened.permissions())))
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

/// Validates the portable path spelling as well as its platform path components. Checking the
/// original string prevents `Path::components` from normalizing away `.` or repeated separators.
fn validate_relative_directory_path(path: &Path) -> OrgFilesystemResult<PathBuf> {
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
        || display.split('/').any(|component| component.starts_with(".grain-") && component.ends_with(".tmp"))
        || path.is_absolute()
        || path
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(OrgFilesystemError::InvalidPath(display.to_owned()));
    }
    Ok(path.to_path_buf())
}

fn validate_portable_relative_path(path: &Path) -> OrgFilesystemResult<PathBuf> {
    validate_relative_directory_path(path)
}

fn read_open_file_utf8(
    mut file: cap_std::fs::File,
    relative_path: &str,
) -> OrgFilesystemResult<String> {
    let before = file.metadata()?;
    if !before.is_file() {
        return Err(OrgFilesystemError::InvalidPath(relative_path.to_owned()));
    }
    let mut bytes = Vec::new();
    Read::by_ref(&mut file).take(before.len()).read_to_end(&mut bytes)?;
    let mut extra = [0u8; 1];
    if bytes.len() as u64 != before.len() || file.read(&mut extra)? != 0 {
        return Err(OrgFilesystemError::InspectionChanged(relative_path.to_owned()));
    }
    require_unchanged_file(&before, &file.metadata()?, relative_path)?;
    String::from_utf8(bytes).map_err(|_| OrgFilesystemError::InvalidUtf8(relative_path.to_owned()))
}

fn require_unchanged_file(
    before: &cap_std::fs::Metadata,
    after: &cap_std::fs::Metadata,
    path: &str,
) -> OrgFilesystemResult<()> {
    let unchanged = before.is_file() && after.is_file() && before.len() == after.len()
        && before.modified()? == after.modified()?;
    #[cfg(unix)]
    let unchanged = unchanged && before.dev() == after.dev() && before.ino() == after.ino()
        && before.mtime() == after.mtime() && before.mtime_nsec() == after.mtime_nsec()
        && before.ctime() == after.ctime() && before.ctime_nsec() == after.ctime_nsec();
    if !unchanged { return Err(OrgFilesystemError::InspectionChanged(path.to_owned())); }
    Ok(())
}

/// Observes a retained regular fd from offset zero with fixed storage and a finite read horizon.
/// No pathname authority is implied: callers must separately validate any installed entry.
/// Metadata/hash observations detect changes but cannot provide an atomic filesystem snapshot.
fn observe_open_file_raw(
    file: &mut cap_std::fs::File,
    path: &str,
) -> OrgFilesystemResult<(u64, String)> {
    std::io::Seek::seek(file, std::io::SeekFrom::Start(0))?;
    let before = file.metadata()?;
    if !before.is_file() {
        return Err(OrgFilesystemError::InvalidPath(path.to_owned()));
    }
    let revision = hash_observed_raw(file, before.len(), path)?;
    require_unchanged_file(&before, &file.metadata()?, path)?;
    Ok((before.len(), revision))
}

fn hash_observed_raw(
    reader: &mut impl Read,
    observed_length: u64,
    path: &str,
) -> OrgFilesystemResult<String> {
    let mut hash = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];
    let mut remaining = observed_length;
    while remaining != 0 {
        let limit = remaining.min(buffer.len() as u64) as usize;
        let count = reader.read(&mut buffer[..limit])?;
        if count == 0 {
            return Err(OrgFilesystemError::InspectionChanged(path.to_owned()));
        }
        hash.update(&buffer[..count]);
        remaining -= count as u64;
        #[cfg(test)]
        tests::run_raw_read_hook();
    }
    let mut extra = [0u8; 1];
    if reader.read(&mut extra)? != 0 {
        return Err(OrgFilesystemError::InspectionChanged(path.to_owned()));
    }
    Ok(hex::encode(hash.finalize()))
}

/// Revision-only reads use fixed storage and at most the captured length plus one growth byte.
/// Metadata/hash checks detect observed changes; they are not a kernel snapshot or atomic CAS.
fn read_open_file_revision_utf8(file: &mut cap_std::fs::File, path: &str) -> OrgFilesystemResult<String> {
    let before = file.metadata()?;
    if !before.is_file() { return Err(OrgFilesystemError::InvalidPath(path.to_owned())); }
    let revision = hash_observed_utf8(file, before.len(), path)?;
    require_unchanged_file(&before, &file.metadata()?, path)?;
    Ok(revision)
}

fn hash_observed_utf8(reader: &mut impl Read, observed_length: u64, path: &str) -> OrgFilesystemResult<String> {
    let mut hash = Sha256::new();
    let mut buffer = [0u8; 64 * 1024 + 3];
    let mut pending = 0;
    let mut remaining = observed_length;
    while remaining != 0 {
        let limit = remaining.min(64 * 1024) as usize;
        let count = reader.read(&mut buffer[pending..pending + limit])?;
        if count == 0 { return Err(OrgFilesystemError::InspectionChanged(path.to_owned())); }
        hash.update(&buffer[pending..pending + count]);
        remaining -= count as u64;
        let length = pending + count;
        pending = match std::str::from_utf8(&buffer[..length]) {
            Ok(_) => 0,
            Err(error) if error.error_len().is_none() => {
                let valid = error.valid_up_to();
                buffer.copy_within(valid..length, 0);
                length - valid
            }
            Err(_) => return Err(OrgFilesystemError::InvalidUtf8(path.to_owned())),
        };
    }
    let mut extra = [0u8; 1];
    if reader.read(&mut extra)? != 0 {
        return Err(OrgFilesystemError::InspectionChanged(path.to_owned()));
    }
    if pending != 0 { return Err(OrgFilesystemError::InvalidUtf8(path.to_owned())); }
    Ok(hex::encode(hash.finalize()))
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

    thread_local! {
        static ACQUISITION_HOOK: std::cell::RefCell<Option<Box<dyn FnOnce()>>> =
            std::cell::RefCell::new(None);
        static RAW_READ_HOOK: std::cell::RefCell<Option<Box<dyn FnOnce()>>> =
            std::cell::RefCell::new(None);
    }

    pub(super) fn run_acquisition_hook() {
        let hook = ACQUISITION_HOOK.with(|slot| slot.borrow_mut().take());
        if let Some(hook) = hook { hook(); }
    }

    pub(super) fn run_raw_read_hook() {
        let hook = RAW_READ_HOOK.with(|slot| slot.borrow_mut().take());
        if let Some(hook) = hook { hook(); }
    }

    #[test]
    fn unsupported_platform_recovery_rejects_regular_retention_markers() {
        for marker in [
            ".grain-write-substituted.tmp",
            ".grain-retaining-substituted.tmp",
            ".grain-resolved-original-1-2-substituted.tmp",
        ] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            root.write("notes.org", "raw\r\n\0body😀").unwrap();
            root.write(marker, b"retained-marker-evidence").unwrap();

            assert!(matches!(
                reject_unrecoverable_org_write_journals(&root),
                Err(OrgFilesystemError::UnsupportedPlatform(_))
            ), "reserved regular-file marker was skipped: {marker}");
            assert_eq!(root.read(marker).unwrap(), b"retained-marker-evidence");
            assert_eq!(
                read_org_document_with_capability(&root, "notes.org").unwrap().content,
                "raw\r\n\0body😀"
            );
        }
    }

    #[cfg(unix)]
    #[test]
    fn unsupported_platform_recovery_rejects_symlink_retention_markers() {
        for marker in [
            ".grain-write-substituted.tmp",
            ".grain-retaining-substituted.tmp",
            ".grain-resolved-original-1-2-substituted.tmp",
        ] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            root.write("notes.org", "raw\r\n\0body😀").unwrap();
            root.create_dir(".grain-aside-evidence.tmp").unwrap();
            let evidence = root.open_dir(".grain-aside-evidence.tmp").unwrap();
            evidence.write("journal.json", b"retained-journal").unwrap();
            root.symlink(".grain-aside-evidence.tmp", marker).unwrap();

            assert!(matches!(
                reject_unrecoverable_org_write_journals(&root),
                Err(OrgFilesystemError::UnsupportedPlatform(_))
            ), "reserved symlink marker was skipped: {marker}");
            assert!(root.symlink_metadata(marker).unwrap().file_type().is_symlink());
            assert_eq!(evidence.read("journal.json").unwrap(), b"retained-journal");
            assert_eq!(
                read_org_document_with_capability(&root, "notes.org").unwrap().content,
                "raw\r\n\0body😀"
            );
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    #[test]
    fn unsupported_write_platform_can_reopen_workspaces_without_manifests() {
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("notes.org"), "raw\r\n\0body").unwrap();
        fs::write(workspace.path().join(".grain-older.tmp"), "unidentified").unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        recover_org_document_writes_with_capability(&root).unwrap();
        assert_eq!(read_org_document_with_capability(&root, "notes.org").unwrap().content, "raw\r\n\0body");
        assert_eq!(scan_org_workspace_with_capability(&root).unwrap().documents.len(), 1);
        assert!(matches!(write_org_document_with_capability(&root, "notes.org", "new", None), Err(OrgFilesystemError::UnsupportedPlatform(_))));
        assert_eq!(root.read("notes.org").unwrap(), b"raw\r\n\0body");
    }

    #[test]
    fn streaming_revision_validates_utf8_across_chunk_and_short_read_boundaries() {
        struct ShortReads<R>(R);
        impl<R: Read> Read for ShortReads<R> {
            fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
                let limit = buffer.len().min(1);
                self.0.read(&mut buffer[..limit])
            }
        }
        for prefix in (64 * 1024 - 3)..=(64 * 1024) {
            let content = format!("{}é古🦀\r\n\0tail", "a".repeat(prefix));
            let expected = revision(content.as_bytes());
            assert_eq!(hash_observed_utf8(&mut io::Cursor::new(content.as_bytes()), content.len() as u64, "notes.org").unwrap(), expected);
            assert_eq!(hash_observed_utf8(&mut ShortReads(io::Cursor::new(content.as_bytes())), content.len() as u64, "notes.org").unwrap(), expected);
        }
        for bytes in [b"valid\xff".as_slice(), b"valid\xe2\x82".as_slice(), b"\xf0\x80\x80\x80".as_slice()] {
            assert!(matches!(hash_observed_utf8(&mut io::Cursor::new(bytes), bytes.len() as u64, "notes.org"), Err(OrgFilesystemError::InvalidUtf8(_))));
        }
        assert_eq!(hash_observed_utf8(&mut io::Cursor::new([]), 0, "notes.org").unwrap(), revision(b""));
    }

    #[test]
    fn streaming_revision_stops_at_observed_length_even_when_every_read_grows_the_file() {
        struct GrowingFile {
            reader: fs::File,
            writer: fs::File,
            bytes_read: u64,
            calls: usize,
        }
        impl Read for GrowingFile {
            fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
                self.writer.write_all(&[b'x'; 1024])?;
                self.writer.sync_all()?;
                self.calls += 1;
                let count = self.reader.read(buffer)?;
                self.bytes_read += count as u64;
                Ok(count)
            }
        }
        let workspace = tempdir().unwrap();
        let path = workspace.path().join("growing.org");
        let observed = 2 * 64 * 1024 + 7;
        fs::write(&path, vec![b'a'; observed]).unwrap();
        let mut reader = GrowingFile {
            reader: fs::File::open(&path).unwrap(),
            writer: fs::OpenOptions::new().append(true).open(&path).unwrap(),
            bytes_read: 0, calls: 0,
        };
        assert!(matches!(hash_observed_utf8(&mut reader, observed as u64, "growing.org"), Err(OrgFilesystemError::InspectionChanged(_))));
        assert_eq!(reader.bytes_read, observed as u64 + 1);
        assert!(reader.calls >= 4);
        assert_eq!(fs::metadata(&path).unwrap().len(), observed as u64 + reader.calls as u64 * 1024);
        assert!(matches!(hash_observed_utf8(&mut io::Cursor::new(b"short"), 10, "notes.org"), Err(OrgFilesystemError::InspectionChanged(_))));
    }

    #[test]
    fn revision_inspection_detects_observed_length_change_without_imposing_a_document_limit() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let mut options = OpenOptions::new();
        options.read(true).write(true).create_new(true);
        let mut file = root.open_with("large.org", &options).unwrap();
        let length = 17 * 1024 * 1024;
        file.set_len(length).unwrap();
        let mut expected = Sha256::new();
        let zeros = [0u8; 64 * 1024];
        for _ in 0..(length / (64 * 1024)) { expected.update(&zeros); }
        assert_eq!(read_open_file_revision_utf8(&mut file, "large.org").unwrap(), hex::encode(expected.finalize()));
        let before = file.metadata().unwrap();
        file.set_len(length + 1).unwrap();
        assert!(matches!(require_unchanged_file(&before, &file.metadata().unwrap(), "large.org"), Err(OrgFilesystemError::InspectionChanged(_))));
        let snapshot = scan_org_workspace_with_capability(&root).unwrap();
        assert_eq!(snapshot.documents.len(), 1);
        assert_eq!(snapshot.documents[0].relative_path, "large.org");
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    #[test]
    fn unsupported_write_platform_retains_manifested_interrupted_writes() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.create_dir(".grain-write-pending.tmp").unwrap();
        let pending = root.open_dir(".grain-write-pending.tmp").unwrap();
        pending.write("journal.json", "manifest").unwrap();
        pending.write("old", "old\r\n").unwrap();
        assert!(matches!(recover_org_document_writes_with_capability(&root), Err(OrgFilesystemError::UnsupportedPlatform(_))));
        assert_eq!(pending.read("journal.json").unwrap(), b"manifest");
        assert_eq!(pending.read("old").unwrap(), b"old\r\n");
    }

    fn recovery_graph_fixture() -> LegacyRecoveryGraph {
        LegacyRecoveryGraph {
            workspace: LegacyRecoveryWorkspace {
                id: "workspace".into(), name: "Book\0目录".into(), description: Some("原始 description\0".into()),
                created_at: i64::MAX.to_string(), updated_at: i64::MIN.to_string(),
            },
            nodes: [
                ("folder", Some("child"), "folder", "9007199254740993"),
                ("child", Some("folder"), "file", "-9007199254740993"),
                ("orphan", Some("unexported-parent"), "unknown-node-kind", "0"),
            ].into_iter().map(|(id, parent, kind, order)| LegacyRecoveryNode {
                id: id.into(), workspace_id: "workspace".into(), parent_id: parent.map(str::to_owned),
                title: format!("原始 {id}\0"), node_type: kind.into(), is_collapsed: "9007199254740993".into(),
                sort_order: order.into(), tags: Some("[ \"原始\" ]".into()),
                created_at: i64::MAX.to_string(), updated_at: i64::MIN.to_string(),
            }).collect(),
        }
    }

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
                "version": 2,
                "graph": recovery_graph_fixture(),
                "recoverySqlPath": format!("{root}/{MIGRATION_RECOVERY_SQL_FILE}"),
                "directories": [], "documents": [], "nodes": [], "warnings": []
            }))
            .unwrap()
        )
    }

    #[tokio::test]
    async fn verified_recovery_restores_exact_workspace_graph_and_raw_rows_after_restart() {
        use sea_orm::{ConnectionTrait, Database, FromQueryResult, Statement};
        let workspace = tempdir().unwrap();
        let graph = recovery_graph_fixture();
        let backups = vec![
            OrgMigrationRecoveryBackup {
                path: "Book/_migration-raw-backups/empty.txt".into(),
                content_id: "empty".into(), content_type: "unknown/content-type".into(),
                node_id: "folder".into(), content: "".into(), version: "9007199254740993".into(),
                created_at: i64::MAX.to_string(), updated_at: i64::MIN.to_string(),
            },
            OrgMigrationRecoveryBackup {
                path: "Book/_migration-raw-backups/unicode.txt".into(),
                content_id: "unicode".into(), content_type: "text".into(),
                node_id: "missing-node".into(), content: "quote '\0你好📚".into(), version: "7".into(),
                created_at: "11".into(), updated_at: "13".into(),
            },
            OrgMigrationRecoveryBackup {
                path: "Book/_migration-raw-backups/duplicate.txt".into(),
                content_id: "duplicate".into(), content_type: "excalidraw".into(),
                node_id: "folder".into(), content: "secondary raw".into(), version: "1".into(),
                created_at: "1".into(), updated_at: "2".into(),
            },
            OrgMigrationRecoveryBackup {
                path: "Book/_migration-raw-backups/child.txt".into(),
                content_id: "child-content".into(), content_type: "text".into(),
                node_id: "child".into(), content: "文件 body\0📚".into(), version: i64::MAX.to_string(),
                created_at: i64::MIN.to_string(), updated_at: i64::MAX.to_string(),
            },
        ];
        let metadata: Vec<_> = backups.iter().map(|backup| {
            let mut value = serde_json::to_value(backup).unwrap();
            value.as_object_mut().unwrap().remove("content");
            value
        }).collect();
        let manifest = recovery_manifest("Book", serde_json::json!(metadata));
        let sql = workspace_recovery_sql(&graph, &backups);
        let capability = open_workspace_capability(workspace.path()).unwrap();
        let mut artifacts: Vec<_> = backups.iter().map(|backup| OrgMigrationArtifact {
            relative_path: backup.path.clone(), content: backup.content.clone(),
        }).collect();
        artifacts.push(OrgMigrationArtifact { relative_path: "Book/migration-manifest.json".into(), content: manifest.clone() });
        artifacts.push(OrgMigrationArtifact { relative_path: format!("Book/{MIGRATION_RECOVERY_SQL_FILE}"), content: sql });
        let write = write_org_migration_with_capability(
            &capability, vec!["Book".into(), "Book/_migration-raw-backups".into()], artifacts,
        ).unwrap();
        let verified = verify_org_migration_with_capability(
            &capability, &write.verification_path, write.artifacts.clone(),
        ).unwrap();
        assert!(verified.mismatches.is_empty());
        let bundle = read_org_migration_recovery_bundle_with_capability(&capability, "Book/migration-manifest.json").unwrap();
        assert_eq!(bundle.graph, graph);
        assert_eq!(bundle.raw_backups, backups);
        let restored_path = workspace.path().join("owned-restored.sqlite");
        let url = format!("sqlite://{}?mode=rwc", restored_path.display());
        let db = Database::connect(&url).await.unwrap();
        for statement in bundle.recovery_sql.split_once('\n').unwrap().1.split(';').filter(|sql| !sql.trim().is_empty()) {
            db.execute_raw(Statement::from_string(db.get_database_backend(), statement.to_owned())).await.unwrap();
        }
        db.close().await.unwrap();
        // Reopen both SQLite and the directory capability before checking every recovered tuple.
        let db = Database::connect(&url).await.unwrap();
        let restored_workspace = LegacyRecoveryWorkspace::find_by_statement(Statement::from_string(db.get_database_backend(),
            "SELECT id,name,description,CAST(created_at AS TEXT) AS created_at,CAST(updated_at AS TEXT) AS updated_at FROM workspaces".to_owned(),
        )).one(&db).await.unwrap().unwrap();
        assert_eq!(restored_workspace, graph.workspace);
        let restored_nodes = LegacyRecoveryNode::find_by_statement(Statement::from_string(db.get_database_backend(),
            "SELECT id,workspace_id,parent_id,title,node_type,CAST(is_collapsed AS TEXT) AS is_collapsed,CAST(sort_order AS TEXT) AS sort_order,tags,CAST(created_at AS TEXT) AS created_at,CAST(updated_at AS TEXT) AS updated_at FROM nodes ORDER BY id".to_owned(),
        )).all(&db).await.unwrap();
        let mut expected_nodes = graph.nodes.clone();
        expected_nodes.sort_by(|left, right| left.id.cmp(&right.id));
        assert_eq!(restored_nodes, expected_nodes);
        #[derive(Debug, PartialEq, Eq, sea_orm::FromQueryResult)]
        struct ContentTuple {
            id: String, node_id: String, content: String, content_type: String,
            version: String, created_at: String, updated_at: String,
        }
        let restored_contents = ContentTuple::find_by_statement(Statement::from_string(db.get_database_backend(),
            "SELECT c.id,c.node_id,c.content,t.content_type,CAST(c.version AS TEXT) AS version,CAST(c.created_at AS TEXT) AS created_at,CAST(c.updated_at AS TEXT) AS updated_at FROM contents c JOIN grain_recovery_content_types t ON t.content_id=c.id ORDER BY c.id".to_owned(),
        )).all(&db).await.unwrap();
        let mut expected_contents: Vec<_> = backups.iter().map(|backup| ContentTuple {
            id: backup.content_id.clone(), node_id: backup.node_id.clone(), content: backup.content.clone(),
            content_type: backup.content_type.clone(), version: backup.version.clone(),
            created_at: backup.created_at.clone(), updated_at: backup.updated_at.clone(),
        }).collect();
        expected_contents.sort_by(|left, right| left.id.cmp(&right.id));
        assert_eq!(restored_contents, expected_contents);
        db.close().await.unwrap();
        drop(capability);
        let reopened = open_workspace_capability(workspace.path()).unwrap();
        assert!(verify_org_migration_with_capability(&reopened, &write.verification_path, write.artifacts).unwrap().mismatches.is_empty());
        assert_eq!(read_org_migration_recovery_bundle_with_capability(&reopened, "Book/migration-manifest.json").unwrap(), bundle);
    }

    #[test]
    fn recovery_bundle_rejects_old_optional_fabricated_and_corrupt_graph_receipts() {
        let workspace = tempdir().unwrap();
        let migration_root = workspace.path().join("Book");
        fs::create_dir(&migration_root).unwrap();
        let manifest_path = migration_root.join(MIGRATION_MANIFEST_FILE);
        let sql_path = migration_root.join(MIGRATION_RECOVERY_SQL_FILE);
        let valid: serde_json::Value = serde_json::from_str(&recovery_manifest("Book", serde_json::json!([]))).unwrap();
        fs::write(&sql_path, workspace_recovery_sql(&recovery_graph_fixture(), &[])).unwrap();
        let capability = open_workspace_capability(workspace.path()).unwrap();
        for mutation in 0..11 {
            let mut invalid = valid.clone();
            match mutation {
                0 => { invalid.as_object_mut().unwrap().remove("graph"); }
                1 => { invalid["graph"] = serde_json::Value::Null; }
                2 => { invalid["version"] = serde_json::json!(1); }
                3 => { invalid["graph"]["workspace"]["createdAt"] = serde_json::json!("9223372036854775808"); }
                4 => { invalid["graph"]["nodes"][0]["sortOrder"] = serde_json::json!("01"); }
                5 => { invalid["graph"]["nodes"][0]["workspaceId"] = serde_json::json!("unrelated"); }
                6 => { invalid["graph"]["nodes"][1]["id"] = invalid["graph"]["nodes"][0]["id"].clone(); }
                7 => { invalid["graph"]["workspace"].as_object_mut().unwrap().remove("description"); }
                8 => { invalid["graph"]["nodes"][0].as_object_mut().unwrap().remove("parentId"); }
                9 => { invalid["graph"]["nodes"][0].as_object_mut().unwrap().remove("tags"); }
                _ => { invalid["oldAlias"] = serde_json::json!(true); }
            }
            fs::write(&manifest_path, serde_json::to_string(&invalid).unwrap()).unwrap();
            assert!(matches!(
                read_org_migration_recovery_bundle_with_capability(&capability, "Book/migration-manifest.json"),
                Err(OrgFilesystemError::InvalidManifest(_))
            ));
        }
        fs::write(&manifest_path, serde_json::to_string(&valid).unwrap()).unwrap();
        fs::write(&sql_path, "DROP TABLE nodes;").unwrap();
        assert!(matches!(
            read_org_migration_recovery_bundle_with_capability(&capability, "Book/migration-manifest.json"),
            Err(OrgFilesystemError::InvalidManifest(_))
        ));
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

    #[cfg(target_os = "linux")]
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

    #[cfg(target_os = "linux")]
    #[test]
    fn unknown_org_syntax_is_preserved() {
        let workspace = tempdir().unwrap();
        let content = "#+future_extension: ☃\n* TODO [#A] Strange :tag:\n:PROPERTIES:\n:X-UNKNOWN: a\\tb\n:END:\n";
        write_org_document(workspace.path(), "unknown.org", content, None).unwrap();

        let document = read_org_document(workspace.path(), "unknown.org").unwrap();
        assert_eq!(document.content.as_bytes(), content.as_bytes());
    }

    #[cfg(unix)]
    #[test]
    fn read_absence_proof_never_describes_directory_symlink_or_unknown_bytes() {
        let workspace = tempdir().unwrap();
        for path in ["missing.org", "missing-parent/note.org"] {
            assert!(matches!(
                &read_org_document(workspace.path(), path),
                Err(OrgFilesystemError::ProvenAbsent(observed)) if observed == path
            ));
        }
        fs::create_dir(workspace.path().join("directory.org")).unwrap();
        fs::write(workspace.path().join("invalid.org"), [0xff]).unwrap();
        std::os::unix::fs::symlink("missing.org", workspace.path().join("dangling.org")).unwrap();
        std::os::unix::fs::symlink("directory.org", workspace.path().join("linked-parent")).unwrap();
        assert!(matches!(read_org_document(workspace.path(), "directory.org"), Err(OrgFilesystemError::InvalidPath(_))));
        assert!(matches!(read_org_document(workspace.path(), "invalid.org"), Err(OrgFilesystemError::InvalidUtf8(_))));
        assert!(matches!(read_org_document(workspace.path(), "dangling.org"), Err(OrgFilesystemError::OutsideWorkspace(_))));
        assert!(matches!(read_org_document(workspace.path(), "linked-parent/missing.org"), Err(OrgFilesystemError::OutsideWorkspace(_))));
        fs::write(workspace.path().join("missing.org"), "new owner\r\n\0😀").unwrap();
        assert_eq!(read_org_document(workspace.path(), "missing.org").unwrap().content, "new owner\r\n\0😀");
    }

    #[test]
    fn traversal_and_absolute_paths_are_rejected() {
        let workspace = tempdir().unwrap();
        for path in [
            "../escape.org",
            "nested/../../escape.org",
            "nested\\escape.org",
            "nested//escape.org",
            "nested/./escape.org",
        ] {
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

    #[cfg(target_os = "linux")]
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

    #[cfg(target_os = "linux")]
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

    #[cfg(target_os = "linux")]
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

    #[cfg(target_os = "linux")]
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

    #[cfg(target_os = "linux")]
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

    #[cfg(target_os = "linux")]
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
        #[cfg(target_os = "linux")]
        {
            write_org_document_with_capability(&capability, "created.org", "safe", None).unwrap();
            assert_eq!(fs::read_to_string(retained.join("created.org")).unwrap(), "safe");
            assert!(!selected.join("created.org").exists());
        }
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

    #[cfg(unix)]
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

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    fn migration_publication_fixture(root: &Dir) -> OrgFilesystemResult<OrgMigrationWriteResult> {
        write_org_migration_with_capability(
            root,
            vec!["migration".into(), "migration/alpha/deep".into(), "migration/beta".into()],
            vec![
                OrgMigrationArtifact { relative_path: "migration/alpha/deep/one.org".into(), content: "* One\r\n\0😀".into() },
                OrgMigrationArtifact { relative_path: "migration/beta/two.org".into(), content: "* Two\n".into() },
                OrgMigrationArtifact { relative_path: "migration/root.org".into(), content: "* Root\n".into() },
            ],
        )
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    #[test]
    fn migration_multidirectory_publication_keeps_expected_visible_bytes_and_verifies() {
        for copy in [false, true] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let result = with_migration_race(Box::new(|_, _, _| Ok(())), copy,
                || migration_publication_fixture(&root)).unwrap();
            assert_eq!(root.read("migration/alpha/deep/one.org").unwrap(), b"* One\r\n\0\xf0\x9f\x98\x80");
            assert_eq!(root.read("migration/beta/two.org").unwrap(), b"* Two\n");
            assert_eq!(root.read("migration/root.org").unwrap(), b"* Root\n");
            assert_eq!(result.written_paths.len(), 4);
            let verification = verify_org_migration_with_capability(&root, &result.verification_path, result.artifacts).unwrap();
            assert!(verification.mismatches.is_empty());
            let scan = scan_org_workspace_with_capability(&root).unwrap();
            assert_eq!(scan.documents.len(), 3);
            assert!(scan.documents.iter().all(|document| !document.relative_path.contains(".grain-")));
        }
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    #[test]
    fn migration_failure_preserves_foreign_temporary_and_original_stage_entries() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let evidence = std::rc::Rc::new(std::cell::RefCell::new(None));
        let recorded = evidence.clone();
        let mut changed = false;
        let result = with_migration_race(Box::new(move |point, parent, name| {
            if point == MigrationRacePoint::BeforeFilePublication && !changed {
                changed = true;
                parent.rename(name, parent, ".grain-held-stage.tmp")?;
                parent.write(name, b"foreign-stage")?;
                *recorded.borrow_mut() = Some((parent.try_clone()?, name.to_os_string()));
            }
            Ok(())
        }), false, || migration_publication_fixture(&root));
        assert!(matches!(result, Err(OrgFilesystemError::InspectionChanged(_))));
        let evidence = evidence.borrow();
        let (parent, name) = evidence.as_ref().unwrap();
        assert_eq!(parent.read(name).unwrap(), b"foreign-stage");
        assert_eq!(parent.read(".grain-held-stage.tmp").unwrap(), b"* One\r\n\0\xf0\x9f\x98\x80");
        assert!(root.symlink_metadata("migration").is_err());
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    #[test]
    fn migration_failure_preserves_foreign_installed_entry_and_complete_held_stage() {
        for copy in [false, true] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let evidence = std::rc::Rc::new(std::cell::RefCell::new(None));
            let recorded = evidence.clone();
            let mut changed = false;
            let result = with_migration_race(Box::new(move |point, parent, name| {
                if point == MigrationRacePoint::AfterFilePublication && !changed {
                    changed = true;
                    parent.rename("one.org", parent, ".grain-held-installed.tmp")?;
                    parent.write("one.org", b"foreign-installed")?;
                    *recorded.borrow_mut() = Some((parent.try_clone()?, name.to_os_string()));
                }
                Ok(())
            }), copy, || migration_publication_fixture(&root));
            assert!(matches!(result, Err(OrgFilesystemError::InspectionChanged(_))));
            let evidence = evidence.borrow();
            let (parent, name) = evidence.as_ref().unwrap();
            assert_eq!(parent.read("one.org").unwrap(), b"foreign-installed");
            assert_eq!(parent.read(".grain-held-installed.tmp").unwrap(), b"* One\r\n\0\xf0\x9f\x98\x80");
            assert_eq!(parent.read(name).unwrap(), b"* One\r\n\0\xf0\x9f\x98\x80");
        }
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    #[test]
    fn migration_refuses_substituted_root_before_publication_and_before_acknowledgement() {
        for boundary in [MigrationRacePoint::BeforeRootPublication, MigrationRacePoint::AfterRootSourceCheck, MigrationRacePoint::BeforeRootSync] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let replaced_name = std::rc::Rc::new(std::cell::RefCell::new(None));
            let recorded = replaced_name.clone();
            let result = with_migration_race(Box::new(move |point, parent, name| {
                if point == boundary {
                    parent.rename(name, parent, ".grain-held-root.tmp")?;
                    parent.create_dir(name)?;
                    parent.open_dir(name)?.write("foreign.txt", b"foreign-root")?;
                    *recorded.borrow_mut() = Some(if boundary == MigrationRacePoint::AfterRootSourceCheck {
                        OsString::from("migration")
                    } else {
                        name.to_os_string()
                    });
                }
                Ok(())
            }), false, || migration_publication_fixture(&root));
            assert!(matches!(result, Err(OrgFilesystemError::InspectionChanged(_))));
            let name = replaced_name.borrow();
            assert_eq!(root.open_dir(name.as_ref().unwrap()).unwrap().read("foreign.txt").unwrap(), b"foreign-root");
            let held = root.open_dir(".grain-held-root.tmp").unwrap();
            assert_eq!(held.read("alpha/deep/one.org").unwrap(), b"* One\r\n\0\xf0\x9f\x98\x80");
            assert_eq!(held.read("beta/two.org").unwrap(), b"* Two\n");
            assert_eq!(held.read("root.org").unwrap(), b"* Root\n");
            assert!(held.read(MIGRATION_VERIFICATION_FILE).unwrap().len() > 0);
        }
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    #[test]
    fn migration_refuses_same_inode_bytes_changed_during_later_staging() {
        for copy in [false, true] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let evidence = std::rc::Rc::new(std::cell::RefCell::new(None::<(Dir, OsString, UnixIdentity)>));
            let recorded = evidence.clone();
            let mut count = 0;
            let result = with_migration_race(Box::new(move |point, parent, name| {
                if point == MigrationRacePoint::AfterStage {
                    count += 1;
                    if count == 1 {
                        *recorded.borrow_mut() = Some((parent.try_clone()?, name.to_os_string(), entry_identity(parent, name)?.unwrap()));
                    } else if count == 2 {
                        let evidence = recorded.borrow();
                        let (parent, name, _) = evidence.as_ref().unwrap();
                        parent.write(name, b"changed-body")?;
                    }
                }
                Ok(())
            }), copy, || migration_publication_fixture(&root));
            assert!(matches!(result, Err(OrgFilesystemError::InspectionChanged(_))));
            let evidence = evidence.borrow();
            let (parent, name, identity) = evidence.as_ref().unwrap();
            assert_eq!(entry_identity(parent, name).unwrap(), Some(*identity));
            assert_eq!(parent.read(name).unwrap(), b"changed-body");
            assert!(root.symlink_metadata("migration").is_err());
        }
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn migration_refuses_observed_named_source_swap_restore_without_publishing_foreign_bytes() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let evidence = std::rc::Rc::new(std::cell::RefCell::new(None));
        let recorded = evidence.clone();
        let mut changed = false;
        let result = with_migration_race(Box::new(move |point, parent, name| {
            if point == MigrationRacePoint::BeforeDescriptorPublication && !changed {
                changed = true;
                parent.rename(name, parent, ".grain-held-stage.tmp")?;
                parent.write(name, b"foreign-transient")?;
                *recorded.borrow_mut() = Some((parent.try_clone()?, name.to_os_string()));
            } else if point == MigrationRacePoint::AfterFilePublication && changed {
                parent.rename(name, parent, ".grain-foreign-stage.tmp")?;
                parent.rename(".grain-held-stage.tmp", parent, name)?;
            }
            Ok(())
        }), false, || migration_publication_fixture(&root));
        assert!(matches!(result, Err(OrgFilesystemError::InspectionChanged(_))));
        let evidence = evidence.borrow();
        let (parent, name) = evidence.as_ref().unwrap();
        assert_eq!(parent.read(name).unwrap(), b"* One\r\n\0\xf0\x9f\x98\x80");
        assert_eq!(parent.read(".grain-foreign-stage.tmp").unwrap(), b"foreign-transient");
        assert_eq!(parent.read("one.org").unwrap(), b"* One\r\n\0\xf0\x9f\x98\x80");
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    #[test]
    fn migration_root_sync_boundary_failure_retains_published_tree_and_foreign_replacement() {
        for replace in [false, true] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let result = with_migration_race(Box::new(move |point, parent, name| {
                if point == MigrationRacePoint::BeforeRootSync {
                    if replace {
                        parent.rename(name, parent, ".grain-held-root.tmp")?;
                        parent.create_dir(name)?;
                        parent.open_dir(name)?.write("foreign.txt", b"foreign-after-publish")?;
                    }
                    return Err(io::Error::other("injected root durability failure"));
                }
                Ok(())
            }), false, || migration_publication_fixture(&root));
            assert!(result.is_err(), "a failed durability boundary must not receive a migration ACK");
            let held_name = if replace { ".grain-held-root.tmp" } else { "migration" };
            let held = root.open_dir(held_name).unwrap();
            assert_eq!(held.read("alpha/deep/one.org").unwrap(), b"* One\r\n\0\xf0\x9f\x98\x80");
            assert_eq!(held.read("beta/two.org").unwrap(), b"* Two\n");
            assert_eq!(held.read("root.org").unwrap(), b"* Root\n");
            let manifest: OrgMigrationVerificationManifest =
                serde_json::from_slice(&held.read(MIGRATION_VERIFICATION_FILE).unwrap()).unwrap();
            let expected = [
                ("migration/alpha/deep/one.org", &b"* One\r\n\0\xf0\x9f\x98\x80"[..]),
                ("migration/beta/two.org", &b"* Two\n"[..]),
                ("migration/root.org", &b"* Root\n"[..]),
            ].map(|(path, bytes)| OrgMigrationArtifactSummary {
                relative_path: path.to_owned(),
                byte_length: bytes.len() as u64,
                revision: revision(bytes),
            });
            assert_eq!(manifest.artifacts, expected);
            if replace {
                assert_eq!(root.read("migration/foreign.txt").unwrap(), b"foreign-after-publish");
            }
        }
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    #[test]
    fn migration_directory_creation_never_chmods_or_follows_a_substituted_symlink() {
        use std::os::unix::fs::PermissionsExt as _;
        let workspace = tempdir().unwrap();
        let outside = tempdir().unwrap();
        fs::set_permissions(outside.path(), fs::Permissions::from_mode(0o755)).unwrap();
        fs::write(outside.path().join("evidence.txt"), b"outside-evidence").unwrap();
        let outside_path = outside.path().to_path_buf();
        let workspace_path = workspace.path().to_path_buf();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let replaced_name = std::rc::Rc::new(std::cell::RefCell::new(None));
        let recorded = replaced_name.clone();
        let result = with_migration_race(Box::new(move |point, parent, name| {
            if point == MigrationRacePoint::AfterDirectoryCreation {
                parent.rename(name, parent, ".grain-original-directory.tmp")?;
                std::os::unix::fs::symlink(&outside_path, workspace_path.join(name))?;
                *recorded.borrow_mut() = Some(name.to_os_string());
            }
            Ok(())
        }), false, || migration_publication_fixture(&root));
        assert!(result.is_err(), "a substituted directory must not receive a migration ACK");
        assert_eq!(fs::metadata(outside.path()).unwrap().permissions().mode() & 0o777, 0o755);
        assert_eq!(fs::read(outside.path().join("evidence.txt")).unwrap(), b"outside-evidence");
        assert!(root.symlink_metadata(replaced_name.borrow().as_ref().unwrap()).unwrap().file_type().is_symlink());
        assert!(root.open_dir(".grain-original-directory.tmp").unwrap().entries().unwrap().next().is_none());
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn migration_darwin_copy_path_reads_retained_fd_and_preserves_swapped_source() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let evidence = std::rc::Rc::new(std::cell::RefCell::new(None));
        let recorded = evidence.clone();
        let mut changed = false;
        let result = with_migration_race(Box::new(move |point, parent, name| {
            if point == MigrationRacePoint::BeforeDescriptorPublication && !changed {
                changed = true;
                parent.rename(name, parent, ".grain-held-stage.tmp")?;
                parent.write(name, b"foreign-source")?;
                *recorded.borrow_mut() = Some((parent.try_clone()?, name.to_os_string()));
            }
            Ok(())
        }), true, || migration_publication_fixture(&root));
        assert!(matches!(result, Err(OrgFilesystemError::InspectionChanged(_))));
        let evidence = evidence.borrow();
        let (parent, name) = evidence.as_ref().unwrap();
        assert_eq!(parent.read(name).unwrap(), b"foreign-source");
        assert_eq!(parent.read(".grain-held-stage.tmp").unwrap(), b"* One\r\n\0\xf0\x9f\x98\x80");
        assert_eq!(parent.read("one.org").unwrap(), b"* One\r\n\0\xf0\x9f\x98\x80");
        assert!(root.symlink_metadata("migration").is_err());
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    #[test]
    fn migration_final_acknowledgement_refuses_changed_bytes_and_unreachable_held_directory() {
        for replace_directory in [false, true] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let result = with_migration_race(Box::new(move |point, parent, name| {
                if point == MigrationRacePoint::BeforeAcknowledgement {
                    let published = parent.open_dir(name)?;
                    if replace_directory {
                        let alpha = published.open_dir("alpha")?;
                        alpha.rename("deep", &alpha, ".grain-held-directory.tmp")?;
                        alpha.create_dir("deep")?;
                        alpha.open_dir("deep")?.write("one.org", b"foreign-directory-body")?;
                    } else {
                        published.write("root.org", b"edited-published-body")?;
                    }
                }
                Ok(())
            }), false, || migration_publication_fixture(&root));
            assert!(matches!(result, Err(OrgFilesystemError::InspectionChanged(_))));
            if replace_directory {
                assert_eq!(root.read("migration/alpha/deep/one.org").unwrap(), b"foreign-directory-body");
                assert_eq!(root.read("migration/alpha/.grain-held-directory.tmp/one.org").unwrap(), b"* One\r\n\0\xf0\x9f\x98\x80");
            } else {
                assert_eq!(root.read("migration/root.org").unwrap(), b"edited-published-body");
            }
            assert_eq!(root.read("migration/beta/two.org").unwrap(), b"* Two\n");
            assert!(root.read("migration/migration-verification.json").unwrap().len() > 0);
        }
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

    #[cfg(unix)]
    #[test]
    fn migration_readers_reject_fifo_swapped_at_acquisition_without_waiting_for_a_writer() {
        use std::os::unix::ffi::OsStrExt as _;
        use std::sync::mpsc;
        use std::time::Duration;

        for limited in [false, true] {
            let workspace = tempdir().unwrap();
            fs::write(workspace.path().join("artifact"), b"original").unwrap();
            let path = workspace.path().to_path_buf();
            let root = open_workspace_capability(&path).unwrap();
            let (sender, receiver) = mpsc::channel();
            let worker = std::thread::spawn(move || {
                ACQUISITION_HOOK.with(|slot| {
                    *slot.borrow_mut() = Some(Box::new(move || {
                        fs::rename(path.join("artifact"), path.join("original")).unwrap();
                        let fifo = std::ffi::CString::new(path.join("artifact").as_os_str().as_bytes()).unwrap();
                        assert_eq!(unsafe { libc::mkfifo(fifo.as_ptr(), 0o600) }, 0);
                    }));
                });
                let rejected = if limited {
                    read_capability_file_utf8_limited(&root, Path::new("artifact"), "artifact", 1024).is_err()
                } else {
                    read_optional_regular_file(&root, Path::new("artifact"), "artifact").is_err()
                };
                sender.send(rejected).unwrap();
            });
            assert!(receiver.recv_timeout(Duration::from_secs(2))
                .expect("regular-file acquisition blocked on a replacement FIFO"));
            worker.join().unwrap();
            assert_eq!(fs::read(workspace.path().join("original")).unwrap(), b"original");
        }
    }

    #[cfg(unix)]
    #[test]
    fn migration_readers_refuse_symlink_and_foreign_inode_acquisition_swaps() {
        for limited in [false, true] {
            for symlink in [false, true] {
                let workspace = tempdir().unwrap();
                fs::write(workspace.path().join("artifact"), b"original").unwrap();
                fs::write(workspace.path().join("foreign"), b"\xffforeign-body").unwrap();
                let root = open_workspace_capability(workspace.path()).unwrap();
                let path = workspace.path().to_path_buf();
                ACQUISITION_HOOK.with(|slot| {
                    *slot.borrow_mut() = Some(Box::new(move || {
                        fs::rename(path.join("artifact"), path.join("original")).unwrap();
                        if symlink {
                            std::os::unix::fs::symlink("foreign", path.join("artifact")).unwrap();
                        } else {
                            fs::rename(path.join("foreign"), path.join("artifact")).unwrap();
                        }
                    }));
                });
                let error = if limited {
                    read_capability_file_utf8_limited(&root, Path::new("artifact"), "artifact", 1024).unwrap_err()
                } else {
                    read_optional_regular_file(&root, Path::new("artifact"), "artifact").unwrap_err()
                };
                if !symlink {
                    assert!(matches!(error, OrgFilesystemError::InspectionChanged(_)));
                } else {
                    assert!(!matches!(error, OrgFilesystemError::InvalidUtf8(_)));
                }
                assert_eq!(fs::read(workspace.path().join("original")).unwrap(), b"original");
            }
        }
    }

    #[test]
    fn raw_hash_has_a_fixed_buffer_and_finite_growth_horizon() {
        struct GrowingReader { consumed: u64, maximum_request: usize }
        impl Read for GrowingReader {
            fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
                self.maximum_request = self.maximum_request.max(buffer.len());
                buffer.fill(0xff);
                self.consumed += buffer.len() as u64;
                Ok(buffer.len())
            }
        }
        let observed_length = 200_000;
        let mut reader = GrowingReader { consumed: 0, maximum_request: 0 };
        assert!(matches!(
            hash_observed_raw(&mut reader, observed_length, "growing"),
            Err(OrgFilesystemError::InspectionChanged(_))
        ));
        assert_eq!(reader.consumed, observed_length + 1);
        assert_eq!(reader.maximum_request, 64 * 1024);
    }

    #[cfg(unix)]
    #[test]
    fn raw_fd_observation_rejects_same_inode_growth_shrink_and_overwrite() {
        use std::os::unix::fs::FileExt as _;
        use std::time::{Duration, SystemTime};

        for mutation in ["grow", "shrink", "overwrite"] {
            let workspace = tempdir().unwrap();
            let path = workspace.path().join("artifact");
            fs::write(&path, vec![b'a'; 192 * 1024]).unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let mut file = root.open("artifact").unwrap();
            let original_identity = file_identity(&file).unwrap();
            RAW_READ_HOOK.with(|slot| {
                *slot.borrow_mut() = Some(Box::new(move || {
                    let writer = fs::OpenOptions::new().write(true).open(path).unwrap();
                    match mutation {
                        "grow" => writer.set_len(256 * 1024).unwrap(),
                        "shrink" => writer.set_len(32 * 1024).unwrap(),
                        "overwrite" => writer.write_all_at(b"changed!", 0).unwrap(),
                        _ => unreachable!(),
                    }
                    writer.set_modified(SystemTime::UNIX_EPOCH + Duration::from_secs(1)).unwrap();
                }));
            });
            assert!(matches!(
                observe_open_file_raw(&mut file, "artifact"),
                Err(OrgFilesystemError::InspectionChanged(_))
            ));
            assert_eq!(file_identity(&file).unwrap(), original_identity);
        }
    }

    #[cfg(unix)]
    #[test]
    fn migration_verification_streams_large_sparse_binary_mismatch_with_actual_summary() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let written = write_org_migration_with_capability(
            &root, vec!["migration".to_owned()],
            vec![OrgMigrationArtifact {
                relative_path: "migration/artifact.org".to_owned(),
                content: "original".to_owned(),
            }],
        ).unwrap();
        let path = workspace.path().join("migration/artifact.org");
        let original_identity = fs::metadata(&path).unwrap();
        let length = 32 * 1024 * 1024 + 1;
        let mut file = fs::OpenOptions::new().write(true).truncate(true).open(&path).unwrap();
        file.set_len(length).unwrap();
        std::io::Seek::seek(&mut file, std::io::SeekFrom::Start(length - 1)).unwrap();
        file.write_all(&[0xff]).unwrap();
        use std::os::unix::fs::MetadataExt as _;
        assert_eq!(fs::metadata(&path).unwrap().ino(), original_identity.ino());

        let mut expected_hash = Sha256::new();
        let zeros = [0u8; 64 * 1024];
        for _ in 0..512 { expected_hash.update(&zeros); }
        expected_hash.update([0xff]);
        let result = verify_org_migration_with_capability(
            &root, &written.verification_path, written.artifacts,
        ).unwrap();
        assert_eq!(result.checked_count, 1);
        assert_eq!(result.mismatches.len(), 1);
        assert_eq!(result.mismatches[0].actual_byte_length, Some(length));
        assert_eq!(result.mismatches[0].actual_revision, Some(hex::encode(expected_hash.finalize())));
    }

    #[cfg(unix)]
    #[test]
    fn migration_verification_accepts_raw_binary_and_utf8_artifact_hashes() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.create_dir("migration").unwrap();
        let mut artifacts = Vec::new();
        for (name, bytes) in [
            ("binary.org", b"\xff\xfe\0\r\n".as_slice()),
            ("utf8.org", "* UTF8 😀\r\n\0body".as_bytes()),
        ] {
            let relative_path = format!("migration/{name}");
            root.write(&relative_path, bytes).unwrap();
            artifacts.push(OrgMigrationArtifactSummary {
                relative_path, byte_length: bytes.len() as u64, revision: revision(bytes),
            });
        }
        let manifest = serde_json::to_vec(&OrgMigrationVerificationManifest { artifacts: artifacts.clone() }).unwrap();
        root.write("migration/migration-verification.json", manifest).unwrap();
        let result = verify_org_migration_with_capability(
            &root, "migration/migration-verification.json", artifacts,
        ).unwrap();
        assert_eq!(result.checked_count, 2);
        assert!(result.mismatches.is_empty());
    }

    #[cfg(unix)]
    #[test]
    fn verification_sidecar_bound_scales_past_recovery_manifest_limit() {
        let artifacts: Vec<_> = (0..10_000).map(|index| OrgMigrationArtifactSummary {
            relative_path: format!("migration/{index:05}-arbitrary-artifact.org"),
            byte_length: index,
            revision: revision(b""),
        }).collect();
        let mut generated = serde_json::to_vec_pretty(&OrgMigrationVerificationManifest {
            artifacts: artifacts.clone(),
        }).unwrap();
        generated.push(b'\n');
        let limit = verification_manifest_byte_limit(&artifacts).unwrap();
        assert_eq!(limit, generated.len() as u64);
        assert!(limit > MAX_MIGRATION_MANIFEST_BYTES);
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.create_dir("migration").unwrap();
        root.write("migration/migration-verification.json", generated).unwrap();
        let result = verify_org_migration_with_capability(
            &root, "migration/migration-verification.json", artifacts,
        ).unwrap();
        assert_eq!(result.checked_count, 10_000);
        assert_eq!(result.mismatches.len(), 10_000);
        assert!(result.mismatches.iter().all(|mismatch|
            mismatch.actual_byte_length.is_none() && mismatch.actual_revision.is_none()));
    }

    #[cfg(unix)]
    #[test]
    fn migration_verification_rejects_sidecar_above_expected_metadata_bound() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.create_dir("migration").unwrap();
        let limit = verification_manifest_byte_limit(&[]).unwrap();
        root.write("migration/migration-verification.json", vec![b' '; limit as usize + 1]).unwrap();
        assert!(matches!(
            verify_org_migration_with_capability(&root, "migration/migration-verification.json", vec![]),
            Err(OrgFilesystemError::FileTooLarge(_))
        ));
    }

    #[cfg(unix)]
    #[test]
    fn raw_fd_observation_rewinds_retained_file_and_does_not_follow_replacement_path() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("artifact", b"\xffheld-body").unwrap();
        let mut file = root.open("artifact").unwrap();
        let expected = (10, revision(b"\xffheld-body"));
        assert_eq!(observe_open_file_raw(&mut file, "artifact").unwrap(), expected);
        assert_eq!(observe_open_file_raw(&mut file, "artifact").unwrap(), expected);
        root.rename("artifact", &root, "retained").unwrap();
        root.write("artifact", b"foreign-body").unwrap();
        // Pathname authority is deliberately outside the retained-fd summary.
        assert_eq!(observe_open_file_raw(&mut file, "artifact").unwrap(), expected);
    }

    #[cfg(unix)]
    #[test]
    fn limited_recovery_reader_preserves_utf8_and_existing_size_limit() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let content = "raw\r\n\0😀";
        root.write("artifact", content).unwrap();
        assert_eq!(
            read_capability_file_utf8_limited(&root, Path::new("artifact"), "artifact", content.len() as u64).unwrap(),
            content,
        );
        assert!(matches!(
            read_capability_file_utf8_limited(&root, Path::new("artifact"), "artifact", content.len() as u64 - 1),
            Err(OrgFilesystemError::FileTooLarge(_))
        ));
        root.write("artifact", b"\xff").unwrap();
        assert!(matches!(
            read_capability_file_utf8_limited(&root, Path::new("artifact"), "artifact", 1),
            Err(OrgFilesystemError::InvalidUtf8(_))
        ));
    }

    #[cfg(not(unix))]
    #[test]
    fn migration_readers_fail_closed_without_modifying_regular_file_evidence() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("artifact", b"retained evidence").unwrap();
        assert!(matches!(
            read_optional_regular_file(&root, Path::new("artifact"), "artifact"),
            Err(OrgFilesystemError::UnsupportedPlatform(_))
        ));
        assert!(matches!(
            read_capability_file_utf8_limited(&root, Path::new("artifact"), "artifact", 1024),
            Err(OrgFilesystemError::UnsupportedPlatform(_))
        ));
        assert_eq!(root.read("artifact").unwrap(), b"retained evidence");
    }
}
