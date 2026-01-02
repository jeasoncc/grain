//! Node DTO 和 Builder 定义
//!
//! 定义节点相关的数据传输对象（DTO）和 Builder 模式。
//! 与前端 TypeScript 的 NodeInterface 对应。

use serde::{Deserialize, Serialize};

// ============================================================================
// 请求 DTO（对应前端 NodeCreateInput, NodeUpdateInput）
// ============================================================================

/// 创建节点请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNodeRequest {
    pub workspace_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub node_type: String,
    pub tags: Option<Vec<String>>,
    pub initial_content: Option<String>,
}

/// 更新节点请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNodeRequest {
    pub title: Option<String>,
    pub is_collapsed: Option<bool>,
    pub sort_order: Option<i32>,
    pub tags: Option<Option<Vec<String>>>,
}

/// 移动节点请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveNodeRequest {
    pub new_parent_id: Option<String>,
    pub new_sort_order: i32,
}

// ============================================================================
// 响应 DTO（对应前端 NodeInterface）
// ============================================================================

/// 节点响应
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeResponse {
    pub id: String,
    pub workspace_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub node_type: String,
    pub is_collapsed: bool,
    pub sort_order: i32,
    pub tags: Option<Vec<String>>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Entity -> DTO 转换
impl From<crate::entity::node::Model> for NodeResponse {
    fn from(model: crate::entity::node::Model) -> Self {
        let tags = model.tags.and_then(|t| serde_json::from_str(&t).ok());
        Self {
            id: model.id,
            workspace_id: model.workspace_id,
            parent_id: model.parent_id,
            title: model.title,
            node_type: model.node_type.to_string(),
            is_collapsed: model.is_collapsed,
            sort_order: model.sort_order,
            tags,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

// ============================================================================
// 不可变更新方法
// ============================================================================

impl NodeResponse {
    /// 不可变更新 - 返回新实例
    pub fn with_title(self, title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
            ..self
        }
    }

    pub fn with_collapsed(self, collapsed: bool) -> Self {
        Self {
            is_collapsed: collapsed,
            ..self
        }
    }

    pub fn with_tags(self, tags: Option<Vec<String>>) -> Self {
        Self { tags, ..self }
    }

    pub fn with_sort_order(self, sort_order: i32) -> Self {
        Self { sort_order, ..self }
    }

    pub fn with_parent_id(self, parent_id: Option<String>) -> Self {
        Self { parent_id, ..self }
    }
}

// ============================================================================
// Builder 模式
// ============================================================================

/// Node Builder - 用于构建复杂的节点请求对象
#[derive(Debug, Clone, Default)]
pub struct NodeBuilder {
    workspace_id: Option<String>,
    parent_id: Option<String>,
    title: Option<String>,
    node_type: Option<String>,
    tags: Option<Vec<String>>,
    initial_content: Option<String>,
}

impl NodeBuilder {
    /// 创建新的 Builder
    pub fn new() -> Self {
        Self::default()
    }

    /// 设置工作区 ID（必填）
    pub fn workspace_id(mut self, workspace_id: impl Into<String>) -> Self {
        self.workspace_id = Some(workspace_id.into());
        self
    }

    /// 设置父节点 ID
    pub fn parent_id(mut self, parent_id: Option<String>) -> Self {
        self.parent_id = parent_id;
        self
    }

    /// 设置标题（必填）
    pub fn title(mut self, title: impl Into<String>) -> Self {
        self.title = Some(title.into());
        self
    }

    /// 设置节点类型（必填）
    pub fn node_type(mut self, node_type: impl Into<String>) -> Self {
        self.node_type = Some(node_type.into());
        self
    }

    /// 设置标签
    pub fn tags(mut self, tags: Vec<String>) -> Self {
        self.tags = Some(tags);
        self
    }

    /// 设置初始内容
    pub fn initial_content(mut self, content: impl Into<String>) -> Self {
        self.initial_content = Some(content.into());
        self
    }

    /// 构建 CreateNodeRequest
    pub fn build(self) -> Result<CreateNodeRequest, String> {
        Ok(CreateNodeRequest {
            workspace_id: self.workspace_id.ok_or("workspace_id is required")?,
            parent_id: self.parent_id,
            title: self.title.ok_or("title is required")?,
            node_type: self.node_type.unwrap_or_else(|| "file".to_string()),
            tags: self.tags,
            initial_content: self.initial_content,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_node_builder() {
        let request = NodeBuilder::new()
            .workspace_id("ws-123")
            .title("My Note")
            .node_type("file")
            .tags(vec!["tag1".into(), "tag2".into()])
            .build()
            .unwrap();

        assert_eq!(request.workspace_id, "ws-123");
        assert_eq!(request.title, "My Note");
        assert_eq!(request.node_type, "file");
        assert_eq!(request.tags, Some(vec!["tag1".into(), "tag2".into()]));
    }

    #[test]
    fn test_node_builder_missing_required() {
        let result = NodeBuilder::new()
            .title("My Note")
            .build();

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "workspace_id is required");
    }

    #[test]
    fn test_node_response_with_methods() {
        let response = NodeResponse {
            id: "node-1".into(),
            workspace_id: "ws-1".into(),
            parent_id: None,
            title: "Original".into(),
            node_type: "file".into(),
            is_collapsed: false,
            sort_order: 0,
            tags: None,
            created_at: 0,
            updated_at: 0,
        };

        let updated = response.with_title("Updated");
        assert_eq!(updated.title, "Updated");
        assert_eq!(updated.id, "node-1"); // ID 不变
    }
}
