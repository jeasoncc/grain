//! Content 请求处理函数

use rust_core::{db::content_db_fn, ContentResponse, SaveContentRequest};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Reply;

use crate::rejection::AppRejection;

/// 获取节点内容
pub async fn get_content(
    node_id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    content_db_fn::find_by_node_id(&db, &node_id)
        .await
        .map(|opt| warp::reply::json(&opt.map(ContentResponse::from)))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 保存内容（创建或更新）
pub async fn save_content(
    node_id: String,
    request: SaveContentRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    let existing = content_db_fn::find_by_node_id(&db, &node_id)
        .await
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))?;

    match existing {
        Some(_) => content_db_fn::update(&db, &node_id, request.content, request.expected_version)
            .await
            .map(|c| warp::reply::json(&ContentResponse::from(c)))
            .map_err(|e| warp::reject::custom(AppRejection::from(e))),
        None => {
            let id = uuid::Uuid::new_v4().to_string();
            content_db_fn::create(&db, id, node_id, request.content)
                .await
                .map(|c| warp::reply::json(&ContentResponse::from(c)))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        }
    }
}
