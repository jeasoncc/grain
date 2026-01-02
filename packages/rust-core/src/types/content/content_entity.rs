//! Content 实体定义
//!
//! 存储节点的编辑器内容 (Lexical JSON 状态)。
//! SeaORM Entity 定义，对应数据库 `contents` 表。

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Content 实体定义
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "contents")]
pub struct Model {
    /// 内容 ID (UUID)
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,

    /// 关联的节点 ID
    #[sea_orm(unique)]
    pub node_id: String,

    /// 编辑器内容 (JSON 格式的 Lexical 状态)
    #[sea_orm(column_type = "Text")]
    pub content: String,

    /// 版本号 (用于乐观锁)
    pub version: i32,

    /// 创建时间戳 (毫秒)
    pub created_at: i64,

    /// 更新时间戳 (毫秒)
    pub updated_at: i64,
}

/// 关系定义
#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    /// 内容属于一个节点
    #[sea_orm(
        belongs_to = "crate::types::node::node_entity::Entity",
        from = "Column::NodeId",
        to = "crate::types::node::node_entity::Column::Id"
    )]
    Node,
}

impl Related<crate::types::node::node_entity::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Node.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
