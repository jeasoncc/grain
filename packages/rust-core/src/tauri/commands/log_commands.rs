//! 日志相关的 Tauri 命令
//!
//! 提供前端调用的日志操作接口

use tauri::State;

use crate::{
    db::{connection::DbConnection, log_db_fn},
    types::{
        error::AppResult,
        log::{
            request::{CreateLogEntryRequest, LogQueryOptions},
            response::{LogEntryResponse, LogQueryResult, LogStats},
        },
    },
};

/// 初始化日志数据库
#[tauri::command]
pub async fn init_log_database(db: State<'_, DbConnection>) -> Result<(), String> {
    log_db_fn::init_log_database(&db.0)
        .await
        .map_err(|e| e.to_string())
}

/// 检查日志数据库是否存在
#[tauri::command]
pub async fn check_log_database_exists(db: State<'_, DbConnection>) -> Result<bool, String> {
    log_db_fn::check_log_database_exists(&db.0)
        .await
        .map_err(|e| e.to_string())
}

/// 保存单个日志条目
#[tauri::command]
pub async fn save_log_entry(
    entry: CreateLogEntryRequest,
    db: State<'_, DbConnection>,
) -> Result<LogEntryResponse, String> {
    log_db_fn::save_log_entry(&db.0, entry)
        .await
        .map_err(|e| e.to_string())
}

/// 批量保存日志条目
#[tauri::command]
pub async fn save_logs_batch(
    entries: Vec<CreateLogEntryRequest>,
    db: State<'_, DbConnection>,
) -> Result<Vec<LogEntryResponse>, String> {
    log_db_fn::save_logs_batch(&db.0, entries)
        .await
        .map_err(|e| e.to_string())
}

/// 查询日志条目
#[tauri::command]
pub async fn query_logs(
    options: LogQueryOptions,
    db: State<'_, DbConnection>,
) -> Result<LogQueryResult, String> {
    log_db_fn::query_logs(&db.0, options)
        .await
        .map_err(|e| e.to_string())
}

/// 获取日志统计信息
#[tauri::command]
pub async fn get_log_stats(db: State<'_, DbConnection>) -> Result<LogStats, String> {
    log_db_fn::get_log_stats(&db.0)
        .await
        .map_err(|e| e.to_string())
}

/// 清理旧日志条目
#[tauri::command]
pub async fn clear_old_logs(
    before_date: String,
    db: State<'_, DbConnection>,
) -> Result<i64, String> {
    log_db_fn::clear_old_logs(&db.0, &before_date)
        .await
        .map_err(|e| e.to_string())
}

/// 清理所有日志条目
#[tauri::command]
pub async fn clear_all_logs(db: State<'_, DbConnection>) -> Result<i64, String> {
    log_db_fn::clear_all_logs(&db.0)
        .await
        .map_err(|e| e.to_string())
}

/// 检查是否需要从 IndexedDB 迁移
/// 
/// 注意：这个函数目前总是返回 false，因为迁移逻辑在前端处理
/// 实际的迁移检查应该在前端通过检查 IndexedDB 是否存在日志数据来实现
#[tauri::command]
pub async fn check_needs_migration() -> Result<bool, String> {
    // 这里可以添加检查逻辑，比如检查是否存在迁移标记文件
    // 目前简单返回 false，让前端处理迁移检查
    Ok(false)
}

/// 标记迁移完成
/// 
/// 可以创建一个标记文件或在配置中记录迁移状态
#[tauri::command]
pub async fn mark_migration_complete() -> Result<(), String> {
    // 这里可以添加标记迁移完成的逻辑
    // 比如创建一个 .migration_complete 文件
    Ok(())
}