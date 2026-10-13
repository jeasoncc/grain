//! 宏模块
//!
//! 提供声明式宏用于自动生成 Warp handlers 和 Tauri commands。
//!
//! ## 设计原则
//!
//! - **零手写边界代码**：所有 HTTP/IPC 处理代码由宏生成
//! - **类型安全**：编译时验证端点定义正确性
//! - **统一行为**：Warp 和 Tauri 使用相同的业务逻辑
//!
//! ## 使用示例
//!
//! ```rust,ignore
//! // Warp 服务器
//! let routes = warp_routes!(db.clone(),
//!     GetWorkspaces => get ("api" / "workspaces"),
//! );
//! let create_route = warp_route_with_body!(
//!     db, CreateWorkspace, post, ("api" / "workspaces")
//! );
//!
//! // Tauri 应用
//! tauri_commands!(
//!     GetWorkspaces => get_workspaces,
//!     CreateWorkspace => create_workspace,
//! );
//! ```

pub mod rejection;

pub use rejection::{handle_rejection, AppRejection};

use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Filter;

// ============================================================================
// Warp 辅助函数
// ============================================================================

/// 注入数据库连接的 Filter
///
/// 将 Arc<DatabaseConnection> 注入到 Warp handler 中
pub fn with_db(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (Arc<DatabaseConnection>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || db.clone())
}

/// 从 JSON body 提取输入的 Filter
///
/// 对于有请求体的端点，从 JSON body 反序列化输入
pub fn json_body<T: serde::de::DeserializeOwned + Send>(
) -> impl Filter<Extract = (T,), Error = warp::Rejection> + Clone {
    warp::body::content_length_limit(1024 * 1024) // 1MB 限制
        .and(warp::body::json())
}

/// 从 query 参数提取输入的 Filter
///
/// 对于 GET 请求，从 query string 反序列化输入
pub fn query_params<T: serde::de::DeserializeOwned + Send + 'static>(
) -> impl Filter<Extract = (T,), Error = warp::Rejection> + Clone {
    warp::query::<T>()
}

// ============================================================================
// Warp Routes 宏
// ============================================================================

/// 生成 Warp 路由
///
/// ## 语法
///
/// ```rust,ignore
/// warp_routes!(db,
///     EndpointType => get ("api" / "resource"),
/// );
/// ```
///
/// ## 参数
///
/// - `db`: DatabaseConnection 实例
/// - `EndpointType`: 实现 ApiEndpoint trait 的类型
/// - `METHOD`: Warp 方法函数名 (`get`, `post`, `put`, `delete`)
/// - `("path" / "segments")`: 静态路径分段，使用 Warp 的 `path!` 语法
/// - 有输入的端点使用 `warp_route_with_body!` 或 `warp_route_with_query!`
///
/// ## 示例
///
/// ```rust,ignore
/// let routes = warp_routes!(db.clone(),
///     GetWorkspaces => get ("api" / "workspaces"),
/// );
/// let create_route = warp_route_with_body!(
///     db.clone(), CreateWorkspace, post, ("api" / "workspaces")
/// );
/// let workspace_route = warp_route_with_query!(
///     db, GetWorkspace, get, ("api" / "workspace")
/// );
/// ```
#[macro_export]
macro_rules! warp_routes {
    // 基础路由（无输入）
    ($db:expr, $($endpoint:ty => $method:ident ($($path:tt)+)),* $(,)?) => {{
        use warp::Filter;
        use $crate::api::ApiEndpoint;
        use $crate::macros::{with_db, handle_rejection, AppRejection};
        use std::sync::Arc;

        let db = Arc::new($db);
        let mut routes = warp::any()
            .and(warp::path::end())
            .map(|| warp::reply::json(&serde_json::json!({"status": "ok"})))
            .boxed();

        $(
            let db_clone = db.clone();
            let route = warp::path!($($path)+)
                .and(warp::$method())
                .and(with_db(db_clone))
                .and_then(|db: Arc<sea_orm::DatabaseConnection>| async move {
                    <$endpoint>::execute(&db, ())
                        .await
                        .map(|output| warp::reply::json(&output))
                        .map_err(|e| warp::reject::custom(AppRejection(e)))
                })
                .boxed();
            routes = routes.or(route).unify().boxed();
        )*

        routes.recover(handle_rejection)
    }};
}

/// 生成带 JSON body 的 Warp 路由
#[macro_export]
macro_rules! warp_route_with_body {
    ($db:expr, $endpoint:ty, $method:ident, ($($path:tt)+)) => {{
        use std::sync::Arc;
        use warp::Filter;
        use $crate::api::ApiEndpoint;
        use $crate::macros::{json_body, with_db, AppRejection};

        let db = Arc::new($db);
        warp::path!($($path)+)
                    .and(warp::$method())
                    .and(with_db(db))
                    .and(json_body::<<$endpoint as ApiEndpoint>::Input>())
                    .and_then(
                        |db: Arc<sea_orm::DatabaseConnection>,
                         input: <$endpoint as ApiEndpoint>::Input| async move {
                            <$endpoint>::execute(&db, input)
                                .await
                                .map(|output| warp::reply::json(&output))
                                .map_err(|e| warp::reject::custom(AppRejection(e)))
                        },
                    )
    }};
}

/// 生成带 query 参数的 Warp 路由
#[macro_export]
macro_rules! warp_route_with_query {
    ($db:expr, $endpoint:ty, $method:ident, ($($path:tt)+)) => {{
        use std::sync::Arc;
        use warp::Filter;
        use $crate::api::ApiEndpoint;
        use $crate::macros::{query_params, with_db, AppRejection};

        let db = Arc::new($db);
        warp::path!($($path)+)
                    .and(warp::$method())
                    .and(with_db(db))
                    .and(query_params::<<$endpoint as ApiEndpoint>::Input>())
                    .and_then(
                        |db: Arc<sea_orm::DatabaseConnection>,
                         input: <$endpoint as ApiEndpoint>::Input| async move {
                            <$endpoint>::execute(&db, input)
                                .await
                                .map(|output| warp::reply::json(&output))
                                .map_err(|e| warp::reject::custom(AppRejection(e)))
                        },
                    )
    }};
}

// ============================================================================
// Tauri Commands 宏
// ============================================================================

/// 生成 Tauri commands
///
/// ## 语法
///
/// ```rust,ignore
/// tauri_commands!(
///     EndpointType => command_name,
///     EndpointType => command_name,
/// );
/// ```
///
/// ## 参数
///
/// - `EndpointType`: 实现 ApiEndpoint trait 的类型
/// - `command_name`: 生成的 Tauri command 函数名（snake_case）
///
/// ## 生成的代码
///
/// 对于每个端点，生成一个 `#[tauri::command]` 标注的异步函数：
///
/// ```rust,ignore
/// #[tauri::command]
/// pub async fn command_name(
///     db: tauri::State<'_, sea_orm::DatabaseConnection>,
///     input: <EndpointType as ApiEndpoint>::Input,
/// ) -> Result<<EndpointType as ApiEndpoint>::Output, String> {
///     EndpointType::execute(&db, input)
///         .await
///         .map_err(|e| e.to_string())
/// }
/// ```
///
/// ## 示例
///
/// ```rust,ignore
/// tauri_commands!(
///     GetWorkspaces => get_workspaces,
///     CreateWorkspace => create_workspace,
///     DeleteWorkspace => delete_workspace,
/// );
///
/// // 在 Tauri Builder 中使用
/// tauri::Builder::default()
///     .invoke_handler(tauri::generate_handler![
///         get_workspaces,
///         create_workspace,
///         delete_workspace,
///     ])
/// ```
#[macro_export]
macro_rules! tauri_commands {
    ($($endpoint:ty => $name:ident),* $(,)?) => {
        $(
            #[tauri::command]
            pub async fn $name(
                db: tauri::State<'_, sea_orm::DatabaseConnection>,
                input: <$endpoint as $crate::api::ApiEndpoint>::Input,
            ) -> Result<<$endpoint as $crate::api::ApiEndpoint>::Output, String> {
                <$endpoint as $crate::api::ApiEndpoint>::execute(&db, input)
                    .await
                    .map_err(|e| e.to_string())
            }
        )*
    };
}

/// 生成无输入参数的 Tauri command
///
/// 用于 Input = () 的端点
#[macro_export]
macro_rules! tauri_command_no_input {
    ($endpoint:ty => $name:ident) => {
        #[tauri::command]
        pub async fn $name(
            db: tauri::State<'_, sea_orm::DatabaseConnection>,
        ) -> Result<<$endpoint as $crate::api::ApiEndpoint>::Output, String> {
            <$endpoint as $crate::api::ApiEndpoint>::execute(&db, ())
                .await
                .map_err(|e| e.to_string())
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::{CreateWorkspace, GetWorkspace, GetWorkspaces};
    use crate::{AppConfig, DbConnection};

    #[tokio::test]
    async fn generated_http_filters_preserve_json_query_and_rejections() {
        let directory = tempfile::tempdir().unwrap();
        let config = AppConfig {
            data_dir: directory.path().to_path_buf(),
            db_filename: "macro-smoke.db".to_owned(),
            backup_dirname: "backups".to_owned(),
            enable_encryption: false,
        };
        let db = DbConnection::connect(&config).await.unwrap();
        let list = warp_routes!(db.clone(),
            GetWorkspaces => get ("api" / "workspaces"),
        );
        let response = warp::test::request()
            .path("/api/workspaces")
            .reply(&list)
            .await;
        assert_eq!(response.status(), warp::http::StatusCode::OK);
        assert_eq!(response.body().as_ref(), b"[]");

        let create = warp_route_with_body!(
            db.clone(), CreateWorkspace, post, ("api" / "workspaces")
        )
        .recover(handle_rejection);
        let response = warp::test::request()
            .method("POST")
            .path("/api/workspaces")
            .json(&serde_json::json!({"title": "Warp 0.4 macro"}))
            .reply(&create)
            .await;
        assert_eq!(response.status(), warp::http::StatusCode::OK);
        let workspace: serde_json::Value = serde_json::from_slice(response.body()).unwrap();
        assert_eq!(workspace["title"], "Warp 0.4 macro");
        let id = workspace["id"].as_str().unwrap();

        let get = warp_route_with_query!(
            db.clone(), GetWorkspace, get, ("api" / "workspace")
        )
        .recover(handle_rejection);
        let response = warp::test::request()
            .path(&format!("/api/workspace?id={id}"))
            .reply(&get)
            .await;
        assert_eq!(response.status(), warp::http::StatusCode::OK);
        let fetched: serde_json::Value = serde_json::from_slice(response.body()).unwrap();
        assert_eq!(fetched, workspace);

        let malformed = warp::test::request()
            .method("POST")
            .path("/api/workspaces")
            .header("content-type", "application/json")
            .body("{")
            .reply(&create)
            .await;
        assert_eq!(malformed.status(), warp::http::StatusCode::BAD_REQUEST);
        let wrong_method = warp::test::request()
            .method("DELETE")
            .path("/api/workspaces")
            .reply(&list)
            .await;
        assert_eq!(wrong_method.status(), warp::http::StatusCode::METHOD_NOT_ALLOWED);
        let extra_segment = warp::test::request()
            .path("/api/workspaces/extra")
            .reply(&list)
            .await;
        assert_eq!(extra_segment.status(), warp::http::StatusCode::NOT_FOUND);
        db.close().await.unwrap();
    }
}
