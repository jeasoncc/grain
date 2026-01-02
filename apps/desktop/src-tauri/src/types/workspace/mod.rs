//! Workspace 类型模块
//!
//! 包含 Workspace 相关的所有类型定义：
//! - `workspace_interface.rs` - DTO 结构体定义
//! - `workspace_builder.rs` - Builder 模式实现

pub mod workspace_builder;
pub mod workspace_interface;

// 重新导出所有公共类型
pub use workspace_builder::WorkspaceBuilder;
pub use workspace_interface::{
    CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceResponse,
};
