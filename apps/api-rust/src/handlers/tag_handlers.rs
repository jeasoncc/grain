//! Tag 请求处理函数
//!
//! 薄层封装，调用 rust-core 的业务逻辑

use rust_core::{db::tag_db_fn, AppError, CreateTagRequest, TagResponse, UpdateTagRequest};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Reply;

use crate::rejection::AppRejection;

/// 获取工作区所有标签
pub async fn get_tags_by_workspace(
    workspace_id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    tag_db_fn::find_by_workspace(&db, &workspace_id)
        .await
        .map(|tags| {
            let responses: Vec<TagResponse> = tags.into_iter().map(TagResponse::from).collect();
            warp::reply::json(&responses)
        })
        .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}

/// 获取单个标签
pub async fn get_tag(id: String, db: Arc<DatabaseConnection>) -> Result<impl Reply, warp::Rejection> {
    tag_db_fn::find_by_id(&db, &id)
        .await
        .map(|opt| warp::reply::json(&opt.map(TagResponse::from)))
        .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}

/// 创建标签
pub async fn create_tag(
    request: CreateTagRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    let id = format!("{}:{}", request.workspace_id, request.name);

    tag_db_fn::create(&db, id, request.name, request.workspace_id)
        .await
        .map(|tag| warp::reply::json(&TagResponse::from(tag)))
        .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}

/// 更新标签
pub async fn update_tag(
    id: String,
    request: UpdateTagRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    tag_db_fn::update(&db, &id, request.name, request.count, request.last_used)
        .await
        .map(|tag| warp::reply::json(&TagResponse::from(tag)))
        .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}

/// 删除标签
pub async fn delete_tag(
    id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    tag_db_fn::delete(&db, &id)
        .await
        .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
        .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}
