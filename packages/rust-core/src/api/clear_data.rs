//! Clear Data API
//!
//! 提供清除 SQLite 数据库数据的 HTTP API 端点

use sea_orm::DatabaseConnection;

use super::{ApiEndpoint, NoInput};
use crate::db::{clear_all_data, ClearDataOptions, ClearDataResult};
use crate::AppResult;

// ============================================================================
// ClearAllData - 清除所有数据
// ============================================================================

/// 清除所有数据
///
/// ## HTTP
/// - Method: DELETE
/// - Path: /api/data/clear
///
/// ## Tauri
/// - Command: clear_sqlite_data
///
/// ## 返回
/// - 成功: ClearDataResult
/// - 失败: DatabaseError
pub struct ClearAllData;

impl ApiEndpoint for ClearAllData {
    type Input = NoInput;
    type Output = ClearDataResult;
    const NAME: &'static str = "clear_all_data";

    async fn execute(db: &DatabaseConnection, _: Self::Input) -> AppResult<Self::Output> {
        clear_all_data(db, ClearDataOptions::all()).await
    }
}

// ============================================================================
// ClearDataKeepUsers - 清除数据（保留用户）
// ============================================================================

/// 清除数据（保留用户）
///
/// ## HTTP
/// - Method: DELETE
/// - Path: /api/data/clear?keepUsers=true
///
/// ## Tauri
/// - Command: clear_sqlite_data_keep_users
///
/// ## 返回
/// - 成功: ClearDataResult
/// - 失败: DatabaseError
pub struct ClearDataKeepUsers;

impl ApiEndpoint for ClearDataKeepUsers {
    type Input = NoInput;
    type Output = ClearDataResult;
    const NAME: &'static str = "clear_data_keep_users";

    async fn execute(db: &DatabaseConnection, _: Self::Input) -> AppResult<Self::Output> {
        clear_all_data(db, ClearDataOptions::database_only()).await
    }
}