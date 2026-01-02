//! Content API 端点
//!
//! 内容相关的 API 端点实现。
//!
//! ## 端点列表
//!
//! | 端点 | 方法 | 路径 | 说明 |
//! |------|------|------|------|
//! | GetContent | GET | /api/nodes/:node_id/content | 获取节点内容 |
//! | SaveContent | POST | /api/content | 保存内容（创建或更新） |
//! | GetContentVersion | GET | /api/nodes/:node_id/content/version | 获取内容版本号 |

use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

use super::{ApiEndpoint, NodeIdInput};
use crate::db::content_db_fn;
use crate::types::content::{ContentResponse, SaveContentRequest};
use crate::AppResult;

// ============================================================================
// GetContent - 获取节点内容
// ============================================================================

/// 获取节点的内容
///
/// ## HTTP
/// - Method: GET
/// - Path: /api/nodes/:node_id/content
///
/// ## Tauri
/// - Command: get_content
///
/// ## 参数
/// - node_id: 节点 ID
///
/// ## 返回
/// - 成功: Option<ContentResponse>（找到返回 Some，未找到返回 None）
/// - 失败: DatabaseError
pub struct GetContent;

impl ApiEndpoint for GetContent {
    type Input = NodeIdInput;
    type Output = Option<ContentResponse>;
    const NAME: &'static str = "get_content";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        content_db_fn::find_by_node_id(db, &input.node_id)
            .await
            .map(|opt| opt.map(Into::into))
    }
}

// ============================================================================
// SaveContent - 保存内容
// ============================================================================

/// 保存内容（创建或更新）
///
/// ## HTTP
/// - Method: POST
/// - Path: /api/content
/// - Body: SaveContentRequest
///
/// ## Tauri
/// - Command: save_content
///
/// ## 参数
/// - node_id: 节点 ID（必填）
/// - content: 内容字符串（必填）
/// - expected_version: 期望版本号（可选，用于乐观锁）
/// - content_type: 内容类型（可选）
///
/// ## 返回
/// - 成功: ContentResponse
/// - 失败: NotFound, ValidationError（版本冲突）, DatabaseError
pub struct SaveContent;

impl ApiEndpoint for SaveContent {
    type Input = SaveContentRequest;
    type Output = ContentResponse;
    const NAME: &'static str = "save_content";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        // 检查是否已存在内容
        let existing = content_db_fn::find_by_node_id(db, &input.node_id).await?;

        match existing {
            Some(_) => {
                // 更新现有内容
                content_db_fn::update(db, &input.node_id, input.content, input.expected_version)
                    .await
                    .map(Into::into)
            }
            None => {
                // 创建新内容
                let id = uuid::Uuid::new_v4().to_string();
                content_db_fn::create(db, id, input.node_id, input.content)
                    .await
                    .map(Into::into)
            }
        }
    }
}

// ============================================================================
// GetContentVersion - 获取内容版本号
// ============================================================================

/// 内容版本响应
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentVersionResponse {
    /// 节点 ID
    pub node_id: String,
    /// 版本号（如果内容不存在则为 None）
    pub version: Option<i32>,
}

/// 获取内容版本号
///
/// ## HTTP
/// - Method: GET
/// - Path: /api/nodes/:node_id/content/version
///
/// ## Tauri
/// - Command: get_content_version
///
/// ## 参数
/// - node_id: 节点 ID
///
/// ## 返回
/// - 成功: ContentVersionResponse
/// - 失败: DatabaseError
pub struct GetContentVersion;

impl ApiEndpoint for GetContentVersion {
    type Input = NodeIdInput;
    type Output = ContentVersionResponse;
    const NAME: &'static str = "get_content_version";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        let content = content_db_fn::find_by_node_id(db, &input.node_id).await?;

        Ok(ContentVersionResponse {
            node_id: input.node_id,
            version: content.map(|c| c.version),
        })
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_utils::setup_test_db;
    use crate::db::{node_db_fn, workspace_db_fn};
    use crate::types::node::NodeType;

    async fn create_test_node(db: &DatabaseConnection) -> String {
        let workspace_id = uuid::Uuid::new_v4().to_string();
        workspace_db_fn::create(db, workspace_id.clone(), "测试工作区".to_string(), None)
            .await
            .unwrap();

        let node_id = uuid::Uuid::new_v4().to_string();
        node_db_fn::create(
            db,
            node_id.clone(),
            workspace_id,
            None,
            "测试节点".to_string(),
            NodeType::File,
            None,
        )
        .await
        .unwrap();

        node_id
    }

    /// Property 1: CRUD Round-Trip Consistency (Content)
    /// Feature: rust-api-macro, Property 1
    ///
    /// 保存内容后，通过节点 ID 获取应返回等价的内容
    #[tokio::test]
    async fn test_content_crud_round_trip() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        // 1. 保存内容
        let save_input = SaveContentRequest {
            node_id: node_id.clone(),
            content: r#"{"text": "hello world"}"#.to_string(),
            expected_version: None,
            content_type: None,
        };

        let saved = SaveContent::execute(&db, save_input).await.unwrap();
        assert_eq!(saved.node_id, node_id);
        assert_eq!(saved.content, r#"{"text": "hello world"}"#);
        assert_eq!(saved.version, 1);

        // 2. 通过节点 ID 获取
        let get_input = NodeIdInput::new(&node_id);
        let fetched = GetContent::execute(&db, get_input).await.unwrap();

        assert!(fetched.is_some());
        let fetched = fetched.unwrap();
        assert_eq!(fetched.node_id, saved.node_id);
        assert_eq!(fetched.content, saved.content);
        assert_eq!(fetched.version, saved.version);
    }

    #[tokio::test]
    async fn test_get_content_not_found() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        let input = NodeIdInput::new(&node_id);
        let result = GetContent::execute(&db, input).await.unwrap();

        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_save_content_create() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        let input = SaveContentRequest {
            node_id: node_id.clone(),
            content: "新内容".to_string(),
            expected_version: None,
            content_type: None,
        };

        let result = SaveContent::execute(&db, input).await.unwrap();

        assert_eq!(result.node_id, node_id);
        assert_eq!(result.content, "新内容");
        assert_eq!(result.version, 1);
    }

    #[tokio::test]
    async fn test_save_content_update() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        // 创建初始内容
        let create_input = SaveContentRequest {
            node_id: node_id.clone(),
            content: "原内容".to_string(),
            expected_version: None,
            content_type: None,
        };
        SaveContent::execute(&db, create_input).await.unwrap();

        // 更新内容
        let update_input = SaveContentRequest {
            node_id: node_id.clone(),
            content: "新内容".to_string(),
            expected_version: None,
            content_type: None,
        };
        let result = SaveContent::execute(&db, update_input).await.unwrap();

        assert_eq!(result.content, "新内容");
        assert_eq!(result.version, 2);
    }

    #[tokio::test]
    async fn test_save_content_optimistic_lock() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        // 创建初始内容
        let create_input = SaveContentRequest {
            node_id: node_id.clone(),
            content: "原内容".to_string(),
            expected_version: None,
            content_type: None,
        };
        SaveContent::execute(&db, create_input).await.unwrap();

        // 使用正确的版本号更新
        let update_input = SaveContentRequest {
            node_id: node_id.clone(),
            content: "新内容".to_string(),
            expected_version: Some(1),
            content_type: None,
        };
        let result = SaveContent::execute(&db, update_input).await;
        assert!(result.is_ok());

        // 使用错误的版本号更新（应该失败）
        let conflict_input = SaveContentRequest {
            node_id: node_id.clone(),
            content: "冲突内容".to_string(),
            expected_version: Some(1), // 版本已经是 2 了
            content_type: None,
        };
        let result = SaveContent::execute(&db, conflict_input).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_get_content_version() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        // 内容不存在时
        let input = NodeIdInput::new(&node_id);
        let result = GetContentVersion::execute(&db, input).await.unwrap();
        assert_eq!(result.node_id, node_id);
        assert!(result.version.is_none());

        // 创建内容
        let save_input = SaveContentRequest {
            node_id: node_id.clone(),
            content: "内容".to_string(),
            expected_version: None,
            content_type: None,
        };
        SaveContent::execute(&db, save_input).await.unwrap();

        // 内容存在时
        let input = NodeIdInput::new(&node_id);
        let result = GetContentVersion::execute(&db, input).await.unwrap();
        assert_eq!(result.node_id, node_id);
        assert_eq!(result.version, Some(1));
    }
}
