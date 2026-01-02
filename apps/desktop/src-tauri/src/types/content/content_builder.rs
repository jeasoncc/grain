//! Content Builder
//!
//! 实现 Builder 模式用于创建 Content 请求对象。
//! 提供链式方法的流畅 API。

use super::content_interface::{
    ContentType, CreateContentRequest, SaveContentRequest, UpdateContentRequest,
};

// ============================================================================
// Content Builder
// ============================================================================

/// Content 请求 Builder
///
/// 提供流畅的 API 用于构建 Content 请求：
/// - 可选属性的合理默认值
/// - 方法链式调用，代码清晰易读
/// - build() 时进行校验
#[derive(Debug, Clone, Default)]
pub struct ContentBuilder {
    node_id: Option<String>,
    content: Option<String>,
    content_type: Option<ContentType>,
    expected_version: Option<i32>,
}

impl ContentBuilder {
    /// 创建新的 Builder
    pub fn new() -> Self {
        Self::default()
    }

    /// 设置节点 ID（必填）
    pub fn node_id(mut self, node_id: impl Into<String>) -> Self {
        self.node_id = Some(node_id.into());
        self
    }

    /// 设置内容
    pub fn content(mut self, content: impl Into<String>) -> Self {
        self.content = Some(content.into());
        self
    }

    /// 设置内容类型
    pub fn content_type(mut self, content_type: ContentType) -> Self {
        self.content_type = Some(content_type);
        self
    }

    /// 设置期望版本号（用于乐观锁）
    pub fn expected_version(mut self, version: i32) -> Self {
        self.expected_version = Some(version);
        self
    }

    /// 构建 SaveContentRequest
    pub fn build(self) -> Result<SaveContentRequest, String> {
        Ok(SaveContentRequest {
            node_id: self.node_id.ok_or("node_id is required")?,
            content: self.content.unwrap_or_default(),
            expected_version: self.expected_version,
            content_type: self.content_type,
        })
    }

    /// 构建 CreateContentRequest
    pub fn build_create(self) -> Result<CreateContentRequest, String> {
        Ok(CreateContentRequest {
            node_id: self.node_id.ok_or("node_id is required")?,
            content: self.content,
            content_type: self.content_type,
        })
    }

    /// 构建 UpdateContentRequest（用于更新操作）
    pub fn build_update(self) -> UpdateContentRequest {
        UpdateContentRequest {
            content: self.content,
            content_type: self.content_type,
            expected_version: self.expected_version,
        }
    }

    /// 重置 builder 到初始状态
    pub fn reset(mut self) -> Self {
        self.node_id = None;
        self.content = None;
        self.content_type = None;
        self.expected_version = None;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_builder_save() {
        let request = ContentBuilder::new()
            .node_id("node-123")
            .content(r#"{"root": {}}"#)
            .content_type(ContentType::Lexical)
            .expected_version(1)
            .build()
            .unwrap();

        assert_eq!(request.node_id, "node-123");
        assert_eq!(request.content, r#"{"root": {}}"#);
        assert_eq!(request.content_type, Some(ContentType::Lexical));
        assert_eq!(request.expected_version, Some(1));
    }

    #[test]
    fn test_content_builder_missing_required() {
        let result = ContentBuilder::new().content("some content").build();

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "node_id is required");
    }

    #[test]
    fn test_content_builder_create() {
        let request = ContentBuilder::new()
            .node_id("node-123")
            .content_type(ContentType::Excalidraw)
            .build_create()
            .unwrap();

        assert_eq!(request.node_id, "node-123");
        assert_eq!(request.content, None);
        assert_eq!(request.content_type, Some(ContentType::Excalidraw));
    }

    #[test]
    fn test_content_builder_update() {
        let request = ContentBuilder::new()
            .content("updated content")
            .expected_version(2)
            .build_update();

        assert_eq!(request.content, Some("updated content".into()));
        assert_eq!(request.expected_version, Some(2));
    }
}
