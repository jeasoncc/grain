//! Grain API Server
//!
//! 基于 Warp 的 HTTP API 服务器，使用 ApiEndpoint trait 统一处理
//!
//! ## 架构
//!
//! ```text
//! HTTP Request
//!      │
//!      ▼
//! ┌─────────────┐
//! │   Filters   │  ← 路由 + 参数提取
//! └──────┬──────┘
//!        │
//!        ▼
//! ┌─────────────┐
//! │ ApiEndpoint │  ← 统一业务逻辑
//! └──────┬──────┘
//!        │
//!        ▼
//! ┌─────────────┐
//! │  rust-core  │  ← 共享数据库操作
//! └─────────────┘
//! ```

mod rejection;

use rust_core::api::{
    content::{GetContent, SaveContent},
    node::{
        CreateNode, DeleteNode, GetChildNodes, GetNode, GetNodesByWorkspace, GetRootNodes,
        MoveNode, UpdateNode,
    },
    transaction::{CreateNodeWithContent, CreateNodeWithContentRequest, DeleteNodeRecursive},
    workspace::{CreateWorkspace, DeleteWorkspace, GetWorkspace, GetWorkspaces, UpdateWorkspace},
    ApiEndpoint, IdInput, IdWithBodyInput, NodeIdInput, ParentIdInput, WorkspaceIdInput,
};
use rust_core::{AppConfig, DbConnection};
use sea_orm::DatabaseConnection;
use std::net::SocketAddr;
use std::sync::Arc;
use tracing_subscriber::fmt::format::FmtSpan;
use warp::Filter;

use rejection::AppRejection;

#[tokio::main]
async fn main() {
    // 初始化日志
    tracing_subscriber::fmt()
        .with_span_events(FmtSpan::CLOSE)
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("grain_api=info".parse().unwrap())
                .add_directive("warp=info".parse().unwrap()),
        )
        .init();

    tracing::info!("🌾 Grain API Server 启动中...");

    // 加载配置
    let config = AppConfig::from_env();
    if let Err(e) = config.init() {
        tracing::error!("初始化配置目录失败: {}", e);
        std::process::exit(1);
    }
    tracing::info!("📁 数据目录: {:?}", config.data_dir);

    // 连接数据库
    tracing::info!("🗄️  数据库路径: {:?}", config.db_path());

    let db = match DbConnection::connect(&config).await {
        Ok(conn) => {
            tracing::info!("✅ 数据库连接成功");
            Arc::new(conn)
        }
        Err(e) => {
            tracing::error!("❌ 数据库连接失败: {}", e);
            std::process::exit(1);
        }
    };

    let config = Arc::new(config);

    // 构建路由树
    let routes = build_routes(db, config);

    // 获取服务器地址
    let host = std::env::var("GRAIN_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port: u16 = std::env::var("GRAIN_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3030);

    let addr: SocketAddr = format!("{}:{}", host, port)
        .parse()
        .expect("无效的服务器地址");

    tracing::info!("🚀 服务器启动: http://{}", addr);
    tracing::info!("📖 API 文档: http://{}/api", addr);

    warp::serve(routes).run(addr).await;
}

// ============================================================================
// 辅助函数
// ============================================================================

/// 注入数据库连接的 Filter
fn with_db(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (Arc<DatabaseConnection>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || db.clone())
}

/// 注入配置的 Filter
fn with_config(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (Arc<AppConfig>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || config.clone())
}

// ============================================================================
// 路由构建
// ============================================================================

/// 构建完整路由树
fn build_routes(
    db: Arc<DatabaseConnection>,
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    // API 路由
    let api = workspace_routes(db.clone())
        .or(node_routes(db.clone()))
        .or(content_routes(db.clone()))
        .or(transaction_routes(db.clone()))
        .or(backup_routes(config.clone()));

    // 健康检查
    let health = warp::path!("health")
        .and(warp::get())
        .map(|| warp::reply::json(&serde_json::json!({"status": "ok"})));

    // API 信息
    let api_info = warp::path!("api").and(warp::get()).map(|| {
        warp::reply::json(&serde_json::json!({
            "name": "Grain API",
            "version": env!("CARGO_PKG_VERSION"),
            "endpoints": [
                "GET /api/workspaces",
                "GET /api/workspaces/:id",
                "POST /api/workspaces",
                "PUT /api/workspaces/:id",
                "DELETE /api/workspaces/:id",
                "GET /api/workspaces/:workspace_id/nodes",
                "GET /api/workspaces/:workspace_id/nodes/root",
                "GET /api/nodes/:id",
                "GET /api/nodes/:id/children",
                "POST /api/nodes",
                "PUT /api/nodes/:id",
                "POST /api/nodes/:id/move",
                "DELETE /api/nodes/:id",
                "GET /api/nodes/:node_id/content",
                "POST /api/contents",
                "POST /api/nodes/with-content",
                "DELETE /api/nodes/:id/recursive",
                "GET /api/backups",
                "POST /api/backups",
                "DELETE /api/backups/:filename",
                "GET /health"
            ]
        }))
    });

    // CORS 配置
    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
        .allow_headers(vec!["Content-Type", "Authorization"]);

    // 请求日志
    let log = warp::log("grain_api::request");

    // 组合所有路由
    health
        .or(api_info)
        .or(api)
        .recover(rejection::handle_rejection)
        .with(cors)
        .with(log)
}

// ============================================================================
// Workspace 路由
// ============================================================================

fn workspace_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_workspaces(db.clone())
        .or(get_workspace(db.clone()))
        .or(create_workspace(db.clone()))
        .or(update_workspace(db.clone()))
        .or(delete_workspace(db))
}

/// GET /api/workspaces
fn get_workspaces(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces")
        .and(warp::get())
        .and(with_db(db))
        .and_then(|db: Arc<DatabaseConnection>| async move {
            GetWorkspaces::execute(&db, ())
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

/// GET /api/workspaces/:id
fn get_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String)
        .and(warp::get())
        .and(with_db(db))
        .and_then(|id: String, db: Arc<DatabaseConnection>| async move {
            GetWorkspace::execute(&db, IdInput::new(&id))
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

/// POST /api/workspaces
fn create_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |body: rust_core::CreateWorkspaceRequest, db: Arc<DatabaseConnection>| async move {
                CreateWorkspace::execute(&db, body)
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

/// PUT /api/workspaces/:id
fn update_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String)
        .and(warp::put())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |id: String,
             body: rust_core::UpdateWorkspaceRequest,
             db: Arc<DatabaseConnection>| async move {
                UpdateWorkspace::execute(&db, IdWithBodyInput::new(&id, body))
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

/// DELETE /api/workspaces/:id
fn delete_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String)
        .and(warp::delete())
        .and(with_db(db))
        .and_then(|id: String, db: Arc<DatabaseConnection>| async move {
            DeleteWorkspace::execute(&db, IdInput::new(&id))
                .await
                .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

// ============================================================================
// Node 路由
// ============================================================================

fn node_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_nodes_by_workspace(db.clone())
        .or(get_root_nodes(db.clone()))
        .or(get_node(db.clone()))
        .or(get_child_nodes(db.clone()))
        .or(create_node(db.clone()))
        .or(update_node(db.clone()))
        .or(move_node(db.clone()))
        .or(delete_node(db))
}

/// GET /api/workspaces/:workspace_id/nodes
fn get_nodes_by_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String / "nodes")
        .and(warp::get())
        .and(with_db(db))
        .and_then(
            |workspace_id: String, db: Arc<DatabaseConnection>| async move {
                GetNodesByWorkspace::execute(&db, WorkspaceIdInput::new(&workspace_id))
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

/// GET /api/workspaces/:workspace_id/nodes/root
fn get_root_nodes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String / "nodes" / "root")
        .and(warp::get())
        .and(with_db(db))
        .and_then(
            |workspace_id: String, db: Arc<DatabaseConnection>| async move {
                GetRootNodes::execute(&db, WorkspaceIdInput::new(&workspace_id))
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

/// GET /api/nodes/:id
fn get_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String)
        .and(warp::get())
        .and(with_db(db))
        .and_then(|id: String, db: Arc<DatabaseConnection>| async move {
            GetNode::execute(&db, IdInput::new(&id))
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

/// GET /api/nodes/:id/children
fn get_child_nodes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String / "children")
        .and(warp::get())
        .and(with_db(db))
        .and_then(|parent_id: String, db: Arc<DatabaseConnection>| async move {
            GetChildNodes::execute(&db, ParentIdInput::new(&parent_id))
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

/// POST /api/nodes
fn create_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |body: rust_core::CreateNodeRequest, db: Arc<DatabaseConnection>| async move {
                CreateNode::execute(&db, body)
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

/// PUT /api/nodes/:id
fn update_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String)
        .and(warp::put())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |id: String,
             body: rust_core::UpdateNodeRequest,
             db: Arc<DatabaseConnection>| async move {
                UpdateNode::execute(&db, IdWithBodyInput::new(&id, body))
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

/// POST /api/nodes/:id/move
fn move_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String / "move")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |id: String,
             body: rust_core::MoveNodeRequest,
             db: Arc<DatabaseConnection>| async move {
                MoveNode::execute(&db, IdWithBodyInput::new(&id, body))
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

/// DELETE /api/nodes/:id
fn delete_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String)
        .and(warp::delete())
        .and(with_db(db))
        .and_then(|id: String, db: Arc<DatabaseConnection>| async move {
            DeleteNode::execute(&db, IdInput::new(&id))
                .await
                .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

// ============================================================================
// Content 路由
// ============================================================================

fn content_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_content(db.clone()).or(save_content(db))
}

/// GET /api/nodes/:node_id/content
fn get_content(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String / "content")
        .and(warp::get())
        .and(with_db(db))
        .and_then(|node_id: String, db: Arc<DatabaseConnection>| async move {
            GetContent::execute(&db, NodeIdInput::new(&node_id))
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

/// POST /api/contents
fn save_content(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "contents")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |body: rust_core::SaveContentRequest, db: Arc<DatabaseConnection>| async move {
                SaveContent::execute(&db, body)
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

// ============================================================================
// Transaction 路由
// ============================================================================

fn transaction_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    create_node_with_content(db.clone()).or(delete_node_recursive(db))
}

/// POST /api/nodes/with-content
fn create_node_with_content(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / "with-content")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |body: CreateNodeWithContentRequest, db: Arc<DatabaseConnection>| async move {
                CreateNodeWithContent::execute(&db, body)
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

/// DELETE /api/nodes/:id/recursive
fn delete_node_recursive(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String / "recursive")
        .and(warp::delete())
        .and(with_db(db))
        .and_then(|id: String, db: Arc<DatabaseConnection>| async move {
            DeleteNodeRecursive::execute(&db, IdInput::new(&id))
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

// ============================================================================
// Backup 路由（保留原有实现，因为涉及文件系统操作）
// ============================================================================

fn backup_routes(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    list_backups(config.clone())
        .or(create_backup(config.clone()))
        .or(delete_backup(config))
}

/// GET /api/backups
fn list_backups(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "backups")
        .and(warp::get())
        .and(with_config(config))
        .and_then(|config: Arc<AppConfig>| async move {
            rust_core::list_backups(&config)
                .map(|backups| warp::reply::json(&backups))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

/// POST /api/backups
fn create_backup(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "backups")
        .and(warp::post())
        .and(with_config(config))
        .and_then(|config: Arc<AppConfig>| async move {
            rust_core::create_backup(&config)
                .map(|info| warp::reply::json(&info))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

/// DELETE /api/backups/:filename
fn delete_backup(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "backups" / String)
        .and(warp::delete())
        .and(with_config(config))
        .and_then(|filename: String, config: Arc<AppConfig>| async move {
            let backup_path = config.backup_dir().join(&filename);
            rust_core::delete_backup(&backup_path)
                .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}
