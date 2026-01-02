//! Backup 请求处理函数
//!
//! 薄层封装，调用 rust-core 的备份函数

use rust_core::AppConfig;
use std::sync::Arc;
use warp::Reply;

use crate::rejection::AppRejection;

/// 列出所有备份
pub async fn list_backups(config: Arc<AppConfig>) -> Result<impl Reply, warp::Rejection> {
    rust_core::list_backups(&config)
        .map(|backups| warp::reply::json(&backups))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 创建备份
pub async fn create_backup(config: Arc<AppConfig>) -> Result<impl Reply, warp::Rejection> {
    rust_core::create_backup(&config)
        .map(|backup_info| warp::reply::json(&backup_info))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 删除备份
pub async fn delete_backup(
    filename: String,
    config: Arc<AppConfig>,
) -> Result<impl Reply, warp::Rejection> {
    let backup_path = config.backup_dir().join(&filename);

    rust_core::delete_backup(&backup_path)
        .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}
