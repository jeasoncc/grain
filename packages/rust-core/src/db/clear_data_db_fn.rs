//! 数据清理函数
//!
//! 提供清除 SQLite 数据库数据的功能

use crate::types::error::{AppError, AppResult};
use crate::types::{
    attachment::AttachmentEntity as Attachment,
    content::ContentEntity as Content,
    node::NodeEntity as Node,
    tag::TagEntity as Tag,
    user::UserEntity as User,
    workspace::WorkspaceEntity as Workspace,
};
use sea_orm::{DatabaseConnection, EntityTrait, TransactionTrait};
use tracing::info;

/// 清除所有数据的选项
#[derive(Debug, Clone, Default)]
pub struct ClearDataOptions {
    /// 是否清除用户数据
    pub clear_users: bool,
    /// 是否清除工作区数据
    pub clear_workspaces: bool,
    /// 是否清除节点数据
    pub clear_nodes: bool,
    /// 是否清除内容数据
    pub clear_contents: bool,
    /// 是否清除标签数据
    pub clear_tags: bool,
    /// 是否清除附件数据
    pub clear_attachments: bool,
}

impl ClearDataOptions {
    /// 创建清除所有数据的选项
    pub fn all() -> Self {
        Self {
            clear_users: true,
            clear_workspaces: true,
            clear_nodes: true,
            clear_contents: true,
            clear_tags: true,
            clear_attachments: true,
        }
    }

    /// 只清除数据库数据（不清除用户）
    pub fn database_only() -> Self {
        Self {
            clear_users: false,
            clear_workspaces: true,
            clear_nodes: true,
            clear_contents: true,
            clear_tags: true,
            clear_attachments: true,
        }
    }
}

/// 清除所有数据
///
/// 按照外键依赖顺序删除数据：
/// 1. 内容（依赖节点）
/// 2. 附件（依赖工作区）
/// 3. 节点（依赖工作区）
/// 4. 标签（依赖工作区）
/// 5. 工作区
/// 6. 用户
pub async fn clear_all_data(
    db: &DatabaseConnection,
    options: ClearDataOptions,
) -> AppResult<ClearDataResult> {
    info!("开始清除 SQLite 数据...");

    let txn = db.begin().await.map_err(|e| {
        AppError::DatabaseError(format!("开启事务失败: {}", e))
    })?;

    let mut result = ClearDataResult::default();

    // 1. 清除内容（依赖节点）
    if options.clear_contents {
        let deleted = Content::delete_many().exec(&txn).await.map_err(|e| {
            AppError::DatabaseError(format!("清除内容失败: {}", e))
        })?;
        result.contents_deleted = deleted.rows_affected;
        info!("已删除 {} 条内容记录", result.contents_deleted);
    }

    // 2. 清除附件（依赖工作区）
    if options.clear_attachments {
        let deleted = Attachment::delete_many().exec(&txn).await.map_err(|e| {
            AppError::DatabaseError(format!("清除附件失败: {}", e))
        })?;
        result.attachments_deleted = deleted.rows_affected;
        info!("已删除 {} 条附件记录", result.attachments_deleted);
    }

    // 3. 清除节点（依赖工作区）
    if options.clear_nodes {
        let deleted = Node::delete_many().exec(&txn).await.map_err(|e| {
            AppError::DatabaseError(format!("清除节点失败: {}", e))
        })?;
        result.nodes_deleted = deleted.rows_affected;
        info!("已删除 {} 条节点记录", result.nodes_deleted);
    }

    // 4. 清除标签（依赖工作区）
    if options.clear_tags {
        let deleted = Tag::delete_many().exec(&txn).await.map_err(|e| {
            AppError::DatabaseError(format!("清除标签失败: {}", e))
        })?;
        result.tags_deleted = deleted.rows_affected;
        info!("已删除 {} 条标签记录", result.tags_deleted);
    }

    // 5. 清除工作区
    if options.clear_workspaces {
        let deleted = Workspace::delete_many().exec(&txn).await.map_err(|e| {
            AppError::DatabaseError(format!("清除工作区失败: {}", e))
        })?;
        result.workspaces_deleted = deleted.rows_affected;
        info!("已删除 {} 条工作区记录", result.workspaces_deleted);
    }

    // 6. 清除用户
    if options.clear_users {
        let deleted = User::delete_many().exec(&txn).await.map_err(|e| {
            AppError::DatabaseError(format!("清除用户失败: {}", e))
        })?;
        result.users_deleted = deleted.rows_affected;
        info!("已删除 {} 条用户记录", result.users_deleted);
    }

    txn.commit().await.map_err(|e| {
        AppError::DatabaseError(format!("提交事务失败: {}", e))
    })?;

    info!("SQLite 数据清除完成: {:?}", result);
    Ok(result)
}

/// 清除数据结果
#[derive(Debug, Clone, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearDataResult {
    /// 删除的用户数
    pub users_deleted: u64,
    /// 删除的工作区数
    pub workspaces_deleted: u64,
    /// 删除的节点数
    pub nodes_deleted: u64,
    /// 删除的内容数
    pub contents_deleted: u64,
    /// 删除的标签数
    pub tags_deleted: u64,
    /// 删除的附件数
    pub attachments_deleted: u64,
}

impl ClearDataResult {
    /// 获取总删除数
    pub fn total(&self) -> u64 {
        self.users_deleted
            + self.workspaces_deleted
            + self.nodes_deleted
            + self.contents_deleted
            + self.tags_deleted
            + self.attachments_deleted
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_utils::setup_test_db;
    use crate::db::{node_db_fn, workspace_db_fn, content_db_fn};
    use crate::types::node::NodeType;

    #[tokio::test]
    async fn test_clear_all_data() {
        let db = setup_test_db().await;

        // 创建测试数据
        let workspace_id = uuid::Uuid::new_v4().to_string();
        workspace_db_fn::create(&db, workspace_id.clone(), "测试工作区".to_string(), None)
            .await
            .unwrap();

        let node_id = uuid::Uuid::new_v4().to_string();
        node_db_fn::create(
            &db,
            node_id.clone(),
            workspace_id,
            None,
            "测试节点".to_string(),
            NodeType::File,
            None,
        )
        .await
        .unwrap();

        content_db_fn::create(&db, "content-1".to_string(), node_id, "测试内容".to_string())
            .await
            .unwrap();

        // 清除所有数据
        let result = clear_all_data(&db, ClearDataOptions::all()).await.unwrap();

        assert!(result.workspaces_deleted >= 1);
        assert!(result.nodes_deleted >= 1);
        assert!(result.contents_deleted >= 1);
    }

    #[tokio::test]
    async fn test_clear_database_only() {
        let db = setup_test_db().await;

        // 创建测试数据
        let workspace_id = uuid::Uuid::new_v4().to_string();
        workspace_db_fn::create(&db, workspace_id.clone(), "测试工作区".to_string(), None)
            .await
            .unwrap();

        // 只清除数据库数据
        let result = clear_all_data(&db, ClearDataOptions::database_only()).await.unwrap();

        assert!(result.workspaces_deleted >= 1);
        assert_eq!(result.users_deleted, 0); // 用户不应被删除
    }
}
