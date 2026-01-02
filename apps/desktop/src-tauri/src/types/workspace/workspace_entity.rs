//! Workspace 实体定义
//!
//! 工作区是节点的顶层容器。
//! SeaORM Entity 定义，对应数据库 `workspaces` 表。

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Workspace 实体定义
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "workspaces")]
pub struct Model {
    /// 工作区 ID (UUID)
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,

    /// 工作区名称
    pub name: String,

    /// 工作区描述
    #[sea_orm(column_type = "Text", nullable)]
    pub description: Option<String>,

    /// 创建时间戳 (毫秒)
    pub created_at: i64,

    /// 更新时间戳 (毫秒)
    pub updated_at: i64,
}

/// 关系定义
#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    /// 工作区包含多个节点
    #[sea_orm(has_many = "crate::types::node::node_entity::Entity")]
    Nodes,
}

impl Related<crate::types::node::node_entity::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Nodes.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
