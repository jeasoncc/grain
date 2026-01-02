//! Content 类型模块
//!
//! 包含 Content 相关的所有类型定义：
//! - `content_interface.rs` - DTO 结构体定义
//! - `content_builder.rs` - Builder 模式实现

pub mod content_builder;
pub mod content_interface;

// 重新导出所有公共类型
pub use content_builder::ContentBuilder;
pub use content_interface::{
    ContentResponse, ContentType, CreateContentRequest, SaveContentRequest, UpdateContentRequest,
};
