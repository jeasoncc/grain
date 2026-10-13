//! Warp HTTP 服务器
//!
//! 提供完整的 HTTP 服务器启动函数

use std::net::SocketAddr;
use std::sync::Arc;

use crate::db::connection::DbConnection;
use crate::AppConfig;

use super::routes::build_routes;

/// 运行 Warp HTTP 服务器
///
/// 这是 api-rust 的唯一入口点，所有配置和路由都在 rust-core 中定义。
///
/// ## 示例
///
/// ```rust,ignore
/// #[tokio::main]
/// async fn main() {
///     rust_core::server::run_server().await;
/// }
/// ```
pub async fn run_server() {
    // 初始化日志
    init_logging();

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

    warp::serve(routes).bind(addr).await.run().await;
}

/// 初始化日志系统
fn init_logging() {
    use tracing_subscriber::fmt::format::FmtSpan;

    tracing_subscriber::fmt()
        .with_span_events(FmtSpan::CLOSE)
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("grain_api=info".parse().unwrap())
                .add_directive("warp=info".parse().unwrap()),
        )
        .init();
}
