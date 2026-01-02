//! Workspace DTO 接口定义
//!
//! 定义工作区相关的数据传输对象（DTO）。
//! 与前端 TypeScript 的 WorkspaceInterface 对应。
//!
//! ## 字段映射（前端 → 后端）
//!
//! | 前端字段 | 后端字段 | 说明 |
//! |---------|---------|------|
//! | id | id | UUID |
//! | title | title | 标题（前端用 title，后端 entity 用 name） |
//! | author | author | 作者 |
//! | description | description | 描述 |
//! | publisher | publisher | 出版商 |
//! | language | language | 语言 |
//! | lastOpen | last_open | 最后打开时间 |
//! | createDate | created_at | 创建时间 |
//! | members | members | 团队成员 |
//! | owner | owner | 所有者 |

use serde::{Deserialize, Serialize};

// ============================================================================
// 请求 DTO（对应前端 WorkspaceCreateInput, WorkspaceUpdateInput）
// ============================================================================

/// 创建工作区请求
/// 对应前端 WorkspaceCreateInput
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceRequest {
    /// 工作区标题
    pub title: String,

    /// 作者名称
    pub author: Option<String>,

    /// 项目描述
    pub description: Option<String>,

    /// 出版商信息
    pub publisher: Option<String>,

    /// 项目语言（如 "zh", "en"）
    pub language: Option<String>,

    /// 团队成员（用户 ID 数组）
    pub members: Option<Vec<String>>,

    /// 所有者用户 ID
    pub owner: Option<String>,
}

/// 更新工作区请求
/// 对应前端 WorkspaceUpdateInput
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkspaceRequest {
    /// 工作区标题
    pub title: Option<String>,

    /// 作者名称
    pub author: Option<String>,

    /// 项目描述
    pub description: Option<Option<String>>,

    /// 出版商信息
    pub publisher: Option<String>,

    /// 项目语言
    pub language: Option<String>,

    /// 最后打开时间（毫秒时间戳）
    pub last_open: Option<i64>,

    /// 团队成员
    pub members: Option<Vec<String>>,

    /// 所有者用户 ID
    pub owner: Option<String>,
}

// ============================================================================
// 响应 DTO（对应前端 WorkspaceInterface）
// ============================================================================

/// 工作区响应
/// 对应前端 WorkspaceInterface
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceResponse {
    /// 工作区 ID
    pub id: String,

    /// 工作区标题（对应前端 title）
    pub title: String,

    /// 作者名称
    pub author: String,

    /// 项目描述
    pub description: String,

    /// 出版商信息
    pub publisher: String,

    /// 项目语言
    pub language: String,

    /// 最后打开时间（毫秒时间戳，对应前端 lastOpen）
    pub last_open: i64,

    /// 创建时间戳（毫秒，对应前端 createDate）
    pub created_at: i64,

    /// 更新时间戳（毫秒）
    pub updated_at: i64,

    /// 团队成员（用户 ID 数组）
    pub members: Option<Vec<String>>,

    /// 所有者用户 ID
    pub owner: Option<String>,
}

/// Entity -> DTO 转换
/// 注意：当前 Entity 缺少部分字段，使用默认值填充
impl From<crate::entity::workspace::Model> for WorkspaceResponse {
    fn from(model: crate::entity::workspace::Model) -> Self {
        Self {
            id: model.id,
            // Entity 使用 name，DTO 使用 title
            title: model.name,
            // 以下字段 Entity 中不存在，使用默认值
            author: String::new(),
            description: model.description.unwrap_or_default(),
            publisher: String::new(),
            language: "zh".to_string(),
            last_open: model.updated_at, // 使用 updated_at 作为 last_open
            created_at: model.created_at,
            updated_at: model.updated_at,
            members: None,
            owner: None,
        }
    }
}

// ============================================================================
// 不可变更新方法
// ============================================================================

impl WorkspaceResponse {
    /// 不可变更新 - 返回新实例
    pub fn with_title(self, title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
            ..self
        }
    }

    pub fn with_author(self, author: impl Into<String>) -> Self {
        Self {
            author: author.into(),
            ..self
        }
    }

    pub fn with_description(self, description: impl Into<String>) -> Self {
        Self {
            description: description.into(),
            ..self
        }
    }

    pub fn with_publisher(self, publisher: impl Into<String>) -> Self {
        Self {
            publisher: publisher.into(),
            ..self
        }
    }

    pub fn with_language(self, language: impl Into<String>) -> Self {
        Self {
            language: language.into(),
            ..self
        }
    }

    pub fn with_last_open(self, last_open: i64) -> Self {
        Self { last_open, ..self }
    }

    pub fn with_members(self, members: Option<Vec<String>>) -> Self {
        Self { members, ..self }
    }

    pub fn with_owner(self, owner: Option<String>) -> Self {
        Self { owner, ..self }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_workspace_response_with_methods() {
        let response = WorkspaceResponse {
            id: "ws-1".into(),
            title: "Original".into(),
            author: "".into(),
            description: "".into(),
            publisher: "".into(),
            language: "zh".into(),
            last_open: 0,
            created_at: 0,
            updated_at: 0,
            members: None,
            owner: None,
        };

        let updated = response.with_title("Updated").with_author("Author");
        assert_eq!(updated.title, "Updated");
        assert_eq!(updated.author, "Author");
        assert_eq!(updated.id, "ws-1"); // ID 不变
    }
}
