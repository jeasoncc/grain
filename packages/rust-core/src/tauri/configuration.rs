//! Fixed-path configuration transport. Only an external editor changes an existing file.
//!
//! Reads and opening follow ordinary symlinks, including a symlinked config directory,
//! so dotfile-managed configurations work normally. Creation never follows or replaces
//! an existing final entry: a dangling config.json symlink is an error, not a missing
//! configuration to repair. No Org workspace grant or caller-provided path is involved.

use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigurationFile {
    path: String,
    content: Option<String>,
}

fn configuration_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|directory| directory.join("config.json"))
        .map_err(|error| format!("Cannot resolve app_config_dir/config.json: {error}"))
}

fn path_string(path: &Path) -> Result<String, String> {
    path.to_str()
        .map(str::to_owned)
        .ok_or_else(|| format!("Configuration path is not valid UTF-8: {}", path.display()))
}

fn file_error(action: &str, path: &Path, error: impl std::fmt::Display) -> String {
    format!("{action} configuration file {}: {error}", path.display())
}

fn read_configuration_at(path: &Path) -> Result<ConfigurationFile, String> {
    let display_path = path_string(path)?;
    let content = match fs::read_to_string(path) {
        Ok(content) => Some(content),
        Err(error) if error.kind() == io::ErrorKind::NotFound => {
            // read_to_string also reports NotFound for a dangling symlink. Preserve
            // that entry and report the broken dotfile setup instead of resetting it.
            match fs::symlink_metadata(path) {
                Err(missing) if missing.kind() == io::ErrorKind::NotFound => None,
                Err(metadata_error) => {
                    return Err(file_error("Cannot inspect", path, metadata_error));
                }
                Ok(_) => return Err(file_error("Cannot read existing", path, error)),
            }
        }
        Err(error) => return Err(file_error("Cannot read", path, error)),
    };
    Ok(ConfigurationFile { path: display_path, content })
}

fn create_configuration_at(path: &Path, content: &str) -> Result<ConfigurationFile, String> {
    let value: serde_json::Value = serde_json::from_str(content)
        .map_err(|error| file_error("Cannot create", path, format!("invalid JSON: {error}")))?;
    if !value.is_object() {
        return Err(file_error("Cannot create", path, "JSON must be an object"));
    }

    let existing = read_configuration_at(path)?;
    if existing.content.is_some() {
        // Existing bytes are authoritative even when malformed. Never normalize,
        // validate, chmod, or rewrite them during initialization or migration.
        return Ok(existing);
    }

    let directory = path.parent()
        .ok_or_else(|| file_error("Cannot create", path, "parent directory is missing"))?;
    let mut builder = fs::DirBuilder::new();
    builder.recursive(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::DirBuilderExt;
        builder.mode(0o700);
    }
    builder.create(directory)
        .map_err(|error| file_error("Cannot create parent directory for", path, error))?;

    let mut staged = tempfile::Builder::new()
        .prefix(".grain-config-")
        .tempfile_in(directory)
        .map_err(|error| file_error("Cannot stage", path, error))?;
    // NamedTempFile uses private permissions. Make the Unix guarantee explicit
    // without changing the permissions of any pre-existing file or directory.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        staged.as_file().set_permissions(fs::Permissions::from_mode(0o600))
            .map_err(|error| file_error("Cannot secure staged", path, error))?;
    }
    staged.write_all(content.as_bytes())
        .map_err(|error| file_error("Cannot write staged", path, error))?;
    staged.as_file().sync_all()
        .map_err(|error| file_error("Cannot sync staged", path, error))?;

    match staged.persist_noclobber(path) {
        Ok(_) => sync_configuration_directory(directory)
            .map_err(|error| file_error("Cannot sync parent directory for", path, error))?,
        Err(error) if error.error.kind() == io::ErrorKind::AlreadyExists => {
            // A concurrent creator won. Dropping PersistError cleans our stage;
            // return the winner, not the bytes this caller attempted to create.
        }
        Err(error) => return Err(file_error("Cannot publish", path, error.error)),
    }

    let installed = read_configuration_at(path)?;
    if installed.content.is_none() {
        return Err(file_error("Cannot read published", path, "file disappeared after creation"));
    }
    Ok(installed)
}

#[cfg(unix)]
fn sync_configuration_directory(directory: &Path) -> io::Result<()> {
    fs::File::open(directory)?.sync_all()
}

// std does not provide portable directory syncing on non-Unix platforms. The
// staged file itself is fully synced before the no-clobber publication there.
#[cfg(not(unix))]
fn sync_configuration_directory(_directory: &Path) -> io::Result<()> {
    Ok(())
}

#[tauri::command]
pub fn read_configuration_file(app: AppHandle) -> Result<ConfigurationFile, String> {
    read_configuration_at(&configuration_path(&app)?)
}

#[tauri::command]
pub fn create_configuration_file(app: AppHandle, content: String) -> Result<ConfigurationFile, String> {
    create_configuration_at(&configuration_path(&app)?, &content)
}

#[tauri::command]
pub fn open_configuration_file(app: AppHandle) -> Result<(), String> {
    let path = configuration_path(&app)?;
    let metadata = fs::metadata(&path)
        .map_err(|error| file_error("Cannot open", &path, error))?;
    if !metadata.is_file() {
        return Err(file_error("Cannot open", &path, "path is not a regular file"));
    }
    app.opener().open_path(path_string(&path)?, None::<&str>)
        .map_err(|error| file_error("Cannot open with the default application", &path, error))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Barrier};

    #[test]
    fn missing_read_does_not_create_and_creation_preserves_exact_bytes() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("nested/config.json");
        let missing = read_configuration_at(&path).unwrap();
        assert_eq!(missing.path, path.to_str().unwrap());
        assert!(missing.content.is_none());
        assert!(!path.parent().unwrap().exists());
        let content = "{\r\n  \"version\": 1, \"name\": \"配置\"\r\n}\n";
        assert_eq!(create_configuration_at(&path, content).unwrap().content.as_deref(), Some(content));
        assert_eq!(fs::read(&path).unwrap(), content.as_bytes());
        assert_eq!(create_configuration_at(&path, "{}").unwrap().content.as_deref(), Some(content));
        assert_eq!(fs::read(&path).unwrap(), content.as_bytes());
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(fs::metadata(&path).unwrap().permissions().mode() & 0o777, 0o600);
            assert_eq!(fs::metadata(path.parent().unwrap()).unwrap().permissions().mode() & 0o077, 0);
        }
    }

    #[test]
    fn malformed_existing_configuration_is_never_repaired() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("config.json");
        fs::write(&path, "{not valid JSON\n").unwrap();
        assert_eq!(create_configuration_at(&path, "{}").unwrap().content.as_deref(), Some("{not valid JSON\n"));
        assert_eq!(fs::read_to_string(&path).unwrap(), "{not valid JSON\n");
    }

    #[test]
    fn rejects_invalid_initial_content_without_creating_directories() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("absent/config.json");
        for content in ["", "broken", "[]", "null", "1", "\"text\"", "{} trailing"] {
            assert!(create_configuration_at(&path, content).unwrap_err().contains(path.to_str().unwrap()));
            assert!(!path.parent().unwrap().exists());
        }
    }

    #[test]
    fn concurrent_creators_return_the_complete_winning_content() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("config.json");
        let barrier = Arc::new(Barrier::new(12));
        let threads: Vec<_> = (0..12).map(|index| {
            let path = path.clone();
            let barrier = Arc::clone(&barrier);
            std::thread::spawn(move || {
                let content = format!("{{\"creator\":{index},\"payload\":\"{}\"}}", "x".repeat(8192));
                barrier.wait();
                create_configuration_at(&path, &content).unwrap().content.unwrap()
            })
        }).collect();
        let results: Vec<_> = threads.into_iter().map(|thread| thread.join().unwrap()).collect();
        let winner = fs::read_to_string(&path).unwrap();
        assert!(serde_json::from_str::<serde_json::Value>(&winner).unwrap().is_object());
        assert!(results.iter().all(|result| result == &winner));
        assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
    }

    #[test]
    fn filesystem_and_encoding_errors_include_configuration_path() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("config.json");
        fs::create_dir(&path).unwrap();
        assert!(read_configuration_at(&path).unwrap_err().contains(path.to_str().unwrap()));
        assert!(create_configuration_at(&path, "{}").unwrap_err().contains(path.to_str().unwrap()));
        fs::remove_dir(&path).unwrap();
        fs::write(&path, [0xff, 0xfe]).unwrap();
        assert!(read_configuration_at(&path).unwrap_err().contains(path.to_str().unwrap()));
        assert!(create_configuration_at(&path, "{}").unwrap_err().contains(path.to_str().unwrap()));
        assert_eq!(fs::read(&path).unwrap(), [0xff, 0xfe]);
        let blocked = directory.path().join("config.json/child/config.json");
        assert!(create_configuration_at(&blocked, "{}").unwrap_err().contains(blocked.to_str().unwrap()));
    }

    #[cfg(unix)]
    #[test]
    fn dotfile_symlinks_are_read_but_never_replaced_or_repaired() {
        use std::os::unix::fs::symlink;
        let directory = tempfile::tempdir().unwrap();
        let target = directory.path().join("dotfiles");
        fs::create_dir(&target).unwrap();
        let linked_directory = directory.path().join("app");
        symlink(&target, &linked_directory).unwrap();
        let path = linked_directory.join("config.json");
        create_configuration_at(&path, "{\"version\":1}").unwrap();
        assert_eq!(fs::read_to_string(target.join("config.json")).unwrap(), "{\"version\":1}");

        let linked_file = directory.path().join("config.json");
        symlink(target.join("config.json"), &linked_file).unwrap();
        assert_eq!(create_configuration_at(&linked_file, "{}").unwrap().content.as_deref(), Some("{\"version\":1}"));
        assert!(fs::symlink_metadata(&linked_file).unwrap().file_type().is_symlink());
        fs::remove_file(target.join("config.json")).unwrap();
        assert!(read_configuration_at(&linked_file).unwrap_err().contains(linked_file.to_str().unwrap()));
        assert!(create_configuration_at(&linked_file, "{}").unwrap_err().contains(linked_file.to_str().unwrap()));
        assert!(fs::symlink_metadata(&linked_file).unwrap().file_type().is_symlink());
        assert!(!target.join("config.json").exists());
    }
}
