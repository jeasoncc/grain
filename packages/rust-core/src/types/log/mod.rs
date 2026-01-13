//! 日志系统类型定义
//!
//! 定义日志相关的数据结构，包括：
//! - LogEntry: 日志条目实体
//! - LogLevel: 日志级别枚举
//! - LogQueryOptions: 日志查询选项
//! - LogQueryResult: 日志查询结果
//! - LogStats: 日志统计信息

pub mod entity;
pub mod request;
pub mod response;

pub use entity::{LogEntity, LogLevel, Model as LogModel};
pub use request::*;
pub use response::*;