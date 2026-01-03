//! Tag Tauri Commands

use crate::db::tag_db_fn;
use crate::{CreateTagRequest, TagResponse, UpdateTagRequest};
use sea_orm::DatabaseConnection;
use tauri::State;

#[tauri::command]
pub async fn get_tags_by_workspace(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
) -> Result<Vec<TagResponse>, String> {
    tag_db_fn::find_by_workspace(&db, &workspace_id)
        .await
        .map(|tags| tags.into_iter().map(TagResponse::from).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_tag(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<Option<TagResponse>, String> {
    tag_db_fn::find_by_id(&db, &id)
        .await
        .map(|opt| opt.map(TagResponse::from))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_tag_by_name(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
    name: String,
) -> Result<Option<TagResponse>, String> {
    tag_db_fn::find_by_name(&db, &workspace_id, &name)
        .await
        .map(|opt| opt.map(TagResponse::from))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_top_tags(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
    limit: u64,
) -> Result<Vec<TagResponse>, String> {
    tag_db_fn::find_top_tags(&db, &workspace_id, limit)
        .await
        .map(|tags| tags.into_iter().map(TagResponse::from).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_tag(
    db: State<'_, DatabaseConnection>,
    request: CreateTagRequest,
) -> Result<TagResponse, String> {
    let id = format!("{}:{}", request.workspace_id, request.name);
    tag_db_fn::create(&db, id, request.name, request.workspace_id)
        .await
        .map(TagResponse::from)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_tag(
    db: State<'_, DatabaseConnection>,
    id: String,
    request: UpdateTagRequest,
) -> Result<TagResponse, String> {
    tag_db_fn::update(&db, &id, request.name, request.count, request.last_used)
        .await
        .map(TagResponse::from)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_or_create_tag(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
    name: String,
) -> Result<TagResponse, String> {
    tag_db_fn::get_or_create(&db, &workspace_id, &name)
        .await
        .map(TagResponse::from)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn increment_tag_count(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<TagResponse, String> {
    tag_db_fn::increment_count(&db, &id)
        .await
        .map(TagResponse::from)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn decrement_tag_count(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<TagResponse, String> {
    tag_db_fn::decrement_count(&db, &id)
        .await
        .map(TagResponse::from)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_tag(db: State<'_, DatabaseConnection>, id: String) -> Result<(), String> {
    tag_db_fn::delete(&db, &id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_tags_by_workspace(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
) -> Result<u64, String> {
    tag_db_fn::delete_by_workspace(&db, &workspace_id)
        .await
        .map_err(|e| e.to_string())
}
