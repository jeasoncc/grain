//! Node Builder
//!
//! 实现 Builder 模式用于创建 Node 请求对象。
//! 提供链式方法的流畅 API。

use super::node_interface::{CreateNodeRequest, NodeType, UpdateNodeRequest};

// ============================================================================
// CreateNodeRequest Builder
// ============================================================================

/// Node 创建请求 Builder
///
/// 提供流畅的 API 用于构建 CreateNodeRequest：
/// - 可选属性的合理默认值
/// - 方法链式调用，代码清晰易读
/// - build() 时进行校验
#[derive(Debug, Clone, Default)]
pub struct NodeBuilder {
    workspace_id: Option<String>,
    parent_id: Option<String>,
    node_type: Option<NodeType>,
    title: Option<String>,
    sort_order: Option<i32>,
    is_collapsed: Option<bool>,
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
    pub fn parent_id(mut self, parent_id: impl Into<String>) -> Self {
        self.parent_id = Some(parent_id.into());
        self
    }

    /// 设置节点类型
    pub fn node_type(mut self, node_type: NodeType) -> Self {
        self.node_type = Some(node_type);
        self
    }

    /// 设置节点标题（必填）
    pub fn title(mut self, title: impl Into<String>) -> Self {
        self.title = Some(title.into());
        self
    }

    /// 设置排序顺序
    pub fn sort_order(mut self, sort_order: i32) -> Self {
        self.sort_order = Some(sort_order);
        self
    }

    /// 设置是否折叠
    pub fn is_collapsed(mut self, is_collapsed: bool) -> Self {
        self.is_collapsed = Some(is_collapsed);
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
            node_type: self.node_type,
            title: self.title.ok_or("title is required")?,
            sort_order: self.sort_order,
            is_collapsed: self.is_collapsed,
            tags: self.tags,
            initial_content: self.initial_content,
        })
    }

    /// 构建 UpdateNodeRequest（用于更新操作）
    pub fn build_update(self) -> UpdateNodeRequest {
        UpdateNodeRequest {
            parent_id: self.parent_id.map(Some),
            node_type: self.node_type,
            title: self.title,
            sort_order: self.sort_order,
            is_collapsed: self.is_collapsed,
            tags: self.tags,
        }
    }

    /// 重置 builder 到初始状态
    pub fn reset(mut self) -> Self {
        self.workspace_id = None;
        self.parent_id = None;
        self.node_type = None;
        self.title = None;
        self.sort_order = None;
        self.is_collapsed = None;
        self.tags = None;
        self.initial_content = None;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_node_builder_create() {
        let request = NodeBuilder::new()
            .workspace_id("ws-123")
            .title("My Node")
            .node_type(NodeType::File)
            .sort_order(0)
            .build()
            .unwrap();

        assert_eq!(request.workspace_id, "ws-123");
        assert_eq!(request.title, "My Node");
        assert_eq!(request.node_type, Some(NodeType::File));
        assert_eq!(request.sort_order, Some(0));
    }

    #[test]
    fn test_node_builder_missing_required() {
        // 缺少 workspace_id
        let result = NodeBuilder::new().title("My Node").build();
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "workspace_id is required");

        // 缺少 title
        let result = NodeBuilder::new().workspace_id("ws-123").build();
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "title is required");
    }

    #[test]
    fn test_node_builder_update() {
        let request = NodeBuilder::new()
            .title("Updated Title")
            .sort_order(5)
            .tags(vec!["tag1".into(), "tag2".into()])
            .build_update();

        assert_eq!(request.title, Some("Updated Title".into()));
        assert_eq!(request.sort_order, Some(5));
        assert_eq!(request.tags, Some(vec!["tag1".into(), "tag2".into()]));
    }
}
