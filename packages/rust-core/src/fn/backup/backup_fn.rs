//! 备份纯函数
//!
//! 实现数据库备份和恢复功能

use crate::types::config::AppConfig;
use crate::types::error::{AppError, AppResult};
use chrono::Utc;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use tracing::{info, warn};
use walkdir::WalkDir;
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

/// 生成备份文件名（使用毫秒精度避免重复）
pub fn generate_backup_filename() -> String {
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S_%3f");
    format!("grain-backup-{}.zip", timestamp)
}

/// 检查文件名是否为有效的备份文件
pub fn is_valid_backup_filename(filename: &str) -> bool {
    filename.starts_with("grain-backup-") && filename.ends_with(".zip")
}

/// 从文件路径提取备份信息
pub fn extract_backup_info(path: &PathBuf) -> Option<BackupInfo> {
    if !path.is_file() {
        return None;
    }

    let filename = path.file_name()?.to_string_lossy().to_string();

    if !is_valid_backup_filename(&filename) {
        return None;
    }

    let metadata = fs::metadata(path).ok()?;
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
    let filename = generate_backup_filename();
    let backup_path = backup_dir.join(&filename);

    // 创建 ZIP 文件
    let file = File::create(&backup_path)?;
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
    if !backup_path.exists() {
        return Err(AppError::backup_error("备份文件不存在"));
    }

    // 打开 ZIP 文件
    let file = File::open(backup_path)?;
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

    for entry in WalkDir::new(&backup_dir).max_depth(1) {
        let entry = entry?;
        let path = entry.path().to_path_buf();

        if let Some(info) = extract_backup_info(&path) {
            backups.push(info);
        }
    }

    // 按创建时间降序排序
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(backups)
}

/// 删除备份
pub fn delete_backup(backup_path: &PathBuf) -> AppResult<()> {
    if !backup_path.exists() {
        return Err(AppError::backup_error("备份文件不存在"));
    }

    fs::remove_file(backup_path)?;
    info!("删除备份: {:?}", backup_path);
    Ok(())
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
            if let Err(e) = delete_backup(&path) {
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

    #[test]
    fn test_generate_backup_filename() {
        let filename = generate_backup_filename();
        assert!(filename.starts_with("grain-backup-"));
        assert!(filename.ends_with(".zip"));
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
        assert!(!is_valid_backup_filename("grain-backup-20240101_120000.tar"));
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
        let result = delete_backup(&backup_path);
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

        // 创建多个备份（毫秒精度文件名，短暂等待即可）
        for _ in 0..5 {
            create_backup(&config).unwrap();
            std::thread::sleep(std::time::Duration::from_millis(10));
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
}
