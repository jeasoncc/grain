//! Ordinary-save journals. Every destructive namespace transition has a durable provenance
//! record first; an uncertain object is retained rather than inferred from its temporary name.
use super::*;
use std::io::{Seek, SeekFrom};
use std::os::fd::AsRawFd;
use std::os::unix::ffi::OsStrExt;

const PREFIX: &str = ".grain-write-";
// Retention is a durable unresolved state, not a successful terminal resolution. Recovery
// never replays or clears this namespace, even if its mutable journal no longer parses.
const RETAINING_PREFIX: &str = ".grain-retaining-";
const ORIGINAL_PREFIX: &str = ".grain-original-";
const DELETED_PREFIX: &str = ".grain-deleted-";
const RESOLVED_ORIGINAL_PREFIX: &str = ".grain-resolved-original-";
const RESOLVED_DELETED_PREFIX: &str = ".grain-resolved-deleted-";
const JOURNAL: &str = "journal.json";
const JOURNAL_GC: &str = "journal.gc";
const STAGE: &str = "stage";
const OLD: &str = "old";
const PUBLICATION_SOURCE: &str = "publication.source";
const PUBLICATION_LINK: &str = "publication.link";
const MAX_JOURNAL_BYTES: u64 = 16 * 1024;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct WriteObject {
    identity: UnixIdentity,
    pub(super) revision: String,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct WriteJournal {
    version: u32,
    directory_name: String,
    parent_identity: UnixIdentity,
    directory_identity: UnixIdentity,
    journal_identity: UnixIdentity,
    pub(super) target: String,
    pub(super) staged: Option<WriteObject>,
    original: Option<WriteObject>,
    #[serde(default)]
    publication_identity: Option<UnixIdentity>,
    #[serde(default)]
    publication_target: Option<String>,
}

pub(super) struct WriteTransaction {
    pub(super) parent: Dir,
    directory: Dir,
    stage_file: Option<cap_std::fs::File>,
    original_file: Option<cap_std::fs::File>,
    publication_file: cap_std::fs::File,
    pub(super) journal: WriteJournal,
    pub(super) display_path: String,
}

fn conflict(path: &str) -> OrgFilesystemError {
    OrgFilesystemError::WriteRecoveryConflict(path.to_owned())
}

fn directory_identity(directory: &Dir) -> io::Result<UnixIdentity> {
    file_identity(&directory.open(".")?)
}

fn open_directory(parent: &Dir, name: &OsStr) -> io::Result<Dir> {
    let mut options = OpenOptions::new();
    options.read(true).custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW);
    Ok(Dir::from_std_file(parent.open_with(name, &options)?.into_std()))
}

fn read_object(parent: &Dir, name: &OsStr, path: &str) -> OrgFilesystemResult<Option<(cap_std::fs::File, WriteObject)>> {
    match parent.symlink_metadata(name) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            return Err(OrgFilesystemError::InvalidPath(format!("{path} is a symlink")));
        }
        Ok(metadata) if !metadata.is_file() => return Err(conflict(path)),
        Ok(_) => {}
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    }
    let mut options = OpenOptions::new();
    options.read(true).custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
    let mut file = match parent.open_with(name, &options) {
        Ok(file) => file,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    };
    if !file.metadata()?.is_file() {
        return Err(conflict(path));
    }
    let identity = file_identity(&file)?;
    let revision = read_open_file_revision_utf8(&mut file, path)?;
    if entry_identity(parent, name)? != Some(identity) {
        return Err(conflict(path));
    }
    Ok(Some((file, WriteObject { identity, revision })))
}

pub(super) fn require_write_object(parent: &Dir, name: &OsStr, expected: &WriteObject, path: &str) -> OrgFilesystemResult<cap_std::fs::File> {
    match read_object(parent, name, path)? {
        Some((file, object)) if object == *expected => Ok(file),
        _ => Err(conflict(path)),
    }
}

fn require_open_write_object(file: &cap_std::fs::File, expected: &WriteObject, path: &str) -> OrgFilesystemResult<()> {
    let mut observed = file.try_clone()?;
    observed.seek(SeekFrom::Start(0))?;
    if file_identity(&observed)? != expected.identity
        || read_open_file_revision_utf8(&mut observed, path)? != expected.revision {
        return Err(conflict(path));
    }
    Ok(())
}

pub(super) fn prepare_org_write(root: &Dir, relative_path: &Path, content: &str, expected_revision: Option<&str>) -> OrgFilesystemResult<WriteTransaction> {
    prepare_org_transaction(root, relative_path, Some(content), expected_revision)
}

fn prepare_org_transaction(root: &Dir, relative_path: &Path, content: Option<&str>, expected_revision: Option<&str>) -> OrgFilesystemResult<WriteTransaction> {
    let relative = validate_relative_org_path(relative_path)?;
    let display_path = portable_relative_path(&relative)?;
    let (parent, target) = resolve_no_symlink_parent(root, &relative, &display_path)?;
    require_descriptor_publication_platform()?;
    let original_file = if expected_revision == Some("<missing>") {
        // Existence alone rejects creation, including directories, symlinks and non-UTF8
        // files. Do not open or read an occupied terminal entry just to choose another name.
        if entry_identity(&parent, &target)?.is_some() {
            return Err(OrgFilesystemError::CreationCollision(display_path));
        }
        None
    } else {
        read_object(&parent, &target, &display_path)?
    };
    let original = original_file.as_ref().map(|(_, object)| object.clone());
    if content.is_none() && original.is_none() {
        return Err(OrgFilesystemError::NotFound(display_path));
    }
    let actual = original.as_ref().map(|object| object.revision.as_str()).unwrap_or("<missing>");
    if let Some(expected) = expected_revision {
        if expected != actual {
            return Err(OrgFilesystemError::RevisionConflict {
                path: display_path, expected: expected.to_owned(), actual: actual.to_owned(),
            });
        }
    }
    let directory_name = format!("{PREFIX}{}.tmp", uuid::Uuid::new_v4());
    let mut builder = cap_std::fs::DirBuilder::new();
    use cap_std::fs::DirBuilderExt;
    builder.mode(0o700);
    parent.create_dir_with(&directory_name, &builder)?;
    let directory = open_directory(&parent, OsStr::new(&directory_name))?;
    let mut options = OpenOptions::new();
    options.read(true).write(true).create_new(true);
    let (stage_file, staged) = if let Some(content) = content {
        let mut file = directory.open_with(STAGE, &options)?;
        file.write_all(content.as_bytes())?;
        if let Some((original, _)) = original_file.as_ref() {
            file.set_permissions(original.metadata()?.permissions())?;
        }
        file.sync_all()?;
        let staged = WriteObject { identity: file_identity(&file)?, revision: revision(content.as_bytes()) };
        (Some(file), Some(staged))
    } else {
        (None, None)
    };
    // This owned scratch inode and every probe link remain named; namespace/hash checks do not
    // authorize unlinking a mutable inode or a concurrently substituted directory entry.
    let publication_file = directory.open_with(PUBLICATION_SOURCE, &options)?;
    publication_file.sync_all()?;
    let publication_target = format!(".grain-publication-{}.tmp", uuid::Uuid::new_v4());
    let mut journal_file = directory.open_with("journal.preparing", &options)?;
    let journal = WriteJournal {
        version: 3,
        directory_name,
        parent_identity: directory_identity(&parent)?,
        directory_identity: directory_identity(&directory)?,
        journal_identity: file_identity(&journal_file)?,
        target: target.to_str().ok_or_else(|| conflict(&display_path))?.to_owned(),
        staged,
        original,
        publication_identity: Some(file_identity(&publication_file)?),
        publication_target: Some(publication_target),
    };
    let bytes = serde_json::to_vec(&journal).map_err(|_| conflict(&display_path))?;
    journal_file.write_all(&bytes)?;
    journal_file.sync_all()?;
    rename_noreplace(&directory, OsStr::new("journal.preparing"), &directory, OsStr::new(JOURNAL))?;
    sync_directory(&directory)?;
    // This barrier precedes the first operation that can make the old destination disappear.
    sync_directory(&parent)?;
    Ok(WriteTransaction {
        parent, directory, stage_file,
        original_file: original_file.map(|(file, _)| file),
        publication_file, journal, display_path,
    })
}

pub(super) fn capture_org_write(transaction: &WriteTransaction) -> OrgFilesystemResult<()> {
    if read_journal(&transaction.parent, &transaction.directory, &transaction.journal.directory_name)?.as_ref() != Some(&transaction.journal) {
        return Err(conflict(&transaction.display_path));
    }
    validate_slots(&transaction.directory, &transaction.journal, &transaction.display_path)?;
    if let Some(staged) = &transaction.journal.staged {
        require_write_object(&transaction.directory, OsStr::new(STAGE), staged, &transaction.display_path)?;
    }
    if let Some(original) = &transaction.journal.original {
        require_write_object(&transaction.parent, OsStr::new(&transaction.journal.target), original, &transaction.display_path)?;
    }
    // Establish the actual descriptor-source primitive on this volume/approved parent before
    // the original can disappear. Failure has preparation effects only; no capture is attempted.
    probe_publication_support(transaction)?;
    if let Some(original) = &transaction.journal.original {
        if transaction.original_file.as_ref().map(file_identity).transpose()? != Some(original.identity) {
            return Err(conflict(&transaction.display_path));
        }
        // The probe performs namespace and durability operations after the first body check.
        // A writer already holding this inode needs no pathname lookup to change it meanwhile.
        require_write_object(&transaction.parent, OsStr::new(&transaction.journal.target), original, &transaction.display_path)?;
        require_open_write_object(transaction.original_file.as_ref().ok_or_else(|| conflict(&transaction.display_path))?, original, &transaction.display_path)?;
        if read_journal(&transaction.parent, &transaction.directory, &transaction.journal.directory_name)?.as_ref() != Some(&transaction.journal) {
            return Err(conflict(&transaction.display_path));
        }
        rename_noreplace(&transaction.parent, OsStr::new(&transaction.journal.target), &transaction.directory, OsStr::new(OLD))?;
        sync_directory(&transaction.directory)?;
        sync_directory(&transaction.parent)?;
        require_write_object(&transaction.directory, OsStr::new(OLD), original, &transaction.display_path)?;
    }
    Ok(())
}

/// Linux resolves the source through its retained open descriptor, not a replaceable stage name.
/// The destination is always relative to the approved parent descriptor and is never replaced.
#[cfg(target_os = "linux")]
pub(super) fn link_open_file(file: &cap_std::fs::File, _source: &Dir, _name: &OsStr, parent: &Dir, target: &OsStr) -> io::Result<()> {
    let source = CString::new(format!("/proc/self/fd/{}", file.as_raw_fd())).unwrap();
    let target = CString::new(target.as_bytes()).map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "target contains NUL"))?;
    let result = unsafe { libc::linkat(libc::AT_FDCWD, source.as_ptr(), parent.as_raw_fd(), target.as_ptr(), libc::AT_SYMLINK_FOLLOW) };
    if result == 0 { Ok(()) } else { Err(io::Error::last_os_error()) }
}

#[cfg(target_os = "macos")]
fn link_open_file(_file: &cap_std::fs::File, _source: &Dir, _name: &OsStr, _parent: &Dir, _target: &OsStr) -> io::Result<()> {
    Err(io::Error::new(io::ErrorKind::Unsupported, "descriptor-bound hard-link publication is unavailable on Darwin"))
}

fn require_descriptor_publication_platform() -> OrgFilesystemResult<()> {
    if cfg!(target_os = "linux") { return Ok(()); }
    Err(OrgFilesystemError::UnsupportedPlatform(
        "ordinary Org publication/restoration requires a descriptor-bound hard-link primitive; Darwin is not qualified".to_owned(),
    ))
}

fn probe_publication_support(transaction: &WriteTransaction) -> OrgFilesystemResult<()> {
    require_descriptor_publication_platform()?;
    let path = &transaction.display_path;
    let identity = transaction.journal.publication_identity.ok_or_else(|| conflict(path))?;
    let target = transaction.journal.publication_target.as_ref().ok_or_else(|| conflict(path))?;
    if file_identity(&transaction.publication_file)? != identity
        || entry_identity(&transaction.directory, OsStr::new(PUBLICATION_SOURCE))? != Some(identity)
        || entry_identity(&transaction.directory, OsStr::new(PUBLICATION_LINK))?.is_some()
        || entry_identity(&transaction.parent, OsStr::new(target))?.is_some() {
        return Err(conflict(path));
    }
    link_open_file(&transaction.publication_file, &transaction.directory, OsStr::new(PUBLICATION_SOURCE), &transaction.parent, OsStr::new(target))
        .map_err(|error| OrgFilesystemError::UnsupportedPlatform(format!(
            "descriptor-bound publication probe failed before original capture; preparation artifacts retained for {path}: {error}",
        )))?;
    sync_directory(&transaction.parent)?;
    if entry_identity(&transaction.parent, OsStr::new(target))? != Some(identity) {
        return Err(conflict(path));
    }
    // The probe's parent entry is no-clobber captured, never unlinked. Substitution may cause a
    // conflict but cannot authorize deletion of either the replacement or the retained scratch.
    rename_noreplace(&transaction.parent, OsStr::new(target), &transaction.directory, OsStr::new(PUBLICATION_LINK))?;
    sync_directory(&transaction.directory)?;
    sync_directory(&transaction.parent)?;
    if entry_identity(&transaction.directory, OsStr::new(PUBLICATION_LINK))? != Some(identity)
        || entry_identity(&transaction.directory, OsStr::new(PUBLICATION_SOURCE))? != Some(identity)
        || read_journal(&transaction.parent, &transaction.directory, &transaction.journal.directory_name)?.as_ref() != Some(&transaction.journal) {
        return Err(conflict(path));
    }
    Ok(())
}

pub(super) fn publish_org_write(transaction: &WriteTransaction) -> OrgFilesystemResult<()> {
    require_descriptor_publication_platform()?;
    if transaction.journal.version == 3
        && entry_identity(&transaction.directory, OsStr::new(PUBLICATION_LINK))? != transaction.journal.publication_identity {
        return Err(conflict(&transaction.display_path));
    }
    if read_journal(&transaction.parent, &transaction.directory, &transaction.journal.directory_name)?.as_ref() != Some(&transaction.journal) {
        return Err(conflict(&transaction.display_path));
    }
    let staged = transaction.journal.staged.as_ref().ok_or_else(|| conflict(&transaction.display_path))?;
    let stage_file = transaction.stage_file.as_ref().ok_or_else(|| conflict(&transaction.display_path))?;
    require_write_object(&transaction.directory, OsStr::new(STAGE), staged, &transaction.display_path)?;
    if file_identity(stage_file)? != staged.identity {
        return Err(conflict(&transaction.display_path));
    }
    if let Some(original) = &transaction.journal.original {
        require_write_object(&transaction.directory, OsStr::new(OLD), original, &transaction.display_path)?;
    }
    // Validate the retained descriptor again after checking the mutable captured original.
    // Neither this check nor linkat is an atomic bytes-CAS against an already-open writer.
    require_open_write_object(stage_file, staged, &transaction.display_path)?;
    if read_journal(&transaction.parent, &transaction.directory, &transaction.journal.directory_name)?.as_ref() != Some(&transaction.journal)
        || entry_identity(&transaction.directory, OsStr::new(STAGE))? != Some(staged.identity) {
        return Err(conflict(&transaction.display_path));
    }
    if let Err(error) = link_open_file(stage_file, &transaction.directory, OsStr::new(STAGE), &transaction.parent, OsStr::new(&transaction.journal.target)) {
        if error.kind() == io::ErrorKind::AlreadyExists {
            let actual = read_object(&transaction.parent, OsStr::new(&transaction.journal.target), &transaction.display_path)?
                .map(|(_, object)| object.revision).unwrap_or_else(|| "<missing>".to_owned());
            return Err(OrgFilesystemError::RevisionConflict {
                path: transaction.display_path.clone(),
                expected: transaction.journal.original.as_ref().map(|object| object.revision.clone()).unwrap_or_else(|| "<missing>".to_owned()),
                actual,
            });
        }
        return Err(error.into());
    }
    sync_directory(&transaction.parent)?;
    require_write_object(&transaction.parent, OsStr::new(&transaction.journal.target), staged, &transaction.display_path)?;
    if let Some(original) = &transaction.journal.original {
        require_write_object(&transaction.directory, OsStr::new(OLD), original, &transaction.display_path)?;
    }
    if read_journal(&transaction.parent, &transaction.directory, &transaction.journal.directory_name)?.as_ref() != Some(&transaction.journal) {
        return Err(conflict(&transaction.display_path));
    }
    Ok(())
}

fn object_slot(directory: &Dir, name: &str, expected: &WriteObject, path: &str) -> OrgFilesystemResult<Option<(String, cap_std::fs::File)>> {
    let mut result = None;
    for slot in [name.to_owned(), format!("{name}.gc")] {
        if let Some((file, object)) = read_object(directory, OsStr::new(&slot), path)? {
            if object != *expected || result.is_some() { return Err(conflict(path)); }
            result = Some((slot, file));
        }
    }
    Ok(result)
}

fn retained_slot(directory: &Dir, name: &str, expected: UnixIdentity, path: &str) -> OrgFilesystemResult<Option<String>> {
    let mut result = None;
    for slot in [name.to_owned(), format!("{name}.gc")] {
        if let Some(identity) = entry_identity(directory, OsStr::new(&slot))? {
            if identity != expected { return Err(conflict(path)); }
            if result.is_none() { result = Some(slot); }
        }
    }
    Ok(result)
}

fn validate_slots(directory: &Dir, journal: &WriteJournal, path: &str) -> OrgFilesystemResult<()> {
    if let Some(staged) = &journal.staged { retained_slot(directory, STAGE, staged.identity, path)?; }
    if let Some(original) = &journal.original { retained_slot(directory, OLD, original.identity, path)?; }
    let allowed = [STAGE, "stage.gc", OLD, "old.gc", JOURNAL, JOURNAL_GC, PUBLICATION_SOURCE, PUBLICATION_LINK];
    for entry in directory.entries()? {
        let name = entry?.file_name();
        if !allowed.iter().any(|allowed| name == OsStr::new(allowed)) { return Err(conflict(path)); }
        if journal.original.is_none() && (name == OLD || name == "old.gc") { return Err(conflict(path)); }
        if journal.staged.is_none() && (name == STAGE || name == "stage.gc") { return Err(conflict(path)); }
        if name == PUBLICATION_SOURCE || name == PUBLICATION_LINK {
            if entry_identity(directory, &name)? != journal.publication_identity || journal.publication_identity.is_none() {
                return Err(conflict(path));
            }
        }
    }
    Ok(())
}

fn require_original_slot(directory: &Dir, journal: &WriteJournal, path: &str) -> OrgFilesystemResult<Option<String>> {
    match &journal.original {
        Some(original) => retained_slot(directory, OLD, original.identity, path)?
            .map(Some).ok_or_else(|| conflict(path)),
        None => Ok(None),
    }
}

fn require_retained_original(directory: &Dir, journal: &WriteJournal, path: &str) -> OrgFilesystemResult<()> {
    if let Some(original) = &journal.original {
        let slot = require_original_slot(directory, journal, path)?.ok_or_else(|| conflict(path))?;
        require_write_object(directory, OsStr::new(&slot), original, path)?;
    }
    Ok(())
}

fn finish(parent: &Dir, directory: &Dir, journal: &WriteJournal, path: &str, retention_prefix: &str) -> OrgFilesystemResult<(String, OrgRecoveryObjectKind)> {
    if read_journal(parent, directory, &journal.directory_name)?.as_ref() != Some(journal) {
        return Err(conflict(path));
    }
    validate_slots(directory, journal, path)?;
    let primary = if let Some(original) = &journal.original {
        retained_slot(directory, OLD, original.identity, path)?.map(|slot| (slot, original.identity, OrgRecoveryObjectKind::Original))
    } else { None };
    let primary = match primary {
        Some(primary) => Some(primary),
        None => match &journal.staged {
            Some(staged) => retained_slot(directory, STAGE, staged.identity, path)?.map(|slot| (slot, staged.identity, OrgRecoveryObjectKind::Staged)),
            None => None,
        },
    };
    let primary = match primary {
        Some(primary) => primary,
        None => {
            let slot = if entry_identity(directory, OsStr::new(JOURNAL))?.is_some() { JOURNAL } else { JOURNAL_GC };
            (slot.to_owned(), journal.journal_identity, OrgRecoveryObjectKind::Journal)
        }
    };
    // Every stage, original, journal and probe name survives completion, even for creations and
    // interrupted restoration. Late descriptor writes remain recoverable. There is no GC/unlink.
    let suffix = journal.directory_name.strip_prefix(PREFIX).ok_or_else(|| conflict(path))?;
    let retained_name = format!("{RETAINING_PREFIX}{suffix}");
    if entry_identity(parent, OsStr::new(&journal.directory_name))? != Some(journal.directory_identity) {
        return Err(conflict(path));
    }
    sync_directory(directory)?;
    if primary.2 == OrgRecoveryObjectKind::Original || retention_prefix == DELETED_PREFIX {
        require_retained_original(directory, journal, path)?;
    }
    if read_journal(parent, directory, &journal.directory_name)?.as_ref() != Some(journal) {
        return Err(conflict(path));
    }
    rename_noreplace(parent, OsStr::new(&journal.directory_name), parent, OsStr::new(&retained_name))?;
    sync_directory(parent)?;
    if entry_identity(parent, OsStr::new(&retained_name))? != Some(journal.directory_identity)
        || entry_identity(directory, OsStr::new(&primary.0))? != Some(primary.1) {
        return Err(conflict(path));
    }
    // A retained name is not permission to accept a changed journal or original body.
    // Post-transition observations can refuse an ACK, but cannot freeze a writable inode.
    if read_journal(parent, directory, &retained_name)?.as_ref() != Some(journal) {
        return Err(conflict(path));
    }
    validate_slots(directory, journal, path)?;
    if primary.2 == OrgRecoveryObjectKind::Original || retention_prefix == DELETED_PREFIX {
        require_retained_original(directory, journal, path)?;
    }
    Ok((format!("{retained_name}/{}", primary.0), primary.2))
}

fn resolved_retention_name(journal: &WriteJournal, retention_prefix: &str) -> Option<String> {
    let suffix = journal.directory_name.strip_prefix(PREFIX)?;
    let prefix = match retention_prefix {
        ORIGINAL_PREFIX => RESOLVED_ORIGINAL_PREFIX,
        DELETED_PREFIX => RESOLVED_DELETED_PREFIX,
        _ => return None,
    };
    Some(format!("{prefix}{:x}-{:x}-{suffix}", journal.directory_identity.device, journal.directory_identity.inode))
}

fn resolved_directory_identity(name: &str) -> Option<UnixIdentity> {
    let suffix = name.strip_prefix(RESOLVED_ORIGINAL_PREFIX)
        .or_else(|| name.strip_prefix(RESOLVED_DELETED_PREFIX))?;
    let mut fields = suffix.splitn(3, '-');
    let device = u64::from_str_radix(fields.next()?, 16).ok()?;
    let inode = u64::from_str_radix(fields.next()?, 16).ok()?;
    let transaction_suffix = fields.next()?;
    if transaction_suffix.is_empty() || !transaction_suffix.ends_with(".tmp") { return None; }
    Some(UnixIdentity { device, inode })
}

/// All body/provenance observations and response construction precede terminal classification.
/// Post-transition namespace validation and the commit barrier remain protected by finalization.
/// A retained unresolved transaction is never automatically retried, restored or imported.
fn resolve_retention(
    parent: &Dir,
    directory: &Dir,
    journal: &WriteJournal,
    path: &str,
    retained: &(String, OrgRecoveryObjectKind),
    retention_prefix: &str,
    expected_target: Option<&WriteObject>,
    kind: OrgOriginalRecoveryKind,
) -> OrgFilesystemResult<OrgOriginalRecoveryEntry> {
    let suffix = journal.directory_name.strip_prefix(PREFIX).ok_or_else(|| conflict(path))?;
    let pending_name = format!("{RETAINING_PREFIX}{suffix}");
    let terminal_name = resolved_retention_name(journal, retention_prefix).ok_or_else(|| conflict(path))?;
    let primary_slot = Path::new(&retained.0).file_name().ok_or_else(|| conflict(path))?;
    let entry = original_entry(path, &format!("{terminal_name}/{}", primary_slot.to_string_lossy()), kind, retained.1)?;
    if read_journal(parent, directory, &pending_name)?.as_ref() != Some(journal) {
        return Err(conflict(path));
    }
    validate_slots(directory, journal, path)?;
    if retained.1 == OrgRecoveryObjectKind::Original || retention_prefix == DELETED_PREFIX {
        require_retained_original(directory, journal, path)?;
    }
    match expected_target {
        Some(expected) => { require_write_object(parent, OsStr::new(&journal.target), expected, path)?; }
        None if entry_identity(parent, OsStr::new(&journal.target))?.is_some() => return Err(conflict(path)),
        None => {}
    }
    // Hashes cannot exclude mutation through a held FD after its final observation. Completion
    // records observations, not an immutable snapshot or an atomic bytes-CAS.
    let committed = (|| -> OrgFilesystemResult<()> {
        rename_noreplace(parent, OsStr::new(&pending_name), parent, OsStr::new(&terminal_name))?;
        // A substituted directory source name cannot inherit completion. The terminal name also
        // binds its directory identity, so restart refuses substitution even across this crash gap.
        if entry_identity(parent, OsStr::new(&terminal_name))? != Some(journal.directory_identity) {
            return Err(conflict(path));
        }
        let primary_identity = match retained.1 {
            OrgRecoveryObjectKind::Original => journal.original.as_ref().map(|object| object.identity),
            OrgRecoveryObjectKind::Staged => journal.staged.as_ref().map(|object| object.identity),
            OrgRecoveryObjectKind::Journal => Some(journal.journal_identity),
            OrgRecoveryObjectKind::PublicationProbe => journal.publication_identity,
        };
        if entry_identity(directory, primary_slot)? != primary_identity {
            return Err(conflict(path));
        }
        validate_slots(directory, journal, path)?;
        sync_directory(parent)?;
        Ok(())
    })();
    if let Err(error) = committed {
        // Preserve all evidence where it is; never move an uncertain terminal entry back. This
        // no-clobber guard durably refuses restart after an observed namespace/barrier rejection.
        // If storage also refuses guard creation or its barrier, durability is unknowable.
        match parent.create_dir(&pending_name) {
            Ok(()) => {}
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {}
            Err(error) => return Err(error.into()),
        }
        sync_directory(parent)?;
        return Err(error);
    }
    Ok(entry)
}

pub(super) fn finish_org_write(transaction: &WriteTransaction) -> OrgFilesystemResult<Option<OrgOriginalRecoveryEntry>> {
    let staged = transaction.journal.staged.as_ref().ok_or_else(|| conflict(&transaction.display_path))?;
    require_write_object(&transaction.parent, OsStr::new(&transaction.journal.target), staged, &transaction.display_path)?;
    require_original_slot(&transaction.directory, &transaction.journal, &transaction.display_path)?;
    let retained = finish(&transaction.parent, &transaction.directory, &transaction.journal, &transaction.display_path, ORIGINAL_PREFIX)?;
    resolve_retention(&transaction.parent, &transaction.directory, &transaction.journal,
        &transaction.display_path, &retained, ORIGINAL_PREFIX, Some(staged), OrgOriginalRecoveryKind::Save).map(Some)
}

fn original_entry(source_path: &str, suffix: &str, kind: OrgOriginalRecoveryKind, object: OrgRecoveryObjectKind) -> OrgFilesystemResult<OrgOriginalRecoveryEntry> {
    let parent = Path::new(source_path).parent().ok_or_else(|| conflict(source_path))?;
    Ok(OrgOriginalRecoveryEntry {
        relative_path: portable_relative_path(&parent.join(suffix))?,
        source_relative_path: source_path.to_owned(),
        kind,
        object,
    })
}

pub(super) fn quarantine_org_document(root: &Dir, relative_path: &Path, expected_revision: &str) -> OrgFilesystemResult<OrgOriginalRecoveryEntry> {
    let transaction = prepare_org_transaction(root, relative_path, None, Some(expected_revision))?;
    capture_org_write(&transaction)?;
    if entry_identity(&transaction.parent, OsStr::new(&transaction.journal.target))?.is_some() {
        return Err(conflict(&transaction.display_path));
    }
    let retained = finish(&transaction.parent, &transaction.directory, &transaction.journal, &transaction.display_path, DELETED_PREFIX)?;
    resolve_retention(&transaction.parent, &transaction.directory, &transaction.journal,
        &transaction.display_path, &retained, DELETED_PREFIX, None, OrgOriginalRecoveryKind::Delete)
}

fn read_journal(parent: &Dir, directory: &Dir, name: &str) -> OrgFilesystemResult<Option<WriteJournal>> {
    let mut found = None;
    for slot in [JOURNAL, JOURNAL_GC] {
        if entry_identity(directory, OsStr::new(slot))?.is_none() { continue; }
        if found.is_some() { return Err(conflict(name)); }
        let mut options = OpenOptions::new();
        options.read(true).custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
        let mut file = directory.open_with(slot, &options)?;
        let metadata = file.metadata()?;
        if !metadata.is_file() || metadata.len() > MAX_JOURNAL_BYTES { return Err(conflict(name)); }
        let mut bytes = Vec::new();
        Read::by_ref(&mut file).take(metadata.len()).read_to_end(&mut bytes)?;
        let mut extra = [0u8; 1];
        if bytes.len() as u64 != metadata.len() || file.read(&mut extra)? != 0 { return Err(conflict(name)); }
        require_unchanged_file(&metadata, &file.metadata()?, name)?;
        let journal: WriteJournal = serde_json::from_slice(&bytes).map_err(|_| conflict(name))?;
        let old_version = (journal.version == 1 && journal.staged.is_some()
            || journal.version == 2 && journal.staged.is_none() && journal.original.is_some())
            && journal.publication_identity.is_none() && journal.publication_target.is_none();
        let probe_target_valid = journal.publication_target.as_ref().is_some_and(|target|
            target.starts_with(".grain-publication-") && target.ends_with(".tmp")
                && !target.contains(['/', '\\', '\0']) && Path::new(target).components().count() == 1);
        let known_version = old_version || journal.version == 3 && journal.publication_identity.is_some()
            && probe_target_valid && (journal.staged.is_some() || journal.original.is_some());
        let retained_name = journal.directory_name.strip_prefix(PREFIX)
            .is_some_and(|suffix| name.strip_prefix(RETAINING_PREFIX) == Some(suffix)
                || name.strip_prefix(ORIGINAL_PREFIX) == Some(suffix)
                || journal.staged.is_none() && journal.original.is_some() && name.strip_prefix(DELETED_PREFIX) == Some(suffix))
            || resolved_retention_name(&journal, ORIGINAL_PREFIX).as_deref() == Some(name)
            || journal.staged.is_none() && journal.original.is_some()
                && resolved_retention_name(&journal, DELETED_PREFIX).as_deref() == Some(name);
        if !known_version || (journal.directory_name != name && !retained_name)
            || journal.parent_identity != directory_identity(parent)?
            || journal.directory_identity != directory_identity(directory)?
            || entry_identity(parent, OsStr::new(name))? != Some(journal.directory_identity)
            || journal.journal_identity != file_identity(&file)?
            || entry_identity(directory, OsStr::new(slot))? != Some(journal.journal_identity)
            || validate_relative_org_path(Path::new(&journal.target)).is_err()
            || Path::new(&journal.target).components().count() != 1 {
            return Err(conflict(name));
        }
        found = Some(journal);
    }
    Ok(found)
}

fn recover_write(parent: &Dir, directory: &Dir, journal: &WriteJournal) -> OrgFilesystemResult<()> {
    let path = &journal.target;
    validate_slots(directory, journal, path)?;
    if read_journal(parent, directory, &journal.directory_name)?.as_ref() != Some(journal) {
        return Err(conflict(path));
    }
    let target = read_object(parent, OsStr::new(path), path)?;
    match target {
        Some((_, object)) if journal.staged.as_ref() == Some(&object) || journal.original.as_ref() == Some(&object) => {
            // New publication or preparation/previous restoration. Never infer ownership by hash
            // alone: a byte-identical independently created inode is still a conflicting edit.
            if journal.staged.as_ref() == Some(&object) {
                require_original_slot(directory, journal, path)?;
            }
            sync_directory(parent)?;
            let retained = finish(parent, directory, journal, path, ORIGINAL_PREFIX)?;
            resolve_retention(parent, directory, journal, path, &retained, ORIGINAL_PREFIX,
                Some(&object), if journal.staged.is_none() { OrgOriginalRecoveryKind::Delete } else { OrgOriginalRecoveryKind::Save }).map(|_| ())
        }
        Some(_) => Err(conflict(path)),
        None => {
            if let Some(original) = &journal.original {
                require_descriptor_publication_platform()?;
                let (slot, file) = object_slot(directory, OLD, original, path)?.ok_or_else(|| conflict(path))?;
                require_open_write_object(&file, original, path)?;
                // Discovery/slot hashing can be separated by arbitrary external descriptor writes.
                // Refuse an observed provenance change before replay touches the live namespace.
                if read_journal(parent, directory, &journal.directory_name)?.as_ref() != Some(journal) {
                    return Err(conflict(path));
                }
                link_open_file(&file, directory, OsStr::new(&slot), parent, OsStr::new(path))?;
                sync_directory(parent)?;
                require_write_object(parent, OsStr::new(path), original, path)?;
                let retained = finish(parent, directory, journal, path, ORIGINAL_PREFIX)?;
                resolve_retention(parent, directory, journal, path, &retained, ORIGINAL_PREFIX,
                    Some(original), if journal.staged.is_none() { OrgOriginalRecoveryKind::Delete } else { OrgOriginalRecoveryKind::Save }).map(|_| ())
            } else {
                // A retained mutable stage is evidence, not Source authority. An interrupted
                // creation without a live publication is inventoried, never silently replayed.
                let retained = finish(parent, directory, journal, path, ORIGINAL_PREFIX)?;
                resolve_retention(parent, directory, journal, path, &retained, ORIGINAL_PREFIX,
                    None, OrgOriginalRecoveryKind::Save).map(|_| ())
            }
        }
    }
}

pub(super) fn recover_directory(parent: &Dir) -> OrgFilesystemResult<()> {
    let entries = parent.entries()?.map(|entry| entry.map(|entry| entry.file_name())).collect::<io::Result<Vec<_>>>()?;
    for name in entries {
        let metadata = match parent.symlink_metadata(&name) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == io::ErrorKind::NotFound => continue,
            Err(error) => return Err(error.into()),
        };
        let text = name.to_string_lossy();
        if text.starts_with(RETAINING_PREFIX) && text.ends_with(".tmp") {
            // This durable state covers post-retention rejection and crashes before the terminal
            // observation/commit. Never infer completion from unchanged bodies or a readable journal.
            return Err(conflict(&text));
        }
        if text.starts_with(RESOLVED_ORIGINAL_PREFIX) || text.starts_with(RESOLVED_DELETED_PREFIX) {
            if !metadata.is_dir() || metadata.file_type().is_symlink()
                || resolved_directory_identity(&text) != entry_identity(parent, &name)? {
                return Err(conflict(&text));
            }
            // Resolution records namespace provenance, not permanent body/journal hashes.
            continue;
        }
        let active = text.starts_with(PREFIX) && text.ends_with(".tmp");
        if active && (!metadata.is_dir() || metadata.file_type().is_symlink()) {
            // The original journal may survive under another reserved name. A replaced active
            // marker cannot prove preparation ended or that an absent Source is recoverable.
            return Err(conflict(&text));
        }
        if !metadata.is_dir() || metadata.file_type().is_symlink() { continue; }
        // Historical v1/v2/v3 original/deleted names have no separate completion witness.
        // Preserve their legacy terminal interpretation; active journals use retaining first.
        if !text.starts_with(PREFIX) && text.starts_with(".grain-") && text.ends_with(".tmp") { continue; }
        let child = open_directory(parent, &name)?;
        if active {
            // No final journal means preparation never authorized capture. Preserve the directory,
            // including partial preparations and unrelated older artifacts, without guessing.
            if let Some(journal) = read_journal(parent, &child, &text)? {
                recover_write(parent, &child, &journal)?;
            }
        } else {
            recover_directory(&child)?;
        }
    }
    Ok(())
}

/// Completed and interrupted artifacts are mutable evidence, never canonical Source bodies.
pub(super) fn scan_retained_original(parent: &Dir, name: &OsStr, relative_parent: &Path) -> OrgFilesystemResult<Vec<OrgOriginalRecoveryEntry>> {
    let text = name.to_string_lossy();
    if !text.ends_with(".tmp") || ![PREFIX, RETAINING_PREFIX, ORIGINAL_PREFIX, DELETED_PREFIX,
        RESOLVED_ORIGINAL_PREFIX, RESOLVED_DELETED_PREFIX].iter().any(|prefix| text.starts_with(prefix)) {
        return Ok(Vec::new());
    }
    let directory = open_directory(parent, name)?;
    let Some(journal) = read_journal(parent, &directory, &text)? else {
        // A partial preparation has no validated provenance. Preserve it without guessing.
        return Ok(Vec::new());
    };
    let kind = if journal.staged.is_none() { OrgOriginalRecoveryKind::Delete } else { OrgOriginalRecoveryKind::Save };
    validate_slots(&directory, &journal, &text)?;
    let source_relative_path = portable_relative_path(&relative_parent.join(&journal.target))?;
    let mut retained = Vec::new();
    for (slots, expected, object) in [
        ([OLD, "old.gc"], journal.original.as_ref().map(|object| object.identity), OrgRecoveryObjectKind::Original),
        ([STAGE, "stage.gc"], journal.staged.as_ref().map(|object| object.identity), OrgRecoveryObjectKind::Staged),
        ([JOURNAL, JOURNAL_GC], Some(journal.journal_identity), OrgRecoveryObjectKind::Journal),
        ([PUBLICATION_SOURCE, PUBLICATION_LINK], journal.publication_identity, OrgRecoveryObjectKind::PublicationProbe),
    ] {
        for slot in slots {
            if let Some(identity) = entry_identity(&directory, OsStr::new(slot))? {
                if Some(identity) != expected { return Err(conflict(&text)); }
                // No body reads, UTF-8 validation, hashes or import: late writes can be arbitrary.
                retained.push(OrgOriginalRecoveryEntry {
                    relative_path: portable_relative_path(&relative_parent.join(name).join(slot))?,
                    source_relative_path: source_relative_path.clone(),
                    kind, object,
                });
            }
        }
    }
    if let Some(target) = &journal.publication_target {
        if let Some(identity) = entry_identity(parent, OsStr::new(target))? {
            if Some(identity) != journal.publication_identity { return Err(conflict(&text)); }
            retained.push(OrgOriginalRecoveryEntry {
                relative_path: portable_relative_path(&relative_parent.join(target))?,
                source_relative_path, kind, object: OrgRecoveryObjectKind::PublicationProbe,
            });
        }
    }
    Ok(retained)
}

#[cfg(test)]
pub(crate) fn prepare_interrupted_org_write(root: &Dir, relative_path: &str, content: &str, published: bool) -> OrgFilesystemResult<()> {
    let _mutation_guard = lock_org_mutations()?;
    let transaction = prepare_org_write(root, Path::new(relative_path), content, None)?;
    capture_org_write(&transaction)?;
    if published { publish_org_write(&transaction)?; }
    Ok(())
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::*;
    use tempfile::tempdir;

    const OLD_BYTES: &str = "* 古い\r\nbody\rNUL\0tail";
    const NEW_BYTES: &str = "* 新しい\r\nnew\0body";

    fn prepare(root: &Dir) -> WriteTransaction {
        prepare_org_write(root, Path::new("notes.org"), NEW_BYTES, Some(&revision(OLD_BYTES.as_bytes()))).unwrap()
    }

    fn prepare_captured_version(root: &Dir, version: u32, deletion: bool) -> WriteTransaction {
        let mut transaction = prepare_org_transaction(root, Path::new("notes.org"), if deletion { None } else { Some(NEW_BYTES) }, None).unwrap();
        if version == 3 {
            capture_org_write(&transaction).unwrap();
        } else {
            // Reproduce an actual legacy journal/namespace, without v3-only probe fields.
            transaction.directory.rename(PUBLICATION_SOURCE, root, ".grain-owned-legacy-probe.tmp").unwrap();
            transaction.journal.version = version;
            transaction.journal.publication_identity = None;
            transaction.journal.publication_target = None;
            let mut legacy = serde_json::to_value(&transaction.journal).unwrap();
            legacy.as_object_mut().unwrap().remove("publication_identity");
            legacy.as_object_mut().unwrap().remove("publication_target");
            transaction.directory.write(JOURNAL, serde_json::to_vec(&legacy).unwrap()).unwrap();
            root.rename("notes.org", &transaction.directory, OLD).unwrap();
            sync_directory(&transaction.directory).unwrap();
            sync_directory(root).unwrap();
        }
        transaction
    }

    #[test]
    fn substituted_active_marker_refuses_reopen_without_replaying_retained_journal() {
        for symlink in [false, true] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            root.write("notes.org", OLD_BYTES).unwrap();
            let transaction = prepare(&root);
            capture_org_write(&transaction).unwrap();
            let active = transaction.journal.directory_name.clone();
            let retained = format!(".grain-held-{}.tmp", uuid::Uuid::new_v4());
            let journal = transaction.directory.read(JOURNAL).unwrap();
            rename_noreplace(&root, OsStr::new(&active), &root, OsStr::new(&retained)).unwrap();
            if symlink {
                root.symlink(&retained, &active).unwrap();
            } else {
                root.write(&active, b"foreign active marker").unwrap();
            }
            let marker = entry_identity(&root, OsStr::new(&active)).unwrap();
            drop(transaction);

            for _ in 0..2 {
                assert!(matches!(
                    recover_org_document_writes_with_capability(&root),
                    Err(OrgFilesystemError::WriteRecoveryConflict(_))
                ));
                assert!(root.symlink_metadata("notes.org").is_err());
                assert_eq!(entry_identity(&root, OsStr::new(&active)).unwrap(), marker);
                let evidence = root.open_dir(&retained).unwrap();
                assert_eq!(evidence.read(OLD).unwrap(), OLD_BYTES.as_bytes());
                assert_eq!(evidence.read(STAGE).unwrap(), NEW_BYTES.as_bytes());
                assert_eq!(evidence.read(JOURNAL).unwrap(), journal);
            }
            if symlink {
                assert_eq!(root.read_link(&active).unwrap(), Path::new(&retained));
            } else {
                assert_eq!(root.read(&active).unwrap(), b"foreign active marker");
            }
        }
    }

    fn overwrite_descriptor(file: &mut cap_std::fs::File, bytes: &[u8]) {
        file.seek(SeekFrom::Start(0)).unwrap();
        file.set_len(0).unwrap();
        file.write_all(bytes).unwrap();
        file.sync_all().unwrap();
    }

    fn assert_body(root: &Dir, bytes: &str) {
        let document = read_org_document_with_capability(root, "notes.org").unwrap();
        assert_eq!(document.content.as_bytes(), bytes.as_bytes());
        assert_eq!(document.revision, revision(bytes.as_bytes()));
        let scan = scan_org_workspace_with_capability(root).unwrap();
        assert_eq!(scan.documents.len(), 1);
        assert_eq!(scan.documents[0].relative_path, "notes.org");
        assert!(scan.directories.is_empty());
    }

    #[test]
    fn interrupted_preparation_capture_and_publication_recover_raw_body_idempotently() {
        for stage in 0..3 {
            let workspace = tempdir().unwrap();
            fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let transaction = prepare(&root);
            if stage >= 1 { capture_org_write(&transaction).unwrap(); }
            if stage >= 2 { publish_org_write(&transaction).unwrap(); }
            drop(transaction);
            recover_org_document_writes_with_capability(&root).unwrap();
            recover_org_document_writes_with_capability(&root).unwrap();
            assert_body(&root, if stage == 2 { NEW_BYTES } else { OLD_BYTES });
        }
    }

    #[test]
    fn legacy_cleanup_slots_and_interrupted_restoration_are_retained() {
        for stage in 0..4 {
            let workspace = tempdir().unwrap();
            fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let transaction = prepare(&root);
            capture_org_write(&transaction).unwrap();
            publish_org_write(&transaction).unwrap();
            if stage >= 1 {
                rename_noreplace(&transaction.directory, OsStr::new(STAGE), &transaction.directory, OsStr::new("stage.gc")).unwrap();
            }
            if stage >= 2 {
                rename_noreplace(&transaction.directory, OsStr::new(OLD), &transaction.directory, OsStr::new("old.gc")).unwrap();
            }
            if stage >= 3 {
                rename_noreplace(&transaction.directory, OsStr::new(JOURNAL), &transaction.directory, OsStr::new(JOURNAL_GC)).unwrap();
            }
            sync_directory(&transaction.directory).unwrap();
            drop(transaction);
            recover_org_document_writes_with_capability(&root).unwrap();
            recover_org_document_writes_with_capability(&root).unwrap();
            assert_body(&root, NEW_BYTES);
            let inventory = scan_org_workspace_with_capability(&root).unwrap().original_recoveries;
            assert_eq!(inventory.len(), 5);
            for (object, expected) in [
                (OrgRecoveryObjectKind::Original, OLD_BYTES.as_bytes()),
                (OrgRecoveryObjectKind::Staged, NEW_BYTES.as_bytes()),
            ] {
                let retained = inventory.iter().find(|entry| entry.object == object).unwrap();
                assert_eq!(root.read(&retained.relative_path).unwrap(), expected);
            }
            assert!(inventory.iter().any(|entry| entry.object == OrgRecoveryObjectKind::Journal));
        }

        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let transaction = prepare(&root);
        capture_org_write(&transaction).unwrap();
        let original = transaction.journal.original.as_ref().unwrap();
        let file = require_write_object(&transaction.directory, OsStr::new(OLD), original, "notes.org").unwrap();
        // Model interruption after descriptor-bound restoration, before retention is completed.
        link_open_file(&file, &transaction.directory, OsStr::new(OLD), &root, OsStr::new("notes.org")).unwrap();
        sync_directory(&root).unwrap();
        drop(transaction);
        recover_org_document_writes_with_capability(&root).unwrap();
        recover_org_document_writes_with_capability(&root).unwrap();
        assert_body(&root, OLD_BYTES);
        let inventory = scan_org_workspace_with_capability(&root).unwrap().original_recoveries;
        assert_eq!(inventory.len(), 5);
        let stage = inventory.iter().find(|entry| entry.object == OrgRecoveryObjectKind::Staged).unwrap();
        assert_eq!(root.read(&stage.relative_path).unwrap(), NEW_BYTES.as_bytes());
    }

    #[test]
    fn external_replacement_and_in_place_edits_fail_closed_retaining_bytes() {
        for published in [false, true] {
            for replace in [false, true] {
                let workspace = tempdir().unwrap();
                fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
                let root = open_workspace_capability(workspace.path()).unwrap();
                let transaction = prepare(&root);
                capture_org_write(&transaction).unwrap();
                if published { publish_org_write(&transaction).unwrap(); }
                if replace && published { root.remove_file("notes.org").unwrap(); }
                fs::write(workspace.path().join("notes.org"), "external\r\n\0change").unwrap();
                assert!(recover_org_document_writes_with_capability(&root).is_err());
                assert!(recover_org_document_writes_with_capability(&root).is_err());
                assert_eq!(root.read("notes.org").unwrap(), b"external\r\n\0change");
                assert_eq!(transaction.directory.read(OLD).unwrap(), OLD_BYTES.as_bytes());
                assert!(transaction.directory.symlink_metadata(JOURNAL).is_ok());
                assert!(transaction.directory.symlink_metadata(STAGE).is_ok());
            }
        }
    }

    #[test]
    fn byte_identical_foreign_inode_is_not_owned_by_recovery() {
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let transaction = prepare(&root);
        capture_org_write(&transaction).unwrap();
        fs::write(workspace.path().join("notes.org"), NEW_BYTES).unwrap();
        assert!(matches!(recover_org_document_writes_with_capability(&root), Err(OrgFilesystemError::WriteRecoveryConflict(_))));
        assert_eq!(transaction.directory.read(OLD).unwrap(), OLD_BYTES.as_bytes());
        assert_eq!(root.read("notes.org").unwrap(), NEW_BYTES.as_bytes());
    }

    #[test]
    fn replaced_stage_cannot_publish_or_produce_a_successful_receipt() {
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let transaction = prepare(&root);
        capture_org_write(&transaction).unwrap();
        transaction.directory.rename(STAGE, &transaction.directory, "retained-stage").unwrap();
        transaction.directory.write(STAGE, "foreign").unwrap();
        assert!(publish_org_write(&transaction).is_err());
        assert!(recover_org_document_writes_with_capability(&root).is_err());
        assert_eq!(transaction.directory.read("retained-stage").unwrap(), NEW_BYTES.as_bytes());
        assert_eq!(transaction.directory.read(STAGE).unwrap(), b"foreign");
        assert_eq!(transaction.directory.read(OLD).unwrap(), OLD_BYTES.as_bytes());
    }

    #[test]
    fn completion_does_not_remove_replaced_captured_staged_journal_or_probe_objects() {
        for slot in [OLD, STAGE, JOURNAL, PUBLICATION_LINK] {
            let workspace = tempdir().unwrap();
            fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let transaction = prepare(&root);
            capture_org_write(&transaction).unwrap();
            publish_org_write(&transaction).unwrap();
            transaction.directory.rename(slot, &transaction.directory, "retained-original").unwrap();
            transaction.directory.write(slot, "foreign").unwrap();
            assert!(finish_org_write(&transaction).is_err());
            assert_eq!(transaction.directory.read(slot).unwrap(), b"foreign");
            assert!(transaction.directory.symlink_metadata("retained-original").is_ok());
            assert_eq!(root.read("notes.org").unwrap(), NEW_BYTES.as_bytes());
        }
    }

    #[test]
    fn capture_rechecks_original_identity_and_revision_before_publication() {
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let transaction = prepare(&root);
        root.rename("notes.org", &root, "retained-original").unwrap();
        root.write("notes.org", OLD_BYTES).unwrap();
        assert!(capture_org_write(&transaction).is_err());
        assert!(recover_org_document_writes_with_capability(&root).is_err());
        assert!(transaction.directory.symlink_metadata(OLD).is_err());
        assert_eq!(root.read("notes.org").unwrap(), OLD_BYTES.as_bytes());
        assert_eq!(root.read("retained-original").unwrap(), OLD_BYTES.as_bytes());
        assert_eq!(transaction.directory.read(STAGE).unwrap(), NEW_BYTES.as_bytes());
    }

    #[test]
    fn missing_revision_creation_skips_occupied_directory_binary_file_and_symlink_without_reading_them() {
        use std::os::unix::fs::symlink;
        for kind in 0..3 {
            let workspace = tempdir().unwrap();
            let outside = tempdir().unwrap();
            fs::write(outside.path().join("private"), b"outside\0unchanged").unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            match kind {
                0 => {
                    root.create_dir("notes.org").unwrap();
                    root.write("notes.org/child", b"directory child").unwrap();
                }
                1 => root.write("notes.org", [0xff, 0xfe, 0x00]).unwrap(),
                _ => symlink(outside.path().join("private"), workspace.path().join("notes.org")).unwrap(),
            }
            assert!(matches!(
                write_org_document_with_capability(&root, "notes.org", NEW_BYTES, Some("<missing>")),
                Err(OrgFilesystemError::CreationCollision(_))
            ));
            // A proven preflight collision has created no stage, journal, or temporary directory.
            assert_eq!(root.entries().unwrap().count(), 1);
            write_org_document_with_capability(&root, "notes-2.org", NEW_BYTES, Some("<missing>")).unwrap();
            assert_eq!(root.read("notes-2.org").unwrap(), NEW_BYTES.as_bytes());
            match kind {
                0 => assert_eq!(root.read("notes.org/child").unwrap(), b"directory child"),
                1 => assert_eq!(root.read("notes.org").unwrap(), [0xff, 0xfe, 0x00]),
                _ => {
                    assert!(root.symlink_metadata("notes.org").unwrap().file_type().is_symlink());
                    assert_eq!(fs::read(outside.path().join("private")).unwrap(), b"outside\0unchanged");
                }
            }
        }
    }

    #[test]
    fn post_stage_collision_retains_foreign_target_stage_and_journal_without_proving_no_write() {
        for kind in 0..3 {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let transaction = prepare_org_write(&root, Path::new("notes.org"), NEW_BYTES, Some("<missing>")).unwrap();
            capture_org_write(&transaction).unwrap();
            match kind {
                0 => {
                    root.create_dir("notes.org").unwrap();
                    root.write("notes.org/child", b"foreign child").unwrap();
                }
                1 => root.write("notes.org", [0xff, 0xfe, 0x00]).unwrap(),
                _ => root.write("notes.org", b"racing UTF8 occupant").unwrap(),
            }
            let error = publish_org_write(&transaction).unwrap_err();
            assert!(!matches!(error, OrgFilesystemError::CreationCollision(_)));
            assert!(root.symlink_metadata(&transaction.journal.directory_name).is_ok());
            assert_eq!(transaction.directory.read(STAGE).unwrap(), NEW_BYTES.as_bytes());
            assert!(transaction.directory.symlink_metadata(JOURNAL).is_ok());
            match kind {
                0 => assert_eq!(root.read("notes.org/child").unwrap(), b"foreign child"),
                1 => assert_eq!(root.read("notes.org").unwrap(), [0xff, 0xfe, 0x00]),
                _ => assert_eq!(root.read("notes.org").unwrap(), b"racing UTF8 occupant"),
            }
        }
    }

    #[test]
    fn published_edited_inode_retains_stage_and_never_becomes_a_preflight_collision() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let transaction = prepare_org_write(&root, Path::new("notes.org"), NEW_BYTES, Some("<missing>")).unwrap();
        capture_org_write(&transaction).unwrap();
        publish_org_write(&transaction).unwrap();
        root.write("notes.org", b"edited recovered entry").unwrap();
        assert_eq!(entry_identity(&root, OsStr::new("notes.org")).unwrap(), Some(transaction.journal.staged.as_ref().unwrap().identity));
        assert!(matches!(publish_org_write(&transaction), Err(OrgFilesystemError::WriteRecoveryConflict(_))));
        assert_eq!(root.read("notes.org").unwrap(), b"edited recovered entry");
        assert_eq!(transaction.directory.read(STAGE).unwrap(), b"edited recovered entry");
        assert!(recover_org_document_writes_with_capability(&root).is_err());
        assert!(transaction.directory.symlink_metadata(JOURNAL).is_ok());
        assert!(root.symlink_metadata(&transaction.journal.directory_name).is_ok());
    }

    #[test]
    fn concurrent_create_is_not_overwritten_and_interrupted_create_is_never_replayed() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let transaction = prepare_org_write(&root, Path::new("notes.org"), NEW_BYTES, None).unwrap();
        capture_org_write(&transaction).unwrap();
        root.write("notes.org", "concurrent").unwrap();
        assert!(matches!(publish_org_write(&transaction), Err(OrgFilesystemError::RevisionConflict { .. })));
        assert!(recover_org_document_writes_with_capability(&root).is_err());
        assert_eq!(root.read("notes.org").unwrap(), b"concurrent");
        assert_eq!(transaction.directory.read(STAGE).unwrap(), NEW_BYTES.as_bytes());

        for phase in 0..3 {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let transaction = prepare_org_write(&root, Path::new("notes.org"), NEW_BYTES, None).unwrap();
            if phase >= 1 { capture_org_write(&transaction).unwrap(); }
            if phase >= 2 { publish_org_write(&transaction).unwrap(); }
            drop(transaction);
            recover_org_document_writes_with_capability(&root).unwrap();
            recover_org_document_writes_with_capability(&root).unwrap();
            let snapshot = scan_org_workspace_with_capability(&root).unwrap();
            assert_eq!(snapshot.documents.len(), usize::from(phase == 2));
            assert!(snapshot.directories.is_empty());
            let staged = snapshot.original_recoveries.iter().find(|entry| entry.object == OrgRecoveryObjectKind::Staged).unwrap();
            assert_eq!(root.read(&staged.relative_path).unwrap(), NEW_BYTES.as_bytes());
            assert!(snapshot.original_recoveries.iter().any(|entry| entry.object == OrgRecoveryObjectKind::Journal));
            if phase == 2 { assert_body(&root, NEW_BYTES); }
            else { assert!(root.symlink_metadata("notes.org").is_err()); }
        }
    }

    #[test]
    fn unidentified_or_partial_preparations_and_older_orphans_are_preserved() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write(".grain-older.tmp", OLD_BYTES).unwrap();
        root.create_dir(".grain-write-unidentified.tmp").unwrap();
        let orphan = root.open_dir(".grain-write-unidentified.tmp").unwrap();
        orphan.write("journal.preparing", "{partial").unwrap();
        orphan.write(STAGE, NEW_BYTES).unwrap();
        recover_org_document_writes_with_capability(&root).unwrap();
        recover_org_document_writes_with_capability(&root).unwrap();
        assert_eq!(root.read(".grain-older.tmp").unwrap(), OLD_BYTES.as_bytes());
        assert_eq!(orphan.read("journal.preparing").unwrap(), b"{partial");
        assert_eq!(orphan.read(STAGE).unwrap(), NEW_BYTES.as_bytes());
        assert!(scan_org_workspace_with_capability(&root).unwrap().directories.is_empty());
    }

    #[test]
    fn journal_provenance_cannot_be_transplanted_to_another_parent() {
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let transaction = prepare(&root);
        capture_org_write(&transaction).unwrap();
        root.create_dir("other").unwrap();
        let other = root.open_dir("other").unwrap();
        root.rename(&transaction.journal.directory_name, &other, &transaction.journal.directory_name).unwrap();
        assert!(recover_org_document_writes_with_capability(&root).is_err());
        assert_eq!(transaction.directory.read(OLD).unwrap(), OLD_BYTES.as_bytes());
        assert_eq!(transaction.directory.read(STAGE).unwrap(), NEW_BYTES.as_bytes());
    }

    #[test]
    fn ordinary_save_preserves_permissions_raw_bytes_and_rejects_stale_revisions() {
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.set_permissions("notes.org", Permissions::from_mode(0o640)).unwrap();
        let receipt = write_org_document_with_capability(&root, "notes.org", NEW_BYTES, Some(&revision(OLD_BYTES.as_bytes()))).unwrap();
        assert_eq!(receipt.revision, revision(NEW_BYTES.as_bytes()));
        assert_body(&root, NEW_BYTES);
        assert_eq!(root.metadata("notes.org").unwrap().permissions().mode() & 0o777, 0o640);
        assert!(matches!(write_org_document_with_capability(&root, "notes.org", OLD_BYTES, Some(&revision(OLD_BYTES.as_bytes()))), Err(OrgFilesystemError::RevisionConflict { .. })));
        assert_body(&root, NEW_BYTES);
    }

    #[test]
    fn save_ack_retains_late_original_descriptor_writes_across_recovery_and_scan() {
        use std::io::{Seek, SeekFrom};
        use std::os::unix::fs::MetadataExt;
        let workspace = tempdir().unwrap();
        fs::create_dir(workspace.path().join("notes")).unwrap();
        let source = workspace.path().join("notes/source.org");
        fs::write(&source, OLD_BYTES).unwrap();
        let mut external = fs::OpenOptions::new().read(true).write(true).open(&source).unwrap();
        let identity = external.metadata().unwrap().ino();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let saved = write_org_document_with_capability(&root, "notes/source.org", NEW_BYTES, Some(&revision(OLD_BYTES.as_bytes()))).unwrap();
        let retained = saved.original_recovery.unwrap();
        assert_eq!(external.metadata().unwrap().nlink(), 1);
        external.seek(SeekFrom::Start(0)).unwrap();
        external.set_len(0).unwrap();
        let late = b"late original fd bytes\r\n\0\xff";
        external.write_all(late).unwrap();
        external.sync_all().unwrap();
        recover_org_document_writes_with_capability(&root).unwrap();
        recover_org_document_writes_with_capability(&root).unwrap();
        assert_eq!(root.read("notes/source.org").unwrap(), NEW_BYTES.as_bytes());
        assert_eq!(root.read(&retained.relative_path).unwrap(), late);
        assert_eq!(fs::metadata(workspace.path().join(&retained.relative_path)).unwrap().ino(), identity);
        let scan = scan_org_workspace_with_capability(&root).unwrap();
        assert_eq!(scan.original_recoveries.len(), 5);
        assert!(scan.original_recoveries.contains(&retained));
        assert_eq!(retained.object, OrgRecoveryObjectKind::Original);
        assert!(scan.original_recoveries.iter().any(|entry| entry.object == OrgRecoveryObjectKind::Staged));
        assert!(scan.original_recoveries.iter().any(|entry| entry.object == OrgRecoveryObjectKind::Journal));
        assert_eq!(scan.documents[0].relative_path, "notes/source.org");
        assert_eq!(scan.directories, ["notes"]);
    }

    #[test]
    fn deletion_ack_preserves_open_writer_inode_and_does_not_replay_as_a_save() {
        use std::io::{Seek, SeekFrom};
        use std::os::unix::fs::MetadataExt;
        let workspace = tempdir().unwrap();
        let source = workspace.path().join("notes.org");
        fs::write(&source, OLD_BYTES).unwrap();
        let mut external = fs::OpenOptions::new().read(true).write(true).open(&source).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let retained = delete_org_document_with_capability(&root, "notes.org", &revision(OLD_BYTES.as_bytes())).unwrap();
        assert_eq!(external.metadata().unwrap().nlink(), 1);
        assert!(root.symlink_metadata("notes.org").is_err());
        external.seek(SeekFrom::Start(0)).unwrap();
        external.set_len(0).unwrap();
        external.write_all(b"after delete ACK \0 retained").unwrap();
        external.sync_all().unwrap();
        recover_org_document_writes_with_capability(&root).unwrap();
        assert!(root.symlink_metadata("notes.org").is_err());
        assert_eq!(root.read(&retained.relative_path).unwrap(), b"after delete ACK \0 retained");
        let scan = scan_org_workspace_with_capability(&root).unwrap();
        assert!(scan.documents.is_empty());
        assert_eq!(scan.original_recoveries.len(), 4);
        assert!(scan.original_recoveries.contains(&retained));
        assert!(scan.original_recoveries.iter().all(|entry| entry.kind == OrgOriginalRecoveryKind::Delete));
        assert!(!scan.original_recoveries.iter().any(|entry| entry.object == OrgRecoveryObjectKind::Staged));
    }

    #[test]
    fn interrupted_delete_restores_original_without_discarding_its_recovery_path() {
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let transaction = prepare_org_transaction(&root, Path::new("notes.org"), None, Some(&revision(OLD_BYTES.as_bytes()))).unwrap();
        capture_org_write(&transaction).unwrap();
        drop(transaction);
        recover_org_document_writes_with_capability(&root).unwrap();
        assert_body(&root, OLD_BYTES);
        let retained = scan_org_workspace_with_capability(&root).unwrap().original_recoveries.into_iter()
            .find(|entry| entry.object == OrgRecoveryObjectKind::Original).unwrap();
        assert_eq!(root.read(retained.relative_path).unwrap(), OLD_BYTES.as_bytes());
    }
    #[test]
    fn successful_creation_retains_stage_journal_and_probe_without_an_original() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let receipt = write_org_document_with_capability(&root, "notes.org", NEW_BYTES, Some("<missing>")).unwrap();
        let primary = receipt.original_recovery.unwrap();
        assert_eq!(primary.object, OrgRecoveryObjectKind::Staged);
        let inventory = scan_org_workspace_with_capability(&root).unwrap().original_recoveries;
        assert_eq!(inventory.len(), 4);
        assert!(inventory.contains(&primary));
        assert!(!inventory.iter().any(|entry| entry.object == OrgRecoveryObjectKind::Original));
        assert_eq!(root.read(&primary.relative_path).unwrap(), NEW_BYTES.as_bytes());
        root.remove_file("notes.org").unwrap();
        recover_org_document_writes_with_capability(&root).unwrap();
        assert!(root.symlink_metadata("notes.org").is_err());
        assert_eq!(scan_org_workspace_with_capability(&root).unwrap().original_recoveries, inventory);
    }

    #[test]
    fn interrupted_restoration_retains_late_stage_and_journal_descriptor_writes() {
        use std::io::{Seek, SeekFrom};
        use std::os::unix::fs::MetadataExt;
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let transaction = prepare(&root);
        capture_org_write(&transaction).unwrap();
        publish_org_write(&transaction).unwrap();
        let mut external_stage = fs::OpenOptions::new().read(true).write(true).open(workspace.path().join("notes.org")).unwrap();
        let mut journal_options = OpenOptions::new();
        journal_options.read(true).append(true);
        let mut external_journal = transaction.directory.open_with(JOURNAL, &journal_options).unwrap();
        let stage_identity = external_stage.metadata().unwrap().ino();
        root.remove_file("notes.org").unwrap();
        recover_org_document_writes_with_capability(&root).unwrap();
        assert_eq!(external_stage.metadata().unwrap().nlink(), 1);
        external_stage.seek(SeekFrom::Start(0)).unwrap();
        external_stage.set_len(0).unwrap();
        let late = b"late staged FD body\r\n\0\xff";
        external_stage.write_all(late).unwrap();
        external_stage.sync_all().unwrap();
        external_journal.write_all(b"\r\n\t").unwrap();
        external_journal.sync_all().unwrap();
        drop(transaction);
        recover_org_document_writes_with_capability(&root).unwrap();
        let inventory = scan_org_workspace_with_capability(&root).unwrap().original_recoveries;
        let staged = inventory.iter().find(|entry| entry.object == OrgRecoveryObjectKind::Staged).unwrap();
        let journal = inventory.iter().find(|entry| entry.object == OrgRecoveryObjectKind::Journal).unwrap();
        assert_eq!(root.read(&staged.relative_path).unwrap(), late);
        assert_eq!(fs::metadata(workspace.path().join(&staged.relative_path)).unwrap().ino(), stage_identity);
        assert!(root.read(&journal.relative_path).unwrap().ends_with(b"\r\n\t"));
        assert_body(&root, OLD_BYTES);
        // Corrupt provenance is not silently normalized or used as Source authority either.
        external_journal.write_all(b"late invalid journal bytes").unwrap();
        external_journal.sync_all().unwrap();
        recover_org_document_writes_with_capability(&root).unwrap();
        assert!(scan_org_workspace_with_capability(&root).is_err());
        assert!(root.read(&journal.relative_path).unwrap().ends_with(b"late invalid journal bytes"));
        assert_eq!(root.read(&staged.relative_path).unwrap(), late);
        assert_eq!(root.read("notes.org").unwrap(), OLD_BYTES.as_bytes());
    }

    #[test]
    fn mutated_unpublished_creation_stage_is_inventory_only_even_when_not_utf8() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let transaction = prepare_org_write(&root, Path::new("notes.org"), NEW_BYTES, None).unwrap();
        transaction.directory.write(STAGE, b"external staged bytes\0\xff").unwrap();
        drop(transaction);
        recover_org_document_writes_with_capability(&root).unwrap();
        let snapshot = scan_org_workspace_with_capability(&root).unwrap();
        assert!(snapshot.documents.is_empty());
        assert!(root.symlink_metadata("notes.org").is_err());
        let staged = snapshot.original_recoveries.iter().find(|entry| entry.object == OrgRecoveryObjectKind::Staged).unwrap();
        assert_eq!(root.read(&staged.relative_path).unwrap(), b"external staged bytes\0\xff");
    }

    #[test]
    fn publication_probe_refusal_preserves_the_still_named_original_and_all_preparations() {
        for occupied_parent in [false, true] {
            let workspace = tempdir().unwrap();
            fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let transaction = prepare(&root);
            let original_identity = entry_identity(&root, OsStr::new("notes.org")).unwrap();
            if occupied_parent {
                root.write(transaction.journal.publication_target.as_ref().unwrap(), b"foreign probe occupant").unwrap();
            } else {
                transaction.directory.write(PUBLICATION_LINK, b"foreign probe occupant").unwrap();
            }
            assert!(capture_org_write(&transaction).is_err());
            assert_eq!(entry_identity(&root, OsStr::new("notes.org")).unwrap(), original_identity);
            assert_eq!(root.read("notes.org").unwrap(), OLD_BYTES.as_bytes());
            assert!(transaction.directory.symlink_metadata(OLD).is_err());
            assert_eq!(transaction.directory.read(STAGE).unwrap(), NEW_BYTES.as_bytes());
            assert!(transaction.directory.symlink_metadata(JOURNAL).is_ok());
            if occupied_parent {
                assert_eq!(root.read(transaction.journal.publication_target.as_ref().unwrap()).unwrap(), b"foreign probe occupant");
            } else {
                assert_eq!(transaction.directory.read(PUBLICATION_LINK).unwrap(), b"foreign probe occupant");
            }
        }
    }

    #[test]
    fn retained_gc_slot_substitutions_never_authorize_unlinking() {
        for slot in ["stage.gc", JOURNAL_GC] {
            let workspace = tempdir().unwrap();
            fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let transaction = prepare(&root);
            capture_org_write(&transaction).unwrap();
            publish_org_write(&transaction).unwrap();
            let source = if slot == "stage.gc" { STAGE } else { JOURNAL };
            transaction.directory.rename(source, &transaction.directory, slot).unwrap();
            finish_org_write(&transaction).unwrap();
            let before = transaction.directory.read(slot).unwrap();
            transaction.directory.rename(slot, &transaction.directory, "externally-held").unwrap();
            transaction.directory.write(slot, b"foreign replacement must survive").unwrap();
            recover_org_document_writes_with_capability(&root).unwrap();
            assert!(scan_org_workspace_with_capability(&root).is_err());
            assert_eq!(transaction.directory.read(slot).unwrap(), b"foreign replacement must survive");
            assert_eq!(transaction.directory.read("externally-held").unwrap(), before);
            assert_eq!(root.read("notes.org").unwrap(), NEW_BYTES.as_bytes());
        }
    }

    #[test]
    fn active_completion_and_restart_refuse_original_descriptor_drift_in_all_journal_versions() {
        for (version, deletion) in [(1, false), (2, true), (3, false), (3, true)] {
            for bytes in [b"external\r\n\0original".as_slice(), b"external\r\n\0\xff".as_slice()] {
                for gc_slot in [false, true] {
                    let workspace = tempdir().unwrap();
                    let root = open_workspace_capability(workspace.path()).unwrap();
                    root.write("notes.org", OLD_BYTES).unwrap();
                    let mut options = OpenOptions::new();
                    options.read(true).write(true);
                    // This writer is open before capture; the removed target name is irrelevant.
                    let mut external = root.open_with("notes.org", &options).unwrap();
                    let transaction = prepare_captured_version(&root, version, deletion);
                    if !deletion { publish_org_write(&transaction).unwrap(); }
                    let slot = if gc_slot { "old.gc" } else { OLD };
                    if gc_slot {
                        transaction.directory.rename(OLD, &transaction.directory, slot).unwrap();
                    }
                    overwrite_descriptor(&mut external, bytes);
                    let completion = if deletion {
                        finish(&transaction.parent, &transaction.directory, &transaction.journal, "notes.org", DELETED_PREFIX).map(|_| ())
                    } else {
                        finish_org_write(&transaction).map(|_| ())
                    };
                    assert!(completion.is_err());
                    assert!(recover_org_document_writes_with_capability(&root).is_err());
                    assert!(recover_org_document_writes_with_capability(&root).is_err());
                    assert_eq!(transaction.directory.read(slot).unwrap(), bytes);
                    assert!(transaction.directory.symlink_metadata(JOURNAL).is_ok());
                    assert!(root.symlink_metadata(&transaction.journal.directory_name).is_ok());
                    if deletion {
                        assert!(root.symlink_metadata("notes.org").is_err());
                    } else {
                        assert_eq!(root.read("notes.org").unwrap(), NEW_BYTES.as_bytes());
                        assert_eq!(transaction.directory.read(STAGE).unwrap(), NEW_BYTES.as_bytes());
                    }
                }
            }
        }
    }

    #[test]
    fn active_completion_and_recovery_refuse_missing_captured_original_without_rolling_back() {
        for (version, deletion) in [(1, false), (2, true), (3, false), (3, true)] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            root.write("notes.org", OLD_BYTES).unwrap();
            let transaction = prepare_captured_version(&root, version, deletion);
            if !deletion { publish_org_write(&transaction).unwrap(); }
            transaction.directory.rename(OLD, &root, ".grain-externally-held.tmp").unwrap();
            let completion = if deletion {
                finish(&transaction.parent, &transaction.directory, &transaction.journal, "notes.org", DELETED_PREFIX).map(|_| ())
            } else {
                finish_org_write(&transaction).map(|_| ())
            };
            assert!(matches!(completion, Err(OrgFilesystemError::WriteRecoveryConflict(_))));
            assert!(recover_org_document_writes_with_capability(&root).is_err());
            assert_eq!(root.read(".grain-externally-held.tmp").unwrap(), OLD_BYTES.as_bytes());
            assert!(transaction.directory.symlink_metadata(JOURNAL).is_ok());
            assert!(root.symlink_metadata(&transaction.journal.directory_name).is_ok());
            if deletion {
                assert!(root.symlink_metadata("notes.org").is_err());
            } else {
                assert_eq!(root.read("notes.org").unwrap(), NEW_BYTES.as_bytes());
                assert_eq!(transaction.directory.read(STAGE).unwrap(), NEW_BYTES.as_bytes());
            }
        }
    }

    #[test]
    fn stage_descriptor_drift_after_validation_refuses_publication_and_never_replays_stage() {
        for version in [1, 3] {
            for bytes in [b"external\r\n\0stage".as_slice(), b"external\r\n\0\xff".as_slice()] {
                let workspace = tempdir().unwrap();
                let root = open_workspace_capability(workspace.path()).unwrap();
                root.write("notes.org", OLD_BYTES).unwrap();
                let transaction = prepare_captured_version(&root, version, false);
                let mut options = OpenOptions::new();
                options.read(true).write(true);
                let mut external = transaction.directory.open_with(STAGE, &options).unwrap();
                let validated = require_write_object(&transaction.directory, OsStr::new(STAGE), transaction.journal.staged.as_ref().unwrap(), "notes.org").unwrap();
                overwrite_descriptor(&mut external, bytes);
                assert!(require_open_write_object(&validated, transaction.journal.staged.as_ref().unwrap(), "notes.org").is_err());
                assert!(publish_org_write(&transaction).is_err());
                assert!(root.symlink_metadata("notes.org").is_err());
                assert_eq!(transaction.directory.read(STAGE).unwrap(), bytes);
                // Restoration is authorized only by unchanged original bytes, never the stage.
                recover_org_document_writes_with_capability(&root).unwrap();
                assert_eq!(root.read("notes.org").unwrap(), OLD_BYTES.as_bytes());
                let inventory = scan_org_workspace_with_capability(&root).unwrap().original_recoveries;
                let staged = inventory.iter().find(|entry| entry.object == OrgRecoveryObjectKind::Staged).unwrap();
                assert_eq!(root.read(&staged.relative_path).unwrap(), bytes);
            }
        }
    }

    #[test]
    fn observed_post_retention_stage_drift_remains_unresolved_on_reopen() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("notes.org", OLD_BYTES).unwrap();
        let transaction = prepare_captured_version(&root, 3, false);
        let mut options = OpenOptions::new();
        options.read(true).write(true);
        let mut external = transaction.directory.open_with(STAGE, &options).unwrap();
        publish_org_write(&transaction).unwrap();
        // Pause the real finish protocol after retention, before its caller's final body check.
        let retained_result = finish(&transaction.parent, &transaction.directory,
            &transaction.journal, "notes.org", ORIGINAL_PREFIX).unwrap();
        let retained = &retained_result.0;
        let evidence_directory = Path::new(retained).parent().unwrap().to_path_buf();
        let journal_bytes = transaction.directory.read(JOURNAL).unwrap();
        let changed = b"* external\r\nowned\0stage";
        overwrite_descriptor(&mut external, changed);
        assert!(matches!(require_write_object(&transaction.parent, OsStr::new("notes.org"),
            transaction.journal.staged.as_ref().unwrap(), "notes.org"),
            Err(OrgFilesystemError::WriteRecoveryConflict(_))));
        assert!(matches!(resolve_retention(&transaction.parent, &transaction.directory,
            &transaction.journal, "notes.org", &retained_result, ORIGINAL_PREFIX,
            transaction.journal.staged.as_ref(), OrgOriginalRecoveryKind::Save),
            Err(OrgFilesystemError::WriteRecoveryConflict(_))));
        assert_eq!(root.read("notes.org").unwrap(), changed);
        assert_eq!(root.read(&retained).unwrap(), OLD_BYTES.as_bytes());
        assert_eq!(transaction.directory.read(STAGE).unwrap(), changed);
        assert!(transaction.directory.symlink_metadata(JOURNAL).is_ok());
        drop(external);
        drop(transaction);
        drop(root);
        for _ in 0..2 {
            let reopened = open_workspace_capability(workspace.path()).unwrap();
            assert!(matches!(recover_org_document_writes_with_capability(&reopened),
                Err(OrgFilesystemError::WriteRecoveryConflict(_))));
            assert_eq!(reopened.read("notes.org").unwrap(), changed);
            assert_eq!(reopened.read(&retained).unwrap(), OLD_BYTES.as_bytes());
            assert_eq!(reopened.read(evidence_directory.join(STAGE)).unwrap(), changed);
            assert_eq!(reopened.read(evidence_directory.join(JOURNAL)).unwrap(), journal_bytes);
        }
    }

    #[test]
    fn post_retention_original_or_journal_rejection_preserves_evidence_on_two_reopens() {
        for (version, deletion) in [(1, false), (2, true), (3, false), (3, true)] {
            for journal_drift in [false, true] {
                let workspace = tempdir().unwrap();
                let root = open_workspace_capability(workspace.path()).unwrap();
                root.write("notes.org", OLD_BYTES).unwrap();
                let transaction = prepare_captured_version(&root, version, deletion);
                let mut options = OpenOptions::new();
                options.read(true).write(true);
                let slot = if journal_drift { JOURNAL } else { OLD };
                let mut external = transaction.directory.open_with(slot, &options).unwrap();
                if !deletion { publish_org_write(&transaction).unwrap(); }
                let prefix = if deletion { DELETED_PREFIX } else { ORIGINAL_PREFIX };
                let retained = finish(&root, &transaction.directory, &transaction.journal, "notes.org", prefix).unwrap();
                let changed = if journal_drift {
                    // Valid UTF-8 and valid JSON, but different recorded meaning in the same inode.
                    let mut changed = serde_json::to_value(&transaction.journal).unwrap();
                    changed["target"] = serde_json::Value::String("other.org".to_owned());
                    serde_json::to_vec(&changed).unwrap()
                } else {
                    b"external\r\n\0retained original".to_vec()
                };
                overwrite_descriptor(&mut external, &changed);
                assert!(matches!(resolve_retention(&root, &transaction.directory,
                    &transaction.journal, "notes.org", &retained, prefix,
                    transaction.journal.staged.as_ref(),
                    if deletion { OrgOriginalRecoveryKind::Delete } else { OrgOriginalRecoveryKind::Save }),
                    Err(OrgFilesystemError::WriteRecoveryConflict(_))));
                let evidence_directory = Path::new(&retained.0).parent().unwrap().to_path_buf();
                let old_bytes = transaction.directory.read(OLD).unwrap();
                let journal_bytes = transaction.directory.read(JOURNAL).unwrap();
                drop(external);
                drop(transaction);
                drop(root);
                for _ in 0..2 {
                    let reopened = open_workspace_capability(workspace.path()).unwrap();
                    assert!(matches!(recover_org_document_writes_with_capability(&reopened),
                        Err(OrgFilesystemError::WriteRecoveryConflict(_))));
                    assert_eq!(reopened.read(evidence_directory.join(OLD)).unwrap(), old_bytes);
                    assert_eq!(reopened.read(evidence_directory.join(JOURNAL)).unwrap(), journal_bytes);
                    assert!(reopened.symlink_metadata("other.org").is_err());
                    if deletion {
                        assert!(reopened.symlink_metadata("notes.org").is_err());
                    } else {
                        assert_eq!(reopened.read("notes.org").unwrap(), NEW_BYTES.as_bytes());
                        assert_eq!(reopened.read(evidence_directory.join(STAGE)).unwrap(), NEW_BYTES.as_bytes());
                    }
                }
            }
        }
    }

    #[test]
    fn crash_after_retention_never_replays_save_or_quarantined_deletion() {
        for deletion in [false, true] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            root.write("notes.org", OLD_BYTES).unwrap();
            let transaction = prepare_captured_version(&root, 3, deletion);
            if !deletion { publish_org_write(&transaction).unwrap(); }
            let prefix = if deletion { DELETED_PREFIX } else { ORIGINAL_PREFIX };
            let retained = finish(&root, &transaction.directory, &transaction.journal, "notes.org", prefix).unwrap();
            let inventory = scan_org_workspace_with_capability(&root).unwrap().original_recoveries;
            assert!(inventory.iter().any(|entry| entry.relative_path == retained.0));
            let journal_bytes = transaction.directory.read(JOURNAL).unwrap();
            let evidence_directory = Path::new(&retained.0).parent().unwrap().to_path_buf();
            drop(transaction);
            drop(root);
            for _ in 0..2 {
                let reopened = open_workspace_capability(workspace.path()).unwrap();
                assert!(matches!(recover_org_document_writes_with_capability(&reopened),
                    Err(OrgFilesystemError::WriteRecoveryConflict(_))));
                assert_eq!(reopened.read(&retained.0).unwrap(), OLD_BYTES.as_bytes());
                assert_eq!(reopened.read(evidence_directory.join(JOURNAL)).unwrap(), journal_bytes);
                if deletion {
                    assert!(reopened.symlink_metadata("notes.org").is_err());
                } else {
                    assert_eq!(reopened.read("notes.org").unwrap(), NEW_BYTES.as_bytes());
                }
            }
        }
    }

    #[test]
    fn resolved_save_and_delete_allow_legitimate_later_external_edits() {
        for deletion in [false, true] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            root.write("notes.org", OLD_BYTES).unwrap();
            let retained = if deletion {
                quarantine_org_document(&root, Path::new("notes.org"), &revision(OLD_BYTES.as_bytes())).unwrap()
            } else {
                write_org_document_with_capability(&root, "notes.org", NEW_BYTES, None).unwrap().original_recovery.unwrap()
            };
            let evidence_directory = Path::new(&retained.relative_path).parent().unwrap().to_path_buf();
            let journal_bytes = root.read(evidence_directory.join(JOURNAL)).unwrap();
            let changed = b"* legitimate external\r\n\0edit";
            // A successful deletion also permits an external editor to create a new target.
            root.write("notes.org", changed).unwrap();
            drop(root);
            for _ in 0..2 {
                let reopened = open_workspace_capability(workspace.path()).unwrap();
                recover_org_document_writes_with_capability(&reopened).unwrap();
                assert_eq!(reopened.read("notes.org").unwrap(), changed);
                assert_eq!(reopened.read(&retained.relative_path).unwrap(), OLD_BYTES.as_bytes());
                assert_eq!(reopened.read(evidence_directory.join(JOURNAL)).unwrap(), journal_bytes);
                let scan = scan_org_workspace_with_capability(&reopened).unwrap();
                assert_eq!(scan.documents.len(), 1);
                assert_eq!(scan.documents[0].relative_path, "notes.org");
                assert!(scan.original_recoveries.contains(&retained));
            }
        }
    }

    #[test]
    fn historical_terminal_names_remain_explicitly_supported_after_external_edits() {
        for (version, deletion) in [(1, false), (2, true), (3, false), (3, true)] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            root.write("notes.org", OLD_BYTES).unwrap();
            let transaction = prepare_captured_version(&root, version, deletion);
            if !deletion { publish_org_write(&transaction).unwrap(); }
            // Reproduce the old successful terminal namespace, which lacked an independent
            // completion witness. It cannot retroactively distinguish a past no-ACK rejection.
            let suffix = transaction.journal.directory_name.strip_prefix(PREFIX).unwrap();
            let prefix = if deletion { DELETED_PREFIX } else { ORIGINAL_PREFIX };
            let legacy_name = format!("{prefix}{suffix}");
            root.rename(&transaction.journal.directory_name, &root, &legacy_name).unwrap();
            sync_directory(&root).unwrap();
            let journal_bytes = transaction.directory.read(JOURNAL).unwrap();
            let changed = b"* legitimate legacy external edit\r\n\0";
            root.write("notes.org", changed).unwrap();
            drop(transaction);
            drop(root);
            for _ in 0..2 {
                let reopened = open_workspace_capability(workspace.path()).unwrap();
                recover_org_document_writes_with_capability(&reopened).unwrap();
                assert_eq!(reopened.read("notes.org").unwrap(), changed);
                assert_eq!(reopened.read(Path::new(&legacy_name).join(OLD)).unwrap(), OLD_BYTES.as_bytes());
                assert_eq!(reopened.read(Path::new(&legacy_name).join(JOURNAL)).unwrap(), journal_bytes);
                let scan = scan_org_workspace_with_capability(&reopened).unwrap();
                assert!(scan.original_recoveries.iter().any(|entry| entry.object == OrgRecoveryObjectKind::Original));
            }
        }
    }

    #[test]
    fn post_retention_deletion_target_reappearance_stays_quarantined_on_restart() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("notes.org", OLD_BYTES).unwrap();
        let transaction = prepare_captured_version(&root, 3, true);
        let retained = finish(&root, &transaction.directory, &transaction.journal, "notes.org", DELETED_PREFIX).unwrap();
        let changed = b"* external new target\r\n\0survives";
        root.write("notes.org", changed).unwrap();
        assert!(matches!(resolve_retention(&root, &transaction.directory, &transaction.journal,
            "notes.org", &retained, DELETED_PREFIX, None, OrgOriginalRecoveryKind::Delete),
            Err(OrgFilesystemError::WriteRecoveryConflict(_))));
        let journal_bytes = transaction.directory.read(JOURNAL).unwrap();
        let evidence_directory = Path::new(&retained.0).parent().unwrap().to_path_buf();
        drop(transaction);
        drop(root);
        for _ in 0..2 {
            let reopened = open_workspace_capability(workspace.path()).unwrap();
            assert!(matches!(recover_org_document_writes_with_capability(&reopened),
                Err(OrgFilesystemError::WriteRecoveryConflict(_))));
            assert_eq!(reopened.read("notes.org").unwrap(), changed);
            assert_eq!(reopened.read(&retained.0).unwrap(), OLD_BYTES.as_bytes());
            assert_eq!(reopened.read(evidence_directory.join(JOURNAL)).unwrap(), journal_bytes);
        }
    }

    #[test]
    fn resolved_namespace_substitution_cannot_inherit_successful_resolution() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("notes.org", OLD_BYTES).unwrap();
        let retained = write_org_document_with_capability(&root, "notes.org", NEW_BYTES, None)
            .unwrap().original_recovery.unwrap();
        let evidence_directory = Path::new(&retained.relative_path).parent().unwrap().to_path_buf();
        let journal_bytes = root.read(evidence_directory.join(JOURNAL)).unwrap();
        let held = ".grain-externally-retained.tmp";
        root.rename(&evidence_directory, &root, held).unwrap();
        root.create_dir(&evidence_directory).unwrap();
        let substitute = root.open_dir(&evidence_directory).unwrap();
        substitute.write(OLD, b"foreign directory bytes").unwrap();
        substitute.write(JOURNAL, &journal_bytes).unwrap();
        drop(substitute);
        drop(root);
        for _ in 0..2 {
            let reopened = open_workspace_capability(workspace.path()).unwrap();
            assert!(matches!(recover_org_document_writes_with_capability(&reopened),
                Err(OrgFilesystemError::WriteRecoveryConflict(_))));
            assert_eq!(reopened.read("notes.org").unwrap(), NEW_BYTES.as_bytes());
            assert_eq!(reopened.read(Path::new(held).join(OLD)).unwrap(), OLD_BYTES.as_bytes());
            assert_eq!(reopened.read(Path::new(held).join(STAGE)).unwrap(), NEW_BYTES.as_bytes());
            assert_eq!(reopened.read(Path::new(held).join(JOURNAL)).unwrap(), journal_bytes);
            assert_eq!(reopened.read(evidence_directory.join(OLD)).unwrap(), b"foreign directory bytes");
            assert_eq!(reopened.read(evidence_directory.join(JOURNAL)).unwrap(), journal_bytes);
        }
    }

    #[test]
    fn recovery_refuses_same_inode_journal_meaning_changes_after_discovery() {
        for (version, deletion) in [(1, false), (2, true), (3, false), (3, true)] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            root.write("notes.org", OLD_BYTES).unwrap();
            let transaction = prepare_captured_version(&root, version, deletion);
            let observed = read_journal(&root, &transaction.directory, &transaction.journal.directory_name).unwrap().unwrap();
            let mut options = OpenOptions::new();
            options.read(true).write(true);
            let mut external = transaction.directory.open_with(JOURNAL, &options).unwrap();
            let mut changed = serde_json::to_value(&observed).unwrap();
            changed["target"] = serde_json::Value::String("other.org".to_owned());
            let changed_bytes = serde_json::to_vec(&changed).unwrap();
            overwrite_descriptor(&mut external, &changed_bytes);
            // Model the retained discovery result entering replay after an external FD write.
            assert!(matches!(recover_write(&root, &transaction.directory, &observed), Err(OrgFilesystemError::WriteRecoveryConflict(_))));
            assert!(root.symlink_metadata("notes.org").is_err());
            assert!(root.symlink_metadata("other.org").is_err());
            assert_eq!(transaction.directory.read(OLD).unwrap(), OLD_BYTES.as_bytes());
            assert_eq!(transaction.directory.read(JOURNAL).unwrap(), changed_bytes);
            assert!(root.symlink_metadata(&transaction.journal.directory_name).is_ok());
            overwrite_descriptor(&mut external, b"invalid journal\r\n\0\xff");
            assert!(recover_org_document_writes_with_capability(&root).is_err());
            assert!(root.symlink_metadata("notes.org").is_err());
            assert!(root.symlink_metadata("other.org").is_err());
            assert_eq!(transaction.directory.read(OLD).unwrap(), OLD_BYTES.as_bytes());
            assert_eq!(transaction.directory.read(JOURNAL).unwrap(), b"invalid journal\r\n\0\xff");
        }
    }

    #[test]
    fn restart_recovery_preserves_valid_v1_and_v2_journal_provenance() {
        for deletion in [false, true] {
            let workspace = tempdir().unwrap();
            fs::write(workspace.path().join("notes.org"), OLD_BYTES).unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            let mut transaction = prepare_org_transaction(&root, Path::new("notes.org"), if deletion { None } else { Some(NEW_BYTES) }, None).unwrap();
            // Create a genuine old-format namespace graph, with no v3 probe fields/slots.
            transaction.directory.rename(PUBLICATION_SOURCE, &root, ".grain-owned-legacy-probe.tmp").unwrap();
            transaction.journal.version = if deletion { 2 } else { 1 };
            transaction.journal.publication_identity = None;
            transaction.journal.publication_target = None;
            let mut legacy = serde_json::to_value(&transaction.journal).unwrap();
            legacy.as_object_mut().unwrap().remove("publication_identity");
            legacy.as_object_mut().unwrap().remove("publication_target");
            transaction.directory.write(JOURNAL, serde_json::to_vec(&legacy).unwrap()).unwrap();
            root.rename("notes.org", &transaction.directory, OLD).unwrap();
            sync_directory(&transaction.directory).unwrap();
            sync_directory(&root).unwrap();
            drop(transaction);
            recover_org_document_writes_with_capability(&root).unwrap();
            recover_org_document_writes_with_capability(&root).unwrap();
            assert_body(&root, OLD_BYTES);
            let inventory = scan_org_workspace_with_capability(&root).unwrap().original_recoveries;
            assert_eq!(inventory.len(), if deletion { 2 } else { 3 });
            assert!(inventory.iter().any(|entry| entry.object == OrgRecoveryObjectKind::Original));
            assert!(inventory.iter().any(|entry| entry.object == OrgRecoveryObjectKind::Journal));
            assert_eq!(inventory.iter().any(|entry| entry.object == OrgRecoveryObjectKind::Staged), !deletion);
        }
    }
}

#[cfg(all(test, target_os = "linux"))]
mod descriptor_tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn unavailable_descriptor_link_primitive_refuses_before_original_capture() {
        // Isolate an actual kernel linkat refusal; no production failure hook or fake publisher.
        let module = module_path!().split_once("::").unwrap().1;
        let output = std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--ignored", "--exact", &format!("{module}::publication_primitive_refusal_child"), "--nocapture"])
            .output().unwrap();
        assert!(output.status.success(), "isolated publication refusal failed: {}\n{}",
            String::from_utf8_lossy(&output.stdout), String::from_utf8_lossy(&output.stderr));
    }

    #[test]
    #[ignore = "seccomp-isolated helper launched by unavailable_descriptor_link_primitive_refuses_before_original_capture"]
    fn publication_primitive_refusal_child() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("notes.org", b"still named original").unwrap();
        let transaction = prepare_org_write(&root, Path::new("notes.org"), "new staged body", None).unwrap();
        let original_identity = entry_identity(&root, OsStr::new("notes.org")).unwrap();
        let mut instructions = [
            libc::sock_filter { code: (libc::BPF_LD | libc::BPF_W | libc::BPF_ABS) as u16, jt: 0, jf: 0, k: 0 },
            libc::sock_filter { code: (libc::BPF_JMP | libc::BPF_JEQ | libc::BPF_K) as u16, jt: 0, jf: 1, k: libc::SYS_linkat as u32 },
            libc::sock_filter { code: (libc::BPF_RET | libc::BPF_K) as u16, jt: 0, jf: 0, k: libc::SECCOMP_RET_ERRNO | libc::EOPNOTSUPP as u32 },
            libc::sock_filter { code: (libc::BPF_RET | libc::BPF_K) as u16, jt: 0, jf: 0, k: libc::SECCOMP_RET_ALLOW },
        ];
        let filter = libc::sock_fprog { len: instructions.len() as u16, filter: instructions.as_mut_ptr() };
        assert_eq!(unsafe { libc::prctl(libc::PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) }, 0);
        assert_eq!(unsafe { libc::prctl(libc::PR_SET_SECCOMP, libc::SECCOMP_MODE_FILTER, &filter, 0, 0) }, 0);
        assert!(matches!(capture_org_write(&transaction), Err(OrgFilesystemError::UnsupportedPlatform(_))));
        assert_eq!(entry_identity(&root, OsStr::new("notes.org")).unwrap(), original_identity);
        assert_eq!(root.read("notes.org").unwrap(), b"still named original");
        assert!(transaction.directory.symlink_metadata(OLD).is_err());
        assert_eq!(transaction.directory.read(STAGE).unwrap(), b"new staged body");
        assert!(transaction.directory.symlink_metadata(JOURNAL).is_ok());
        assert!(transaction.directory.symlink_metadata(PUBLICATION_SOURCE).is_ok());
        assert!(transaction.directory.symlink_metadata(PUBLICATION_LINK).is_err());
        drop(transaction);
        // Restart can inventory/refinalize un-captured preparation without retrying publication.
        recover_org_document_writes_with_capability(&root).unwrap();
        let snapshot = scan_org_workspace_with_capability(&root).unwrap();
        assert_eq!(snapshot.documents.len(), 1);
        assert_eq!(snapshot.original_recoveries.len(), 3);
        assert_eq!(root.read("notes.org").unwrap(), b"still named original");
    }

    #[test]
    fn publication_source_is_the_retained_object_not_a_replaced_name() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let transaction = prepare_org_write(&root, Path::new("notes.org"), "captured\r\n\0body", None).unwrap();
        transaction.directory.rename(STAGE, &transaction.directory, "retained-stage").unwrap();
        transaction.directory.write(STAGE, "foreign").unwrap();
        let stage_file = transaction.stage_file.as_ref().unwrap();
        link_open_file(stage_file, &transaction.directory, OsStr::new(STAGE), &root, OsStr::new("notes.org")).unwrap();
        let installed = require_write_object(&root, OsStr::new("notes.org"), transaction.journal.staged.as_ref().unwrap(), "notes.org").unwrap();
        assert_eq!(file_identity(&installed).unwrap(), file_identity(stage_file).unwrap());
        assert_eq!(root.read("notes.org").unwrap(), b"captured\r\n\0body");
        assert_eq!(transaction.directory.read(STAGE).unwrap(), b"foreign");
        // The changed staging graph remains ambiguous; recovery must not erase either object.
        assert!(recover_org_document_writes_with_capability(&root).is_err());
        assert_eq!(transaction.directory.read("retained-stage").unwrap(), b"captured\r\n\0body");
    }

    #[test]
    fn a_byte_identical_replaced_journal_is_not_provenance() {
        let workspace = tempdir().unwrap();
        fs::write(workspace.path().join("notes.org"), "old").unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        let transaction = prepare_org_write(&root, Path::new("notes.org"), "new", None).unwrap();
        capture_org_write(&transaction).unwrap();
        let bytes = transaction.directory.read(JOURNAL).unwrap();
        transaction.directory.rename(JOURNAL, &transaction.directory, "retained-journal").unwrap();
        transaction.directory.write(JOURNAL, &bytes).unwrap();
        assert!(recover_org_document_writes_with_capability(&root).is_err());
        assert_eq!(transaction.directory.read(OLD).unwrap(), b"old");
        assert_eq!(transaction.directory.read(STAGE).unwrap(), b"new");
        assert_eq!(transaction.directory.read("retained-journal").unwrap(), bytes);
    }
}

#[cfg(all(test, target_os = "macos"))]
mod darwin_refusal_tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn ordinary_save_and_delete_refuse_before_preparation_or_capture() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("notes.org", b"still named original\r\n\0").unwrap();
        let identity = entry_identity(&root, OsStr::new("notes.org")).unwrap();
        assert!(matches!(
            write_org_document_with_capability(&root, "notes.org", "new", None),
            Err(OrgFilesystemError::UnsupportedPlatform(_))
        ));
        assert!(matches!(
            delete_org_document_with_capability(&root, "notes.org", &revision(b"still named original\r\n\0")),
            Err(OrgFilesystemError::UnsupportedPlatform(_))
        ));
        assert_eq!(entry_identity(&root, OsStr::new("notes.org")).unwrap(), identity);
        assert_eq!(root.read("notes.org").unwrap(), b"still named original\r\n\0");
        assert_eq!(root.entries().unwrap().count(), 1);
    }

    #[test]
    fn a_replaceable_named_source_is_not_a_descriptor_publication_fallback() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("source", b"owned source").unwrap();
        let file = root.open("source").unwrap();
        root.rename("source", &root, "externally-held").unwrap();
        root.write("source", b"foreign replacement").unwrap();
        let error = link_open_file(&file, &root, OsStr::new("source"), &root, OsStr::new("notes.org")).unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::Unsupported);
        assert!(root.symlink_metadata("notes.org").is_err());
        assert_eq!(root.read("source").unwrap(), b"foreign replacement");
        assert_eq!(root.read("externally-held").unwrap(), b"owned source");
    }

    #[test]
    fn interrupted_original_restoration_refuses_and_retains_all_legacy_evidence() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("notes.org", b"original").unwrap();
        let (_, original) = read_object(&root, OsStr::new("notes.org"), "notes.org").unwrap().unwrap();
        let directory_name = format!("{PREFIX}{}.tmp", uuid::Uuid::new_v4());
        root.create_dir(&directory_name).unwrap();
        let directory = open_directory(&root, OsStr::new(&directory_name)).unwrap();
        let mut options = OpenOptions::new();
        options.read(true).write(true).create_new(true);
        let mut journal_file = directory.open_with(JOURNAL, &options).unwrap();
        let journal = WriteJournal {
            version: 2, directory_name,
            parent_identity: directory_identity(&root).unwrap(),
            directory_identity: directory_identity(&directory).unwrap(),
            journal_identity: file_identity(&journal_file).unwrap(),
            target: "notes.org".to_owned(), staged: None, original: Some(original),
            publication_identity: None, publication_target: None,
        };
        journal_file.write_all(&serde_json::to_vec(&journal).unwrap()).unwrap();
        journal_file.sync_all().unwrap();
        root.rename("notes.org", &directory, OLD).unwrap();
        sync_directory(&directory).unwrap();
        sync_directory(&root).unwrap();
        assert!(matches!(recover_org_document_writes_with_capability(&root), Err(OrgFilesystemError::UnsupportedPlatform(_))));
        assert!(root.symlink_metadata("notes.org").is_err());
        assert_eq!(directory.read(OLD).unwrap(), b"original");
        assert_eq!(read_journal(&root, &directory, &journal.directory_name).unwrap(), Some(journal));
    }
}
