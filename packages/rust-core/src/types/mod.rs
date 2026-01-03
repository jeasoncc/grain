//! 类型定义模块
//!
//! 包含错误类型、配置结构体、DTO、Builder 和 Entity 等核心类型定义。
//!
//! ## 类型分层
//!
//! - **Entity** (`xxx_entity.rs`): 数据库实体，SeaORM Model
//! - **DTO** (`xxx_interface.rs`): 数据传输对象，用于 API 边界
//! - **Builder** (`xxx_builder.rs`): 构建复杂对象的 Builder 模式

// 核心类型
pub mod config;
pub mod error;

// DTO + Builder + Entity 模块（按实体分目录）
pub mod attachment;
pub mod content;
pub mod node;
pub mod tag;
pub mod user;
pub mod workspace;

// 重新导出核心类型
pub use config::AppConfig;
pub use error::{AppError, AppResult};

// 重新导出 Node 类型
pub use node::{
    CreateNodeRequest, MoveNodeRequest, NodeActiveModel, NodeBuilder, NodeColumn, NodeEntity,
    NodeModel, NodeRelation, NodeResponse, NodeType, UpdateNodeRequest,
};

// 重新导出 Workspace 类型
pub use workspace::{
    CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceActiveModel, WorkspaceBuilder,
    WorkspaceColumn, WorkspaceEntity, WorkspaceModel, WorkspaceRelation, WorkspaceResponse,
};

// 重新导出 Content 类型
pub use content::{
    ContentActiveModel, ContentBuilder, ContentColumn, ContentEntity, ContentModel,
    ContentRelation, ContentResponse, ContentType, CreateContentRequest, SaveContentRequest,
    UpdateContentRequest,
};

// 重新导出 Tag 类型
pub use tag::{
    CreateTagRequest, TagActiveModel, TagColumn, TagEntity, TagGraphData, TagGraphEdge,
    TagGraphNode, TagModel, TagResponse, UpdateTagRequest,
};

// 重新导出 User 类型
pub use user::{
    CreateUserRequest, UpdateUserRequest, UserActiveModel, UserColumn, UserEntity, UserModel,
    UserPlan, UserResponse,
};

// 重新导出 Attachment 类型
pub use attachment::{
    AttachmentActiveModel, AttachmentColumn, AttachmentEntity, AttachmentModel, AttachmentResponse,
    AttachmentType, CreateAttachmentRequest, UpdateAttachmentRequest,
};
