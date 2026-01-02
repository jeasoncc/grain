//! User 请求处理函数
//!
//! 薄层封装，调用 rust-core 的业务逻辑

use rust_core::{db::user_db_fn, AppError, CreateUserRequest, UpdateUserRequest, UserResponse};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Reply;

use crate::rejection::AppRejection;

/// 获取所有用户
pub async fn get_users(db: Arc<DatabaseConnection>) -> Result<impl Reply, warp::Rejection> {
    user_db_fn::find_all(&db)
        .await
        .map(|users| {
            let responses: Vec<UserResponse> = users.into_iter().map(UserResponse::from).collect();
            warp::reply::json(&responses)
        })
        .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}

/// 获取当前用户
pub async fn get_current_user(db: Arc<DatabaseConnection>) -> Result<impl Reply, warp::Rejection> {
    user_db_fn::find_current(&db)
        .await
        .map(|opt| warp::reply::json(&opt.map(UserResponse::from)))
        .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}

/// 获取单个用户
pub async fn get_user(
    id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    user_db_fn::find_by_id(&db, &id)
        .await
        .map(|opt| warp::reply::json(&opt.map(UserResponse::from)))
        .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}

/// 创建用户
pub async fn create_user(
    request: CreateUserRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    let id = uuid::Uuid::new_v4().to_string();

    user_db_fn::create(
        &db,
        id,
        request.username,
        request.display_name,
        request.avatar,
        request.email,
        request.plan,
        request.features,
        request.settings,
    )
    .await
    .map(|user| warp::reply::json(&UserResponse::from(user)))
    .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}


/// 更新用户
pub async fn update_user(
    id: String,
    request: UpdateUserRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    user_db_fn::update(
        &db,
        &id,
        request.username,
        request.display_name,
        request.avatar,
        request.email,
        request.last_login,
        request.plan,
        request.plan_start_date,
        request.plan_expires_at,
        request.trial_expires_at,
        request.token,
        request.server_message,
        request.features,
        request.state,
        request.settings,
    )
    .await
    .map(|user| warp::reply::json(&UserResponse::from(user)))
    .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}

/// 删除用户
pub async fn delete_user(
    id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    user_db_fn::delete(&db, &id)
        .await
        .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
        .map_err(|e| warp::reject::custom(AppRejection::from(AppError::from(e))))
}
