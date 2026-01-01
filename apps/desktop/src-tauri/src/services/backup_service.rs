//! 备份服务
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

/// 备份服务
pub struct BackupService;

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

impl BackupService {
    /// 创建备份
    ///
    /// 将数据库文件打包为 ZIP 文件
    pub fn create_backup(config: &AppConfig) -> AppResult<BackupInfo> {
        let db_path = config.db_path();

        if !db_path.exists() {
            return Err(AppError::BackupError("数据库文件不存在".to_string()));
        }

        // 确保备份目录存在
        let backup_dir = config.backup_dir();
        fs::create_dir_all(&backup_dir)?;

        // 生成备份文件名
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        let filename = format!("grain-backup-{}.zip", timestamp);
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
            return Err(AppError::BackupError("备份文件不存在".to_string()));
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
            return Err(AppError::BackupError(format!(
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
            let path = entry.path();

            if path.is_file() && path.extension().map_or(false, |ext| ext == "zip") {
                if let Some(filename) = path.file_name() {
                    let filename = filename.to_string_lossy().to_string();

                    // 只处理 grain-backup-*.zip 格式的文件
                    if filename.starts_with("grain-backup-") {
                        let metadata = fs::metadata(path)?;

                        // 从文件修改时间获取创建时间
                        let created_at = metadata
                            .modified()
                            .map(|t| {
                                t.duration_since(std::time::UNIX_EPOCH)
                                    .map(|d| d.as_millis() as i64)
                                    .unwrap_or(0)
                            })
                            .unwrap_or(0);

                        backups.push(BackupInfo {
                            filename,
                            path: path.to_string_lossy().to_string(),
                            created_at,
                            size: metadata.len(),
                        });
                    }
                }
            }
        }

        // 按创建时间降序排序
        backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        Ok(backups)
    }

    /// 删除备份
    pub fn delete_backup(backup_path: &PathBuf) -> AppResult<()> {
        if !backup_path.exists() {
            return Err(AppError::BackupError("备份文件不存在".to_string()));
        }

        fs::remove_file(backup_path)?;
        info!("删除备份: {:?}", backup_path);
        Ok(())
    }

    /// 清理旧备份（保留最近 N 个）
    pub fn cleanup_old_backups(config: &AppConfig, keep_count: usize) -> AppResult<usize> {
        let mut backups = Self::list_backups(config)?;

        if backups.len() <= keep_count {
            return Ok(0);
        }

        let mut deleted = 0;
        while backups.len() > keep_count {
            if let Some(oldest) = backups.pop() {
                let path = PathBuf::from(&oldest.path);
                if let Err(e) = Self::delete_backup(&path) {
                    warn!("删除旧备份失败: {} - {}", oldest.filename, e);
                } else {
                    deleted += 1;
                }
            }
        }

        info!("清理旧备份: 删除 {} 个", deleted);
        Ok(deleted)
    }
}
