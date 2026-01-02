//! Grain Core - 共享业务逻辑
//!
//! 此 crate 包含所有业务逻辑，被 Tauri 和 Warp 共同使用。
//!
//! ## 模块结构
//!
//! - `types/` - 类型定义（Interface + Builder + Entity）
//! - `db/` - 数据库操作函数
//! - `fn/` - 纯函数
//!
//! ## 使用示例
//!
//! ```rust,ignore
//! use rust_core::{
//!     AppError, AppResult,
//!     CreateWorkspaceRequest, WorkspaceResponse,
//!     db::workspace_db_fn,
//! };
//! ```

pub mod db;
pub mod r#fn;
pub mod types;

// ============================================
// 重新导出核心类型
// ============================================

pub use types::config::AppConfig;
pub use types::error::{AppError, AppResult};

// ============================================
// 重新导出 Workspace 类型
// ============================================

pub use types::workspace::{
    CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceActiveModel, WorkspaceBuilder,
    WorkspaceColumn, WorkspaceEntity, WorkspaceModel, WorkspaceRelation, WorkspaceResponse,
};

// ============================================
// 重新导出 Node 类型
// ============================================

pub use types::node::{
    CreateNodeRequest, MoveNodeRequest, NodeActiveModel, NodeBuilder, NodeColumn, NodeEntity,
    NodeModel, NodeRelation, NodeResponse, NodeType, UpdateNodeRequest,
};

// ============================================
// 重新导出 Content 类型
// ============================================

pub use types::content::{
    ContentActiveModel, ContentBuilder, ContentColumn, ContentEntity, ContentModel,
    ContentRelation, ContentResponse, ContentType, CreateContentRequest, SaveContentRequest,
    UpdateContentRequest,
};

// ============================================
// 重新导出 Tag 类型
// ============================================

pub use types::tag::{
    CreateTagRequest, TagActiveModel, TagColumn, TagEntity, TagModel, TagResponse,
    UpdateTagRequest,
};

// ============================================
// 重新导出 User 类型
// ============================================

pub use types::user::{
    CreateUserRequest, UpdateUserRequest, UserActiveModel, UserColumn, UserEntity, UserModel,
    UserPlan, UserResponse,
};

// ============================================
// 重新导出 Attachment 类型
// ============================================

pub use types::attachment::{
    AttachmentActiveModel, AttachmentColumn, AttachmentEntity, AttachmentModel, AttachmentResponse,
    AttachmentType, CreateAttachmentRequest, UpdateAttachmentRequest,
};

// ============================================
// 重新导出数据库函数
// ============================================

pub use db::connection::DbConnection;

// ============================================
// 重新导出纯函数
// ============================================

pub use r#fn::backup::{
    cleanup_old_backups, create_backup, delete_backup, extract_backup_info,
    generate_backup_filename, is_valid_backup_filename, list_backups, restore_backup, BackupInfo,
};

pub use r#fn::crypto::{delete_key, generate_key, get_or_create_key, key_exists};

#[cfg(debug_assertions)]
pub use r#fn::crypto::get_dev_key;

pub use r#fn::node::{
    create_node_with_content, delete_node_recursive, duplicate_node, extract_tags,
    generate_copy_title, is_folder, is_root_node, node_type_needs_content, serialize_tags,
    transform_title,
};
