//! 事务 API 端点
//!
//! 需要事务支持的复合操作端点。
//!
//! ## 端点列表
//!
//! | 端点 | 方法 | 路径 | 说明 |
//! |------|------|------|------|
//! | CreateNodeWithContent | POST | /api/nodes/with-content | 事务创建节点和内容 |
//! | DeleteNodeRecursive | DELETE | /api/nodes/:id/recursive | 事务删除节点及后代 |

use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};
use serde::{Deserialize, Serialize};

use super::{ApiEndpoint, IdInput, NoOutput};
use crate::types::content::{content_entity as content, ContentEntity as Content, ContentResponse};
use crate::types::node::{node_entity as node, NodeEntity as Node, NodeResponse, NodeType};
use crate::AppError;
use crate::AppResult;

// ============================================================================
// CreateNodeWithContent - 事务创建节点和内容
// ============================================================================

/// 创建节点和内容的请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNodeWithContentRequest {
    /// 所属工作区 ID
    pub workspace_id: String,

    /// 父节点 ID（根节点为 null）
    pub parent_id: Option<String>,

    /// 节点类型（默认 "file"）
    #[serde(default)]
    pub node_type: Option<NodeType>,

    /// 节点标题
    pub title: String,

    /// 排序顺序（默认 0）
    pub sort_order: Option<i32>,

    /// 是否折叠（默认 true）
    pub is_collapsed: Option<bool>,

    /// 标签数组
    pub tags: Option<Vec<String>>,

    /// 初始内容（必填）
    pub content: String,
}

/// 创建节点和内容的响应
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNodeWithContentResponse {
    /// 创建的节点
    pub node: NodeResponse,
    /// 创建的内容
    pub content: ContentResponse,
}

/// 事务创建节点和内容
///
/// ## HTTP
/// - Method: POST
/// - Path: /api/nodes/with-content
/// - Body: CreateNodeWithContentRequest
///
/// ## Tauri
/// - Command: create_node_with_content
///
/// ## 事务保证
/// - 节点和内容在同一事务中创建
/// - 如果任一操作失败，整个事务回滚
///
/// ## 参数
/// - workspace_id: 工作区 ID（必填）
/// - parent_id: 父节点 ID（可选）
/// - title: 节点标题（必填）
/// - content: 初始内容（必填）
/// - 其他节点属性...
///
/// ## 返回
/// - 成功: CreateNodeWithContentResponse
/// - 失败: DatabaseError, ValidationError
pub struct CreateNodeWithContent;

impl ApiEndpoint for CreateNodeWithContent {
    type Input = CreateNodeWithContentRequest;
    type Output = CreateNodeWithContentResponse;
    const NAME: &'static str = "create_node_with_content";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        // 开启事务
        let txn = db.begin().await?;

        // 生成 ID
        let node_id = uuid::Uuid::new_v4().to_string();
        let content_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();

        // 序列化 tags
        let tags = input.tags.map(|t| serde_json::to_string(&t).unwrap());

        // 计算排序顺序
        let sort_order = {
            let siblings = match &input.parent_id {
                Some(pid) => {
                    Node::find()
                        .filter(node::Column::ParentId.eq(pid))
                        .order_by_asc(node::Column::SortOrder)
                        .all(&txn)
                        .await?
                }
                None => {
                    Node::find()
                        .filter(node::Column::WorkspaceId.eq(&input.workspace_id))
                        .filter(node::Column::ParentId.is_null())
                        .order_by_asc(node::Column::SortOrder)
                        .all(&txn)
                        .await?
                }
            };
            siblings.iter().map(|n| n.sort_order).max().unwrap_or(-1) + 1
        };

        // 1. 创建节点
        let node_model = node::ActiveModel {
            id: Set(node_id.clone()),
            workspace_id: Set(input.workspace_id),
            parent_id: Set(input.parent_id),
            title: Set(input.title),
            node_type: Set(input.node_type.unwrap_or(NodeType::File)),
            is_collapsed: Set(input.is_collapsed.unwrap_or(false)),
            sort_order: Set(sort_order),
            tags: Set(tags),
            created_at: Set(now),
            updated_at: Set(now),
        };
        let node_result = node_model.insert(&txn).await?;

        // 2. 创建内容
        let content_model = content::ActiveModel {
            id: Set(content_id),
            node_id: Set(node_id),
            content: Set(input.content),
            version: Set(1),
            created_at: Set(now),
            updated_at: Set(now),
        };
        let content_result = content_model.insert(&txn).await?;

        // 3. 提交事务
        txn.commit().await?;

        Ok(CreateNodeWithContentResponse {
            node: node_result.into(),
            content: content_result.into(),
        })
    }
}

// ============================================================================
// DeleteNodeRecursive - 事务删除节点及后代
// ============================================================================

/// 事务删除节点及其所有后代
///
/// ## HTTP
/// - Method: DELETE
/// - Path: /api/nodes/:id/recursive
///
/// ## Tauri
/// - Command: delete_node_recursive
///
/// ## 事务保证
/// - 节点及其所有后代在同一事务中删除
/// - 如果任一操作失败，整个事务回滚
///
/// ## 参数
/// - id: 节点 ID
///
/// ## 返回
/// - 成功: ()
/// - 失败: NotFound, DatabaseError
pub struct DeleteNodeRecursive;

impl ApiEndpoint for DeleteNodeRecursive {
    type Input = IdInput;
    type Output = NoOutput;
    const NAME: &'static str = "delete_node_recursive";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        // 开启事务
        let txn = db.begin().await?;

        // 获取所有后代节点（递归）
        let mut descendants = Vec::new();
        let mut stack = vec![input.id.clone()];

        while let Some(current_id) = stack.pop() {
            let children = Node::find()
                .filter(node::Column::ParentId.eq(&current_id))
                .all(&txn)
                .await?;
            for child in children {
                stack.push(child.id.clone());
                descendants.push(child);
            }
        }

        // 删除所有后代节点的内容
        for descendant in &descendants {
            Content::delete_many()
                .filter(content::Column::NodeId.eq(&descendant.id))
                .exec(&txn)
                .await?;
        }

        // 删除目标节点的内容
        Content::delete_many()
            .filter(content::Column::NodeId.eq(&input.id))
            .exec(&txn)
            .await?;

        // 删除所有后代节点（从叶子节点开始）
        for descendant in descendants.iter().rev() {
            Node::delete_by_id(&descendant.id).exec(&txn).await?;
        }

        // 删除目标节点
        let result = Node::delete_by_id(&input.id).exec(&txn).await?;

        if result.rows_affected == 0 {
            return Err(AppError::not_found(format!("Node {}", input.id)));
        }

        // 提交事务
        txn.commit().await?;

        Ok(())
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::{GetContent, GetNode, NodeIdInput};
    use crate::db::test_utils::setup_test_db;
    use crate::db::workspace_db_fn;

    async fn create_test_workspace(db: &DatabaseConnection) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        workspace_db_fn::create(db, id.clone(), "测试工作区".to_string(), None)
            .await
            .unwrap();
        id
    }

    /// Property 2: Transaction Atomicity
    /// Feature: rust-api-macro, Property 2
    ///
    /// CreateNodeWithContent 成功后，节点和内容都应存在
    #[tokio::test]
    async fn test_create_node_with_content_success() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        let input = CreateNodeWithContentRequest {
            workspace_id,
            parent_id: None,
            node_type: Some(NodeType::File),
            title: "测试节点".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: Some(vec!["tag1".to_string()]),
            content: r#"{"text": "hello"}"#.to_string(),
        };

        let result = CreateNodeWithContent::execute(&db, input).await.unwrap();

        // 验证节点存在
        let node_input = IdInput::new(&result.node.id);
        let node = GetNode::execute(&db, node_input).await.unwrap();
        assert!(node.is_some());
        assert_eq!(node.unwrap().title, "测试节点");

        // 验证内容存在
        let content_input = NodeIdInput::new(&result.node.id);
        let content = GetContent::execute(&db, content_input).await.unwrap();
        assert!(content.is_some());
        assert_eq!(content.unwrap().content, r#"{"text": "hello"}"#);
    }

    /// Property 2: Transaction Atomicity
    /// Feature: rust-api-macro, Property 2
    ///
    /// DeleteNodeRecursive 成功后，节点及其后代都应不存在
    #[tokio::test]
    async fn test_delete_node_recursive_success() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        // 创建父节点和内容
        let parent_input = CreateNodeWithContentRequest {
            workspace_id: workspace_id.clone(),
            parent_id: None,
            node_type: Some(NodeType::Folder),
            title: "父文件夹".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: None,
            content: "{}".to_string(),
        };
        let parent = CreateNodeWithContent::execute(&db, parent_input)
            .await
            .unwrap();

        // 创建子节点和内容
        let child_input = CreateNodeWithContentRequest {
            workspace_id,
            parent_id: Some(parent.node.id.clone()),
            node_type: Some(NodeType::File),
            title: "子文件".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: None,
            content: r#"{"text": "child"}"#.to_string(),
        };
        let child = CreateNodeWithContent::execute(&db, child_input)
            .await
            .unwrap();

        // 删除父节点（应级联删除子节点）
        let delete_input = IdInput::new(&parent.node.id);
        DeleteNodeRecursive::execute(&db, delete_input)
            .await
            .unwrap();

        // 验证父节点不存在
        let parent_check = IdInput::new(&parent.node.id);
        assert!(GetNode::execute(&db, parent_check).await.unwrap().is_none());

        // 验证子节点不存在
        let child_check = IdInput::new(&child.node.id);
        assert!(GetNode::execute(&db, child_check).await.unwrap().is_none());

        // 验证父节点内容不存在
        let parent_content_check = NodeIdInput::new(&parent.node.id);
        assert!(GetContent::execute(&db, parent_content_check)
            .await
            .unwrap()
            .is_none());

        // 验证子节点内容不存在
        let child_content_check = NodeIdInput::new(&child.node.id);
        assert!(GetContent::execute(&db, child_content_check)
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn test_delete_node_recursive_not_found() {
        let db = setup_test_db().await;

        let input = IdInput::new("non-existent-id");
        let result = DeleteNodeRecursive::execute(&db, input).await;

        assert!(result.is_err());
    }
}
