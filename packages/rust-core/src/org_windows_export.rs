//! Picker-selected Windows exports use the document backend's retained HANDLE publication.
//! Selection retains the directory and original object; confirmation never authorizes a
//! replacement object or a pathname-based overwrite. Recovery objects remain named.

use super::*;
use crate::org_filesystem::windows;
use std::path::Prefix;

pub struct SelectedExport {
    parent: Dir,
    _ancestors: Vec<Dir>,
    target: OsString,
    path: PathBuf,
    observation: windows::LeafObservation,
}

fn invalid(reason: impl std::fmt::Display) -> String {
    format!("Unsafe Org export destination: {reason}")
}

fn validate_component(name: &OsStr) -> Result<(), String> {
    let text = name
        .to_str()
        .ok_or_else(|| invalid("destination is not UTF-8"))?;
    if text.is_empty()
        || text.starts_with('.')
        || text
            .get(..10)
            .is_some_and(|prefix| prefix.eq_ignore_ascii_case("_migration"))
        || text.contains(['/', '\\', ':', '\0'])
        || text.chars().any(char::is_control)
        || text.ends_with('.')
        || text.ends_with(' ')
    {
        return Err(invalid(
            "hidden, metadata, stream, or non-portable path component",
        ));
    }
    let stem = text.split('.').next().unwrap();
    let device = ["CON", "PRN", "AUX", "NUL", "CLOCK$", "CONIN$", "CONOUT$"]
        .iter()
        .any(|reserved| stem.eq_ignore_ascii_case(reserved))
        || (stem.get(..3).is_some_and(|prefix| {
            prefix.eq_ignore_ascii_case("COM") || prefix.eq_ignore_ascii_case("LPT")
        }) && matches!(
            stem.get(3..),
            Some("1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "¹" | "²" | "³")
        ));
    if device {
        return Err(invalid("reserved Windows device name"));
    }
    Ok(())
}

fn require_unreserved_directory(directory: &Dir) -> Result<(), String> {
    for marker in [MIGRATION_MANIFEST_FILE, MIGRATION_VERIFICATION_FILE] {
        match directory.symlink_metadata(marker) {
            Ok(_) => return Err(invalid("destination is inside a migration/recovery tree")),
            Err(error) if error.kind() == io::ErrorKind::NotFound => {}
            Err(error) => return Err(format!("Cannot inspect export directory metadata: {error}")),
        }
    }
    Ok(())
}

fn selected_parent(path: &Path) -> Result<(Dir, Vec<Dir>, OsString), String> {
    if !path.is_absolute() || path.to_str().is_none() {
        return Err(invalid(
            "the native picker must return an absolute UTF-8 filesystem path",
        ));
    }
    let mut components = path.components().peekable();
    let prefix = match components.next() {
        Some(Component::Prefix(prefix))
            if matches!(
                prefix.kind(),
                Prefix::Disk(_)
                    | Prefix::VerbatimDisk(_)
                    | Prefix::UNC(_, _)
                    | Prefix::VerbatimUNC(_, _)
            ) =>
        {
            prefix
        }
        _ => return Err(invalid("unsupported filesystem path prefix")),
    };
    if components.next() != Some(Component::RootDir) {
        return Err(invalid("destination has no filesystem root"));
    }
    let mut filesystem_root = PathBuf::from(prefix.as_os_str());
    filesystem_root.push("\\");
    let mut directory = Dir::open_ambient_dir(filesystem_root, ambient_authority())
        .map_err(|error| format!("Cannot open export filesystem root: {error}"))?;
    require_unreserved_directory(&directory)?;
    let mut ancestors = Vec::new();
    while let Some(component) = components.next() {
        let Component::Normal(name) = component else {
            return Err(invalid("destination contains path traversal"));
        };
        validate_component(name)?;
        if components.peek().is_none() {
            return Ok((directory, ancestors, name.to_os_string()));
        }
        let next = windows::open_directory(&directory, name)
            .map_err(|error| format!("Cannot open non-reparse export parent: {error}"))?;
        require_unreserved_directory(&next)?;
        ancestors.push(directory);
        directory = next;
    }
    Err(invalid("destination has no leaf filename"))
}

pub fn select_destination(
    path: PathBuf,
    format: OrgExportFormat,
) -> Result<SelectedExport, String> {
    let name = path
        .file_name()
        .and_then(OsStr::to_str)
        .ok_or_else(|| invalid("destination has no UTF-8 filename"))?;
    validate_suggested_name(name, format)?;
    let (parent, ancestors, target) = selected_parent(&path)?;
    let observation = windows::observe_leaf(&parent, &target).map_err(|error| error.to_string())?;
    Ok(SelectedExport {
        parent,
        _ancestors: ancestors,
        target,
        path,
        observation,
    })
}

impl SelectedExport {
    pub fn replacement_prompt(&self) -> Option<String> {
        self.observation.identity.as_ref().map(|identity| format!(
            "Replace this existing export only?\n\n{}\n\nFile identity: {identity:?}\nRevision: {}\n\nThe prior export and publication recovery data will be retained beside this file. No Org source or workspace permission is changed.",
            self.path.display(), self.observation.revision.as_deref().expect("an observed existing Windows file has a revision"),
        ))
    }

    fn require_parent_identity(&self) -> Result<(), String> {
        let (current, _ancestors, target) = selected_parent(&self.path)?;
        if target != self.target
            || !windows::same_directory(&self.parent, &current)
                .map_err(|error| format!("Cannot verify selected export parent: {error}"))?
        {
            return Err(
                "Org export parent path no longer identifies the picker-selected directory".into(),
            );
        }
        require_unreserved_directory(&self.parent)
    }
}

pub fn publish(selected: SelectedExport, content: &str) -> Result<OrgExportOutcome, String> {
    selected.require_parent_identity()?;
    let receipt = windows::publish_observed_leaf(
        &selected.parent,
        &selected.target,
        content.as_bytes(),
        &selected.observation,
    )
    .map_err(|error| error.to_string())?;
    let recovery = receipt.original_recovery.ok_or_else(|| {
        "Windows export publication did not return its retained recovery object".to_string()
    })?;
    let recovery_path = selected
        .path
        .parent()
        .ok_or_else(|| invalid("destination has no parent"))?
        .join(recovery.relative_path);
    Ok(OrgExportOutcome::Saved {
        path: selected
            .path
            .to_str()
            .ok_or_else(|| invalid("destination is not UTF-8"))?
            .into(),
        recovery_path: recovery_path
            .to_str()
            .ok_or_else(|| invalid("recovery path is not UTF-8"))?
            .into(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn directory() -> tempfile::TempDir {
        tempfile::Builder::new()
            .prefix("grain-windows-export-")
            .tempdir()
            .unwrap()
    }

    fn saved(outcome: OrgExportOutcome) -> (String, String) {
        match outcome {
            OrgExportOutcome::Saved {
                path,
                recovery_path,
            } => (path, recovery_path),
            OrgExportOutcome::Cancelled => panic!("native export unexpectedly cancelled"),
        }
    }

    #[test]
    fn windows_export_create_replace_and_retained_bytes_are_exact() {
        let root = directory();
        let path = root.path().join("写作.html");
        let old = "<!doctype html>\r\n<p>小麦 λ 📝\0</p>\r\n";
        let new = "<!doctype html>\r\n<p>新的内容 📝</p>\r\n";
        let selected = select_destination(path.clone(), OrgExportFormat::Html).unwrap();
        assert!(selected.replacement_prompt().is_none());
        let (published, first_recovery) = saved(publish(selected, old).unwrap());
        assert_eq!(Path::new(&published), path);
        assert_eq!(std::fs::read(&path).unwrap(), old.as_bytes());
        assert_eq!(std::fs::read(&first_recovery).unwrap(), old.as_bytes());
        let selected = select_destination(path.clone(), OrgExportFormat::Html).unwrap();
        assert!(selected.replacement_prompt().is_some());
        let (_, original_recovery) = saved(publish(selected, new).unwrap());
        assert_eq!(std::fs::read(&path).unwrap(), new.as_bytes());
        assert_eq!(std::fs::read(&original_recovery).unwrap(), old.as_bytes());
        assert_eq!(std::fs::read(&first_recovery).unwrap(), old.as_bytes());
        let reopened = open_workspace_capability(root.path()).unwrap();
        recover_org_document_writes_with_capability(&reopened).unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), new.as_bytes());
        assert_eq!(std::fs::read(&original_recovery).unwrap(), old.as_bytes());
    }

    #[test]
    fn windows_export_selection_pins_every_directory_ancestor() {
        let root = directory();
        let ancestor = root.path().join("outer");
        let parent = ancestor.join("inner");
        std::fs::create_dir_all(&parent).unwrap();
        let path = parent.join("report.html");
        let selected = select_destination(path.clone(), OrgExportFormat::Html).unwrap();
        assert!(std::fs::rename(&ancestor, root.path().join("swapped")).is_err());
        publish(selected, "<p>selected parent</p>\r\n").unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), b"<p>selected parent</p>\r\n");
        assert!(!root.path().join("swapped").exists());
    }

    #[test]
    fn windows_export_confirmation_rejects_changed_original() {
        let root = directory();
        let path = root.path().join("report.md");
        std::fs::write(&path, b"selected\r\n").unwrap();
        let selected = select_destination(path.clone(), OrgExportFormat::Markdown).unwrap();
        std::fs::write(&path, b"external change\r\n").unwrap();
        assert!(publish(selected, "must not overwrite").is_err());
        assert_eq!(std::fs::read(&path).unwrap(), b"external change\r\n");
    }

    #[test]
    fn windows_export_confirmation_rejects_same_bytes_replacement_object() {
        let root = directory();
        let path = root.path().join("report.md");
        let retained = root.path().join("moved.md");
        std::fs::write(&path, b"selected\r\n").unwrap();
        let selected = select_destination(path.clone(), OrgExportFormat::Markdown).unwrap();
        std::fs::rename(&path, &retained).unwrap();
        std::fs::write(&path, b"selected\r\n").unwrap();
        assert!(publish(selected, "must not overwrite").is_err());
        assert_eq!(std::fs::read(&path).unwrap(), b"selected\r\n");
        assert_eq!(std::fs::read(&retained).unwrap(), b"selected\r\n");
    }

    #[test]
    fn windows_export_rejects_device_stream_alias_and_migration_destinations() {
        let root = directory();
        for name in [
            "CON.md",
            "NUL.md",
            "COM¹.md",
            "report.md:stream",
            "report.md.",
            "report.md ",
            "_MIGRATION.md",
        ] {
            assert!(
                select_destination(root.path().join(name), OrgExportFormat::Markdown).is_err(),
                "{name}"
            );
        }
        let nested = root.path().join("recovery");
        std::fs::create_dir(&nested).unwrap();
        std::fs::write(nested.join(MIGRATION_MANIFEST_FILE), b"retained metadata").unwrap();
        assert!(select_destination(nested.join("report.md"), OrgExportFormat::Markdown).is_err());
        assert_eq!(
            std::fs::read(nested.join(MIGRATION_MANIFEST_FILE)).unwrap(),
            b"retained metadata"
        );
    }
}
