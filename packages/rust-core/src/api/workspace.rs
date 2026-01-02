//! Workspace API 端点
//!
//! 工作区相关的 API 端点实现。
//!
//! ## 端点列表
//!
//! | 端点 | 方法 | 路径 | 说明 |
//! |------|------|------|------|
//! | GetWorkspaces | GET | /api/workspaces | 获取所有工作区 |
//! | GetWorkspace | GET | /api/workspaces/:id | 获取单个工作区 |
//! | CreateWorkspace | POST | /api/workspaces | 创建工作区 |
//! | UpdateWorkspace | PUT | /api/workspaces/:id | 更新工作区 |
//! | DeleteWorkspace | DELETE | /api/workspaces/:id | 删除工作区 |

use sea_orm::DatabaseConnection;

use super::{ApiEndpoint, IdInput, IdWithBodyInput, NoInput, NoOutput};
use crate::db::workspace_db_fn;
use crate::types::workspace::{CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceResponse};
use crate::AppResult;

// ============================================================================
// GetWorkspaces - 获取所有工作区
// ============================================================================

/// 获取所有工作区
///
/// ## HTTP
/// - Method: GET
/// - Path: /api/workspaces
///
/// ## Tauri
/// - Command: get_workspaces
///
/// ## 返回
/// - 成功: Vec<WorkspaceResponse>
/// - 失败: DatabaseError
pub struct GetWorkspaces;

impl ApiEndpoint for GetWorkspaces {
    type Input = NoInput;
    type Output = Vec<WorkspaceResponse>;
    const NAME: &'static str = "get_workspaces";

    async fn execute(db: &DatabaseConnection, _: Self::Input) -> AppResult<Self::Output> {
        workspace_db_fn::find_all(db)
            .await
            .map(|v| v.into_iter().map(Into::into).collect())
    }
}

// ============================================================================
// GetWorkspace - 获取单个工作区
// ============================================================================

/// 获取单个工作区
///
/// ## HTTP
/// - Method: GET
/// - Path: /api/workspaces/:id
///
/// ## Tauri
/// - Command: get_workspace
///
/// ## 参数
/// - id: 工作区 ID
///
/// ## 返回
/// - 成功: Option<WorkspaceResponse>（找到返回 Some，未找到返回 None）
/// - 失败: DatabaseError
pub struct GetWorkspace;

impl ApiEndpoint for GetWorkspace {
    type Input = IdInput;
    type Output = Option<WorkspaceResponse>;
    const NAME: &'static str = "get_workspace";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        workspace_db_fn::find_by_id(db, &input.id)
            .await
            .map(|opt| opt.map(Into::into))
    }
}

// ============================================================================
// CreateWorkspace - 创建工作区
// ============================================================================

/// 创建工作区
///
/// ## HTTP
/// - Method: POST
/// - Path: /api/workspaces
/// - Body: CreateWorkspaceRequest
///
/// ## Tauri
/// - Command: create_workspace
///
/// ## 参数
/// - title: 工作区标题（必填）
/// - author: 作者（可选）
/// - description: 描述（可选）
/// - publisher: 出版商（可选）
/// - language: 语言（可选）
/// - members: 成员列表（可选）
/// - owner: 所有者（可选）
///
/// ## 返回
/// - 成功: WorkspaceResponse
/// - 失败: DatabaseError, ValidationError
pub struct CreateWorkspace;

impl ApiEndpoint for CreateWorkspace {
    type Input = CreateWorkspaceRequest;
    type Output = WorkspaceResponse;
    const NAME: &'static str = "create_workspace";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        // 生成 UUID
        let id = uuid::Uuid::new_v4().to_string();

        // 调用数据库函数创建
        workspace_db_fn::create(db, id, input.title, input.description)
            .await
            .map(Into::into)
    }
}

// ============================================================================
// UpdateWorkspace - 更新工作区
// ============================================================================

/// 更新工作区
///
/// ## HTTP
/// - Method: PUT
/// - Path: /api/workspaces/:id
/// - Body: UpdateWorkspaceRequest
///
/// ## Tauri
/// - Command: update_workspace
///
/// ## 参数
/// - id: 工作区 ID（路径参数）
/// - title: 新标题（可选）
/// - author: 新作者（可选）
/// - description: 新描述（可选）
/// - 其他字段...
///
/// ## 返回
/// - 成功: WorkspaceResponse
/// - 失败: NotFound, DatabaseError
pub struct UpdateWorkspace;

impl ApiEndpoint for UpdateWorkspace {
    type Input = IdWithBodyInput<UpdateWorkspaceRequest>;
    type Output = WorkspaceResponse;
    const NAME: &'static str = "update_workspace";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        workspace_db_fn::update(db, &input.id, input.body.title, input.body.description)
            .await
            .map(Into::into)
    }
}

// ============================================================================
// DeleteWorkspace - 删除工作区
// ============================================================================

/// 删除工作区
///
/// ## HTTP
/// - Method: DELETE
/// - Path: /api/workspaces/:id
///
/// ## Tauri
/// - Command: delete_workspace
///
/// ## 参数
/// - id: 工作区 ID
///
/// ## 返回
/// - 成功: ()
/// - 失败: NotFound, DatabaseError
pub struct DeleteWorkspace;

impl ApiEndpoint for DeleteWorkspace {
    type Input = IdInput;
    type Output = NoOutput;
    const NAME: &'static str = "delete_workspace";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        workspace_db_fn::delete(db, &input.id).await
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_utils::setup_test_db;

    /// Property 1: CRUD Round-Trip Consistency (Workspace)
    /// Feature: rust-api-macro, Property 1
    ///
    /// 创建工作区后，通过 ID 获取应返回等价的工作区
    #[tokio::test]
    async fn test_workspace_crud_round_trip() {
        let db = setup_test_db().await;

        // 1. 创建工作区
        let create_input = CreateWorkspaceRequest {
            title: "测试工作区".to_string(),
            author: Some("测试作者".to_string()),
            description: Some("测试描述".to_string()),
            publisher: None,
            language: None,
            members: None,
            owner: None,
        };

        let created = CreateWorkspace::execute(&db, create_input).await.unwrap();
        assert_eq!(created.title, "测试工作区");
        assert_eq!(created.description, "测试描述");

        // 2. 通过 ID 获取
        let get_input = IdInput::new(&created.id);
        let fetched = GetWorkspace::execute(&db, get_input).await.unwrap();

        assert!(fetched.is_some());
        let fetched = fetched.unwrap();
        assert_eq!(fetched.id, created.id);
        assert_eq!(fetched.title, created.title);
        assert_eq!(fetched.description, created.description);
    }

    #[tokio::test]
    async fn test_get_workspaces_empty() {
        let db = setup_test_db().await;

        let result = GetWorkspaces::execute(&db, ()).await.unwrap();
        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn test_get_workspaces_multiple() {
        let db = setup_test_db().await;

        // 创建多个工作区
        for i in 1..=3 {
            let input = CreateWorkspaceRequest {
                title: format!("工作区 {}", i),
                author: None,
                description: None,
                publisher: None,
                language: None,
                members: None,
                owner: None,
            };
            CreateWorkspace::execute(&db, input).await.unwrap();
        }

        let result = GetWorkspaces::execute(&db, ()).await.unwrap();
        assert_eq!(result.len(), 3);
    }

    #[tokio::test]
    async fn test_get_workspace_not_found() {
        let db = setup_test_db().await;

        let input = IdInput::new("non-existent-id");
        let result = GetWorkspace::execute(&db, input).await.unwrap();

        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_update_workspace() {
        let db = setup_test_db().await;

        // 1. 创建
        let create_input = CreateWorkspaceRequest {
            title: "原标题".to_string(),
            author: None,
            description: None,
            publisher: None,
            language: None,
            members: None,
            owner: None,
        };
        let created = CreateWorkspace::execute(&db, create_input).await.unwrap();

        // 2. 更新
        let update_input = IdWithBodyInput::new(
            &created.id,
            UpdateWorkspaceRequest {
                title: Some("新标题".to_string()),
                author: None,
                description: Some(Some("新描述".to_string())),
                publisher: None,
                language: None,
                last_open: None,
                members: None,
                owner: None,
            },
        );
        let updated = UpdateWorkspace::execute(&db, update_input).await.unwrap();

        assert_eq!(updated.id, created.id);
        assert_eq!(updated.title, "新标题");
        assert_eq!(updated.description, "新描述");
    }

    #[tokio::test]
    async fn test_update_workspace_not_found() {
        let db = setup_test_db().await;

        let input = IdWithBodyInput::new(
            "non-existent-id",
            UpdateWorkspaceRequest {
                title: Some("新标题".to_string()),
                author: None,
                description: None,
                publisher: None,
                language: None,
                last_open: None,
                members: None,
                owner: None,
            },
        );
        let result = UpdateWorkspace::execute(&db, input).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_delete_workspace() {
        let db = setup_test_db().await;

        // 1. 创建
        let create_input = CreateWorkspaceRequest {
            title: "待删除".to_string(),
            author: None,
            description: None,
            publisher: None,
            language: None,
            members: None,
            owner: None,
        };
        let created = CreateWorkspace::execute(&db, create_input).await.unwrap();

        // 2. 删除
        let delete_input = IdInput::new(&created.id);
        DeleteWorkspace::execute(&db, delete_input).await.unwrap();

        // 3. 验证已删除
        let get_input = IdInput::new(&created.id);
        let result = GetWorkspace::execute(&db, get_input).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_delete_workspace_not_found() {
        let db = setup_test_db().await;

        let input = IdInput::new("non-existent-id");
        let result = DeleteWorkspace::execute(&db, input).await;

        assert!(result.is_err());
    }
}
