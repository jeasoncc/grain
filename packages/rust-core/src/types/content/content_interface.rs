//! Content DTO 接口定义
//!
//! 定义内容相关的数据传输对象（DTO）。
//! 与前端 TypeScript 的 ContentInterface 对应。
//!
//! ## 字段映射（前端 → 后端）
//!
//! | 前端字段 | 后端字段 | 说明 |
//! |---------|---------|------|
//! | id | id | UUID |
//! | nodeId | node_id | 关联节点 ID |
//! | content | content | 内容字符串 |
//! | contentType | content_type | 内容类型 |
//! | lastEdit | updated_at | 更新时间 |
//! | - | version | 版本号（后端独有，用于乐观锁） |

use serde::{Deserialize, Serialize};

// ============================================================================
// 内容类型枚举
// ============================================================================

/// 内容类型
/// 对应前端 ContentType: "lexical" | "excalidraw" | "text"
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ContentType {
    /// Lexical 编辑器 JSON
    Lexical,
    /// Excalidraw 绘图 JSON
    Excalidraw,
    /// 纯文本
    Text,
}

impl Default for ContentType {
    fn default() -> Self {
        Self::Lexical
    }
}

impl std::fmt::Display for ContentType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ContentType::Lexical => write!(f, "lexical"),
            ContentType::Excalidraw => write!(f, "excalidraw"),
            ContentType::Text => write!(f, "text"),
        }
    }
}

impl std::str::FromStr for ContentType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "lexical" => Ok(ContentType::Lexical),
            "excalidraw" => Ok(ContentType::Excalidraw),
            "text" => Ok(ContentType::Text),
            _ => Err(format!("未知的内容类型: {}", s)),
        }
    }
}

// ============================================================================
// 请求 DTO（对应前端 ContentCreateInput, ContentUpdateInput）
// ============================================================================

/// 保存内容请求（创建或更新）
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveContentRequest {
    /// 关联的节点 ID
    pub node_id: String,

    /// 内容字符串
    pub content: String,

    /// 期望版本号（用于乐观锁）
    pub expected_version: Option<i32>,

    /// 内容类型
    pub content_type: Option<ContentType>,
}

/// 创建内容请求
/// 对应前端 ContentCreateInput
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateContentRequest {
    /// 关联的节点 ID
    pub node_id: String,

    /// 内容字符串（默认空字符串）
    pub content: Option<String>,

    /// 内容类型（默认 lexical）
    pub content_type: Option<ContentType>,
}

/// 更新内容请求
/// 对应前端 ContentUpdateInput
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateContentRequest {
    /// 内容字符串
    pub content: Option<String>,

    /// 内容类型
    pub content_type: Option<ContentType>,

    /// 期望版本号（用于乐观锁）
    pub expected_version: Option<i32>,
}

// ============================================================================
// 响应 DTO（对应前端 ContentInterface）
// ============================================================================

/// 内容响应
/// 对应前端 ContentInterface
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentResponse {
    /// 内容 ID
    pub id: String,

    /// 关联的节点 ID
    pub node_id: String,

    /// 内容字符串
    pub content: String,

    /// 内容类型
    pub content_type: ContentType,

    /// 版本号（用于乐观锁）
    pub version: i32,

    /// 创建时间戳（毫秒）
    pub created_at: i64,

    /// 更新时间戳（毫秒，对应前端 lastEdit）
    pub updated_at: i64,
}

/// Entity -> DTO 转换
/// 注意：当前 Entity 缺少 content_type 字段，使用默认值
impl From<super::content_entity::Model> for ContentResponse {
    fn from(model: super::content_entity::Model) -> Self {
        Self {
            id: model.id,
            node_id: model.node_id,
            content: model.content,
            // Entity 中不存在 content_type，使用默认值
            content_type: ContentType::Lexical,
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

    pub fn with_content_type(self, content_type: ContentType) -> Self {
        Self {
            content_type,
            ..self
        }
    }

    pub fn with_version(self, version: i32) -> Self {
        Self { version, ..self }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_type_display() {
        assert_eq!(ContentType::Lexical.to_string(), "lexical");
        assert_eq!(ContentType::Excalidraw.to_string(), "excalidraw");
        assert_eq!(ContentType::Text.to_string(), "text");
    }

    #[test]
    fn test_content_type_from_str() {
        assert_eq!(
            "lexical".parse::<ContentType>().unwrap(),
            ContentType::Lexical
        );
        assert_eq!(
            "excalidraw".parse::<ContentType>().unwrap(),
            ContentType::Excalidraw
        );
        assert_eq!("text".parse::<ContentType>().unwrap(), ContentType::Text);
    }

    #[test]
    fn test_content_response_with_methods() {
        let response = ContentResponse {
            id: "content-1".into(),
            node_id: "node-1".into(),
            content: "original".into(),
            content_type: ContentType::Lexical,
            version: 1,
            created_at: 0,
            updated_at: 0,
        };

        let updated = response.with_content("updated").with_version(2);
        assert_eq!(updated.content, "updated");
        assert_eq!(updated.version, 2);
        assert_eq!(updated.id, "content-1"); // ID 不变
    }
}
