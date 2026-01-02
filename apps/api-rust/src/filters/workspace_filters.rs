//! Workspace Filter 定义
//!
//! 使用 Warp 的 Filter 组合子模式构建路由

use rust_core::{CreateWorkspaceRequest, UpdateWorkspaceRequest};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Filter;

use super::with_db;
use crate::handlers::workspace_handlers;

/// Workspace 路由组合
///
/// 使用 `or()` 组合子构建路由树
pub fn workspace_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_workspaces(db.clone())
        .or(get_workspace(db.clone()))
        .or(create_workspace(db.clone()))
        .or(update_workspace(db.clone()))
        .or(delete_workspace(db))
}

/// GET /api/workspaces
fn get_workspaces(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces")
        .and(warp::get())
        .and(with_db(db))
        .and_then(workspace_handlers::get_workspaces)
}

/// GET /api/workspaces/:id
fn get_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String)
        .and(warp::get())
        .and(with_db(db))
        .and_then(workspace_handlers::get_workspace)
}

/// POST /api/workspaces
fn create_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces")
        .and(warp::post())
        .and(warp::body::json::<CreateWorkspaceRequest>())
        .and(with_db(db))
        .and_then(workspace_handlers::create_workspace)
}

/// PUT /api/workspaces/:id
fn update_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String)
        .and(warp::put())
        .and(warp::body::json::<UpdateWorkspaceRequest>())
        .and(with_db(db))
        .and_then(workspace_handlers::update_workspace)
}

/// DELETE /api/workspaces/:id
fn delete_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String)
        .and(warp::delete())
        .and(with_db(db))
        .and_then(workspace_handlers::delete_workspace)
}
