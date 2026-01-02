//! Node 类型模块
//!
//! 包含 Node 相关的所有类型定义：
//! - `node_interface.rs` - DTO 结构体定义
//! - `node_builder.rs` - Builder 模式实现

pub mod node_builder;
pub mod node_interface;

// 重新导出所有公共类型
pub use node_builder::NodeBuilder;
pub use node_interface::{
    CreateNodeRequest, MoveNodeRequest, NodeResponse, NodeType, UpdateNodeRequest,
};
