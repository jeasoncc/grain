//! Workspace 请求处理函数
//!
//! 薄层封装，调用 rust-core 的业务逻辑

use rust_core::{
    db::workspace_db_fn, CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceResponse,
};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Reply;

use crate::rejection::AppRejection;

/// 获取所有工作区
pub async fn get_workspaces(db: Arc<DatabaseConnection>) -> Result<impl Reply, warp::Rejection> {
    workspace_db_fn::find_all(&db)
        .await
        .map(|workspaces| {
            let responses: Vec<WorkspaceResponse> =
                workspaces.into_iter().map(WorkspaceResponse::from).collect();
            warp::reply::json(&responses)
        })
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 获取单个工作区
pub async fn get_workspace(
    id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    workspace_db_fn::find_by_id(&db, &id)
        .await
        .map(|opt| warp::reply::json(&opt.map(WorkspaceResponse::from)))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 创建工作区
pub async fn create_workspace(
    request: CreateWorkspaceRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    let id = uuid::Uuid::new_v4().to_string();

    workspace_db_fn::create(&db, id, request.title, request.description)
        .await
        .map(|w| warp::reply::json(&WorkspaceResponse::from(w)))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 更新工作区
pub async fn update_workspace(
    id: String,
    request: UpdateWorkspaceRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    workspace_db_fn::update(&db, &id, request.title, request.description)
        .await
        .map(|w| warp::reply::json(&WorkspaceResponse::from(w)))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 删除工作区
pub async fn delete_workspace(
    id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    workspace_db_fn::delete(&db, &id)
        .await
        .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}
