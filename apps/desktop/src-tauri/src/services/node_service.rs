//! 节点服务层
//!
//! 组合 Repository 操作，实现节点相关业务逻辑

use crate::entity::node::NodeType;
use crate::repo::{ContentRepo, NodeRepo};
use crate::types::error::AppResult;
use sea_orm::DatabaseConnection;
use tracing::info;

/// 节点服务
pub struct NodeService;

impl NodeService {
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
    ) -> AppResult<crate::entity::node::Model> {
        // 创建节点
        let node = NodeRepo::create(
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
        if node_type != NodeType::Folder {
            let content_id = uuid::Uuid::new_v4().to_string();
            let content = initial_content.unwrap_or_else(|| "{}".to_string());
            ContentRepo::create(db, content_id, node_id, content).await?;
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
        let children = NodeRepo::find_children(db, id).await?;
        for child in children {
            Box::pin(Self::delete_node_recursive(db, &child.id)).await?;
        }

        // 删除节点本身（内容会级联删除）
        NodeRepo::delete(db, id).await?;

        info!("递归删除节点: {}", id);
        Ok(())
    }

    /// 复制节点（包括内容）
    pub async fn duplicate_node(
        db: &DatabaseConnection,
        source_id: &str,
        new_title: Option<String>,
    ) -> AppResult<crate::entity::node::Model> {
        // 获取源节点
        let source = NodeRepo::find_by_id(db, source_id)
            .await?
            .ok_or_else(|| crate::types::error::AppError::NotFound {
                entity: "Node".to_string(),
                id: source_id.to_string(),
            })?;

        // 获取源内容
        let source_content = ContentRepo::find_by_node_id(db, source_id).await?;

        // 创建新节点
        let new_id = uuid::Uuid::new_v4().to_string();
        let title = new_title.unwrap_or_else(|| format!("{} (副本)", source.title));

        let new_node = NodeRepo::create(
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
            ContentRepo::create(db, content_id, new_id, content.content).await?;
        }

        info!("复制节点: {} -> {}", source_id, new_node.id);
        Ok(new_node)
    }
}
