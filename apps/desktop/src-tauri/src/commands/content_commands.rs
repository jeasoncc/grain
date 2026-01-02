//! Content Tauri Commands
//!
//! 内容相关的前端可调用命令
//!
//! 薄层设计：仅负责 Tauri State 注入和错误转换，
//! 所有业务逻辑委托给 rust_core

use rust_core::db::content_db_fn;
use rust_core::{ContentResponse, SaveContentRequest};
use sea_orm::DatabaseConnection;
use tauri::State;

/// 获取节点内容
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

/// 保存内容（创建或更新）
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

/// 获取内容版本号
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
