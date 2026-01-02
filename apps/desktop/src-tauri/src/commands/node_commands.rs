//! Node Tauri Commands
//!
//! 节点相关的前端可调用命令

use crate::entity::node::NodeType as EntityNodeType;
use crate::repo::NodeRepo;
use crate::services::NodeService;
use crate::types::{CreateNodeRequest, MoveNodeRequest, NodeResponse, UpdateNodeRequest};
use sea_orm::DatabaseConnection;
use tauri::State;

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

    // 转换节点类型：DTO NodeType -> Entity NodeType
    let node_type: EntityNodeType = request
        .node_type
        .map(|t| t.into())
        .unwrap_or(EntityNodeType::File);

    // 创建节点时不带 tags 和 initial_content（需要通过 update 添加）
    NodeService::create_node_with_content(
        &db,
        id,
        request.workspace_id,
        request.parent_id,
        request.title,
        node_type,
        None, // tags
        None, // initial_content
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
    // 序列化 tags: Option<Vec<String>> -> Option<Option<String>>
    let tags = request.tags.map(|t| Some(serde_json::to_string(&t).unwrap_or_default()));

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

/// 获取根节点（parent_id 为 null）
#[tauri::command]
pub async fn get_root_nodes(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
) -> Result<Vec<NodeResponse>, String> {
    NodeRepo::find_root_nodes(&db, &workspace_id)
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

/// 按父节点获取子节点（支持 None 表示根节点）
#[tauri::command]
pub async fn get_nodes_by_parent(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
    parent_id: Option<String>,
) -> Result<Vec<NodeResponse>, String> {
    NodeRepo::find_by_parent(&db, &workspace_id, parent_id.as_deref())
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

/// 按类型获取节点
#[tauri::command]
pub async fn get_nodes_by_type(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
    node_type: String,
) -> Result<Vec<NodeResponse>, String> {
    let parsed_type: EntityNodeType = node_type
        .parse()
        .unwrap_or(EntityNodeType::File);

    NodeRepo::find_by_type(&db, &workspace_id, parsed_type)
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

/// 获取节点的所有后代
#[tauri::command]
pub async fn get_descendants(
    db: State<'_, DatabaseConnection>,
    node_id: String,
) -> Result<Vec<NodeResponse>, String> {
    NodeRepo::find_descendants(&db, &node_id)
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

/// 获取下一个排序号
#[tauri::command]
pub async fn get_next_sort_order(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
    parent_id: Option<String>,
) -> Result<i32, String> {
    NodeRepo::get_next_sort_order_pub(&db, &workspace_id, parent_id.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// 批量重排序节点
#[tauri::command]
pub async fn reorder_nodes(
    db: State<'_, DatabaseConnection>,
    node_ids: Vec<String>,
) -> Result<(), String> {
    NodeRepo::reorder_nodes(&db, node_ids)
        .await
        .map_err(|e| e.to_string())
}

/// 批量删除节点
#[tauri::command]
pub async fn delete_nodes_batch(
    db: State<'_, DatabaseConnection>,
    node_ids: Vec<String>,
) -> Result<(), String> {
    NodeRepo::delete_batch(&db, node_ids)
        .await
        .map_err(|e| e.to_string())
}
