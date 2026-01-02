//! 数据库操作模块
//!
//! 包含数据库连接管理和各实体的 CRUD 操作函数。

pub mod connection;

// 数据库函数将在后续任务中迁移
// pub mod workspace_db_fn;
// pub mod node_db_fn;
// pub mod content_db_fn;
// pub mod tag_db_fn;
// pub mod user_db_fn;
// pub mod attachment_db_fn;

pub use connection::DbConnection;
