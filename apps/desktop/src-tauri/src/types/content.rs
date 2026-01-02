//! Content DTO 和 Builder 定义
//!
//! 定义内容相关的数据传输对象（DTO）和 Builder 模式。
//! 与前端 TypeScript 的 ContentInterface 对应。

use serde::{Deserialize, Serialize};

// ============================================================================
// 请求 DTO（对应前端 ContentCreateInput, ContentUpdateInput）
// ============================================================================

/// 保存内容请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveContentRequest {
    pub node_id: String,
    pub content: String,
    pub expected_version: Option<i32>,
}

/// 创建内容请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateContentRequest {
    pub node_id: String,
    pub content: String,
}

/// 更新内容请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateContentRequest {
    pub content: String,
    pub expected_version: Option<i32>,
}

// ============================================================================
// 响应 DTO（对应前端 ContentInterface）
// ============================================================================

/// 内容响应
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentResponse {
    pub id: String,
    pub node_id: String,
    pub content: String,
    pub version: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Entity -> DTO 转换
impl From<crate::entity::content::Model> for ContentResponse {
    fn from(model: crate::entity::content::Model) -> Self {
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

// ============================================================================
// 不可变更新方法
// ============================================================================

impl ContentResponse {
    /// 不可变更新 - 返回新实例
    pub fn with_content(self, content: impl Into<String>) -> Self {
        Self {
            content: content.into(),
            ..self
        }
    }

    pub fn with_version(self, version: i32) -> Self {
        Self { version, ..self }
    }
}

// ============================================================================
// Builder 模式
// ============================================================================

/// Content Builder - 用于构建复杂的内容请求对象
#[derive(Debug, Clone, Default)]
pub struct ContentBuilder {
    node_id: Option<String>,
    content: Option<String>,
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
        })
    }

    /// 构建 CreateContentRequest
    pub fn build_create(self) -> Result<CreateContentRequest, String> {
        Ok(CreateContentRequest {
            node_id: self.node_id.ok_or("node_id is required")?,
            content: self.content.unwrap_or_default(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_builder() {
        let request = ContentBuilder::new()
            .node_id("node-123")
            .content(r#"{"root": {}}"#)
            .expected_version(1)
            .build()
            .unwrap();

        assert_eq!(request.node_id, "node-123");
        assert_eq!(request.content, r#"{"root": {}}"#);
        assert_eq!(request.expected_version, Some(1));
    }

    #[test]
    fn test_content_builder_missing_required() {
        let result = ContentBuilder::new()
            .content("some content")
            .build();

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "node_id is required");
    }

    #[test]
    fn test_content_response_with_methods() {
        let response = ContentResponse {
            id: "content-1".into(),
            node_id: "node-1".into(),
            content: "original".into(),
            version: 1,
            created_at: 0,
            updated_at: 0,
        };

        let updated = response.with_content("updated");
        assert_eq!(updated.content, "updated");
        assert_eq!(updated.id, "content-1"); // ID 不变
        assert_eq!(updated.version, 1); // 版本不变
    }
}
