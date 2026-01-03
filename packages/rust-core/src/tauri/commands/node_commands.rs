//! Node Tauri Commands

use crate::db::node_db_fn;
use crate::r#fn::node::node_service_fn;
use crate::{CreateNodeRequest, MoveNodeRequest, NodeResponse, NodeType, UpdateNodeRequest};
use sea_orm::DatabaseConnection;
use tauri::State;

#[tauri::command]
pub async fn get_nodes_by_workspace(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
) -> Result<Vec<NodeResponse>, String> {
    node_db_fn::find_by_workspace(&db, &workspace_id)
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_node(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<Option<NodeResponse>, String> {
    node_db_fn::find_by_id(&db, &id)
        .await
        .map(|opt| opt.map(NodeResponse::from))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_child_nodes(
    db: State<'_, DatabaseConnection>,
    parent_id: String,
) -> Result<Vec<NodeResponse>, String> {
    node_db_fn::find_children(&db, &parent_id)
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_node(
    db: State<'_, DatabaseConnection>,
    request: CreateNodeRequest,
) -> Result<NodeResponse, String> {
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
    .map(NodeResponse::from)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_node(
    db: State<'_, DatabaseConnection>,
    id: String,
    request: UpdateNodeRequest,
) -> Result<NodeResponse, String> {
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
    .map(NodeResponse::from)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn move_node(
    db: State<'_, DatabaseConnection>,
    id: String,
    request: MoveNodeRequest,
) -> Result<NodeResponse, String> {
    node_db_fn::move_node(&db, &id, request.new_parent_id, request.new_sort_order)
        .await
        .map(NodeResponse::from)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_node(db: State<'_, DatabaseConnection>, id: String) -> Result<(), String> {
    node_service_fn::delete_node_recursive(&db, &id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn duplicate_node(
    db: State<'_, DatabaseConnection>,
    id: String,
    new_title: Option<String>,
) -> Result<NodeResponse, String> {
    node_service_fn::duplicate_node(&db, &id, new_title)
        .await
        .map(NodeResponse::from)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_root_nodes(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
) -> Result<Vec<NodeResponse>, String> {
    node_db_fn::find_root_nodes(&db, &workspace_id)
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_nodes_by_parent(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
    parent_id: Option<String>,
) -> Result<Vec<NodeResponse>, String> {
    node_db_fn::find_by_parent(&db, &workspace_id, parent_id.as_deref())
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_nodes_by_type(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
    node_type: String,
) -> Result<Vec<NodeResponse>, String> {
    let parsed_type: NodeType = node_type.parse().unwrap_or(NodeType::File);
    node_db_fn::find_by_type(&db, &workspace_id, parsed_type)
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_descendants(
    db: State<'_, DatabaseConnection>,
    node_id: String,
) -> Result<Vec<NodeResponse>, String> {
    node_db_fn::find_descendants(&db, &node_id)
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_next_sort_order(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
    parent_id: Option<String>,
) -> Result<i32, String> {
    node_db_fn::get_next_sort_order(&db, &workspace_id, parent_id.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn reorder_nodes(
    db: State<'_, DatabaseConnection>,
    node_ids: Vec<String>,
) -> Result<(), String> {
    node_db_fn::reorder_nodes(&db, node_ids)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_nodes_batch(
    db: State<'_, DatabaseConnection>,
    node_ids: Vec<String>,
) -> Result<(), String> {
    node_db_fn::delete_batch(&db, node_ids)
        .await
        .map_err(|e| e.to_string())
}
