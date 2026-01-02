//! Attachment Filter 定义

use rust_core::{CreateAttachmentRequest, UpdateAttachmentRequest};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Filter;

use super::with_db;
use crate::handlers::attachment_handlers;

/// Attachment 路由组合
pub fn attachment_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_attachments_by_project(db.clone())
        .or(get_attachment(db.clone()))
        .or(create_attachment(db.clone()))
        .or(update_attachment(db.clone()))
        .or(delete_attachment(db))
}

/// GET /api/projects/:project_id/attachments
fn get_attachments_by_project(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "projects" / String / "attachments")
        .and(warp::get())
        .and(with_db(db))
        .and_then(attachment_handlers::get_attachments_by_project)
}

/// GET /api/attachments/:id
fn get_attachment(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "attachments" / String)
        .and(warp::get())
        .and(with_db(db))
        .and_then(attachment_handlers::get_attachment)
}

/// POST /api/attachments
fn create_attachment(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "attachments")
        .and(warp::post())
        .and(warp::body::json::<CreateAttachmentRequest>())
        .and(with_db(db))
        .and_then(attachment_handlers::create_attachment)
}

/// PUT /api/attachments/:id
fn update_attachment(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "attachments" / String)
        .and(warp::put())
        .and(warp::body::json::<UpdateAttachmentRequest>())
        .and(with_db(db))
        .and_then(attachment_handlers::update_attachment)
}

/// DELETE /api/attachments/:id
fn delete_attachment(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "attachments" / String)
        .and(warp::delete())
        .and(with_db(db))
        .and_then(attachment_handlers::delete_attachment)
}
