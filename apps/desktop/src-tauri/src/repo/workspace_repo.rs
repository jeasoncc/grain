//! Workspace 数据访问层
//!
//! 封装工作区相关的数据库操作

use crate::entity::workspace::{self, Entity as Workspace};
use crate::types::error::{AppError, AppResult};
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, Set};
use tracing::info;

/// Workspace 数据访问层
pub struct WorkspaceRepo;

impl WorkspaceRepo {
    /// 根据 ID 查询工作区
    pub async fn find_by_id(
        db: &DatabaseConnection,
        id: &str,
    ) -> AppResult<Option<workspace::Model>> {
        let workspace = Workspace::find_by_id(id).one(db).await?;
        Ok(workspace)
    }

    /// 查询所有工作区
    pub async fn find_all(db: &DatabaseConnection) -> AppResult<Vec<workspace::Model>> {
        let workspaces = Workspace::find().all(db).await?;
        Ok(workspaces)
    }

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

    /// 更新工作区
    pub async fn update(
        db: &DatabaseConnection,
        id: &str,
        name: Option<String>,
        description: Option<Option<String>>,
    ) -> AppResult<workspace::Model> {
        let existing = Self::find_by_id(db, id).await?.ok_or_else(|| AppError::NotFound {
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
}
