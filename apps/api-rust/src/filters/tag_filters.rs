//! Tag Filter 定义

use rust_core::{CreateTagRequest, UpdateTagRequest};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Filter;

use super::with_db;
use crate::handlers::tag_handlers;

/// Tag 路由组合
pub fn tag_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_tags_by_workspace(db.clone())
        .or(get_tag(db.clone()))
        .or(create_tag(db.clone()))
        .or(update_tag(db.clone()))
        .or(delete_tag(db))
}

/// GET /api/workspaces/:workspace_id/tags
fn get_tags_by_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String / "tags")
        .and(warp::get())
        .and(with_db(db))
        .and_then(tag_handlers::get_tags_by_workspace)
}

/// GET /api/tags/:id
fn get_tag(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "tags" / String)
        .and(warp::get())
        .and(with_db(db))
        .and_then(tag_handlers::get_tag)
}

/// POST /api/tags
fn create_tag(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "tags")
        .and(warp::post())
        .and(warp::body::json::<CreateTagRequest>())
        .and(with_db(db))
        .and_then(tag_handlers::create_tag)
}

/// PUT /api/tags/:id
fn update_tag(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "tags" / String)
        .and(warp::put())
        .and(warp::body::json::<UpdateTagRequest>())
        .and(with_db(db))
        .and_then(tag_handlers::update_tag)
}

/// DELETE /api/tags/:id
fn delete_tag(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "tags" / String)
        .and(warp::delete())
        .and(with_db(db))
        .and_then(tag_handlers::delete_tag)
}
