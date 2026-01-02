//! Node 数据访问层
//!
//! 封装节点相关的数据库操作

use crate::types::node::{node_entity as node, NodeEntity as Node, NodeType};
use crate::types::error::{AppError, AppResult};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
};
use tracing::info;

/// Node 数据访问层
pub struct NodeRepo;

impl NodeRepo {
    /// 根据 ID 查询节点
    pub async fn find_by_id(db: &DatabaseConnection, id: &str) -> AppResult<Option<node::Model>> {
        let node = Node::find_by_id(id).one(db).await?;
        Ok(node)
    }

    /// 查询工作区下的所有节点
    pub async fn find_by_workspace(
        db: &DatabaseConnection,
        workspace_id: &str,
    ) -> AppResult<Vec<node::Model>> {
        let nodes = Node::find()
            .filter(node::Column::WorkspaceId.eq(workspace_id))
            .order_by_asc(node::Column::SortOrder)
            .all(db)
            .await?;
        Ok(nodes)
    }

    /// 查询子节点
    pub async fn find_children(
        db: &DatabaseConnection,
        parent_id: &str,
    ) -> AppResult<Vec<node::Model>> {
        let nodes = Node::find()
            .filter(node::Column::ParentId.eq(parent_id))
            .order_by_asc(node::Column::SortOrder)
            .all(db)
            .await?;
        Ok(nodes)
    }

    /// 查询根节点（没有父节点的节点）
    pub async fn find_root_nodes(
        db: &DatabaseConnection,
        workspace_id: &str,
    ) -> AppResult<Vec<node::Model>> {
        let nodes = Node::find()
            .filter(node::Column::WorkspaceId.eq(workspace_id))
            .filter(node::Column::ParentId.is_null())
            .order_by_asc(node::Column::SortOrder)
            .all(db)
            .await?;
        Ok(nodes)
    }

    /// 按父节点查询子节点（支持 None 表示根节点）
    pub async fn find_by_parent(
        db: &DatabaseConnection,
        workspace_id: &str,
        parent_id: Option<&str>,
    ) -> AppResult<Vec<node::Model>> {
        let nodes = match parent_id {
            Some(pid) => {
                Node::find()
                    .filter(node::Column::WorkspaceId.eq(workspace_id))
                    .filter(node::Column::ParentId.eq(pid))
                    .order_by_asc(node::Column::SortOrder)
                    .all(db)
                    .await?
            }
            None => {
                Node::find()
                    .filter(node::Column::WorkspaceId.eq(workspace_id))
                    .filter(node::Column::ParentId.is_null())
                    .order_by_asc(node::Column::SortOrder)
                    .all(db)
                    .await?
            }
        };
        Ok(nodes)
    }

    /// 按类型查询节点
    pub async fn find_by_type(
        db: &DatabaseConnection,
        workspace_id: &str,
        node_type: NodeType,
    ) -> AppResult<Vec<node::Model>> {
        let nodes = Node::find()
            .filter(node::Column::WorkspaceId.eq(workspace_id))
            .filter(node::Column::NodeType.eq(node_type))
            .order_by_asc(node::Column::SortOrder)
            .all(db)
            .await?;
        Ok(nodes)
    }

    /// 获取节点的所有后代（递归）
    pub async fn find_descendants(
        db: &DatabaseConnection,
        node_id: &str,
    ) -> AppResult<Vec<node::Model>> {
        let mut descendants = Vec::new();
        let mut stack = vec![node_id.to_string()];

        while let Some(current_id) = stack.pop() {
            let children = Self::find_children(db, &current_id).await?;
            for child in children {
                stack.push(child.id.clone());
                descendants.push(child);
            }
        }

        Ok(descendants)
    }

    /// 创建节点
    pub async fn create(
        db: &DatabaseConnection,
        id: String,
        workspace_id: String,
        parent_id: Option<String>,
        title: String,
        node_type: NodeType,
        tags: Option<String>,
    ) -> AppResult<node::Model> {
        let now = chrono::Utc::now().timestamp_millis();

        // 计算排序顺序（放在同级节点的最后）
        let sort_order = Self::get_next_sort_order_pub(db, &workspace_id, parent_id.as_deref()).await?;

        let model = node::ActiveModel {
            id: Set(id),
            workspace_id: Set(workspace_id),
            parent_id: Set(parent_id),
            title: Set(title.clone()),
            node_type: Set(node_type),
            is_collapsed: Set(false),
            sort_order: Set(sort_order),
            tags: Set(tags),
            created_at: Set(now),
            updated_at: Set(now),
        };

        let node = model.insert(db).await?;
        info!("创建节点: {} ({})", node.title, node.id);
        Ok(node)
    }

    /// 获取下一个排序顺序（公开方法）
    pub async fn get_next_sort_order_pub(
        db: &DatabaseConnection,
        workspace_id: &str,
        parent_id: Option<&str>,
    ) -> AppResult<i32> {
        let siblings = match parent_id {
            Some(pid) => Self::find_children(db, pid).await?,
            None => Self::find_root_nodes(db, workspace_id).await?,
        };

        let max_order = siblings.iter().map(|n| n.sort_order).max().unwrap_or(-1);
        Ok(max_order + 1)
    }

    /// 批量重排序节点
    /// 
    /// 按照传入的 ID 顺序更新 sort_order
    pub async fn reorder_nodes(
        db: &DatabaseConnection,
        node_ids: Vec<String>,
    ) -> AppResult<()> {
        let now = chrono::Utc::now().timestamp_millis();

        for (index, node_id) in node_ids.iter().enumerate() {
            let existing = Self::find_by_id(db, node_id).await?.ok_or_else(|| AppError::NotFound {
                entity: "Node".to_string(),
                id: node_id.to_string(),
            })?;

            let mut model: node::ActiveModel = existing.into();
            model.sort_order = Set(index as i32);
            model.updated_at = Set(now);
            model.update(db).await?;
        }

        info!("批量重排序 {} 个节点", node_ids.len());
        Ok(())
    }

    /// 批量删除节点（含级联删除子节点和内容）
    pub async fn delete_batch(
        db: &DatabaseConnection,
        node_ids: Vec<String>,
    ) -> AppResult<()> {
        for node_id in &node_ids {
            // 先递归删除所有子节点
            let descendants = Self::find_descendants(db, node_id).await?;
            for descendant in descendants {
                Node::delete_by_id(&descendant.id).exec(db).await?;
            }
            // 删除节点本身
            Node::delete_by_id(node_id).exec(db).await?;
        }

        info!("批量删除 {} 个节点", node_ids.len());
        Ok(())
    }

    /// 更新节点
    pub async fn update(
        db: &DatabaseConnection,
        id: &str,
        title: Option<String>,
        is_collapsed: Option<bool>,
        sort_order: Option<i32>,
        tags: Option<Option<String>>,
    ) -> AppResult<node::Model> {
        let existing = Self::find_by_id(db, id).await?.ok_or_else(|| AppError::NotFound {
            entity: "Node".to_string(),
            id: id.to_string(),
        })?;

        let now = chrono::Utc::now().timestamp_millis();

        let mut model: node::ActiveModel = existing.into();
        model.updated_at = Set(now);

        if let Some(title) = title {
            model.title = Set(title);
        }
        if let Some(is_collapsed) = is_collapsed {
            model.is_collapsed = Set(is_collapsed);
        }
        if let Some(sort_order) = sort_order {
            model.sort_order = Set(sort_order);
        }
        if let Some(tags) = tags {
            model.tags = Set(tags);
        }

        let node = model.update(db).await?;
        info!("更新节点: {} ({})", node.title, node.id);
        Ok(node)
    }

    /// 移动节点到新的父节点
    pub async fn move_node(
        db: &DatabaseConnection,
        id: &str,
        new_parent_id: Option<String>,
        new_sort_order: i32,
    ) -> AppResult<node::Model> {
        let existing = Self::find_by_id(db, id).await?.ok_or_else(|| AppError::NotFound {
            entity: "Node".to_string(),
            id: id.to_string(),
        })?;

        let now = chrono::Utc::now().timestamp_millis();

        let mut model: node::ActiveModel = existing.into();
        model.parent_id = Set(new_parent_id);
        model.sort_order = Set(new_sort_order);
        model.updated_at = Set(now);

        let node = model.update(db).await?;
        info!("移动节点: {} ({})", node.title, node.id);
        Ok(node)
    }

    /// 删除节点（级联删除子节点由数据库外键处理）
    pub async fn delete(db: &DatabaseConnection, id: &str) -> AppResult<()> {
        let result = Node::delete_by_id(id).exec(db).await?;

        if result.rows_affected == 0 {
            return Err(AppError::NotFound {
                entity: "Node".to_string(),
                id: id.to_string(),
            });
        }

        info!("删除节点: {}", id);
        Ok(())
    }
}
