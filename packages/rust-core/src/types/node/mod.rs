//! Node 类型模块
//!
//! 包含 Node 相关的所有类型定义：
//! - `node_entity.rs` - SeaORM 数据库实体
//! - `node_interface.rs` - DTO 结构体定义
//! - `node_builder.rs` - Builder 模式实现

pub mod node_builder;
pub mod node_entity;
pub mod node_interface;

// 重新导出所有公共类型
pub use node_builder::NodeBuilder;
pub use node_entity::{
    ActiveModel as NodeActiveModel, Column as NodeColumn, Entity as NodeEntity,
    Model as NodeModel, Relation as NodeRelation,
};
pub use node_interface::{
    CreateNodeRequest, MoveNodeRequest, NodeResponse, NodeType, UpdateNodeRequest,
};
