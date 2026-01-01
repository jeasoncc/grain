//! Content Tauri Commands
//!
//! 内容相关的前端可调用命令

use crate::entity::content;
use crate::repo::ContentRepo;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use tauri::State;

/// 保存内容请求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveContentRequest {
    pub node_id: String,
    pub content: String,
    pub expected_version: Option<i32>,
}

/// 内容响应
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentResponse {
    pub id: String,
    pub node_id: String,
    pub content: String,
    pub version: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<content::Model> for ContentResponse {
    fn from(model: content::Model) -> Self {
        Self {
            id: model.id,
            node_id: model.node_id,
            content: model.content,
            version: model.version,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

/// 获取节点内容
#[tauri::command]
pub async fn get_content(
    db: State<'_, DatabaseConnection>,
    node_id: String,
) -> Result<Option<ContentResponse>, String> {
    ContentRepo::find_by_node_id(&db, &node_id)
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
    // 检查是否已存在内容
    let existing = ContentRepo::find_by_node_id(&db, &request.node_id)
        .await
        .map_err(|e| e.to_string())?;

    match existing {
        Some(_) => {
            // 更新现有内容
            ContentRepo::update(&db, &request.node_id, request.content, request.expected_version)
                .await
                .map(ContentResponse::from)
                .map_err(|e| e.to_string())
        }
        None => {
            // 创建新内容
            let id = uuid::Uuid::new_v4().to_string();
            ContentRepo::create(&db, id, request.node_id, request.content)
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
    ContentRepo::find_by_node_id(&db, &node_id)
        .await
        .map(|opt| opt.map(|c| c.version))
        .map_err(|e| e.to_string())
}
