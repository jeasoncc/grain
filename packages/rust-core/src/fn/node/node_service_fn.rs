//! Node 服务纯函数
//!
//! 组合数据库操作的业务逻辑函数

use crate::db::{content_db_fn, node_db_fn};
use crate::r#fn::node::node_transform_fn;
use crate::types::error::{AppError, AppResult};
use crate::types::node::{node_entity, NodeType};
use sea_orm::DatabaseConnection;
use tracing::info;

// ============================================================================
// 组合业务函数
// ============================================================================

/// 创建节点并初始化内容
///
/// 对于非文件夹类型的节点，会同时创建空内容记录
pub async fn create_node_with_content(
    db: &DatabaseConnection,
    node_id: String,
    workspace_id: String,
    parent_id: Option<String>,
    title: String,
    node_type: NodeType,
    tags: Option<String>,
    initial_content: Option<String>,
) -> AppResult<node_entity::Model> {
    // 转换标题
    let title = node_transform_fn::transform_title(&title);

    // 创建节点
    let node = node_db_fn::create(
        db,
        node_id.clone(),
        workspace_id,
        parent_id,
        title,
        node_type.clone(),
        tags,
    )
    .await?;

    // 对于非文件夹类型，创建内容记录
    if node_transform_fn::node_type_needs_content(&node_type) {
        let content_id = uuid::Uuid::new_v4().to_string();
        let content = initial_content.unwrap_or_else(|| "{}".to_string());
        content_db_fn::create(db, content_id, node_id, content).await?;
    }

    info!("创建节点及内容: {} ({})", node.title, node.id);
    Ok(node)
}

/// 删除节点及其所有子节点
///
/// 递归删除所有子节点，然后删除节点本身
/// 内容会通过数据库外键级联删除
pub async fn delete_node_recursive(db: &DatabaseConnection, id: &str) -> AppResult<()> {
    // 先递归删除所有子节点
    let children = node_db_fn::find_children(db, id).await?;
    for child in children {
        Box::pin(delete_node_recursive(db, &child.id)).await?;
    }

    // 删除节点本身（内容会级联删除）
    node_db_fn::delete(db, id).await?;

    info!("递归删除节点: {}", id);
    Ok(())
}

/// 复制节点（包括内容）
pub async fn duplicate_node(
    db: &DatabaseConnection,
    source_id: &str,
    new_title: Option<String>,
) -> AppResult<node_entity::Model> {
    // 获取源节点
    let source = node_db_fn::find_by_id(db, source_id)
        .await?
        .ok_or_else(|| AppError::not_found(format!("Node: {}", source_id)))?;

    // 获取源内容
    let source_content = content_db_fn::find_by_node_id(db, source_id).await?;

    // 创建新节点
    let new_id = uuid::Uuid::new_v4().to_string();
    let title = new_title.unwrap_or_else(|| node_transform_fn::generate_copy_title(&source.title));

    let new_node = node_db_fn::create(
        db,
        new_id.clone(),
        source.workspace_id,
        source.parent_id,
        title,
        source.node_type,
        source.tags,
    )
    .await?;

    // 复制内容
    if let Some(content) = source_content {
        let content_id = uuid::Uuid::new_v4().to_string();
        content_db_fn::create(db, content_id, new_id, content.content).await?;
    }

    info!("复制节点: {} -> {}", source_id, new_node.id);
    Ok(new_node)
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

    #[tokio::test]
    async fn test_create_node_with_content_file() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        let result = create_node_with_content(
            &db,
            "node-1".to_string(),
            workspace_id,
            None,
            "  测试文件  ".to_string(), // 带空白的标题
            NodeType::File,
            None,
            Some(r#"{"text": "hello"}"#.to_string()),
        )
        .await;

        assert!(result.is_ok());
        let node = result.unwrap();
        assert_eq!(node.title, "测试文件"); // 空白已去除

        // 验证内容已创建
        let content = content_db_fn::find_by_node_id(&db, "node-1").await.unwrap();
        assert!(content.is_some());
        assert_eq!(content.unwrap().content, r#"{"text": "hello"}"#);
    }

    #[tokio::test]
    async fn test_create_node_with_content_folder() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        let result = create_node_with_content(
            &db,
            "folder-1".to_string(),
            workspace_id,
            None,
            "测试文件夹".to_string(),
            NodeType::Folder,
            None,
            None,
        )
        .await;

        assert!(result.is_ok());

        // 文件夹不应该有内容
        let content = content_db_fn::find_by_node_id(&db, "folder-1").await.unwrap();
        assert!(content.is_none());
    }

    #[tokio::test]
    async fn test_delete_node_recursive() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        // 创建父节点
        node_db_fn::create(
            &db,
            "parent".to_string(),
            workspace_id.clone(),
            None,
            "父节点".to_string(),
            NodeType::Folder,
            None,
        )
        .await
        .unwrap();

        // 创建子节点
        node_db_fn::create(
            &db,
            "child-1".to_string(),
            workspace_id.clone(),
            Some("parent".to_string()),
            "子节点1".to_string(),
            NodeType::File,
            None,
        )
        .await
        .unwrap();

        node_db_fn::create(
            &db,
            "child-2".to_string(),
            workspace_id,
            Some("parent".to_string()),
            "子节点2".to_string(),
            NodeType::File,
            None,
        )
        .await
        .unwrap();

        // 递归删除父节点
        let result = delete_node_recursive(&db, "parent").await;
        assert!(result.is_ok());

        // 验证所有节点都已删除
        assert!(node_db_fn::find_by_id(&db, "parent")
            .await
            .unwrap()
            .is_none());
        assert!(node_db_fn::find_by_id(&db, "child-1")
            .await
            .unwrap()
            .is_none());
        assert!(node_db_fn::find_by_id(&db, "child-2")
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn test_duplicate_node() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        // 创建源节点
        create_node_with_content(
            &db,
            "source".to_string(),
            workspace_id,
            None,
            "原始节点".to_string(),
            NodeType::File,
            Some(r#"["tag1"]"#.to_string()),
            Some("原始内容".to_string()),
        )
        .await
        .unwrap();

        // 复制节点
        let result = duplicate_node(&db, "source", None).await;

        assert!(result.is_ok());
        let new_node = result.unwrap();
        assert_eq!(new_node.title, "原始节点 (副本)");
        assert_ne!(new_node.id, "source");

        // 验证内容也被复制
        let content = content_db_fn::find_by_node_id(&db, &new_node.id)
            .await
            .unwrap();
        assert!(content.is_some());
        assert_eq!(content.unwrap().content, "原始内容");
    }

    #[tokio::test]
    async fn test_duplicate_node_with_custom_title() {
        let db = setup_test_db().await;
        let workspace_id = create_test_workspace(&db).await;

        // 创建源节点
        node_db_fn::create(
            &db,
            "source".to_string(),
            workspace_id,
            None,
            "原始节点".to_string(),
            NodeType::File,
            None,
        )
        .await
        .unwrap();

        // 复制节点并指定新标题
        let result = duplicate_node(&db, "source", Some("自定义标题".to_string())).await;

        assert!(result.is_ok());
        let new_node = result.unwrap();
        assert_eq!(new_node.title, "自定义标题");
    }

    #[tokio::test]
    async fn test_duplicate_node_not_found() {
        let db = setup_test_db().await;

        let result = duplicate_node(&db, "non-existent", None).await;

        assert!(result.is_err());
    }
}
