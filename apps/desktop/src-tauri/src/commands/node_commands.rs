//! Node Tauri Commands
//!
//! 节点相关的前端可调用命令

use crate::entity::node::{self, NodeType};
use crate::repo::NodeRepo;
use crate::services::NodeService;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use tauri::State;

/// 创建节点请求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNodeRequest {
    pub workspace_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub node_type: String,
    pub tags: Option<Vec<String>>,
    pub initial_content: Option<String>,
}

/// 更新节点请求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNodeRequest {
    pub title: Option<String>,
    pub is_collapsed: Option<bool>,
    pub sort_order: Option<i32>,
    pub tags: Option<Option<Vec<String>>>,
}

/// 移动节点请求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveNodeRequest {
    pub new_parent_id: Option<String>,
    pub new_sort_order: i32,
}

/// 节点响应
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeResponse {
    pub id: String,
    pub workspace_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub node_type: String,
    pub is_collapsed: bool,
    pub sort_order: i32,
    pub tags: Option<Vec<String>>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<node::Model> for NodeResponse {
    fn from(model: node::Model) -> Self {
        // 解析 tags JSON
        let tags = model.tags.and_then(|t| serde_json::from_str(&t).ok());

        Self {
            id: model.id,
            workspace_id: model.workspace_id,
            parent_id: model.parent_id,
            title: model.title,
            node_type: model.node_type.to_string(),
            is_collapsed: model.is_collapsed,
            sort_order: model.sort_order,
            tags,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

/// 获取工作区下的所有节点
#[tauri::command]
pub async fn get_nodes_by_workspace(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
) -> Result<Vec<NodeResponse>, String> {
    NodeRepo::find_by_workspace(&db, &workspace_id)
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

/// 获取单个节点
#[tauri::command]
pub async fn get_node(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<Option<NodeResponse>, String> {
    NodeRepo::find_by_id(&db, &id)
        .await
        .map(|opt| opt.map(NodeResponse::from))
        .map_err(|e| e.to_string())
}

/// 获取子节点
#[tauri::command]
pub async fn get_child_nodes(
    db: State<'_, DatabaseConnection>,
    parent_id: String,
) -> Result<Vec<NodeResponse>, String> {
    NodeRepo::find_children(&db, &parent_id)
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

/// 创建节点
#[tauri::command]
pub async fn create_node(
    db: State<'_, DatabaseConnection>,
    request: CreateNodeRequest,
) -> Result<NodeResponse, String> {
    let id = uuid::Uuid::new_v4().to_string();

    // 解析节点类型
    let node_type: NodeType = request
        .node_type
        .parse()
        .unwrap_or(NodeType::File);

    // 序列化 tags
    let tags = request
        .tags
        .map(|t| serde_json::to_string(&t).unwrap_or_default());

    NodeService::create_node_with_content(
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
    .map(NodeResponse::from)
    .map_err(|e| e.to_string())
}

/// 更新节点
#[tauri::command]
pub async fn update_node(
    db: State<'_, DatabaseConnection>,
    id: String,
    request: UpdateNodeRequest,
) -> Result<NodeResponse, String> {
    // 序列化 tags
    let tags = request.tags.map(|opt| opt.map(|t| serde_json::to_string(&t).unwrap_or_default()));

    NodeRepo::update(
        &db,
        &id,
        request.title,
        request.is_collapsed,
        request.sort_order,
        tags,
    )
    .await
    .map(NodeResponse::from)
    .map_err(|e| e.to_string())
}

/// 移动节点
#[tauri::command]
pub async fn move_node(
    db: State<'_, DatabaseConnection>,
    id: String,
    request: MoveNodeRequest,
) -> Result<NodeResponse, String> {
    NodeRepo::move_node(&db, &id, request.new_parent_id, request.new_sort_order)
        .await
        .map(NodeResponse::from)
        .map_err(|e| e.to_string())
}

/// 删除节点（递归删除子节点）
#[tauri::command]
pub async fn delete_node(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<(), String> {
    NodeService::delete_node_recursive(&db, &id)
        .await
        .map_err(|e| e.to_string())
}

/// 复制节点
#[tauri::command]
pub async fn duplicate_node(
    db: State<'_, DatabaseConnection>,
    id: String,
    new_title: Option<String>,
) -> Result<NodeResponse, String> {
    NodeService::duplicate_node(&db, &id, new_title)
        .await
        .map(NodeResponse::from)
        .map_err(|e| e.to_string())
}
