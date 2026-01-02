//! Content Filter 定义

use rust_core::SaveContentRequest;
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Filter;

use super::with_db;
use crate::handlers::content_handlers;

/// Content 路由组合
pub fn content_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_content(db.clone()).or(save_content(db))
}

/// GET /api/nodes/:node_id/content
fn get_content(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String / "content")
        .and(warp::get())
        .and(with_db(db))
        .and_then(content_handlers::get_content)
}

/// PUT /api/nodes/:node_id/content
fn save_content(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String / "content")
        .and(warp::put())
        .and(warp::body::json::<SaveContentRequest>())
        .and(with_db(db))
        .and_then(content_handlers::save_content)
}
