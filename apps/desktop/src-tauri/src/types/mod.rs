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
pub mod config;
pub mod error;

// DTO + Builder 模块（按实体分目录）
pub mod content;
pub mod node;
pub mod workspace;

// 重新导出核心类型
pub use config::AppConfig;
pub use error::{AppError, AppResult};

// 重新导出 Node DTO + Builder
pub use node::{
    CreateNodeRequest, MoveNodeRequest, NodeBuilder, NodeResponse, NodeType, UpdateNodeRequest,
};

// 重新导出 Workspace DTO + Builder
pub use workspace::{
    CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceBuilder, WorkspaceResponse,
};

// 重新导出 Content DTO + Builder
pub use content::{
    ContentBuilder, ContentResponse, ContentType, CreateContentRequest, SaveContentRequest,
    UpdateContentRequest,
};
