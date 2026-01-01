//! Content 数据访问层
//!
//! 封装内容相关的数据库操作

use crate::entity::content::{self, Entity as Content};
use crate::types::error::{AppError, AppResult};
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use tracing::info;

/// Content 数据访问层
pub struct ContentRepo;

impl ContentRepo {
    /// 根据 ID 查询内容
    pub async fn find_by_id(
        db: &DatabaseConnection,
        id: &str,
    ) -> AppResult<Option<content::Model>> {
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

    /// 更新内容（带乐观锁）
    pub async fn update(
        db: &DatabaseConnection,
        node_id: &str,
        content_text: String,
        expected_version: Option<i32>,
    ) -> AppResult<content::Model> {
        let existing =
            Self::find_by_node_id(db, node_id)
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
        match Self::find_by_node_id(db, &node_id).await? {
            Some(_) => Self::update(db, &node_id, content_text, None).await,
            None => Self::create(db, id, node_id, content_text).await,
        }
    }

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
}
