//! Grain API Server
//!
//! 基于 Warp 的 HTTP API 服务器，使用 Filter 组合子模式
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
//! │  Handlers   │  ← 薄层封装
//! └──────┬──────┘
//!        │
//!        ▼
//! ┌─────────────┐
//! │  rust-core  │  ← 共享业务逻辑
//! └─────────────┘
//! ```

mod filters;
mod handlers;
mod rejection;

use rust_core::{AppConfig, DbConnection};
use std::net::SocketAddr;
use std::sync::Arc;
use tracing_subscriber::fmt::format::FmtSpan;
use warp::Filter;

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

/// 构建完整路由树
///
/// 使用 Filter 组合子模式，将所有路由组合成一棵树
fn build_routes(
    db: Arc<sea_orm::DatabaseConnection>,
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    // API 路由
    let api = filters::workspace_routes(db.clone())
        .or(filters::node_routes(db.clone()))
        .or(filters::content_routes(db.clone()))
        .or(filters::tag_routes(db.clone()))
        .or(filters::user_routes(db.clone()))
        .or(filters::attachment_routes(db.clone()))
        .or(filters::backup_routes(config.clone()));

    // 健康检查
    let health = warp::path!("health")
        .and(warp::get())
        .map(|| warp::reply::json(&serde_json::json!({"status": "ok"})));

    // API 信息
    let api_info = warp::path!("api")
        .and(warp::get())
        .map(|| {
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
                    "GET /api/nodes/:id",
                    "POST /api/nodes",
                    "PUT /api/nodes/:id",
                    "DELETE /api/nodes/:id",
                    "GET /api/nodes/:node_id/content",
                    "POST /api/contents",
                    "PUT /api/contents/:id",
                    "GET /api/workspaces/:workspace_id/tags",
                    "GET /api/tags/:id",
                    "POST /api/tags",
                    "PUT /api/tags/:id",
                    "DELETE /api/tags/:id",
                    "GET /api/users",
                    "GET /api/users/current",
                    "GET /api/users/:id",
                    "POST /api/users",
                    "PUT /api/users/:id",
                    "DELETE /api/users/:id",
                    "GET /api/projects/:project_id/attachments",
                    "GET /api/attachments/:id",
                    "POST /api/attachments",
                    "PUT /api/attachments/:id",
                    "DELETE /api/attachments/:id",
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
