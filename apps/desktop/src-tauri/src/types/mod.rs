//! 类型定义模块
//! 
//! 包含错误类型、配置结构体等核心类型定义

pub mod error;
pub mod config;

pub use error::{AppError, AppResult};
pub use config::AppConfig;
