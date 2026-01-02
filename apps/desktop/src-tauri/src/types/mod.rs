//! 类型定义模块
//!
//! 包含错误类型、配置结构体、DTO 和 Builder 等核心类型定义。
//! 
//! ## 类型分层
//! 
//! - **Entity** (`entity/`): 数据库实体，SeaORM Model
//! - **DTO** (`types/`): 数据传输对象，用于 API 边界
//! - **Builder** (`types/`): 构建复杂对象的 Builder 模式

// 核心类型
pub mod error;
pub mod config;

// DTO + Builder（对应前端 Interface）
pub mod node;
pub mod workspace;
pub mod content;

// 重新导出核心类型
pub use error::{AppError, AppResult};
pub use config::AppConfig;

// 重新导出 Node DTO
pub use node::{
    CreateNodeRequest, UpdateNodeRequest, MoveNodeRequest,
    NodeResponse, NodeBuilder,
};

// 重新导出 Workspace DTO
pub use workspace::{
    CreateWorkspaceRequest, UpdateWorkspaceRequest,
    WorkspaceResponse, WorkspaceBuilder,
};

// 重新导出 Content DTO
pub use content::{
    SaveContentRequest, CreateContentRequest, UpdateContentRequest,
    ContentResponse, ContentBuilder,
};
