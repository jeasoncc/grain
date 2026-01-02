//! Node API 端点
//!
//! 节点相关的 API 端点实现。
//!
//! ## 端点列表
//!
//! | 端点 | 方法 | 路径 | 说明 |
//! |------|------|------|------|
//! | GetNodesByWorkspace | GET | /api/workspaces/:id/nodes | 获取工作区所有节点 |
//! | GetNode | GET | /api/nodes/:id | 获取单个节点 |
//! | GetRootNodes | GET | /api/workspaces/:id/nodes/root | 获取根节点 |
//! | GetChildNodes | GET | /api/nodes/:id/children | 获取子节点 |
//! | CreateNode | POST | /api/nodes | 创建节点 |
//! | UpdateNode | PUT | /api/nodes/:id | 更新节点 |
//! | MoveNode | PUT | /api/nodes/:id/move | 移动节点 |
//! | DeleteNode | DELETE | /api/nodes/:id | 删除节点 |

use sea_orm::DatabaseConnection;

use super::{ApiEndpoint, IdInput, IdWithBodyInput, NoOutput, ParentIdInput, WorkspaceIdInput};
use crate::db::node_db_fn;
use crate::types::node::{
    CreateNodeRequest, MoveNodeRequest, NodeResponse, NodeType, UpdateNodeRequest,
};
use crate::AppResult;

// ============================================================================
// GetNodesByWorkspace - 获取工作区所有节点
// ============================================================================

/// 获取工作区下的所有节点
///
/// ## HTTP
/// - Method: GET
/// - Path: /api/workspaces/:workspace_id/nodes
///
/// ## Tauri
/// - Command: get_nodes_by_workspace
///
/// ## 参数
/// - workspace_id: 工作区 ID
///
/// ## 返回
/// - 成功: Vec<NodeResponse>
/// - 失败: DatabaseError
pub struct GetNodesByWorkspace;

impl ApiEndpoint for GetNodesByWorkspace {
    type Input = WorkspaceIdInput;
    type Output = Vec<NodeResponse>;
    const NAME: &'static str = "get_nodes_by_workspace";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        node_db_fn::find_by_workspace(db, &input.workspace_id)
            .await
            .map(|v| v.into_iter().map(Into::into).collect())
    }
}

// ============================================================================
// GetNode - 获取单个节点
// ============================================================================

/// 获取单个节点
///
/// ## HTTP
/// - Method: GET
/// - Path: /api/nodes/:id
///
/// ## Tauri
/// - Command: get_node
///
/// ## 参数
/// - id: 节点 ID
///
/// ## 返回
/// - 成功: Option<NodeResponse>
/// - 失败: DatabaseError
pub struct GetNode;

impl ApiEndpoint for GetNode {
    type Input = IdInput;
    type Output = Option<NodeResponse>;
    const NAME: &'static str = "get_node";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        node_db_fn::find_by_id(db, &input.id)
            .await
            .map(|opt| opt.map(Into::into))
    }
}

// ============================================================================
// GetRootNodes - 获取根节点
// ============================================================================

/// 获取工作区的根节点（没有父节点的节点）
///
/// ## HTTP
/// - Method: GET
/// - Path: /api/workspaces/:workspace_id/nodes/root
///
/// ## Tauri
/// - Command: get_root_nodes
///
/// ## 参数
/// - workspace_id: 工作区 ID
///
/// ## 返回
/// - 成功: Vec<NodeResponse>
/// - 失败: DatabaseError
pub struct GetRootNodes;

impl ApiEndpoint for GetRootNodes {
    type Input = WorkspaceIdInput;
    type Output = Vec<NodeResponse>;
    const NAME: &'static str = "get_root_nodes";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        node_db_fn::find_root_nodes(db, &input.workspace_id)
            .await
            .map(|v| v.into_iter().map(Into::into).collect())
    }
}

// ============================================================================
// GetChildNodes - 获取子节点
// ============================================================================

/// 获取指定节点的子节点
///
/// ## HTTP
/// - Method: GET
/// - Path: /api/nodes/:parent_id/children
///
/// ## Tauri
/// - Command: get_child_nodes
///
/// ## 参数
/// - parent_id: 父节点 ID
///
/// ## 返回
/// - 成功: Vec<NodeResponse>
/// - 失败: DatabaseError
pub struct GetChildNodes;

impl ApiEndpoint for GetChildNodes {
    type Input = ParentIdInput;
    type Output = Vec<NodeResponse>;
    const NAME: &'static str = "get_child_nodes";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        node_db_fn::find_children(db, &input.parent_id)
            .await
            .map(|v| v.into_iter().map(Into::into).collect())
    }
}

// ============================================================================
// CreateNode - 创建节点
// ============================================================================

/// 创建节点
///
/// ## HTTP
/// - Method: POST
/// - Path: /api/nodes
/// - Body: CreateNodeRequest
///
/// ## Tauri
/// - Command: create_node
///
/// ## 参数
/// - workspace_id: 工作区 ID（必填）
/// - parent_id: 父节点 ID（可选，null 表示根节点）
/// - title: 节点标题（必填）
/// - node_type: 节点类型（可选，默认 "file"）
/// - sort_order: 排序顺序（可选）
/// - is_collapsed: 是否折叠（可选）
/// - tags: 标签数组（可选）
/// - initial_content: 初始内容（可选）
///
/// ## 返回
/// - 成功: NodeResponse
/// - 失败: DatabaseError, ValidationError
pub struct CreateNode;

impl ApiEndpoint for CreateNode {
    type Input = CreateNodeRequest;
    type Output = NodeResponse;
    const NAME: &'static str = "create_node";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        // 生成 UUID
        let id = uuid::Uuid::new_v4().to_string();

        // 序列化 tags
        let tags = input.tags.map(|t| serde_json::to_string(&t).unwrap());

        // 调用数据库函数创建
        node_db_fn::create(
            db,
            id,
            input.workspace_id,
            input.parent_id,
            input.title,
            input.node_type.unwrap_or(NodeType::File),
            tags,
        )
        .await
        .map(Into::into)
    }
}

// ============================================================================
// UpdateNode - 更新节点
// ============================================================================

/// 更新节点
///
/// ## HTTP
/// - Method: PUT
/// - Path: /api/nodes/:id
/// - Body: UpdateNodeRequest
///
/// ## Tauri
/// - Command: update_node
///
/// ## 参数
/// - id: 节点 ID（路径参数）
/// - title: 新标题（可选）
/// - is_collapsed: 是否折叠（可选）
/// - sort_order: 排序顺序（可选）
/// - tags: 标签数组（可选）
///
/// ## 返回
/// - 成功: NodeResponse
/// - 失败: NotFound, DatabaseError
pub struct UpdateNode;

impl ApiEndpoint for UpdateNode {
    type Input = IdWithBodyInput<UpdateNodeRequest>;
    type Output = NodeResponse;
    const NAME: &'static str = "update_node";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        // 序列化 tags
        let tags = input
            .body
            .tags
            .map(|t| Some(serde_json::to_string(&t).unwrap()));

        node_db_fn::update(
            db,
            &input.id,
            input.body.title,
            input.body.is_collapsed,
            input.body.sort_order,
            tags,
        )
        .await
        .map(Into::into)
    }
}

// ============================================================================
// MoveNode - 移动节点
// ============================================================================

/// 移动节点到新的父节点
///
/// ## HTTP
/// - Method: PUT
/// - Path: /api/nodes/:id/move
/// - Body: MoveNodeRequest
///
/// ## Tauri
/// - Command: move_node
///
/// ## 参数
/// - id: 节点 ID（路径参数）
/// - new_parent_id: 新的父节点 ID（null 表示移动到根级别）
/// - new_sort_order: 新的排序顺序
///
/// ## 返回
/// - 成功: NodeResponse
/// - 失败: NotFound, DatabaseError
pub struct MoveNode;

impl ApiEndpoint for MoveNode {
    type Input = IdWithBodyInput<MoveNodeRequest>;
    type Output = NodeResponse;
    const NAME: &'static str = "move_node";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        node_db_fn::move_node(
            db,
            &input.id,
            input.body.new_parent_id,
            input.body.new_sort_order,
        )
        .await
        .map(Into::into)
    }
}

// ============================================================================
// DeleteNode - 删除节点
// ============================================================================

/// 删除节点（级联删除子节点）
///
/// ## HTTP
/// - Method: DELETE
/// - Path: /api/nodes/:id
///
/// ## Tauri
/// - Command: delete_node
///
/// ## 参数
/// - id: 节点 ID
///
/// ## 返回
/// - 成功: ()
/// - 失败: NotFound, DatabaseError
pub struct DeleteNode;

impl ApiEndpoint for DeleteNode {
    type Input = IdInput;
    type Output = NoOutput;
    const NAME: &'static str = "delete_node";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        // 使用批量删除以确保级联删除子节点
        node_db_fn::delete_batch(db, vec![input.id]).await
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_utils::setup_test_db;
    use crate::db::workspace_db_fn;

    async fn create_test_workspace(db: &DatabaseConnection) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        workspace_db_fn::create(db, id.clone(), "测试工作区".to_string(), None)
            .await
            .unwrap();
        id
    }

    /// Property 1: CRUD Round-Trip Consistency (Node)
    /// Feature: rust-api-macro, Property 1
    ///
    /// 创建节点后，通过 ID 获取应返回等价的节点
    #[tokio::test]
    async fn test_node_crud_round_trip() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        // 1. 创建节点
        let create_input = CreateNodeRequest {
            workspace_id: workspace_id.clone(),
            parent_id: None,
            node_type: Some(NodeType::File),
            title: "测试节点".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: Some(vec!["tag1".to_string(), "tag2".to_string()]),
            initial_content: None,
        };

        let created = CreateNode::execute(&db, create_input).await.unwrap();
        assert_eq!(created.title, "测试节点");
        assert_eq!(created.node_type, NodeType::File);
        assert_eq!(created.tags, Some(vec!["tag1".to_string(), "tag2".to_string()]));

        // 2. 通过 ID 获取
        let get_input = IdInput::new(&created.id);
        let fetched = GetNode::execute(&db, get_input).await.unwrap();

        assert!(fetched.is_some());
        let fetched = fetched.unwrap();
        assert_eq!(fetched.id, created.id);
        assert_eq!(fetched.title, created.title);
        assert_eq!(fetched.node_type, created.node_type);
        assert_eq!(fetched.tags, created.tags);
    }

    #[tokio::test]
    async fn test_get_nodes_by_workspace() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        // 创建多个节点
        for i in 1..=3 {
            let input = CreateNodeRequest {
                workspace_id: workspace_id.clone(),
                parent_id: None,
                node_type: Some(NodeType::File),
                title: format!("节点 {}", i),
                sort_order: None,
                is_collapsed: None,
                tags: None,
                initial_content: None,
            };
            CreateNode::execute(&db, input).await.unwrap();
        }

        let input = WorkspaceIdInput::new(&workspace_id);
        let result = GetNodesByWorkspace::execute(&db, input).await.unwrap();
        assert_eq!(result.len(), 3);
    }

    #[tokio::test]
    async fn test_get_root_nodes() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        // 创建根节点
        let root_input = CreateNodeRequest {
            workspace_id: workspace_id.clone(),
            parent_id: None,
            node_type: Some(NodeType::Folder),
            title: "根文件夹".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: None,
            initial_content: None,
        };
        let root = CreateNode::execute(&db, root_input).await.unwrap();

        // 创建子节点
        let child_input = CreateNodeRequest {
            workspace_id: workspace_id.clone(),
            parent_id: Some(root.id.clone()),
            node_type: Some(NodeType::File),
            title: "子文件".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: None,
            initial_content: None,
        };
        CreateNode::execute(&db, child_input).await.unwrap();

        // 获取根节点
        let input = WorkspaceIdInput::new(&workspace_id);
        let result = GetRootNodes::execute(&db, input).await.unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].title, "根文件夹");
    }

    #[tokio::test]
    async fn test_get_child_nodes() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        // 创建父节点
        let parent_input = CreateNodeRequest {
            workspace_id: workspace_id.clone(),
            parent_id: None,
            node_type: Some(NodeType::Folder),
            title: "父文件夹".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: None,
            initial_content: None,
        };
        let parent = CreateNode::execute(&db, parent_input).await.unwrap();

        // 创建子节点
        for i in 1..=2 {
            let input = CreateNodeRequest {
                workspace_id: workspace_id.clone(),
                parent_id: Some(parent.id.clone()),
                node_type: Some(NodeType::File),
                title: format!("子文件 {}", i),
                sort_order: None,
                is_collapsed: None,
                tags: None,
                initial_content: None,
            };
            CreateNode::execute(&db, input).await.unwrap();
        }

        // 获取子节点
        let input = ParentIdInput::new(&parent.id);
        let result = GetChildNodes::execute(&db, input).await.unwrap();

        assert_eq!(result.len(), 2);
    }

    #[tokio::test]
    async fn test_update_node() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        // 创建节点
        let create_input = CreateNodeRequest {
            workspace_id,
            parent_id: None,
            node_type: Some(NodeType::File),
            title: "原标题".to_string(),
            sort_order: None,
            is_collapsed: Some(false),
            tags: None,
            initial_content: None,
        };
        let created = CreateNode::execute(&db, create_input).await.unwrap();

        // 更新节点
        let update_input = IdWithBodyInput::new(
            &created.id,
            UpdateNodeRequest {
                parent_id: None,
                node_type: None,
                title: Some("新标题".to_string()),
                sort_order: None,
                is_collapsed: Some(true),
                tags: Some(vec!["new-tag".to_string()]),
            },
        );
        let updated = UpdateNode::execute(&db, update_input).await.unwrap();

        assert_eq!(updated.id, created.id);
        assert_eq!(updated.title, "新标题");
        assert!(updated.is_collapsed);
        assert_eq!(updated.tags, Some(vec!["new-tag".to_string()]));
    }

    #[tokio::test]
    async fn test_move_node() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        // 创建两个文件夹
        let folder1_input = CreateNodeRequest {
            workspace_id: workspace_id.clone(),
            parent_id: None,
            node_type: Some(NodeType::Folder),
            title: "文件夹1".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: None,
            initial_content: None,
        };
        let folder1 = CreateNode::execute(&db, folder1_input).await.unwrap();

        let folder2_input = CreateNodeRequest {
            workspace_id: workspace_id.clone(),
            parent_id: None,
            node_type: Some(NodeType::Folder),
            title: "文件夹2".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: None,
            initial_content: None,
        };
        let folder2 = CreateNode::execute(&db, folder2_input).await.unwrap();

        // 创建文件在文件夹1下
        let file_input = CreateNodeRequest {
            workspace_id,
            parent_id: Some(folder1.id.clone()),
            node_type: Some(NodeType::File),
            title: "文件".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: None,
            initial_content: None,
        };
        let file = CreateNode::execute(&db, file_input).await.unwrap();

        // 移动文件到文件夹2
        let move_input = IdWithBodyInput::new(
            &file.id,
            MoveNodeRequest {
                new_parent_id: Some(folder2.id.clone()),
                new_sort_order: 0,
            },
        );
        let moved = MoveNode::execute(&db, move_input).await.unwrap();

        assert_eq!(moved.parent_id, Some(folder2.id));
        assert_eq!(moved.sort_order, 0);
    }

    #[tokio::test]
    async fn test_delete_node() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        // 创建节点
        let create_input = CreateNodeRequest {
            workspace_id,
            parent_id: None,
            node_type: Some(NodeType::File),
            title: "待删除".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: None,
            initial_content: None,
        };
        let created = CreateNode::execute(&db, create_input).await.unwrap();

        // 删除节点
        let delete_input = IdInput::new(&created.id);
        DeleteNode::execute(&db, delete_input).await.unwrap();

        // 验证已删除
        let get_input = IdInput::new(&created.id);
        let result = GetNode::execute(&db, get_input).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_delete_node_cascade() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        // 创建父节点
        let parent_input = CreateNodeRequest {
            workspace_id: workspace_id.clone(),
            parent_id: None,
            node_type: Some(NodeType::Folder),
            title: "父文件夹".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: None,
            initial_content: None,
        };
        let parent = CreateNode::execute(&db, parent_input).await.unwrap();

        // 创建子节点
        let child_input = CreateNodeRequest {
            workspace_id,
            parent_id: Some(parent.id.clone()),
            node_type: Some(NodeType::File),
            title: "子文件".to_string(),
            sort_order: None,
            is_collapsed: None,
            tags: None,
            initial_content: None,
        };
        let child = CreateNode::execute(&db, child_input).await.unwrap();

        // 删除父节点（应级联删除子节点）
        let delete_input = IdInput::new(&parent.id);
        DeleteNode::execute(&db, delete_input).await.unwrap();

        // 验证父节点已删除
        let get_parent = IdInput::new(&parent.id);
        assert!(GetNode::execute(&db, get_parent).await.unwrap().is_none());

        // 验证子节点也已删除
        let get_child = IdInput::new(&child.id);
        assert!(GetNode::execute(&db, get_child).await.unwrap().is_none());
    }
}
