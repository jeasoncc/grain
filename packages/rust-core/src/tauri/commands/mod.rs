//! Tauri Commands 模块
//!
//! 定义前端可调用的 Tauri Commands
//!
//! 所有命令都在 rust-core 中定义，desktop 只需调用 run() 函数

mod attachment_commands;
mod backup_commands;
mod content_commands;
mod file_commands;
mod node_commands;
mod tag_commands;
mod user_commands;
mod workspace_commands;

pub use attachment_commands::*;
pub use backup_commands::*;
pub use content_commands::*;
pub use file_commands::*;
pub use node_commands::*;
pub use tag_commands::*;
pub use user_commands::*;
pub use workspace_commands::*;
