//! Tag 数据库函数
//!
//! 标签相关的 CRUD 操作

use crate::types::{TagActiveModel, TagColumn, TagEntity, TagModel};
use sea_orm::*;

// ============================================================================
// 查询操作
// ============================================================================

/// 获取工作区所有标签
pub async fn find_by_workspace(
    db: &DatabaseConnection,
    workspace_id: &str,
) -> Result<Vec<TagModel>, DbErr> {
    TagEntity::find()
        .filter(TagColumn::WorkspaceId.eq(workspace_id))
        .order_by_desc(TagColumn::Count)
        .all(db)
        .await
}

/// 按 ID 获取标签
pub async fn find_by_id(db: &DatabaseConnection, id: &str) -> Result<Option<TagModel>, DbErr> {
    TagEntity::find_by_id(id).one(db).await
}

/// 按名称获取标签（在工作区内）
pub async fn find_by_name(
    db: &DatabaseConnection,
    workspace_id: &str,
    name: &str,
) -> Result<Option<TagModel>, DbErr> {
    TagEntity::find()
        .filter(TagColumn::WorkspaceId.eq(workspace_id))
        .filter(TagColumn::Name.eq(name))
        .one(db)
        .await
}

/// 获取热门标签（按使用次数排序）
pub async fn find_top_tags(
    db: &DatabaseConnection,
    workspace_id: &str,
    limit: u64,
) -> Result<Vec<TagModel>, DbErr> {
    TagEntity::find()
        .filter(TagColumn::WorkspaceId.eq(workspace_id))
        .order_by_desc(TagColumn::Count)
        .limit(limit)
        .all(db)
        .await
}

// ============================================================================
// 写入操作
// ============================================================================

/// 创建标签
pub async fn create(
    db: &DatabaseConnection,
    id: String,
    name: String,
    workspace_id: String,
) -> Result<TagModel, DbErr> {
    let now = chrono::Utc::now().timestamp_millis();

    let model = TagActiveModel {
        id: Set(id),
        name: Set(name),
        workspace_id: Set(workspace_id),
        count: Set(1),
        last_used: Set(now),
        created_at: Set(now),
    };

    model.insert(db).await
}

/// 更新标签
pub async fn update(
    db: &DatabaseConnection,
    id: &str,
    name: Option<String>,
    count: Option<i32>,
    last_used: Option<i64>,
) -> Result<TagModel, DbErr> {
    let tag = TagEntity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(DbErr::RecordNotFound(format!("Tag {} not found", id)))?;

    let mut model: TagActiveModel = tag.into();

    if let Some(n) = name {
        model.name = Set(n);
    }
    if let Some(c) = count {
        model.count = Set(c);
    }
    if let Some(lu) = last_used {
        model.last_used = Set(lu);
    }

    model.update(db).await
}

/// 增加标签使用计数
pub async fn increment_count(db: &DatabaseConnection, id: &str) -> Result<TagModel, DbErr> {
    let tag = TagEntity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(DbErr::RecordNotFound(format!("Tag {} not found", id)))?;

    let now = chrono::Utc::now().timestamp_millis();
    let mut model: TagActiveModel = tag.into();
    model.count = Set(model.count.unwrap() + 1);
    model.last_used = Set(now);

    model.update(db).await
}

/// 减少标签使用计数
pub async fn decrement_count(db: &DatabaseConnection, id: &str) -> Result<TagModel, DbErr> {
    let tag = TagEntity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(DbErr::RecordNotFound(format!("Tag {} not found", id)))?;

    let new_count = (tag.count - 1).max(0);
    let mut model: TagActiveModel = tag.into();
    model.count = Set(new_count);

    model.update(db).await
}

/// 删除标签
pub async fn delete(db: &DatabaseConnection, id: &str) -> Result<(), DbErr> {
    TagEntity::delete_by_id(id).exec(db).await?;
    Ok(())
}

/// 删除工作区所有标签
pub async fn delete_by_workspace(db: &DatabaseConnection, workspace_id: &str) -> Result<u64, DbErr> {
    let result = TagEntity::delete_many()
        .filter(TagColumn::WorkspaceId.eq(workspace_id))
        .exec(db)
        .await?;
    Ok(result.rows_affected)
}

/// 获取或创建标签
pub async fn get_or_create(
    db: &DatabaseConnection,
    workspace_id: &str,
    name: &str,
) -> Result<TagModel, DbErr> {
    let id = format!("{}:{}", workspace_id, name);

    match find_by_id(db, &id).await? {
        Some(_tag) => {
            // 标签已存在，增加计数
            increment_count(db, &id).await
        }
        None => {
            // 创建新标签
            create(db, id, name.to_string(), workspace_id.to_string()).await
        }
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

    #[tokio::test]
    async fn test_tag_crud() {
        let db = setup_test_db().await;

        // 先创建工作区（外键约束）
        workspace_db_fn::create(&db, "ws-1".into(), "Test Workspace".into(), None)
            .await
            .unwrap();

        // 创建
        let tag = create(
            &db,
            "ws-1:rust".into(),
            "rust".into(),
            "ws-1".into(),
        )
        .await
        .unwrap();

        assert_eq!(tag.name, "rust");
        assert_eq!(tag.count, 1);

        // 查询
        let found = find_by_id(&db, "ws-1:rust").await.unwrap();
        assert!(found.is_some());

        // 增加计数
        let updated = increment_count(&db, "ws-1:rust").await.unwrap();
        assert_eq!(updated.count, 2);

        // 删除
        delete(&db, "ws-1:rust").await.unwrap();
        let deleted = find_by_id(&db, "ws-1:rust").await.unwrap();
        assert!(deleted.is_none());
    }

    #[tokio::test]
    async fn test_get_or_create() {
        let db = setup_test_db().await;

        // 先创建工作区（外键约束）
        workspace_db_fn::create(&db, "ws-1".into(), "Test Workspace".into(), None)
            .await
            .unwrap();

        // 第一次调用创建
        let tag1 = get_or_create(&db, "ws-1", "typescript").await.unwrap();
        assert_eq!(tag1.count, 1);

        // 第二次调用增加计数
        let tag2 = get_or_create(&db, "ws-1", "typescript").await.unwrap();
        assert_eq!(tag2.count, 2);
    }
}
