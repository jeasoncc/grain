//! User Filter 定义

use rust_core::{CreateUserRequest, UpdateUserRequest};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Filter;

use super::with_db;
use crate::handlers::user_handlers;

/// User 路由组合
pub fn user_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_users(db.clone())
        .or(get_user(db.clone()))
        .or(get_current_user(db.clone()))
        .or(create_user(db.clone()))
        .or(update_user(db.clone()))
        .or(delete_user(db))
}

/// GET /api/users
fn get_users(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "users")
        .and(warp::get())
        .and(with_db(db))
        .and_then(user_handlers::get_users)
}

/// GET /api/users/current
fn get_current_user(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "users" / "current")
        .and(warp::get())
        .and(with_db(db))
        .and_then(user_handlers::get_current_user)
}

/// GET /api/users/:id
fn get_user(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "users" / String)
        .and(warp::get())
        .and(with_db(db))
        .and_then(user_handlers::get_user)
}

/// POST /api/users
fn create_user(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "users")
        .and(warp::post())
        .and(warp::body::json::<CreateUserRequest>())
        .and(with_db(db))
        .and_then(user_handlers::create_user)
}

/// PUT /api/users/:id
fn update_user(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "users" / String)
        .and(warp::put())
        .and(warp::body::json::<UpdateUserRequest>())
        .and(with_db(db))
        .and_then(user_handlers::update_user)
}

/// DELETE /api/users/:id
fn delete_user(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "users" / String)
        .and(warp::delete())
        .and(with_db(db))
        .and_then(user_handlers::delete_user)
}
