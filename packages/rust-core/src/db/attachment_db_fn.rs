//! Attachment 数据库函数
//!
//! 附件相关的 CRUD 操作

use crate::types::{
    AttachmentActiveModel, AttachmentColumn, AttachmentEntity, AttachmentModel, AttachmentType,
};
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
pub async fn find_by_id(
    db: &DatabaseConnection,
    id: &str,
) -> Result<Option<AttachmentModel>, DbErr> {
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

/// 获取项目所有图片附件
pub async fn find_images_by_project(
    db: &DatabaseConnection,
    project_id: &str,
) -> Result<Vec<AttachmentModel>, DbErr> {
    find_by_type(db, project_id, AttachmentType::Image).await
}

/// 获取项目所有音频附件
pub async fn find_audio_by_project(
    db: &DatabaseConnection,
    project_id: &str,
) -> Result<Vec<AttachmentModel>, DbErr> {
    find_by_type(db, project_id, AttachmentType::Audio).await
}

/// 获取所有附件
pub async fn find_all(db: &DatabaseConnection) -> Result<Vec<AttachmentModel>, DbErr> {
    AttachmentEntity::find()
        .order_by_desc(AttachmentColumn::UploadedAt)
        .all(db)
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
        .ok_or(DbErr::RecordNotFound(format!(
            "Attachment {} not found",
            id
        )))?;

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
        let images = find_by_type(&db, "project-1", AttachmentType::Image)
            .await
            .unwrap();
        assert_eq!(images.len(), 1);

        // 更新
        let updated = update(&db, "att-1", Some("renamed.png".into()), None, None, None)
            .await
            .unwrap();

        assert_eq!(updated.file_name, "renamed.png");

        // 删除
        delete(&db, "att-1").await.unwrap();
        let deleted = find_by_id(&db, "att-1").await.unwrap();
        assert!(deleted.is_none());
    }

    #[tokio::test]
    async fn test_find_images_by_project() {
        let db = setup_test_db().await;

        // 创建图片附件
        create(
            &db,
            "att-img-1".into(),
            Some("project-1".into()),
            AttachmentType::Image,
            "image1.png".into(),
            "/uploads/image1.png".into(),
            Some(1024),
            Some("image/png".into()),
        )
        .await
        .unwrap();

        // 创建音频附件
        create(
            &db,
            "att-audio-1".into(),
            Some("project-1".into()),
            AttachmentType::Audio,
            "audio1.mp3".into(),
            "/uploads/audio1.mp3".into(),
            Some(2048),
            Some("audio/mpeg".into()),
        )
        .await
        .unwrap();

        // 查询图片
        let images = find_images_by_project(&db, "project-1").await.unwrap();
        assert_eq!(images.len(), 1);
        assert_eq!(images[0].file_name, "image1.png");

        // 查询音频
        let audios = find_audio_by_project(&db, "project-1").await.unwrap();
        assert_eq!(audios.len(), 1);
        assert_eq!(audios[0].file_name, "audio1.mp3");
    }
}

/// Property-based tests for Attachment CRUD operations
/// **Property 5: Attachment CRUD Round Trip**
/// **Validates: Requirements 6.2**
#[cfg(test)]
mod property_tests {
    use super::*;
    use crate::db::test_utils::setup_test_db;
    use proptest::prelude::*;

    /// Generate a valid attachment type
    fn arb_attachment_type() -> impl Strategy<Value = AttachmentType> {
        prop_oneof![
            Just(AttachmentType::Image),
            Just(AttachmentType::Audio),
            Just(AttachmentType::File),
        ]
    }

    /// Generate a valid file name (non-empty, alphanumeric with extension)
    fn arb_file_name() -> impl Strategy<Value = String> {
        "[a-zA-Z][a-zA-Z0-9_]{0,20}\\.(png|jpg|mp3|wav|pdf|txt)"
            .prop_map(|s| s.to_string())
    }

    /// Generate a valid file path
    fn arb_file_path() -> impl Strategy<Value = String> {
        "/uploads/[a-zA-Z][a-zA-Z0-9_]{0,20}\\.(png|jpg|mp3|wav|pdf|txt)"
            .prop_map(|s| s.to_string())
    }

    /// Generate optional file size
    fn arb_size() -> impl Strategy<Value = Option<i64>> {
        prop_oneof![
            Just(None),
            (1i64..10_000_000i64).prop_map(Some),
        ]
    }

    /// Generate optional MIME type
    fn arb_mime_type() -> impl Strategy<Value = Option<String>> {
        prop_oneof![
            Just(None),
            Just(Some("image/png".to_string())),
            Just(Some("image/jpeg".to_string())),
            Just(Some("audio/mpeg".to_string())),
            Just(Some("application/pdf".to_string())),
        ]
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// **Property 5: Attachment CRUD Round Trip**
        /// *For any* valid attachment data, creating an attachment then retrieving it by ID
        /// should return an equivalent attachment object.
        /// **Validates: Requirements 6.2**
        #[test]
        fn prop_attachment_crud_round_trip(
            attachment_type in arb_attachment_type(),
            file_name in arb_file_name(),
            file_path in arb_file_path(),
            size in arb_size(),
            mime_type in arb_mime_type(),
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let db = setup_test_db().await;
                let id = uuid::Uuid::new_v4().to_string();
                let project_id = Some("test-project".to_string());

                // Create attachment
                let created = create(
                    &db,
                    id.clone(),
                    project_id.clone(),
                    attachment_type,
                    file_name.clone(),
                    file_path.clone(),
                    size,
                    mime_type.clone(),
                )
                .await
                .expect("Failed to create attachment");

                // Verify created attachment matches input
                prop_assert_eq!(&created.id, &id);
                prop_assert_eq!(&created.project_id, &project_id);
                prop_assert_eq!(created.attachment_type, attachment_type);
                prop_assert_eq!(&created.file_name, &file_name);
                prop_assert_eq!(&created.file_path, &file_path);
                prop_assert_eq!(created.size, size);
                prop_assert_eq!(&created.mime_type, &mime_type);

                // Retrieve by ID
                let found = find_by_id(&db, &id)
                    .await
                    .expect("Failed to find attachment")
                    .expect("Attachment not found");

                // Verify retrieved attachment matches created
                prop_assert_eq!(&found.id, &created.id);
                prop_assert_eq!(&found.project_id, &created.project_id);
                prop_assert_eq!(found.attachment_type, created.attachment_type);
                prop_assert_eq!(&found.file_name, &created.file_name);
                prop_assert_eq!(&found.file_path, &created.file_path);
                prop_assert_eq!(found.size, created.size);
                prop_assert_eq!(&found.mime_type, &created.mime_type);
                prop_assert_eq!(found.uploaded_at, created.uploaded_at);

                Ok(())
            })?;
        }
    }
}
