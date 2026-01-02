//! Warp Filter 模块
//!
//! 使用 Filter 组合子模式构建路由树

pub mod attachment_filters;
pub mod backup_filters;
pub mod content_filters;
pub mod node_filters;
pub mod tag_filters;
pub mod user_filters;
pub mod workspace_filters;

use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Filter;

pub use attachment_filters::attachment_routes;
pub use backup_filters::backup_routes;
pub use content_filters::content_routes;
pub use node_filters::node_routes;
pub use tag_filters::tag_routes;
pub use user_filters::user_routes;
pub use workspace_filters::workspace_routes;

/// 注入数据库连接的 Filter
pub fn with_db(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (Arc<DatabaseConnection>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || db.clone())
}

/// 注入配置的 Filter
pub fn with_config(
    config: Arc<rust_core::AppConfig>,
) -> impl Filter<Extract = (Arc<rust_core::AppConfig>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || config.clone())
}
