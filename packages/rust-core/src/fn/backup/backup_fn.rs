//! 备份纯函数
//!
//! 实现数据库备份和恢复功能

use crate::types::config::{AppConfig, ORG_DERIVED_DB_FILENAME};
use crate::types::error::{AppError, AppResult};
use chrono::Utc;
use cap_std::{ambient_authority, fs::Dir};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};
use tracing::{info, warn};
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

/// 备份信息
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    /// 备份文件名
    pub filename: String,
    /// 备份文件完整路径
    pub path: String,
    /// 备份时间戳（毫秒）
    pub created_at: i64,
    /// 文件大小（字节）
    pub size: u64,
}

// ============================================================================
// 纯函数（数据转换）
// ============================================================================

fn backup_prefix(config: &AppConfig) -> &'static str {
    if config.db_filename == ORG_DERIVED_DB_FILENAME {
        "grain-org-index-backup-"
    } else {
        "grain-backup-"
    }
}

/// Generate a database-specific namespace; derived cache archives are never historical backups.
pub fn generate_backup_filename(config: &AppConfig) -> String {
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S_%3f");
    format!("{}{}.zip", backup_prefix(config), timestamp)
}

/// Accept only single-component historical or derived backup timestamp names.
pub fn is_valid_backup_filename(filename: &str) -> bool {
    let timestamp = filename.strip_prefix("grain-backup-")
        .or_else(|| filename.strip_prefix("grain-org-index-backup-"))
        .and_then(|name| name.strip_suffix(".zip"));
    let Some(timestamp) = timestamp else { return false };
    matches!(timestamp.len(), 15 | 19)
        && timestamp.bytes().enumerate().all(|(index, byte)| {
            if index == 8 || index == 15 { byte == b'_' } else { byte.is_ascii_digit() }
        })
}

/// 从文件路径提取备份信息
pub fn extract_backup_info(path: &PathBuf) -> Option<BackupInfo> {
    let metadata = fs::symlink_metadata(path).ok()?;
    if !metadata.file_type().is_file() {
        return None;
    }

    let filename = path.file_name()?.to_string_lossy().to_string();

    if !is_valid_backup_filename(&filename) {
        return None;
    }

    let created_at = metadata
        .modified()
        .ok()?
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_millis() as i64;

    Some(BackupInfo {
        filename,
        path: path.to_string_lossy().to_string(),
        created_at,
        size: metadata.len(),
    })
}

fn backup_namespace(config: &AppConfig) -> AppResult<Dir> {
    let path = config.backup_dir();
    if !fs::symlink_metadata(&path)?.file_type().is_dir() {
        return Err(AppError::backup_error("Backup namespace must be a real directory"));
    }
    Ok(Dir::open_ambient_dir(&path, ambient_authority())?)
}

fn confined_backup_name<'a>(config: &AppConfig, path: &'a Path) -> AppResult<&'a str> {
    let filename = path.file_name().and_then(|name| name.to_str())
        .ok_or_else(|| AppError::backup_error("Invalid backup filename"))?;
    let single_component = path.components().count() == 1
        && matches!(path.components().next(), Some(Component::Normal(_)));
    if (!single_component && path.parent() != Some(config.backup_dir().as_path()))
        || !is_valid_backup_filename(filename)
        || !filename.starts_with(backup_prefix(config))
    {
        return Err(AppError::backup_error("Backup path is outside its database namespace"));
    }
    Ok(filename)
}

/// Classify archives by both namespace and exact database membership. Old, mixed, corrupt,
/// symlinked and otherwise unidentified archives are recovery assets, not retention candidates.
fn open_classified_backup(config: &AppConfig, directory: &Dir, name: &str) -> AppResult<File> {
    confined_backup_name(config, Path::new(name))?;
    if !directory.symlink_metadata(name)?.file_type().is_file() {
        return Err(AppError::backup_error("Backup must be a regular file, not a symbolic link"));
    }
    let file = directory.open(name)?.into_std();
    let mut archive = ZipArchive::new(file)?;
    if archive.len() != 1 || archive.by_index(0)?.name() != config.db_filename {
        return Err(AppError::backup_error("Archive is not classified for this database"));
    }
    Ok(archive.into_inner())
}

// ============================================================================
// 副作用函数（文件系统操作）
// ============================================================================

/// 创建备份
///
/// 将数据库文件打包为 ZIP 文件
pub fn create_backup(config: &AppConfig) -> AppResult<BackupInfo> {
    let db_path = config.db_path();

    if !db_path.exists() {
        return Err(AppError::backup_error("数据库文件不存在"));
    }

    // 确保备份目录存在
    let backup_dir = config.backup_dir();
    fs::create_dir_all(&backup_dir)?;

    // 生成备份文件名
    let filename = generate_backup_filename(config);
    let backup_path = backup_dir.join(&filename);

    // 创建 ZIP 文件
    let file = File::options().write(true).create_new(true).open(&backup_path)?;
    let mut zip = ZipWriter::new(file);

    // 添加数据库文件到 ZIP
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .compression_level(Some(6));

    zip.start_file(&config.db_filename, options)?;
    let mut db_file = File::open(&db_path)?;
    let mut buffer = Vec::new();
    db_file.read_to_end(&mut buffer)?;
    zip.write_all(&buffer)?;

    zip.finish()?;

    // 获取备份文件信息
    let metadata = fs::metadata(&backup_path)?;
    let created_at = Utc::now().timestamp_millis();

    info!("创建备份: {}", filename);

    Ok(BackupInfo {
        filename,
        path: backup_path.to_string_lossy().to_string(),
        created_at,
        size: metadata.len(),
    })
}

/// 恢复备份
///
/// 从 ZIP 文件恢复数据库
pub fn restore_backup(config: &AppConfig, backup_path: &PathBuf) -> AppResult<()> {
    let name = confined_backup_name(config, backup_path)?;
    let directory = backup_namespace(config)?;
    let file = open_classified_backup(config, &directory, name)?;
    let mut archive = ZipArchive::new(file)?;

    // 查找数据库文件
    let db_filename = &config.db_filename;
    let mut found = false;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        if file.name() == db_filename {
            found = true;

            // 备份当前数据库（如果存在）
            let db_path = config.db_path();
            if db_path.exists() {
                let backup_current = db_path.with_extension("db.bak");
                fs::rename(&db_path, &backup_current)?;
                info!("当前数据库已备份到: {:?}", backup_current);
            }

            // 解压数据库文件
            let mut outfile = File::create(&db_path)?;
            std::io::copy(&mut file, &mut outfile)?;

            info!("恢复备份: {:?}", backup_path);
            break;
        }
    }

    if !found {
        return Err(AppError::backup_error(&format!(
            "备份文件中未找到数据库: {}",
            db_filename
        )));
    }

    Ok(())
}

/// 列出所有备份
pub fn list_backups(config: &AppConfig) -> AppResult<Vec<BackupInfo>> {
    let backup_dir = config.backup_dir();

    if !backup_dir.exists() {
        return Ok(vec![]);
    }

    let mut backups = Vec::new();

    let directory = backup_namespace(config)?;
    for entry in directory.entries()? {
        let entry = entry?;
        let filename = entry.file_name();
        let Some(name) = filename.to_str() else { continue };
        if open_classified_backup(config, &directory, name).is_err() {
            continue;
        }
        let path = backup_dir.join(name);
        if let Some(info) = extract_backup_info(&path) {
            backups.push(info);
        }
    }

    // 按创建时间降序排序
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at).then_with(|| b.filename.cmp(&a.filename)));

    Ok(backups)
}

/// 删除备份
pub fn delete_backup(config: &AppConfig, backup_path: &PathBuf) -> AppResult<()> {
    let name = confined_backup_name(config, backup_path)?;
    let directory = backup_namespace(config)?;
    // Avoid disturbing known recovery assets; then capture and reclassify the actual entry.
    // A concurrent replacement of the original name must never turn inspection into an unlink
    // of unrelated bytes. Private captures containing uncertain bytes are retained on failure.
    drop(open_classified_backup(config, &directory, name)?);
    let capture_name = format!(".grain-backup-delete-{}", uuid::Uuid::new_v4());
    directory.create_dir(&capture_name)?;
    let capture = directory.open_dir(&capture_name)?;
    if let Err(error) = directory.rename(name, &capture, name) {
        let _ = directory.remove_dir(&capture_name);
        return Err(error.into());
    }
    if let Err(error) = delete_captured_backup(config, &directory, &capture, name) {
        if !capture.try_exists(name)? {
            let _ = directory.remove_dir(&capture_name);
            return Err(error);
        }
        return Err(AppError::backup_error(&format!(
            "{error}; uncertain captured assets remain in {}/{}",
            config.backup_dir().display(), capture_name,
        )));
    }
    directory.remove_dir(&capture_name)?;
    info!("删除备份: {:?}", backup_path);
    Ok(())
}

fn delete_captured_backup(config: &AppConfig, directory: &Dir, capture: &Dir, name: &str) -> AppResult<()> {
    match open_classified_backup(config, capture, name) {
        Ok(file) => {
            drop(file);
            capture.remove_file(name)?;
            Ok(())
        }
        Err(error) => {
            // Restore regular unidentified archives only with exclusive creation. If a new file
            // already occupies the original name, or the captured entry is not a regular file,
            // retain both assets rather than guessing ownership or overwriting the replacement.
            if capture.symlink_metadata(name)?.file_type().is_file()
                && capture.hard_link(name, directory, name).is_ok()
            {
                capture.remove_file(name)?;
            }
            Err(error)
        }
    }
}

/// 清理旧备份（保留最近 N 个）
pub fn cleanup_old_backups(config: &AppConfig, keep_count: usize) -> AppResult<usize> {
    let mut backups = list_backups(config)?;

    if backups.len() <= keep_count {
        return Ok(0);
    }

    let mut deleted = 0;
    while backups.len() > keep_count {
        if let Some(oldest) = backups.pop() {
            let path = PathBuf::from(&oldest.path);
            if let Err(e) = delete_backup(config, &path) {
                warn!("删除旧备份失败: {} - {}", oldest.filename, e);
            } else {
                deleted += 1;
            }
        }
    }

    info!("清理旧备份: 删除 {} 个", deleted);
    Ok(deleted)
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn write_archive(path: &Path, database: &str) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        let mut zip = ZipWriter::new(File::create(path).unwrap());
        zip.start_file(database, SimpleFileOptions::default()).unwrap();
        zip.write_all(b"database recovery bytes").unwrap();
        zip.finish().unwrap();
    }

    #[test]
    fn test_generate_backup_filename() {
        let filename = generate_backup_filename(&AppConfig::default());
        assert!(filename.starts_with("grain-backup-"));
        assert!(filename.ends_with(".zip"));
    }

    #[test]
    fn backup_timestamp_names_are_single_component_and_database_scoped() {
        assert!(is_valid_backup_filename("grain-org-index-backup-20240101_120000_001.zip"));
        for filename in [
            "grain-backup-../../20240101_120000.zip",
            "grain-backup-/20240101_120000.zip",
            "grain-backup-20240101_120000/001.zip",
            "grain-backup-20240101_120000_abc.zip",
            "grain-backup-anything.zip",
        ] {
            assert!(!is_valid_backup_filename(filename), "{filename}");
        }
        let derived = AppConfig::for_tauri_mode(false);
        assert!(generate_backup_filename(&derived).starts_with("grain-org-index-backup-"));
        assert!(confined_backup_name(&derived, Path::new("grain-backup-20240101_120000.zip")).is_err());
    }

    #[test]
    fn test_is_valid_backup_filename_valid() {
        assert!(is_valid_backup_filename("grain-backup-20240101_120000.zip"));
    }

    #[test]
    fn test_is_valid_backup_filename_invalid_prefix() {
        assert!(!is_valid_backup_filename("backup-20240101_120000.zip"));
    }

    #[test]
    fn test_is_valid_backup_filename_invalid_extension() {
        assert!(!is_valid_backup_filename(
            "grain-backup-20240101_120000.tar"
        ));
    }

    #[test]
    fn test_extract_backup_info_non_existent() {
        let path = PathBuf::from("/non/existent/path.zip");
        assert!(extract_backup_info(&path).is_none());
    }

    #[test]
    fn test_create_and_list_backup() {
        let temp_dir = tempdir().unwrap();
        let config = AppConfig {
            data_dir: temp_dir.path().to_path_buf(),
            db_filename: "test.db".to_string(),
            backup_dirname: "backups".to_string(),
            enable_encryption: false,
        };

        // 创建一个假的数据库文件
        let db_path = config.db_path();
        fs::write(&db_path, "test database content").unwrap();

        // 创建备份
        let result = create_backup(&config);
        assert!(result.is_ok());

        let backup_info = result.unwrap();
        assert!(backup_info.filename.starts_with("grain-backup-"));
        assert!(backup_info.size > 0);

        // 列出备份
        let backups = list_backups(&config).unwrap();
        assert_eq!(backups.len(), 1);
        assert_eq!(backups[0].filename, backup_info.filename);
    }

    #[test]
    fn test_create_backup_no_db() {
        let temp_dir = tempdir().unwrap();
        let config = AppConfig {
            data_dir: temp_dir.path().to_path_buf(),
            db_filename: "test.db".to_string(),
            backup_dirname: "backups".to_string(),
            enable_encryption: false,
        };

        // 不创建数据库文件
        let result = create_backup(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_backup() {
        let temp_dir = tempdir().unwrap();
        let config = AppConfig {
            data_dir: temp_dir.path().to_path_buf(),
            db_filename: "test.db".to_string(),
            backup_dirname: "backups".to_string(),
            enable_encryption: false,
        };

        // 创建数据库和备份
        let db_path = config.db_path();
        fs::write(&db_path, "test").unwrap();
        let backup_info = create_backup(&config).unwrap();

        // 删除备份
        let backup_path = PathBuf::from(&backup_info.path);
        let result = delete_backup(&config, &backup_path);
        assert!(result.is_ok());

        // 验证已删除
        let backups = list_backups(&config).unwrap();
        assert_eq!(backups.len(), 0);
    }

    #[test]
    fn test_cleanup_old_backups() {
        let temp_dir = tempdir().unwrap();
        let config = AppConfig {
            data_dir: temp_dir.path().to_path_buf(),
            db_filename: "test.db".to_string(),
            backup_dirname: "backups".to_string(),
            enable_encryption: false,
        };

        // 创建数据库
        let db_path = config.db_path();
        fs::write(&db_path, "test").unwrap();

        // Fixed archive names avoid sleep-based ordering and exercise the real archive classifier.
        for day in 1..=5 {
            write_archive(
                &config.backup_dir().join(format!("grain-backup-2024010{day}_120000.zip")),
                &config.db_filename,
            );
        }

        // 验证创建了 5 个备份
        let backups_before = list_backups(&config).unwrap();
        assert_eq!(backups_before.len(), 5, "应该创建 5 个备份");

        // 清理，保留 2 个
        let deleted = cleanup_old_backups(&config, 2).unwrap();
        assert_eq!(deleted, 3);

        // 验证剩余数量
        let backups = list_backups(&config).unwrap();
        assert_eq!(backups.len(), 2);
    }

    #[test]
    fn deletion_and_restore_reject_ambient_paths_and_traversal() {
        let root = tempdir().unwrap();
        let mut config = AppConfig::for_tauri_mode(true);
        config.data_dir = root.path().join("data");
        fs::create_dir_all(config.backup_dir()).unwrap();
        let outside = root.path().join("grain-backup-20240101_120000.zip");
        write_archive(&outside, &config.db_filename);
        let original = fs::read(&outside).unwrap();
        let traversal = config.backup_dir().join("../grain-backup-20240101_120000.zip");
        assert!(delete_backup(&config, &outside).is_err());
        assert!(delete_backup(&config, &traversal).is_err());
        assert!(restore_backup(&config, &outside).is_err());
        assert!(restore_backup(&config, &traversal).is_err());
        assert_eq!(fs::read(&outside).unwrap(), original);
        assert!(!config.db_path().exists());
    }

    #[test]
    fn derived_retention_preserves_historical_and_unclassified_archives() {
        let root = tempdir().unwrap();
        let mut legacy = AppConfig::for_tauri_mode(true);
        legacy.data_dir = root.path().to_path_buf();
        let mut derived = AppConfig::for_tauri_mode(false);
        derived.data_dir = root.path().to_path_buf();
        let historical = legacy.backup_dir().join("grain-backup-20240101_120000.zip");
        write_archive(&historical, &legacy.db_filename);
        let misnamed_historical = derived.backup_dir().join("grain-org-index-backup-20240101_120000.zip");
        write_archive(&misnamed_historical, &legacy.db_filename);
        let unknown = derived.backup_dir().join("grain-org-index-backup-20240102_120000.zip");
        fs::write(&unknown, b"unclassified recovery bytes").unwrap();
        let wrong_namespace = derived.backup_dir().join("grain-backup-20240103_120000.zip");
        write_archive(&wrong_namespace, &derived.db_filename);
        let classified = derived.backup_dir().join("grain-org-index-backup-20240104_120000.zip");
        write_archive(&classified, &derived.db_filename);

        assert_eq!(list_backups(&derived).unwrap().len(), 1);
        assert!(delete_backup(&derived, &historical).is_err());
        assert!(delete_backup(&derived, &misnamed_historical).is_err());
        assert!(delete_backup(&derived, &unknown).is_err());
        assert!(delete_backup(&derived, &wrong_namespace).is_err());
        assert_eq!(cleanup_old_backups(&derived, 0).unwrap(), 1);
        for path in [&historical, &misnamed_historical, &unknown, &wrong_namespace] {
            assert!(path.exists(), "preserve recovery asset {}", path.display());
        }
        assert!(!classified.exists());
        assert_eq!(cleanup_old_backups(&derived, 0).unwrap(), 0);
    }

    #[cfg(unix)]
    #[test]
    fn backup_operations_reject_symlinks_without_touching_their_targets() {
        use std::os::unix::fs::symlink;
        let root = tempdir().unwrap();
        let mut config = AppConfig::for_tauri_mode(true);
        config.data_dir = root.path().join("data");
        fs::create_dir_all(config.backup_dir()).unwrap();
        let external = root.path().join("external.zip");
        write_archive(&external, &config.db_filename);
        let link = config.backup_dir().join("grain-backup-20240101_120000.zip");
        symlink(&external, &link).unwrap();
        assert!(delete_backup(&config, &link).is_err());
        assert!(restore_backup(&config, &link).is_err());
        assert_eq!(cleanup_old_backups(&config, 0).unwrap(), 0);
        assert!(external.exists());
        assert!(fs::symlink_metadata(&link).unwrap().file_type().is_symlink());
    }

    #[test]
    fn captured_retention_never_unlinks_a_concurrent_original_name_replacement() {
        let root = tempdir().unwrap();
        let mut config = AppConfig::for_tauri_mode(false);
        config.data_dir = root.path().to_path_buf();
        let name = "grain-org-index-backup-20240101_120000.zip";
        let path = config.backup_dir().join(name);
        write_archive(&path, &config.db_filename);
        let directory = backup_namespace(&config).unwrap();
        directory.create_dir("capture").unwrap();
        let capture = directory.open_dir("capture").unwrap();
        directory.rename(name, &capture, name).unwrap();
        write_archive(&path, "grain.db");
        let replacement = fs::read(&path).unwrap();

        delete_captured_backup(&config, &directory, &capture, name).unwrap();
        assert_eq!(fs::read(&path).unwrap(), replacement);
        assert!(!capture.try_exists(name).unwrap());
    }

    #[test]
    fn unclassified_captured_archives_restore_exclusively_or_remain_recoverable() {
        let root = tempdir().unwrap();
        let mut config = AppConfig::for_tauri_mode(false);
        config.data_dir = root.path().to_path_buf();
        fs::create_dir_all(config.backup_dir()).unwrap();
        let directory = backup_namespace(&config).unwrap();
        directory.create_dir("capture").unwrap();
        let capture = directory.open_dir("capture").unwrap();
        let name = "grain-org-index-backup-20240101_120000.zip";
        capture.write(name, b"unknown historical bytes").unwrap();
        assert!(delete_captured_backup(&config, &directory, &capture, name).is_err());
        assert_eq!(directory.read(name).unwrap(), b"unknown historical bytes");
        assert!(!capture.try_exists(name).unwrap());

        capture.write(name, b"another historical body").unwrap();
        assert!(delete_captured_backup(&config, &directory, &capture, name).is_err());
        assert_eq!(directory.read(name).unwrap(), b"unknown historical bytes");
        assert_eq!(capture.read(name).unwrap(), b"another historical body");
    }
}
