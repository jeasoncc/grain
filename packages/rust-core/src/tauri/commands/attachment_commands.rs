//! Attachment Tauri Commands

use crate::db::attachment_db_fn;
use crate::{
    AttachmentResponse, AttachmentType, CreateAttachmentRequest, UpdateAttachmentRequest,
};
use sea_orm::DatabaseConnection;
use tauri::State;

#[tauri::command]
pub async fn get_attachments_by_project(
    db: State<'_, DatabaseConnection>,
    project_id: String,
) -> Result<Vec<AttachmentResponse>, String> {
    attachment_db_fn::find_by_project(&db, &project_id)
        .await
        .map(|attachments| {
            attachments
                .into_iter()
                .map(AttachmentResponse::from)
                .collect()
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_attachment(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<Option<AttachmentResponse>, String> {
    attachment_db_fn::find_by_id(&db, &id)
        .await
        .map(|opt| opt.map(AttachmentResponse::from))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_attachments_by_type(
    db: State<'_, DatabaseConnection>,
    project_id: String,
    attachment_type: AttachmentType,
) -> Result<Vec<AttachmentResponse>, String> {
    attachment_db_fn::find_by_type(&db, &project_id, attachment_type)
        .await
        .map(|attachments| {
            attachments
                .into_iter()
                .map(AttachmentResponse::from)
                .collect()
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_attachment_by_path(
    db: State<'_, DatabaseConnection>,
    file_path: String,
) -> Result<Option<AttachmentResponse>, String> {
    attachment_db_fn::find_by_path(&db, &file_path)
        .await
        .map(|opt| opt.map(AttachmentResponse::from))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_attachment(
    db: State<'_, DatabaseConnection>,
    request: CreateAttachmentRequest,
) -> Result<AttachmentResponse, String> {
    let id = uuid::Uuid::new_v4().to_string();
    attachment_db_fn::create(
        &db,
        id,
        request.project_id,
        request.attachment_type,
        request.file_name,
        request.file_path,
        request.size,
        request.mime_type,
    )
    .await
    .map(AttachmentResponse::from)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_attachment(
    db: State<'_, DatabaseConnection>,
    id: String,
    request: UpdateAttachmentRequest,
) -> Result<AttachmentResponse, String> {
    attachment_db_fn::update(
        &db,
        &id,
        request.file_name,
        request.file_path,
        request.size,
        request.mime_type,
    )
    .await
    .map(AttachmentResponse::from)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_attachment(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<(), String> {
    attachment_db_fn::delete(&db, &id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_attachments_by_project(
    db: State<'_, DatabaseConnection>,
    project_id: String,
) -> Result<u64, String> {
    attachment_db_fn::delete_by_project(&db, &project_id)
        .await
        .map_err(|e| e.to_string())
}
