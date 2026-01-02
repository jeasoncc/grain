//! Node Filter 定义

use rust_core::{CreateNodeRequest, MoveNodeRequest, UpdateNodeRequest};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Filter;

use super::with_db;
use crate::handlers::node_handlers;

/// Node 路由组合
pub fn node_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_nodes_by_workspace(db.clone())
        .or(get_node(db.clone()))
        .or(create_node(db.clone()))
        .or(update_node(db.clone()))
        .or(move_node(db.clone()))
        .or(delete_node(db.clone()))
        .or(duplicate_node(db))
}

/// GET /api/workspaces/:workspace_id/nodes
fn get_nodes_by_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String / "nodes")
        .and(warp::get())
        .and(with_db(db))
        .and_then(node_handlers::get_nodes_by_workspace)
}

/// GET /api/nodes/:id
fn get_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String)
        .and(warp::get())
        .and(with_db(db))
        .and_then(node_handlers::get_node)
}

/// POST /api/nodes
fn create_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes")
        .and(warp::post())
        .and(warp::body::json::<CreateNodeRequest>())
        .and(with_db(db))
        .and_then(node_handlers::create_node)
}

/// PUT /api/nodes/:id
fn update_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String)
        .and(warp::put())
        .and(warp::body::json::<UpdateNodeRequest>())
        .and(with_db(db))
        .and_then(node_handlers::update_node)
}

/// PUT /api/nodes/:id/move
fn move_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String / "move")
        .and(warp::put())
        .and(warp::body::json::<MoveNodeRequest>())
        .and(with_db(db))
        .and_then(node_handlers::move_node)
}

/// DELETE /api/nodes/:id
fn delete_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String)
        .and(warp::delete())
        .and(with_db(db))
        .and_then(node_handlers::delete_node)
}

/// POST /api/nodes/:id/duplicate
fn duplicate_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String / "duplicate")
        .and(warp::post())
        .and(warp::body::json::<Option<String>>())
        .and(with_db(db))
        .and_then(node_handlers::duplicate_node)
}
