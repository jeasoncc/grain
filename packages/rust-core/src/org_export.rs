//! Picker-selected export publication, independent of Org document/body history.
//! Linux leases supplement (not replace) durable recovery and no-clobber namespace operations.
//! A lease may be forcibly broken; no precheck is an atomic compare-and-swap with publication.
//! Never discard the captured inode or staged bytes, even after a successful receipt.

use super::*;

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OrgExportFormat {
    Html,
    Markdown,
}

impl OrgExportFormat {
    pub fn extension(self) -> &'static str {
        match self {
            Self::Html => "html",
            Self::Markdown => "md",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Html => "HTML",
            Self::Markdown => "Markdown",
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum OrgExportOutcome {
    Saved { path: String, #[serde(rename = "recoveryPath")] recovery_path: String },
    Cancelled,
}

pub fn validate_suggested_name(name: &str, format: OrgExportFormat) -> Result<(), String> {
    if name.is_empty() || name.contains(['/', '\\', ':', '\0'])
        || name.chars().any(char::is_control)
        || !matches!(Path::new(name).components().next(), Some(Component::Normal(_)))
        || Path::new(name).components().count() != 1
        || name.starts_with('.') || name.starts_with("_migration")
        || Path::new(name).extension() != Some(OsStr::new(format.extension()))
    {
        return Err(format!("Org export suggestedName must be a non-hidden leaf filename ending in .{}", format.extension()));
    }
    Ok(())
}

const UNSUPPORTED_PLATFORM: &str = "Org export saving requires Linux or Windows handle-bound publication; this platform is unsupported";

pub fn require_supported_platform() -> Result<(), String> {
    if cfg!(any(target_os = "linux", target_os = "windows")) {
        Ok(())
    } else {
        Err(UNSUPPORTED_PLATFORM.into())
    }
}

#[cfg(target_os = "linux")]
mod platform {
    use super::*;
    use std::io::{Seek, SeekFrom};
    use std::os::fd::FromRawFd;

    // Linux UAPI values (fcntl-linux.h); libc does not expose these on every Linux target.
    const F_SETSIG: libc::c_int = 10;
    const F_SETLEASE: libc::c_int = 1024;
    const F_GETLEASE: libc::c_int = 1025;

    #[derive(Clone, Debug, PartialEq, Eq, Serialize)]
    struct ExportObject {
        identity: UnixIdentity,
        byte_length: u64,
        revision: String,
        modified_seconds: i64,
        modified_nanoseconds: i64,
        changed_seconds: i64,
        changed_nanoseconds: i64,
    }

    struct ExistingExport {
        file: cap_std::fs::File,
        object: ExportObject,
    }

    pub struct SelectedExport {
        parent: Dir,
        target: OsString,
        path: PathBuf,
        original: Option<ExistingExport>,
    }

    fn invalid(reason: impl std::fmt::Display) -> String {
        format!("Unsafe Org export destination: {reason}")
    }

    fn io_error(context: &str, error: io::Error) -> String {
        format!("{context}: {error}")
    }

    fn require_unreserved_directory(directory: &Dir) -> Result<(), String> {
        for marker in [MIGRATION_MANIFEST_FILE, MIGRATION_VERIFICATION_FILE] {
            match directory.symlink_metadata(marker) {
                Ok(_) => return Err(invalid("destination is inside a migration/recovery tree")),
                Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                Err(error) => return Err(io_error("Cannot inspect export directory metadata", error)),
            }
        }
        Ok(())
    }

    // Open each picker path component relative to a retained descriptor, including ancestors.
    // Never canonicalize a symlink into an apparently innocent destination.
    fn selected_parent(path: &Path) -> Result<(Dir, OsString), String> {
        if !path.is_absolute() {
            return Err(invalid("the native picker did not return an absolute filesystem path"));
        }
        let mut directory = Dir::open_ambient_dir("/", ambient_authority())
            .map_err(|error| io_error("Cannot open export filesystem root", error))?;
        let mut components = path.components().peekable();
        if components.next() != Some(Component::RootDir) {
            return Err(invalid("unsupported filesystem path prefix"));
        }
        require_unreserved_directory(&directory)?;
        while let Some(component) = components.next() {
            let Component::Normal(name) = component else {
                return Err(invalid("destination contains non-leaf path traversal"));
            };
            let text = name.to_str().ok_or_else(|| invalid("destination is not UTF-8"))?;
            if text.starts_with('.') || text.starts_with("_migration")
                || text.contains(['\\', ':']) || text.chars().any(char::is_control)
            {
                return Err(invalid("hidden, metadata, migration, or non-portable path component"));
            }
            if components.peek().is_none() {
                return Ok((directory, name.to_os_string()));
            }
            let mut options = OpenOptions::new();
            options.read(true).custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW | libc::O_NONBLOCK);
            let file = directory.open_with(name, &options)
                .map_err(|error| io_error("Cannot open non-symlink export parent", error))?;
            directory = Dir::from_std_file(file.into_std());
            require_unreserved_directory(&directory)?;
        }
        Err(invalid("destination has no leaf filename"))
    }

    fn snapshot(file: &mut cap_std::fs::File, expected_links: u64) -> Result<ExportObject, String> {
        let before = file.metadata().map_err(|error| io_error("Cannot inspect export inode", error))?;
        if !before.is_file() || before.nlink() != expected_links {
            return Err(invalid("export inode is not regular or has an unexpected hard-link count"));
        }
        file.seek(SeekFrom::Start(0)).map_err(|error| io_error("Cannot seek export inode", error))?;
        let mut hash = Sha256::new();
        let mut buffer = [0u8; 64 * 1024];
        let mut byte_length = 0u64;
        loop {
            let count = file.read(&mut buffer).map_err(|error| io_error("Cannot read export inode", error))?;
            if count == 0 { break; }
            hash.update(&buffer[..count]);
            byte_length += count as u64;
        }
        let after = file.metadata().map_err(|error| io_error("Cannot reinspect export inode", error))?;
        if metadata_identity(&before) != metadata_identity(&after) || before.len() != byte_length
            || after.len() != byte_length || after.nlink() != expected_links
            || before.mtime() != after.mtime() || before.mtime_nsec() != after.mtime_nsec()
            || before.ctime() != after.ctime() || before.ctime_nsec() != after.ctime_nsec()
        {
            return Err("Org export destination changed while it was being inspected".into());
        }
        Ok(ExportObject {
            identity: metadata_identity(&after), byte_length,
            revision: hex::encode(hash.finalize()),
            modified_seconds: after.mtime(), modified_nanoseconds: after.mtime_nsec(),
            changed_seconds: after.ctime(), changed_nanoseconds: after.ctime_nsec(),
        })
    }

    pub fn select_destination(path: PathBuf, format: OrgExportFormat) -> Result<SelectedExport, String> {
        let name = path.file_name().and_then(OsStr::to_str)
            .ok_or_else(|| invalid("destination has no UTF-8 filename"))?;
        validate_suggested_name(name, format)?;
        let (parent, target) = selected_parent(&path)?;
        let original = match parent.symlink_metadata(&target) {
            Ok(metadata) => {
                if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.nlink() != 1 {
                    return Err(invalid("destination is a symlink, special file, directory, or hardlinked file"));
                }
                let mut options = OpenOptions::new();
                options.read(true).custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
                let mut file = parent.open_with(&target, &options)
                    .map_err(|error| io_error("Cannot open existing export", error))?;
                let object = snapshot(&mut file, 1)?;
                if object.identity != metadata_identity(&metadata)
                    || entry_identity(&parent, &target).map_err(|error| io_error("Cannot inspect selected export", error))? != Some(object.identity)
                {
                    return Err("Org export destination changed during native selection".into());
                }
                Some(ExistingExport { file, object })
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => None,
            Err(error) => return Err(io_error("Cannot inspect selected export", error)),
        };
        Ok(SelectedExport { parent, target, path, original })
    }

    impl SelectedExport {
        pub fn replacement_prompt(&self) -> Option<String> {
            self.original.as_ref().map(|original| format!(
                "Replace this existing export only?\n\n{}\n\nInode: {}:{}\nBytes: {}\nRevision: {}\n\nThe prior export and publication recovery data will be retained beside this file. No Org source or workspace permission is changed.",
                self.path.display(), original.object.identity.device, original.object.identity.inode,
                original.object.byte_length, original.object.revision,
            ))
        }

        fn require_parent_identity(&self) -> Result<(), String> {
            let (current, _) = selected_parent(&self.path)?;
            let retained = self.parent.dir_metadata().map_err(|error| io_error("Cannot inspect retained export parent", error))?;
            let current = current.dir_metadata().map_err(|error| io_error("Cannot inspect current export parent", error))?;
            if metadata_identity(&retained) != metadata_identity(&current) {
                return Err("Org export parent path no longer identifies the picker-selected directory".into());
            }
            require_unreserved_directory(&self.parent)
        }
    }

    // SIGURG's default disposition is ignore. Do not alter any process-wide handler or mask.
    // F_GETLEASE also reports a pending break's target type, including before forced expiry.
    struct InodeLease {
        descriptor: i32,
        kind: i32,
    }

    impl InodeLease {
        fn acquire(file: &cap_std::fs::File, kind: i32) -> Result<Self, String> {
            unsafe {
                let mut action: libc::sigaction = std::mem::zeroed();
                if libc::sigaction(libc::SIGURG, std::ptr::null(), &mut action) != 0 {
                    return Err(io_error("Cannot inspect lease notification signal", io::Error::last_os_error()));
                }
                if action.sa_sigaction != libc::SIG_DFL && action.sa_sigaction != libc::SIG_IGN {
                    return Err("Org export inode leases are unsupported with the process's SIGURG handler".into());
                }
                let descriptor = file.as_raw_fd();
                if libc::fcntl(descriptor, libc::F_SETOWN, libc::getpid()) == -1
                    || libc::fcntl(descriptor, F_SETSIG, libc::SIGURG) == -1
                    || libc::fcntl(descriptor, F_SETLEASE, kind) == -1
                {
                    return Err(io_error("Cannot acquire kernel export inode lease (active readers/writers or unsupported filesystem); nothing may be published", io::Error::last_os_error()));
                }
                Ok(Self { descriptor, kind })
            }
        }

        fn require_intact(&self) -> Result<(), String> {
            let actual = unsafe { libc::fcntl(self.descriptor, F_GETLEASE) };
            if actual == -1 {
                return Err(io_error("Cannot inspect kernel export inode lease", io::Error::last_os_error()));
            }
            if actual != self.kind {
                return Err("A concurrent inode access requested or forced an Org export lease break".into());
            }
            Ok(())
        }
    }

    impl Drop for InodeLease {
        fn drop(&mut self) {
            unsafe { libc::fcntl(self.descriptor, F_SETLEASE, libc::F_UNLCK); }
        }
    }

    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct ExportJournal<'a> {
        version: u32,
        target_path: &'a Path,
        parent_identity: UnixIdentity,
        recovery_identity: UnixIdentity,
        stage_identity: UnixIdentity,
        publication_identity: UnixIdentity,
        byte_length: usize,
        revision: String,
        original: Option<&'a ExportObject>,
    }

    fn require_entry(parent: &Dir, name: &OsStr, identity: UnixIdentity) -> Result<(), String> {
        if entry_identity(parent, name).map_err(|error| io_error("Cannot inspect export transaction entry", error))? != Some(identity) {
            return Err("Org export transaction entry changed concurrently".into());
        }
        Ok(())
    }

    fn same_captured_object(before: &ExportObject, after: &ExportObject) -> bool {
        // Capture changes ctime. Inode, bytes, length and mtime must remain unchanged.
        before.identity == after.identity && before.byte_length == after.byte_length
            && before.revision == after.revision && before.modified_seconds == after.modified_seconds
            && before.modified_nanoseconds == after.modified_nanoseconds
    }

    pub fn publish(mut selected: SelectedExport, content: &str) -> Result<OrgExportOutcome, String> {
        selected.require_parent_identity()?;
        let original_lease = selected.original.as_ref()
            .map(|original| InodeLease::acquire(&original.file, libc::F_RDLCK)).transpose()?;
        if let Some(original) = &mut selected.original {
            if snapshot(&mut original.file, 1)? != original.object {
                return Err("Org export destination changed while replacement consent was pending".into());
            }
            require_entry(&selected.parent, &selected.target, original.object.identity)?;
        } else if entry_identity(&selected.parent, &selected.target)
            .map_err(|error| io_error("Cannot inspect new export destination", error))?.is_some()
        {
            return Err("A concurrent file occupied the new Org export destination; it was not replaced".into());
        }
        if let Some(lease) = &original_lease { lease.require_intact()?; }

        let recovery_name = format!(".grain-export-{}.tmp", uuid::Uuid::new_v4());
        let recovery_path = selected.path.with_file_name(&recovery_name);
        let mut builder = cap_std::fs::DirBuilder::new();
        use cap_std::fs::DirBuilderExt;
        builder.mode(0o700);
        selected.parent.create_dir_with(&recovery_name, &builder)
            .map_err(|error| io_error("Cannot create private export recovery directory", error))?;
        (|| -> Result<OrgExportOutcome, String> {
            let mut directory_options = OpenOptions::new();
            directory_options.read(true).custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW);
            let recovery = Dir::from_std_file(selected.parent.open_with(&recovery_name, &directory_options)
                .map_err(|error| io_error("Cannot retain export recovery directory", error))?.into_std());
            let recovery_identity = metadata_identity(&recovery.dir_metadata()
                .map_err(|error| io_error("Cannot inspect export recovery directory", error))?);
            let mut options = OpenOptions::new();
            options.read(true).write(true).create_new(true).mode(0o600);
            let mut stage = recovery.open_with("stage", &options)
                .map_err(|error| io_error("Cannot create export stage", error))?;
            let stage_lease = InodeLease::acquire(&stage, libc::F_WRLCK)?;
            stage.write_all(content.as_bytes()).map_err(|error| io_error("Cannot write exact export bytes", error))?;
            stage.sync_all().map_err(|error| io_error("Cannot sync export stage", error))?;
            let stage_identity = file_identity(&stage).map_err(|error| io_error("Cannot inspect export stage", error))?;
            // The recovery copy must not share the installed inode: otherwise each exported
            // target would be hardlinked and therefore unsafe to replace on the next export.
            // O_TMPFILE gives publication a descriptor-only inode without an unlink race.
            let descriptor = unsafe {
                libc::openat(selected.parent.as_raw_fd(), c".".as_ptr(),
                    libc::O_TMPFILE | libc::O_RDWR | libc::O_CLOEXEC, 0o600)
            };
            if descriptor == -1 {
                return Err(io_error("Anonymous export publication is unsupported on this filesystem (O_TMPFILE required)", io::Error::last_os_error()));
            }
            let mut publication = cap_std::fs::File::from_std(unsafe { std::fs::File::from_raw_fd(descriptor) });
            let publication_lease = InodeLease::acquire(&publication, libc::F_WRLCK)?;
            publication.write_all(content.as_bytes()).map_err(|error| io_error("Cannot write anonymous export publication", error))?;
            publication.sync_all().map_err(|error| io_error("Cannot sync anonymous export publication", error))?;
            let publication_object = snapshot(&mut publication, 0)?;
            let staged_object = snapshot(&mut stage, 1)?;
            let expected_revision = revision(content.as_bytes());
            if publication_object.revision != expected_revision || staged_object.revision != expected_revision
                || publication_object.byte_length != content.len() as u64 || staged_object.byte_length != content.len() as u64
            {
                return Err("Export staging bytes changed before publication".into());
            }
            let journal = ExportJournal {
                version: 1, target_path: &selected.path,
                parent_identity: metadata_identity(&selected.parent.dir_metadata()
                    .map_err(|error| io_error("Cannot inspect export parent", error))?),
                recovery_identity, stage_identity, publication_identity: publication_object.identity,
                byte_length: content.len(), revision: expected_revision,
                original: selected.original.as_ref().map(|original| &original.object),
            };
            let mut journal_file = recovery.open_with("journal.json", &options)
                .map_err(|error| io_error("Cannot create export recovery journal", error))?;
            let journal_lease = InodeLease::acquire(&journal_file, libc::F_WRLCK)?;
            serde_json::to_writer(&mut journal_file, &journal)
                .map_err(|error| format!("Cannot write export recovery journal: {error}"))?;
            journal_file.sync_all().map_err(|error| io_error("Cannot sync export recovery journal", error))?;
            let journal_identity = file_identity(&journal_file).map_err(|error| io_error("Cannot inspect export journal", error))?;
            sync_directory(&recovery).map_err(|error| io_error("Cannot sync export recovery directory", error))?;
            sync_directory(&selected.parent).map_err(|error| io_error("Cannot sync export parent before publication", error))?;
            selected.require_parent_identity()?;
            require_entry(&selected.parent, OsStr::new(&recovery_name), recovery_identity)?;
            require_entry(&recovery, OsStr::new("stage"), stage_identity)?;
            require_entry(&recovery, OsStr::new("journal.json"), journal_identity)?;
            journal_lease.require_intact()?;
            stage_lease.require_intact()?;
            publication_lease.require_intact()?;
            if let Some(original) = &mut selected.original {
                original_lease.as_ref().unwrap().require_intact()?;
                if snapshot(&mut original.file, 1)? != original.object {
                    return Err("Existing export changed before capture".into());
                }
                rename_noreplace(&selected.parent, &selected.target, &recovery, OsStr::new("old"))
                    .map_err(|error| io_error("Cannot capture existing export without clobbering", error))?;
                sync_directory(&recovery).map_err(|error| io_error("Cannot sync captured export", error))?;
                sync_directory(&selected.parent).map_err(|error| io_error("Cannot sync export capture", error))?;
                require_entry(&recovery, OsStr::new("old"), original.object.identity)?;
                if !same_captured_object(&original.object, &snapshot(&mut original.file, 1)?) {
                    return Err("Captured export changed concurrently; original inode is retained".into());
                }
                original_lease.as_ref().unwrap().require_intact()?;
            }
            // Resolve the publication source through its retained descriptor. linkat never
            // replaces a target, even when somebody installs one after capture/checks.
            let source = CString::new(format!("/proc/self/fd/{}", publication.as_raw_fd())).unwrap();
            let target = CString::new(selected.target.as_bytes()).map_err(|_| invalid("filename contains NUL"))?;
            if unsafe { libc::linkat(libc::AT_FDCWD, source.as_ptr(), selected.parent.as_raw_fd(), target.as_ptr(), libc::AT_SYMLINK_FOLLOW) } != 0 {
                return Err(io_error("Cannot publish export without replacing a concurrent target (descriptor hard-link support required)", io::Error::last_os_error()));
            }
            sync_directory(&selected.parent).map_err(|error| io_error("Cannot durably publish export", error))?;
            // These are post-publication observations, not an atomic CAS. A break, path swap,
            // or uncertain fsync is a concrete error with both objects left for recovery.
            stage_lease.require_intact()?;
            publication_lease.require_intact()?;
            journal_lease.require_intact()?;
            require_entry(&selected.parent, &selected.target, publication_object.identity)?;
            require_entry(&selected.parent, OsStr::new(&recovery_name), recovery_identity)?;
            require_entry(&recovery, OsStr::new("stage"), stage_identity)?;
            require_entry(&recovery, OsStr::new("journal.json"), journal_identity)?;
            if !same_captured_object(&publication_object, &snapshot(&mut publication, 1)?)
                || !same_captured_object(&staged_object, &snapshot(&mut stage, 1)?)
            {
                return Err("Export bytes changed during publication; independent recovery is retained".into());
            }
            if let Some(original) = &mut selected.original {
                require_entry(&recovery, OsStr::new("old"), original.object.identity)?;
                if !same_captured_object(&original.object, &snapshot(&mut original.file, 1)?) {
                    return Err("Captured prior export changed during publication; recovery is retained".into());
                }
                original_lease.as_ref().unwrap().require_intact()?;
            }
            selected.require_parent_identity()?;
            stage_lease.require_intact()?;
            journal_lease.require_intact()?;
            publication_lease.require_intact()?;
            Ok(OrgExportOutcome::Saved {
                path: selected.path.to_str().ok_or_else(|| invalid("destination is not UTF-8"))?.into(),
                recovery_path: recovery_path.to_str().ok_or_else(|| invalid("recovery path is not UTF-8"))?.into(),
            })
        })().map_err(|error| format!(
            "Org export publication failed or is uncertain for {}: {error}; recovery artifacts retained at {} (last known picker directory path)",
            selected.path.display(), recovery_path.display(),
        ))
    }

    #[cfg(test)]
    mod lease_tests {
        use super::*;

        #[test]
        fn pending_or_forced_inode_lease_break_is_not_an_intact_precheck() {
            let temporary = tempfile::Builder::new().prefix("grain-export-lease-").tempdir().unwrap();
            let directory = Dir::open_ambient_dir(temporary.path(), ambient_authority()).unwrap();
            directory.write("report.md", "old").unwrap();
            let file = directory.open("report.md").unwrap();
            let lease = InodeLease::acquire(&file, libc::F_RDLCK).unwrap();
            let mut writer = OpenOptions::new();
            writer.write(true).custom_flags(libc::O_NONBLOCK);
            let error = directory.open_with("report.md", &writer).unwrap_err();
            assert_eq!(error.raw_os_error(), Some(libc::EWOULDBLOCK));
            assert!(lease.require_intact().unwrap_err().contains("lease break"));
            assert_eq!(unsafe { libc::fcntl(file.as_raw_fd(), F_SETLEASE, libc::F_UNLCK) }, 0);
            assert!(lease.require_intact().is_err());
        }
    }
}

#[cfg(target_os = "linux")]
pub use platform::{publish, select_destination};

#[cfg(windows)]
#[path = "org_windows_export.rs"]
mod windows_platform;

#[cfg(windows)]
pub use windows_platform::{publish, select_destination, SelectedExport};

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
pub struct SelectedExport;

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
impl SelectedExport {
    pub fn replacement_prompt(&self) -> Option<String> { None }
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
pub fn select_destination(_path: PathBuf, _format: OrgExportFormat) -> Result<SelectedExport, String> {
    Err(UNSUPPORTED_PLATFORM.into())
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
pub fn publish(_selected: SelectedExport, _content: &str) -> Result<OrgExportOutcome, String> {
    Err(UNSUPPORTED_PLATFORM.into())
}

#[cfg(test)]
mod tests {
    use super::*;


    #[test]
    fn suggested_names_cannot_address_source_metadata_or_paths() {
        for name in ["", "../report.md", "directory/report.md", "directory\\report.md", "source.org", "source.org.md/notes", ".grain.md", "_migration.md", "migration-manifest.json", "report.md:stream", "report.md\0", "report\n.md"] {
            assert!(validate_suggested_name(name, OrgExportFormat::Markdown).is_err(), "{name:?}");
        }
        assert!(validate_suggested_name("report.md", OrgExportFormat::Markdown).is_ok());
        assert!(validate_suggested_name("report.html", OrgExportFormat::Html).is_ok());
        assert!(validate_suggested_name("report.HTML", OrgExportFormat::Html).is_err());
    }

    #[cfg(target_os = "linux")]
    fn directory() -> tempfile::TempDir {
        tempfile::Builder::new().prefix("grain-export-tests-").tempdir().unwrap()
    }

    #[cfg(target_os = "linux")]
    fn recovery_directory(root: &Path) -> PathBuf {
        let directories: Vec<_> = std::fs::read_dir(root).unwrap()
            .map(|entry| entry.unwrap().path())
            .filter(|path| path.file_name().unwrap().to_string_lossy().starts_with(".grain-export-"))
            .collect();
        assert_eq!(directories.len(), 1);
        directories.into_iter().next().unwrap()
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn new_export_publishes_exact_bytes_with_durable_recovery() {
        let root = directory();
        let path = root.path().join("report.html");
        let selected = select_destination(path.clone(), OrgExportFormat::Html).unwrap();
        assert!(selected.replacement_prompt().is_none());
        let bytes = "<!doctype html>\r\n<p>λ\0</p>\n";
        let outcome = publish(selected, bytes).unwrap();
        let OrgExportOutcome::Saved { path: saved, recovery_path } = outcome else { panic!("Native publication was not saved") };
        assert_eq!(saved, path.to_str().unwrap());
        assert_eq!(std::fs::read(&path).unwrap(), bytes.as_bytes());
        let recovery = recovery_directory(root.path());
        assert_eq!(Path::new(&recovery_path), recovery);
        assert_eq!(std::fs::read(recovery.join("stage")).unwrap(), bytes.as_bytes());
        assert!(recovery.join("journal.json").is_file());
        assert!(!recovery.join("old").exists());
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn replacement_retains_prior_inode_and_exact_export_bytes() {
        let root = directory();
        let path = root.path().join("report.md");
        std::fs::write(&path, "prior\r\n").unwrap();
        let selected = select_destination(path.clone(), OrgExportFormat::Markdown).unwrap();
        assert!(selected.replacement_prompt().unwrap().contains("Replace this existing export only?"));
        publish(selected, "new λ\r\n\0").unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), "new λ\r\n\0".as_bytes());
        let recovery = recovery_directory(root.path());
        assert_eq!(std::fs::read(recovery.join("old")).unwrap(), b"prior\r\n");
        assert_eq!(std::fs::read(recovery.join("stage")).unwrap(), "new λ\r\n\0".as_bytes());
        use std::os::unix::fs::MetadataExt;
        assert_eq!(std::fs::metadata(&path).unwrap().nlink(), 1);
        assert!(select_destination(path.clone(), OrgExportFormat::Markdown).unwrap().replacement_prompt().is_some());
        std::fs::write(&path, "later edit").unwrap();
        assert_eq!(std::fs::read(recovery.join("stage")).unwrap(), "new λ\r\n\0".as_bytes());
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn picker_selection_and_denied_replacement_create_no_artifacts() {
        let root = directory();
        let path = root.path().join("report.md");
        std::fs::write(&path, "prior").unwrap();
        drop(select_destination(path.clone(), OrgExportFormat::Markdown).unwrap());
        assert_eq!(std::fs::read(&path).unwrap(), b"prior");
        assert_eq!(std::fs::read_dir(root.path()).unwrap().count(), 1);
        drop(select_destination(root.path().join("new.md"), OrgExportFormat::Markdown).unwrap());
        assert_eq!(std::fs::read_dir(root.path()).unwrap().count(), 1);
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn concurrent_creation_and_replacement_changes_are_not_clobbered() {
        let root = directory();
        let path = root.path().join("report.md");
        let selected = select_destination(path.clone(), OrgExportFormat::Markdown).unwrap();
        std::fs::write(&path, "concurrent creation").unwrap();
        assert!(publish(selected, "export").unwrap_err().contains("occupied"));
        assert_eq!(std::fs::read(&path).unwrap(), b"concurrent creation");
        let selected = select_destination(path.clone(), OrgExportFormat::Markdown).unwrap();
        std::fs::write(&path, "concurrent edit").unwrap();
        assert!(publish(selected, "export").unwrap_err().contains("changed"));
        assert_eq!(std::fs::read(&path).unwrap(), b"concurrent edit");
        assert_eq!(std::fs::read_dir(root.path()).unwrap().count(), 1);
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn already_open_uncooperative_writer_fails_closed_before_publication() {
        let root = directory();
        let path = root.path().join("report.md");
        std::fs::write(&path, "prior").unwrap();
        let selected = select_destination(path.clone(), OrgExportFormat::Markdown).unwrap();
        let writer = std::fs::OpenOptions::new().write(true).open(&path).unwrap();
        assert!(publish(selected, "export").unwrap_err().contains("kernel export inode lease"));
        assert_eq!(std::fs::read(&path).unwrap(), b"prior");
        assert_eq!(std::fs::read_dir(root.path()).unwrap().count(), 1);
        drop(writer);
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn source_aliases_special_files_and_migration_trees_are_rejected() {
        use std::os::unix::fs::symlink;
        let root = directory();
        let source = root.path().join("source.org");
        std::fs::write(&source, "* source").unwrap();
        let path = root.path().join("report.md");
        symlink(&source, &path).unwrap();
        assert!(select_destination(path.clone(), OrgExportFormat::Markdown).is_err());
        std::fs::remove_file(&path).unwrap();
        std::fs::hard_link(&source, &path).unwrap();
        assert!(select_destination(path.clone(), OrgExportFormat::Markdown).is_err());
        std::fs::remove_file(&path).unwrap();
        std::fs::create_dir(&path).unwrap();
        assert!(select_destination(path, OrgExportFormat::Markdown).is_err());
        let tree = root.path().join("migrated");
        std::fs::create_dir(&tree).unwrap();
        std::fs::write(tree.join(MIGRATION_MANIFEST_FILE), "{}").unwrap();
        assert!(select_destination(tree.join("report.md"), OrgExportFormat::Markdown).is_err());
        let alias = root.path().join("alias");
        symlink(&tree, &alias).unwrap();
        assert!(select_destination(alias.join("report.md"), OrgExportFormat::Markdown).is_err());
        assert_eq!(std::fs::read(source).unwrap(), b"* source");
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn parent_swap_never_redirects_selected_authority() {
        use std::os::unix::fs::symlink;
        let root = directory();
        let parent = root.path().join("picked");
        let other = root.path().join("other");
        std::fs::create_dir(&parent).unwrap();
        std::fs::create_dir(&other).unwrap();
        let selected = select_destination(parent.join("report.md"), OrgExportFormat::Markdown).unwrap();
        std::fs::rename(&parent, root.path().join("retained")).unwrap();
        symlink(&other, &parent).unwrap();
        assert!(publish(selected, "export").is_err());
        assert!(!other.join("report.md").exists());
        assert!(!root.path().join("retained/report.md").exists());
    }
}
