//! Tag SeaORM Entity
//!
//! 标签数据库实体定义

use sea_orm::entity::prelude::*;

/// 标签实体
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "tags")]
pub struct Model {
    /// 标签 ID（格式：workspace_id:tag_name）
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,

    /// 标签名称
    pub name: String,

    /// 所属工作区 ID
    pub workspace_id: String,

    /// 使用此标签的文档数量
    pub count: i32,

    /// 最后使用时间戳（毫秒）
    pub last_used: i64,

    /// 创建时间戳（毫秒）
    pub created_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
