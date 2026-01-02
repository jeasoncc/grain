//! Attachment 数据库函数
//!
//! 附件相关的 CRUD 操作

use crate::types::{AttachmentActiveModel, AttachmentColumn, AttachmentEntity, AttachmentModel, AttachmentType};
use sea_orm::*;

// ============================================================================
// 查询操作
// ============================================================================

/// 获取项目所有附件
pub async fn find_by_project(
    db: &DatabaseConnection,
    project_id: &str,
) -> Result<Vec<AttachmentModel>, DbErr> {
    AttachmentEntity::find()
        .filter(AttachmentColumn::ProjectId.eq(project_id))
        .order_by_desc(AttachmentColumn::UploadedAt)
        .all(db)
        .await
}

/// 按 ID 获取附件
pub async fn find_by_id(db: &DatabaseConnection, id: &str) -> Result<Option<AttachmentModel>, DbErr> {
    AttachmentEntity::find_by_id(id).one(db).await
}

/// 按类型获取附件
pub async fn find_by_type(
    db: &DatabaseConnection,
    project_id: &str,
    attachment_type: AttachmentType,
) -> Result<Vec<AttachmentModel>, DbErr> {
    AttachmentEntity::find()
        .filter(AttachmentColumn::ProjectId.eq(project_id))
        .filter(AttachmentColumn::AttachmentType.eq(attachment_type))
        .order_by_desc(AttachmentColumn::UploadedAt)
        .all(db)
        .await
}

/// 按文件路径获取附件
pub async fn find_by_path(
    db: &DatabaseConnection,
    file_path: &str,
) -> Result<Option<AttachmentModel>, DbErr> {
    AttachmentEntity::find()
        .filter(AttachmentColumn::FilePath.eq(file_path))
        .one(db)
        .await
}

// ============================================================================
// 写入操作
// ============================================================================

/// 创建附件
#[allow(clippy::too_many_arguments)]
pub async fn create(
    db: &DatabaseConnection,
    id: String,
    project_id: Option<String>,
    attachment_type: AttachmentType,
    file_name: String,
    file_path: String,
    size: Option<i64>,
    mime_type: Option<String>,
) -> Result<AttachmentModel, DbErr> {
    let now = chrono::Utc::now().timestamp_millis();

    let model = AttachmentActiveModel {
        id: Set(id),
        project_id: Set(project_id),
        attachment_type: Set(attachment_type),
        file_name: Set(file_name),
        file_path: Set(file_path),
        uploaded_at: Set(now),
        size: Set(size),
        mime_type: Set(mime_type),
    };

    model.insert(db).await
}

/// 更新附件
pub async fn update(
    db: &DatabaseConnection,
    id: &str,
    file_name: Option<String>,
    file_path: Option<String>,
    size: Option<Option<i64>>,
    mime_type: Option<Option<String>>,
) -> Result<AttachmentModel, DbErr> {
    let attachment = AttachmentEntity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(DbErr::RecordNotFound(format!("Attachment {} not found", id)))?;

    let mut model: AttachmentActiveModel = attachment.into();

    if let Some(fn_) = file_name {
        model.file_name = Set(fn_);
    }
    if let Some(fp) = file_path {
        model.file_path = Set(fp);
    }
    if let Some(s) = size {
        model.size = Set(s);
    }
    if let Some(mt) = mime_type {
        model.mime_type = Set(mt);
    }

    model.update(db).await
}

/// 删除附件
pub async fn delete(db: &DatabaseConnection, id: &str) -> Result<(), DbErr> {
    AttachmentEntity::delete_by_id(id).exec(db).await?;
    Ok(())
}

/// 删除项目所有附件
pub async fn delete_by_project(db: &DatabaseConnection, project_id: &str) -> Result<u64, DbErr> {
    let result = AttachmentEntity::delete_many()
        .filter(AttachmentColumn::ProjectId.eq(project_id))
        .exec(db)
        .await?;
    Ok(result.rows_affected)
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_utils::setup_test_db;

    #[tokio::test]
    async fn test_attachment_crud() {
        let db = setup_test_db().await;

        // 创建
        let attachment = create(
            &db,
            "att-1".into(),
            Some("project-1".into()),
            AttachmentType::Image,
            "test.png".into(),
            "/uploads/test.png".into(),
            Some(1024),
            Some("image/png".into()),
        )
        .await
        .unwrap();

        assert_eq!(attachment.file_name, "test.png");
        assert_eq!(attachment.attachment_type, AttachmentType::Image);

        // 查询
        let found = find_by_id(&db, "att-1").await.unwrap();
        assert!(found.is_some());

        // 按类型查询
        let images = find_by_type(&db, "project-1", AttachmentType::Image).await.unwrap();
        assert_eq!(images.len(), 1);

        // 更新
        let updated = update(
            &db,
            "att-1",
            Some("renamed.png".into()),
            None,
            None,
            None,
        )
        .await
        .unwrap();

        assert_eq!(updated.file_name, "renamed.png");

        // 删除
        delete(&db, "att-1").await.unwrap();
        let deleted = find_by_id(&db, "att-1").await.unwrap();
        assert!(deleted.is_none());
    }
}
