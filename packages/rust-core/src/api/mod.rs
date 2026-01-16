//! API 端点定义
//!
//! 此模块定义 `ApiEndpoint` trait 和所有 API 端点实现。
//! Warp 和 Tauri 通过宏使用这些端点定义，实现代码共享。
//!
//! ## 设计原则
//!
//! - **入口窄出口宽**：Input 严格校验，Output 容错处理
//! - **纯函数核心**：execute 只依赖 db 和 input，无其他副作用
//! - **类型安全**：编译时保证 Input/Output 类型正确
//!
//! ## 使用示例
//!
//! ```rust,ignore
//! use rust_core::api::{ApiEndpoint, GetWorkspaces};
//!
//! // 直接调用端点
//! let workspaces = GetWorkspaces::execute(&db, ()).await?;
//!
//! // 通过宏生成 Warp 路由
//! let routes = warp_routes!(db,
//!     GetWorkspaces => GET "/api/workspaces",
//! );
//! ```

pub mod content;
pub mod clear_data;
pub mod inputs;
pub mod node;
pub mod transaction;
pub mod workspace;

use sea_orm::DatabaseConnection;
use serde::{de::DeserializeOwned, Serialize};
use std::future::Future;

use crate::AppResult;

// ============================================================================
// ApiEndpoint Trait
// ============================================================================

/// API 端点 trait - 所有端点的统一抽象
///
/// ## 设计哲学
///
/// ```text
/// 入口窄：Input 类型严格定义，通过 serde 反序列化校验
///   │
///   ▼
/// ┌─────────────────────────────────────────────────────────────┐
/// │                    execute() 纯函数                          │
/// │                                                             │
/// │  - 只依赖 db 和 input                                       │
/// │  - 无其他副作用（HTTP/IPC 由宏处理）                         │
/// │  - 返回 AppResult<Output>                                   │
/// └─────────────────────────────────────────────────────────────┘
///   │
///   ▼
/// 出口宽：Output 序列化为 JSON，错误转换为统一格式
/// ```
///
/// ## 实现要求
///
/// - `Input`: 必须实现 `DeserializeOwned + Send + 'static`
/// - `Output`: 必须实现 `Serialize + Send + 'static`
/// - `NAME`: 端点名称，用于日志和调试
/// - `execute`: 异步执行函数，返回 `AppResult<Output>`
pub trait ApiEndpoint: Send + Sync + 'static {
    /// 请求输入类型
    ///
    /// 对于无参数的端点，使用 `NoInput` (即 `()`)
    type Input: DeserializeOwned + Send + 'static;

    /// 响应输出类型
    ///
    /// 对于无返回值的端点（如删除），使用 `NoOutput` (即 `()`)
    type Output: Serialize + Send + 'static;

    /// 端点名称
    ///
    /// 用于日志记录和调试，格式为 snake_case
    /// 例如：`"get_workspaces"`, `"create_node"`
    const NAME: &'static str;

    /// 执行端点逻辑
    ///
    /// ## 参数
    ///
    /// - `db`: 数据库连接引用
    /// - `input`: 请求输入（已通过 serde 反序列化）
    ///
    /// ## 返回值
    ///
    /// - `Ok(Output)`: 执行成功
    /// - `Err(AppError)`: 执行失败，错误会被转换为 HTTP 状态码或 Tauri 错误字符串
    fn execute(
        db: &DatabaseConnection,
        input: Self::Input,
    ) -> impl Future<Output = AppResult<Self::Output>> + Send;
}

// ============================================================================
// 类型别名
// ============================================================================

/// 无输入参数的端点辅助类型
///
/// 用于不需要请求参数的端点，如 `GetWorkspaces`
///
/// ```rust,ignore
/// impl ApiEndpoint for GetWorkspaces {
///     type Input = NoInput;  // 等同于 ()
///     // ...
/// }
/// ```
pub type NoInput = ();

/// 无输出的端点辅助类型
///
/// 用于不返回数据的端点，如 `DeleteWorkspace`
///
/// ```rust,ignore
/// impl ApiEndpoint for DeleteWorkspace {
///     type Output = NoOutput;  // 等同于 ()
///     // ...
/// }
/// ```
pub type NoOutput = ();

// ============================================================================
// 重新导出
// ============================================================================

pub use content::*;
pub use clear_data::*;
pub use inputs::*;
pub use node::*;
pub use transaction::*;
pub use workspace::*;
