//! 通用输入类型
//!
//! 定义可复用的输入类型，避免为每个端点重复定义相似的输入结构。
//!
//! ## 命名规范
//!
//! - `XxxInput`: 单一参数输入
//! - `XxxWithBodyInput<T>`: 带 ID 和请求体的输入

use serde::Deserialize;

// ============================================================================
// 单一 ID 输入
// ============================================================================

/// 通用 ID 输入
///
/// 用于只需要一个 ID 参数的端点
///
/// ```rust,ignore
/// impl ApiEndpoint for GetWorkspace {
///     type Input = IdInput;
///     // ...
/// }
/// ```
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdInput {
    /// 资源 ID
    pub id: String,
}

impl IdInput {
    /// 创建新的 IdInput
    pub fn new(id: impl Into<String>) -> Self {
        Self { id: id.into() }
    }
}

// ============================================================================
// 工作区相关输入
// ============================================================================

/// 工作区 ID 输入
///
/// 用于需要工作区 ID 的端点
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceIdInput {
    /// 工作区 ID
    pub workspace_id: String,
}

impl WorkspaceIdInput {
    /// 创建新的 WorkspaceIdInput
    pub fn new(workspace_id: impl Into<String>) -> Self {
        Self {
            workspace_id: workspace_id.into(),
        }
    }
}

// ============================================================================
// 节点相关输入
// ============================================================================

/// 父节点 ID 输入
///
/// 用于获取子节点的端点
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParentIdInput {
    /// 父节点 ID
    pub parent_id: String,
}

impl ParentIdInput {
    /// 创建新的 ParentIdInput
    pub fn new(parent_id: impl Into<String>) -> Self {
        Self {
            parent_id: parent_id.into(),
        }
    }
}

/// 节点 ID 输入
///
/// 用于需要节点 ID 的端点
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeIdInput {
    /// 节点 ID
    pub node_id: String,
}

impl NodeIdInput {
    /// 创建新的 NodeIdInput
    pub fn new(node_id: impl Into<String>) -> Self {
        Self {
            node_id: node_id.into(),
        }
    }
}

/// 获取下一个排序顺序的输入
///
/// 用于 GetNextSortOrder 端点
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NextSortOrderInput {
    /// 工作区 ID
    pub workspace_id: String,

    /// 父节点 ID（null 表示根级别）
    pub parent_id: Option<String>,
}

impl NextSortOrderInput {
    /// 创建新的 NextSortOrderInput
    pub fn new(workspace_id: impl Into<String>, parent_id: Option<String>) -> Self {
        Self {
            workspace_id: workspace_id.into(),
            parent_id,
        }
    }
}

// ============================================================================
// 带请求体的输入
// ============================================================================

/// ID + 请求体输入
///
/// 用于更新操作，需要 ID 和请求体
///
/// ```rust,ignore
/// impl ApiEndpoint for UpdateWorkspace {
///     type Input = IdWithBodyInput<UpdateWorkspaceRequest>;
///     // ...
/// }
/// ```
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdWithBodyInput<T> {
    /// 资源 ID
    pub id: String,

    /// 请求体（使用 flatten 将字段展开）
    #[serde(flatten)]
    pub body: T,
}

impl<T> IdWithBodyInput<T> {
    /// 创建新的 IdWithBodyInput
    pub fn new(id: impl Into<String>, body: T) -> Self {
        Self {
            id: id.into(),
            body,
        }
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_id_input_deserialize() {
        let json = r#"{"id": "ws-123"}"#;
        let input: IdInput = serde_json::from_str(json).unwrap();
        assert_eq!(input.id, "ws-123");
    }

    #[test]
    fn test_workspace_id_input_deserialize() {
        let json = r#"{"workspaceId": "ws-123"}"#;
        let input: WorkspaceIdInput = serde_json::from_str(json).unwrap();
        assert_eq!(input.workspace_id, "ws-123");
    }

    #[test]
    fn test_parent_id_input_deserialize() {
        let json = r#"{"parentId": "node-123"}"#;
        let input: ParentIdInput = serde_json::from_str(json).unwrap();
        assert_eq!(input.parent_id, "node-123");
    }

    #[test]
    fn test_node_id_input_deserialize() {
        let json = r#"{"nodeId": "node-123"}"#;
        let input: NodeIdInput = serde_json::from_str(json).unwrap();
        assert_eq!(input.node_id, "node-123");
    }

    #[test]
    fn test_id_with_body_input_deserialize() {
        #[derive(Debug, Deserialize, PartialEq)]
        #[serde(rename_all = "camelCase")]
        struct TestBody {
            name: String,
        }

        let json = r#"{"id": "ws-123", "name": "Test"}"#;
        let input: IdWithBodyInput<TestBody> = serde_json::from_str(json).unwrap();
        assert_eq!(input.id, "ws-123");
        assert_eq!(input.body.name, "Test");
    }
}
