//! Node 实体定义
//!
//! 节点是文件树的基本单元，可以是文件夹或各种类型的文件。
//! SeaORM Entity 定义，对应数据库 `nodes` 表。

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::node_interface::NodeType;

/// Node 实体定义
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "nodes")]
pub struct Model {
    /// 节点 ID (UUID)
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,

    /// 所属工作区 ID
    pub workspace_id: String,

    /// 父节点 ID (根节点为 None)
    #[sea_orm(nullable)]
    pub parent_id: Option<String>,

    /// 节点标题
    pub title: String,

    /// 节点类型
    pub node_type: NodeType,

    /// 是否折叠 (仅对文件夹有效)
    pub is_collapsed: bool,

    /// 排序顺序
    pub sort_order: i32,

    /// 标签 (JSON 数组)
    #[sea_orm(column_type = "Text", nullable)]
    pub tags: Option<String>,

    /// 创建时间戳 (毫秒)
    pub created_at: i64,

    /// 更新时间戳 (毫秒)
    pub updated_at: i64,
}

/// 关系定义
#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    /// 节点属于一个工作区
    #[sea_orm(
        belongs_to = "crate::types::workspace::workspace_entity::Entity",
        from = "Column::WorkspaceId",
        to = "crate::types::workspace::workspace_entity::Column::Id"
    )]
    Workspace,

    /// 节点有一个内容
    #[sea_orm(has_one = "crate::types::content::content_entity::Entity")]
    Content,
}

impl Related<crate::types::workspace::workspace_entity::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Workspace.def()
    }
}

impl Related<crate::types::content::content_entity::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Content.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
