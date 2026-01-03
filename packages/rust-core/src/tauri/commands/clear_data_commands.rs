//! Clear Data Tauri Commands
//!
//! 提供清除 SQLite 数据库数据的 Tauri 命令

use crate::db::clear_data_db_fn::{self, ClearDataOptions, ClearDataResult};
use sea_orm::DatabaseConnection;
use tauri::State;

/// 清除所有 SQLite 数据
///
/// 清除数据库中的所有数据，包括用户、工作区、节点、内容、标签、附件
#[tauri::command]
pub async fn clear_sqlite_data(
    db: State<'_, DatabaseConnection>,
) -> Result<ClearDataResult, String> {
    clear_data_db_fn::clear_all_data(&db, ClearDataOptions::all())
        .await
        .map_err(|e| e.to_string())
}

/// 清除 SQLite 数据（保留用户）
///
/// 清除数据库中的数据，但保留用户信息
#[tauri::command]
pub async fn clear_sqlite_data_keep_users(
    db: State<'_, DatabaseConnection>,
) -> Result<ClearDataResult, String> {
    clear_data_db_fn::clear_all_data(&db, ClearDataOptions::database_only())
        .await
        .map_err(|e| e.to_string())
}
