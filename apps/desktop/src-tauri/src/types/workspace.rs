//! Workspace DTO 和 Builder 定义
//!
//! 定义工作区相关的数据传输对象（DTO）和 Builder 模式。
//! 与前端 TypeScript 的 WorkspaceInterface 对应。

use serde::{Deserialize, Serialize};

// ============================================================================
// 请求 DTO（对应前端 WorkspaceCreateInput, WorkspaceUpdateInput）
// ============================================================================

/// 创建工作区请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceRequest {
    pub name: String,
    pub description: Option<String>,
}

/// 更新工作区请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkspaceRequest {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
}

// ============================================================================
// 响应 DTO（对应前端 WorkspaceInterface）
// ============================================================================

/// 工作区响应
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Entity -> DTO 转换
impl From<crate::entity::workspace::Model> for WorkspaceResponse {
    fn from(model: crate::entity::workspace::Model) -> Self {
        Self {
            id: model.id,
            name: model.name,
            description: model.description,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

// ============================================================================
// 不可变更新方法
// ============================================================================

impl WorkspaceResponse {
    /// 不可变更新 - 返回新实例
    pub fn with_name(self, name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            ..self
        }
    }

    pub fn with_description(self, description: Option<String>) -> Self {
        Self {
            description,
            ..self
        }
    }
}

// ============================================================================
// Builder 模式
// ============================================================================

/// Workspace Builder - 用于构建复杂的工作区请求对象
#[derive(Debug, Clone, Default)]
pub struct WorkspaceBuilder {
    name: Option<String>,
    description: Option<String>,
}

impl WorkspaceBuilder {
    /// 创建新的 Builder
    pub fn new() -> Self {
        Self::default()
    }

    /// 设置名称（必填）
    pub fn name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }

    /// 设置描述
    pub fn description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }

    /// 构建 CreateWorkspaceRequest
    pub fn build(self) -> Result<CreateWorkspaceRequest, String> {
        Ok(CreateWorkspaceRequest {
            name: self.name.ok_or("name is required")?,
            description: self.description,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_workspace_builder() {
        let request = WorkspaceBuilder::new()
            .name("My Workspace")
            .description("A test workspace")
            .build()
            .unwrap();

        assert_eq!(request.name, "My Workspace");
        assert_eq!(request.description, Some("A test workspace".into()));
    }

    #[test]
    fn test_workspace_builder_missing_required() {
        let result = WorkspaceBuilder::new()
            .description("Description only")
            .build();

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "name is required");
    }

    #[test]
    fn test_workspace_response_with_methods() {
        let response = WorkspaceResponse {
            id: "ws-1".into(),
            name: "Original".into(),
            description: None,
            created_at: 0,
            updated_at: 0,
        };

        let updated = response.with_name("Updated");
        assert_eq!(updated.name, "Updated");
        assert_eq!(updated.id, "ws-1"); // ID 不变
    }
}
