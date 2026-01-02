//! Workspace Tauri Commands
//!
//! 工作区相关的前端可调用命令

use crate::repo::WorkspaceRepo;
use crate::types::{CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceResponse};
use sea_orm::DatabaseConnection;
use tauri::State;

/// 获取所有工作区
#[tauri::command]
pub async fn get_workspaces(
    db: State<'_, DatabaseConnection>,
) -> Result<Vec<WorkspaceResponse>, String> {
    WorkspaceRepo::find_all(&db)
        .await
        .map(|workspaces| workspaces.into_iter().map(WorkspaceResponse::from).collect())
        .map_err(|e| e.to_string())
}

/// 获取单个工作区
#[tauri::command]
pub async fn get_workspace(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<Option<WorkspaceResponse>, String> {
    WorkspaceRepo::find_by_id(&db, &id)
        .await
        .map(|opt| opt.map(WorkspaceResponse::from))
        .map_err(|e| e.to_string())
}

/// 创建工作区
#[tauri::command]
pub async fn create_workspace(
    db: State<'_, DatabaseConnection>,
    request: CreateWorkspaceRequest,
) -> Result<WorkspaceResponse, String> {
    let id = uuid::Uuid::new_v4().to_string();

    // 使用 title 字段（前端使用 title，后端 Entity 使用 name）
    WorkspaceRepo::create(&db, id, request.title, request.description)
        .await
        .map(WorkspaceResponse::from)
        .map_err(|e| e.to_string())
}

/// 更新工作区
#[tauri::command]
pub async fn update_workspace(
    db: State<'_, DatabaseConnection>,
    id: String,
    request: UpdateWorkspaceRequest,
) -> Result<WorkspaceResponse, String> {
    // 使用 title 字段（前端使用 title，后端 Entity 使用 name）
    WorkspaceRepo::update(&db, &id, request.title, request.description)
        .await
        .map(WorkspaceResponse::from)
        .map_err(|e| e.to_string())
}

/// 删除工作区
#[tauri::command]
pub async fn delete_workspace(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<(), String> {
    WorkspaceRepo::delete(&db, &id)
        .await
        .map_err(|e| e.to_string())
}
