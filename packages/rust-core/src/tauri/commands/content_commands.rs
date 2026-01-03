//! Content Tauri Commands

use crate::db::content_db_fn;
use crate::{ContentResponse, SaveContentRequest};
use sea_orm::DatabaseConnection;
use tauri::State;

#[tauri::command]
pub async fn get_content(
    db: State<'_, DatabaseConnection>,
    node_id: String,
) -> Result<Option<ContentResponse>, String> {
    content_db_fn::find_by_node_id(&db, &node_id)
        .await
        .map(|opt| opt.map(ContentResponse::from))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_content(
    db: State<'_, DatabaseConnection>,
    request: SaveContentRequest,
) -> Result<ContentResponse, String> {
    let existing = content_db_fn::find_by_node_id(&db, &request.node_id)
        .await
        .map_err(|e| e.to_string())?;

    match existing {
        Some(_) => content_db_fn::update(
            &db,
            &request.node_id,
            request.content,
            request.expected_version,
        )
        .await
        .map(ContentResponse::from)
        .map_err(|e| e.to_string()),
        None => {
            let id = uuid::Uuid::new_v4().to_string();
            content_db_fn::create(&db, id, request.node_id, request.content)
                .await
                .map(ContentResponse::from)
                .map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
pub async fn get_content_version(
    db: State<'_, DatabaseConnection>,
    node_id: String,
) -> Result<Option<i32>, String> {
    content_db_fn::find_by_node_id(&db, &node_id)
        .await
        .map(|opt| opt.map(|c| c.version))
        .map_err(|e| e.to_string())
}
