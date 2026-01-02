//! Backup Tauri Commands
//!
//! 备份相关的前端可调用命令

use crate::r#fn::backup::backup_fn::{self, BackupInfo};
use crate::types::config::AppConfig;
use std::path::PathBuf;
use tauri::State;

/// 创建备份
#[tauri::command]
pub async fn create_backup(config: State<'_, AppConfig>) -> Result<BackupInfo, String> {
    backup_fn::create_backup(&config).map_err(|e| e.to_string())
}

/// 恢复备份
#[tauri::command]
pub async fn restore_backup(
    config: State<'_, AppConfig>,
    backup_path: String,
) -> Result<(), String> {
    let path = PathBuf::from(backup_path);
    backup_fn::restore_backup(&config, &path).map_err(|e| e.to_string())
}

/// 列出所有备份
#[tauri::command]
pub async fn list_backups(config: State<'_, AppConfig>) -> Result<Vec<BackupInfo>, String> {
    backup_fn::list_backups(&config).map_err(|e| e.to_string())
}

/// 删除备份
#[tauri::command]
pub async fn delete_backup(backup_path: String) -> Result<(), String> {
    let path = PathBuf::from(backup_path);
    backup_fn::delete_backup(&path).map_err(|e| e.to_string())
}

/// 清理旧备份
#[tauri::command]
pub async fn cleanup_old_backups(
    config: State<'_, AppConfig>,
    keep_count: usize,
) -> Result<usize, String> {
    backup_fn::cleanup_old_backups(&config, keep_count).map_err(|e| e.to_string())
}
