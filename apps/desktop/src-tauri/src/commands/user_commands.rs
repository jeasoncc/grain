//! User Tauri Commands
//!
//! 用户相关的前端可调用命令

use crate::db::user_db_fn;
use crate::types::{CreateUserRequest, UpdateUserRequest, UserResponse};
use sea_orm::DatabaseConnection;
use tauri::State;

/// 获取所有用户
#[tauri::command]
pub async fn get_users(
    db: State<'_, DatabaseConnection>,
) -> Result<Vec<UserResponse>, String> {
    user_db_fn::find_all(&db)
        .await
        .map(|users| users.into_iter().map(UserResponse::from).collect())
        .map_err(|e| e.to_string())
}

/// 获取单个用户
#[tauri::command]
pub async fn get_user(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<Option<UserResponse>, String> {
    user_db_fn::find_by_id(&db, &id)
        .await
        .map(|opt| opt.map(UserResponse::from))
        .map_err(|e| e.to_string())
}

/// 按用户名获取用户
#[tauri::command]
pub async fn get_user_by_username(
    db: State<'_, DatabaseConnection>,
    username: String,
) -> Result<Option<UserResponse>, String> {
    user_db_fn::find_by_username(&db, &username)
        .await
        .map(|opt| opt.map(UserResponse::from))
        .map_err(|e| e.to_string())
}

/// 按邮箱获取用户
#[tauri::command]
pub async fn get_user_by_email(
    db: State<'_, DatabaseConnection>,
    email: String,
) -> Result<Option<UserResponse>, String> {
    user_db_fn::find_by_email(&db, &email)
        .await
        .map(|opt| opt.map(UserResponse::from))
        .map_err(|e| e.to_string())
}

/// 获取当前用户
#[tauri::command]
pub async fn get_current_user(
    db: State<'_, DatabaseConnection>,
) -> Result<Option<UserResponse>, String> {
    user_db_fn::find_current(&db)
        .await
        .map(|opt| opt.map(UserResponse::from))
        .map_err(|e| e.to_string())
}

/// 创建用户
#[tauri::command]
pub async fn create_user(
    db: State<'_, DatabaseConnection>,
    request: CreateUserRequest,
) -> Result<UserResponse, String> {
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
    .map(UserResponse::from)
    .map_err(|e| e.to_string())
}

/// 更新用户
#[tauri::command]
pub async fn update_user(
    db: State<'_, DatabaseConnection>,
    id: String,
    request: UpdateUserRequest,
) -> Result<UserResponse, String> {
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
    .map(UserResponse::from)
    .map_err(|e| e.to_string())
}

/// 更新最后登录时间
#[tauri::command]
pub async fn update_user_last_login(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<UserResponse, String> {
    user_db_fn::update_last_login(&db, &id)
        .await
        .map(UserResponse::from)
        .map_err(|e| e.to_string())
}

/// 删除用户
#[tauri::command]
pub async fn delete_user(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<(), String> {
    user_db_fn::delete(&db, &id)
        .await
        .map_err(|e| e.to_string())
}
