//! Attachment 请求处理函数
//!
//! 薄层封装，调用 rust-core 的业务逻辑

use rust_core::{
    db::attachment_db_fn, AppError, AttachmentResponse, CreateAttachmentRequest,
    UpdateAttachmentRequest,
};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Reply;

use crate::rejection::AppRejection;

/// 获取项目所有附件
pub async fn get_attachments_by_project(
    project_id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    attachment_db_fn::find_by_project(&db, &project_id)
        .await
        .map(|attachments| {
            let responses: Vec<AttachmentResponse> =
                attachments.into_iter().map(AttachmentResponse::from).collect();
            warp::reply::json(&responses)
        })
        .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}

/// 获取单个附件
pub async fn get_attachment(
    id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    attachment_db_fn::find_by_id(&db, &id)
        .await
        .map(|opt| warp::reply::json(&opt.map(AttachmentResponse::from)))
        .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}

/// 创建附件
pub async fn create_attachment(
    request: CreateAttachmentRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    let id = uuid::Uuid::new_v4().to_string();

    attachment_db_fn::create(
        &db,
        id,
        request.project_id,
        request.attachment_type,
        request.file_name,
        request.file_path,
        request.size,
        request.mime_type,
    )
    .await
    .map(|attachment| warp::reply::json(&AttachmentResponse::from(attachment)))
    .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}

/// 更新附件
pub async fn update_attachment(
    id: String,
    request: UpdateAttachmentRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    attachment_db_fn::update(
        &db,
        &id,
        request.file_name,
        request.file_path,
        request.size,
        request.mime_type,
    )
    .await
    .map(|attachment| warp::reply::json(&AttachmentResponse::from(attachment)))
    .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}

/// 删除附件
pub async fn delete_attachment(
    id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    attachment_db_fn::delete(&db, &id)
        .await
        .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
        .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}
