//! Workspace Tauri Commands
//!
//! 工作区相关的前端可调用命令

use crate::entity::workspace;
use crate::repo::WorkspaceRepo;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use tauri::State;

/// 创建工作区请求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceRequest {
    pub name: String,
    pub description: Option<String>,
}

/// 更新工作区请求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkspaceRequest {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
}

/// 工作区响应
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<workspace::Model> for WorkspaceResponse {
    fn from(model: workspace::Model) -> Self {
        Self {
            id: model.id,
            name: model.name,
            description: model.description,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

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

    WorkspaceRepo::create(&db, id, request.name, request.description)
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
    WorkspaceRepo::update(&db, &id, request.name, request.description)
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
