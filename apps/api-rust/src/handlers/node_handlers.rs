//! Node 请求处理函数

use rust_core::{
    db::node_db_fn, r#fn::node::node_service_fn, CreateNodeRequest, MoveNodeRequest, NodeResponse,
    NodeType, UpdateNodeRequest,
};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Reply;

use crate::rejection::AppRejection;

/// 获取工作区下的所有节点
pub async fn get_nodes_by_workspace(
    workspace_id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    node_db_fn::find_by_workspace(&db, &workspace_id)
        .await
        .map(|nodes| {
            let responses: Vec<NodeResponse> =
                nodes.into_iter().map(NodeResponse::from).collect();
            warp::reply::json(&responses)
        })
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 获取单个节点
pub async fn get_node(
    id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    node_db_fn::find_by_id(&db, &id)
        .await
        .map(|opt| warp::reply::json(&opt.map(NodeResponse::from)))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 创建节点
pub async fn create_node(
    request: CreateNodeRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    let id = uuid::Uuid::new_v4().to_string();
    let node_type = request.node_type.unwrap_or(NodeType::File);
    let tags = request
        .tags
        .map(|t| serde_json::to_string(&t).unwrap_or_default());

    node_service_fn::create_node_with_content(
        &db,
        id,
        request.workspace_id,
        request.parent_id,
        request.title,
        node_type,
        tags,
        request.initial_content,
    )
    .await
    .map(|n| warp::reply::json(&NodeResponse::from(n)))
    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 更新节点
pub async fn update_node(
    id: String,
    request: UpdateNodeRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    let tags = request
        .tags
        .map(|t| Some(serde_json::to_string(&t).unwrap_or_default()));

    node_db_fn::update(
        &db,
        &id,
        request.title,
        request.is_collapsed,
        request.sort_order,
        tags,
    )
    .await
    .map(|n| warp::reply::json(&NodeResponse::from(n)))
    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 移动节点
pub async fn move_node(
    id: String,
    request: MoveNodeRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    node_db_fn::move_node(&db, &id, request.new_parent_id, request.new_sort_order)
        .await
        .map(|n| warp::reply::json(&NodeResponse::from(n)))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 删除节点
pub async fn delete_node(
    id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    node_service_fn::delete_node_recursive(&db, &id)
        .await
        .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 复制节点
pub async fn duplicate_node(
    id: String,
    new_title: Option<String>,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    node_service_fn::duplicate_node(&db, &id, new_title)
        .await
        .map(|n| warp::reply::json(&NodeResponse::from(n)))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}
