//! Workspace 数据库函数
//!
//! 封装工作区相关的数据库操作

use crate::types::error::{AppError, AppResult};
use crate::types::workspace::{workspace_entity as workspace, WorkspaceEntity as Workspace};
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, Set};
use tracing::info;

// ============================================================================
// 查询函数
// ============================================================================

/// 根据 ID 查询工作区
pub async fn find_by_id(db: &DatabaseConnection, id: &str) -> AppResult<Option<workspace::Model>> {
    let workspace = Workspace::find_by_id(id).one(db).await?;
    Ok(workspace)
}

/// 查询所有工作区
pub async fn find_all(db: &DatabaseConnection) -> AppResult<Vec<workspace::Model>> {
    let workspaces = Workspace::find().all(db).await?;
    Ok(workspaces)
}

// ============================================================================
// 创建函数
// ============================================================================

/// 创建工作区
pub async fn create(
    db: &DatabaseConnection,
    id: String,
    name: String,
    description: Option<String>,
) -> AppResult<workspace::Model> {
    let now = chrono::Utc::now().timestamp_millis();

    let model = workspace::ActiveModel {
        id: Set(id),
        name: Set(name.clone()),
        description: Set(description),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let workspace = model.insert(db).await?;
    info!("创建工作区: {} ({})", workspace.name, workspace.id);
    Ok(workspace)
}

// ============================================================================
// 更新函数
// ============================================================================

/// 更新工作区
pub async fn update(
    db: &DatabaseConnection,
    id: &str,
    name: Option<String>,
    description: Option<Option<String>>,
) -> AppResult<workspace::Model> {
    let existing = find_by_id(db, id).await?.ok_or_else(|| AppError::NotFound {
        entity: "Workspace".to_string(),
        id: id.to_string(),
    })?;

    let now = chrono::Utc::now().timestamp_millis();

    let mut model: workspace::ActiveModel = existing.into();
    model.updated_at = Set(now);

    if let Some(name) = name {
        model.name = Set(name);
    }
    if let Some(desc) = description {
        model.description = Set(desc);
    }

    let workspace = model.update(db).await?;
    info!("更新工作区: {} ({})", workspace.name, workspace.id);
    Ok(workspace)
}

// ============================================================================
// 删除函数
// ============================================================================

/// 删除工作区
pub async fn delete(db: &DatabaseConnection, id: &str) -> AppResult<()> {
    let result = Workspace::delete_by_id(id).exec(db).await?;

    if result.rows_affected == 0 {
        return Err(AppError::NotFound {
            entity: "Workspace".to_string(),
            id: id.to_string(),
        });
    }

    info!("删除工作区: {}", id);
    Ok(())
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_utils::setup_test_db;

    #[tokio::test]
    async fn test_create_workspace() {
        let db = setup_test_db().await;

        let result = create(
            &db,
            "ws-1".to_string(),
            "测试工作区".to_string(),
            Some("描述".to_string()),
        )
        .await;

        assert!(result.is_ok());
        let workspace = result.unwrap();
        assert_eq!(workspace.id, "ws-1");
        assert_eq!(workspace.name, "测试工作区");
        assert_eq!(workspace.description, Some("描述".to_string()));
    }

    #[tokio::test]
    async fn test_find_by_id_not_found() {
        let db = setup_test_db().await;

        let result = find_by_id(&db, "non-existent").await;

        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_find_by_id_found() {
        let db = setup_test_db().await;

        // 先创建
        create(&db, "ws-1".to_string(), "测试".to_string(), None)
            .await
            .unwrap();

        // 再查找
        let result = find_by_id(&db, "ws-1").await;

        assert!(result.is_ok());
        let workspace = result.unwrap();
        assert!(workspace.is_some());
        assert_eq!(workspace.unwrap().name, "测试");
    }

    #[tokio::test]
    async fn test_find_all() {
        let db = setup_test_db().await;

        // 创建多个工作区
        create(&db, "ws-1".to_string(), "工作区1".to_string(), None)
            .await
            .unwrap();
        create(&db, "ws-2".to_string(), "工作区2".to_string(), None)
            .await
            .unwrap();

        let result = find_all(&db).await;

        assert!(result.is_ok());
        let workspaces = result.unwrap();
        assert_eq!(workspaces.len(), 2);
    }

    #[tokio::test]
    async fn test_update_workspace() {
        let db = setup_test_db().await;

        // 先创建
        create(&db, "ws-1".to_string(), "原名称".to_string(), None)
            .await
            .unwrap();

        // 更新
        let result = update(&db, "ws-1", Some("新名称".to_string()), None).await;

        assert!(result.is_ok());
        let workspace = result.unwrap();
        assert_eq!(workspace.name, "新名称");
    }

    #[tokio::test]
    async fn test_update_workspace_not_found() {
        let db = setup_test_db().await;

        let result = update(&db, "non-existent", Some("新名称".to_string()), None).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_delete_workspace() {
        let db = setup_test_db().await;

        // 先创建
        create(&db, "ws-1".to_string(), "测试".to_string(), None)
            .await
            .unwrap();

        // 删除
        let result = delete(&db, "ws-1").await;
        assert!(result.is_ok());

        // 验证已删除
        let found = find_by_id(&db, "ws-1").await.unwrap();
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn test_delete_workspace_not_found() {
        let db = setup_test_db().await;

        let result = delete(&db, "non-existent").await;

        assert!(result.is_err());
    }
}
