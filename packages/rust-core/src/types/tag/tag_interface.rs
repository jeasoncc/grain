//! Tag DTO 接口定义
//!
//! 定义标签相关的数据传输对象（DTO）

use serde::{Deserialize, Serialize};

// ============================================================================
// 请求 DTO
// ============================================================================

/// 创建标签请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTagRequest {
    /// 标签名称
    pub name: String,

    /// 所属工作区 ID
    pub workspace_id: String,
}

/// 更新标签请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTagRequest {
    /// 标签名称
    pub name: Option<String>,

    /// 使用计数
    pub count: Option<i32>,

    /// 最后使用时间戳（毫秒）
    pub last_used: Option<i64>,
}

// ============================================================================
// 响应 DTO
// ============================================================================

/// 标签响应
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagResponse {
    /// 标签 ID
    pub id: String,

    /// 标签名称
    pub name: String,

    /// 所属工作区 ID
    pub workspace_id: String,

    /// 使用计数
    pub count: i32,

    /// 最后使用时间戳（毫秒）
    pub last_used: i64,

    /// 创建时间戳（毫秒）
    pub created_at: i64,
}

/// Entity -> DTO 转换
impl From<super::tag_entity::Model> for TagResponse {
    fn from(model: super::tag_entity::Model) -> Self {
        Self {
            id: model.id,
            name: model.name,
            workspace_id: model.workspace_id,
            count: model.count,
            last_used: model.last_used,
            created_at: model.created_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tag_response_from_model() {
        let model = super::super::tag_entity::Model {
            id: "ws-1:rust".into(),
            name: "rust".into(),
            workspace_id: "ws-1".into(),
            count: 5,
            last_used: 1704067200000,
            created_at: 1704067200000,
        };

        let response = TagResponse::from(model);
        assert_eq!(response.id, "ws-1:rust");
        assert_eq!(response.name, "rust");
        assert_eq!(response.count, 5);
    }
}
