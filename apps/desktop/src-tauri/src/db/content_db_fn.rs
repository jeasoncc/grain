//! Content 数据库函数
//!
//! 封装内容相关的数据库操作

use crate::types::content::{content_entity as content, ContentEntity as Content};
use crate::types::error::{AppError, AppResult};
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use tracing::info;

// ============================================================================
// 查询函数
// ============================================================================

/// 根据 ID 查询内容
pub async fn find_by_id(db: &DatabaseConnection, id: &str) -> AppResult<Option<content::Model>> {
    let content = Content::find_by_id(id).one(db).await?;
    Ok(content)
}

/// 根据节点 ID 查询内容
pub async fn find_by_node_id(
    db: &DatabaseConnection,
    node_id: &str,
) -> AppResult<Option<content::Model>> {
    let content = Content::find()
        .filter(content::Column::NodeId.eq(node_id))
        .one(db)
        .await?;
    Ok(content)
}

// ============================================================================
// 创建函数
// ============================================================================

/// 创建内容
pub async fn create(
    db: &DatabaseConnection,
    id: String,
    node_id: String,
    content_text: String,
) -> AppResult<content::Model> {
    let now = chrono::Utc::now().timestamp_millis();

    let model = content::ActiveModel {
        id: Set(id),
        node_id: Set(node_id.clone()),
        content: Set(content_text),
        version: Set(1),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let content = model.insert(db).await?;
    info!("创建内容: node_id={}", node_id);
    Ok(content)
}

// ============================================================================
// 更新函数
// ============================================================================

/// 更新内容（带乐观锁）
pub async fn update(
    db: &DatabaseConnection,
    node_id: &str,
    content_text: String,
    expected_version: Option<i32>,
) -> AppResult<content::Model> {
    let existing = find_by_node_id(db, node_id)
        .await?
        .ok_or_else(|| AppError::NotFound {
            entity: "Content".to_string(),
            id: node_id.to_string(),
        })?;

    // 乐观锁检查
    if let Some(expected) = expected_version {
        if existing.version != expected {
            return Err(AppError::ValidationError(format!(
                "版本冲突: 期望版本 {}, 实际版本 {}",
                expected, existing.version
            )));
        }
    }

    let now = chrono::Utc::now().timestamp_millis();
    let new_version = existing.version + 1;

    let mut model: content::ActiveModel = existing.into();
    model.content = Set(content_text);
    model.version = Set(new_version);
    model.updated_at = Set(now);

    let content = model.update(db).await?;
    info!("更新内容: node_id={}, version={}", node_id, new_version);
    Ok(content)
}

/// 创建或更新内容（upsert）
pub async fn upsert(
    db: &DatabaseConnection,
    id: String,
    node_id: String,
    content_text: String,
) -> AppResult<content::Model> {
    match find_by_node_id(db, &node_id).await? {
        Some(_) => update(db, &node_id, content_text, None).await,
        None => create(db, id, node_id, content_text).await,
    }
}

// ============================================================================
// 删除函数
// ============================================================================

/// 删除内容
pub async fn delete(db: &DatabaseConnection, id: &str) -> AppResult<()> {
    let result = Content::delete_by_id(id).exec(db).await?;

    if result.rows_affected == 0 {
        return Err(AppError::NotFound {
            entity: "Content".to_string(),
            id: id.to_string(),
        });
    }

    info!("删除内容: {}", id);
    Ok(())
}

/// 根据节点 ID 删除内容
pub async fn delete_by_node_id(db: &DatabaseConnection, node_id: &str) -> AppResult<()> {
    Content::delete_many()
        .filter(content::Column::NodeId.eq(node_id))
        .exec(db)
        .await?;

    info!("删除节点内容: node_id={}", node_id);
    Ok(())
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_utils::setup_test_db;
    use crate::db::{node_db_fn, workspace_db_fn};
    use crate::types::node::NodeType;

    async fn create_test_node(db: &DatabaseConnection) -> String {
        let workspace_id = uuid::Uuid::new_v4().to_string();
        workspace_db_fn::create(db, workspace_id.clone(), "测试工作区".to_string(), None)
            .await
            .unwrap();

        let node_id = uuid::Uuid::new_v4().to_string();
        node_db_fn::create(
            db,
            node_id.clone(),
            workspace_id,
            None,
            "测试节点".to_string(),
            NodeType::File,
            None,
        )
        .await
        .unwrap();

        node_id
    }

    #[tokio::test]
    async fn test_create_content() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        let result = create(
            &db,
            "content-1".to_string(),
            node_id.clone(),
            r#"{"text": "hello"}"#.to_string(),
        )
        .await;

        assert!(result.is_ok());
        let content = result.unwrap();
        assert_eq!(content.id, "content-1");
        assert_eq!(content.node_id, node_id);
        assert_eq!(content.version, 1);
    }

    #[tokio::test]
    async fn test_find_by_id_not_found() {
        let db = setup_test_db().await;

        let result = find_by_id(&db, "non-existent").await;

        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_find_by_node_id() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        create(
            &db,
            "content-1".to_string(),
            node_id.clone(),
            "test".to_string(),
        )
        .await
        .unwrap();

        let result = find_by_node_id(&db, &node_id).await;

        assert!(result.is_ok());
        let content = result.unwrap();
        assert!(content.is_some());
        assert_eq!(content.unwrap().content, "test");
    }

    #[tokio::test]
    async fn test_update_content() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        create(
            &db,
            "content-1".to_string(),
            node_id.clone(),
            "原内容".to_string(),
        )
        .await
        .unwrap();

        let result = update(&db, &node_id, "新内容".to_string(), None).await;

        assert!(result.is_ok());
        let content = result.unwrap();
        assert_eq!(content.content, "新内容");
        assert_eq!(content.version, 2);
    }

    #[tokio::test]
    async fn test_update_content_with_version_check() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        create(
            &db,
            "content-1".to_string(),
            node_id.clone(),
            "原内容".to_string(),
        )
        .await
        .unwrap();

        // 正确的版本号
        let result = update(&db, &node_id, "新内容".to_string(), Some(1)).await;
        assert!(result.is_ok());

        // 错误的版本号
        let result = update(&db, &node_id, "更新内容".to_string(), Some(1)).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_upsert_create() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        let result = upsert(
            &db,
            "content-1".to_string(),
            node_id.clone(),
            "内容".to_string(),
        )
        .await;

        assert!(result.is_ok());
        let content = result.unwrap();
        assert_eq!(content.version, 1);
    }

    #[tokio::test]
    async fn test_upsert_update() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        // 先创建
        create(
            &db,
            "content-1".to_string(),
            node_id.clone(),
            "原内容".to_string(),
        )
        .await
        .unwrap();

        // upsert 应该更新
        let result = upsert(
            &db,
            "content-2".to_string(), // 不同的 ID
            node_id.clone(),
            "新内容".to_string(),
        )
        .await;

        assert!(result.is_ok());
        let content = result.unwrap();
        assert_eq!(content.content, "新内容");
        assert_eq!(content.version, 2);
    }

    #[tokio::test]
    async fn test_delete_content() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        create(
            &db,
            "content-1".to_string(),
            node_id,
            "内容".to_string(),
        )
        .await
        .unwrap();

        let result = delete(&db, "content-1").await;
        assert!(result.is_ok());

        let found = find_by_id(&db, "content-1").await.unwrap();
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn test_delete_by_node_id() {
        let db = setup_test_db().await;
        let node_id = create_test_node(&db).await;

        create(
            &db,
            "content-1".to_string(),
            node_id.clone(),
            "内容".to_string(),
        )
        .await
        .unwrap();

        let result = delete_by_node_id(&db, &node_id).await;
        assert!(result.is_ok());

        let found = find_by_node_id(&db, &node_id).await.unwrap();
        assert!(found.is_none());
    }
}
