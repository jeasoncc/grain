//! Workspace Tauri Commands

use crate::db::workspace_db_fn;
use crate::{CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceResponse};
use sea_orm::DatabaseConnection;
use tauri::State;

#[tauri::command]
pub async fn get_workspaces(
    db: State<'_, DatabaseConnection>,
) -> Result<Vec<WorkspaceResponse>, String> {
    workspace_db_fn::find_all(&db)
        .await
        .map(|workspaces| workspaces.into_iter().map(WorkspaceResponse::from).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_workspace(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<Option<WorkspaceResponse>, String> {
    workspace_db_fn::find_by_id(&db, &id)
        .await
        .map(|opt| opt.map(WorkspaceResponse::from))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_workspace(
    db: State<'_, DatabaseConnection>,
    request: CreateWorkspaceRequest,
) -> Result<WorkspaceResponse, String> {
    let id = uuid::Uuid::new_v4().to_string();
    workspace_db_fn::create(&db, id, request.title, request.description)
        .await
        .map(WorkspaceResponse::from)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_workspace(
    db: State<'_, DatabaseConnection>,
    id: String,
    request: UpdateWorkspaceRequest,
) -> Result<WorkspaceResponse, String> {
    workspace_db_fn::update(&db, &id, request.title, request.description)
        .await
        .map(WorkspaceResponse::from)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_workspace(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<(), String> {
    workspace_db_fn::delete(&db, &id)
        .await
        .map_err(|e| e.to_string())
}
