//! Backup Filter 定义

use rust_core::AppConfig;
use std::sync::Arc;
use warp::Filter;

use super::with_config;
use crate::handlers::backup_handlers;

/// Backup 路由组合
pub fn backup_routes(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    list_backups(config.clone())
        .or(create_backup(config.clone()))
        .or(delete_backup(config))
}

/// GET /api/backups
fn list_backups(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "backups")
        .and(warp::get())
        .and(with_config(config))
        .and_then(backup_handlers::list_backups)
}

/// POST /api/backups
fn create_backup(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "backups")
        .and(warp::post())
        .and(with_config(config))
        .and_then(backup_handlers::create_backup)
}

/// DELETE /api/backups/:filename
fn delete_backup(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "backups" / String)
        .and(warp::delete())
        .and(with_config(config))
        .and_then(backup_handlers::delete_backup)
}
