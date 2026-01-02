//! Warp 错误处理
//!
//! 将 AppError 转换为 Warp Rejection，实现统一错误响应

use rust_core::AppError;
use serde::Serialize;
use std::convert::Infallible;
use warp::{http::StatusCode, reject::Reject, Rejection, Reply};

/// 自定义 Rejection 类型
#[derive(Debug)]
pub struct AppRejection(pub AppError);

impl Reject for AppRejection {}

impl From<AppError> for AppRejection {
    fn from(err: AppError) -> Self {
        AppRejection(err)
    }
}

/// 错误响应结构
#[derive(Serialize)]
pub struct ErrorResponse {
    pub code: u16,
    pub error: String,
    pub message: String,
}

/// 统一错误处理
///
/// 将所有 Rejection 转换为 JSON 错误响应
pub async fn handle_rejection(err: Rejection) -> Result<impl Reply, Infallible> {
    let (code, error, message) = if let Some(app_err) = err.find::<AppRejection>() {
        (
            StatusCode::from_u16(app_err.0.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            app_err.0.error_code().to_string(),
            app_err.0.to_string(),
        )
    } else if err.is_not_found() {
        (
            StatusCode::NOT_FOUND,
            "NOT_FOUND".to_string(),
            "路由未找到".to_string(),
        )
    } else if err.find::<warp::reject::MethodNotAllowed>().is_some() {
        (
            StatusCode::METHOD_NOT_ALLOWED,
            "METHOD_NOT_ALLOWED".to_string(),
            "方法不允许".to_string(),
        )
    } else if err.find::<warp::reject::PayloadTooLarge>().is_some() {
        (
            StatusCode::PAYLOAD_TOO_LARGE,
            "PAYLOAD_TOO_LARGE".to_string(),
            "请求体过大".to_string(),
        )
    } else if err.find::<warp::reject::InvalidHeader>().is_some() {
        (
            StatusCode::BAD_REQUEST,
            "INVALID_HEADER".to_string(),
            "无效的请求头".to_string(),
        )
    } else {
        tracing::error!("未处理的错误: {:?}", err);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR".to_string(),
            "内部服务器错误".to_string(),
        )
    };

    let json = warp::reply::json(&ErrorResponse {
        code: code.as_u16(),
        error,
        message,
    });

    Ok(warp::reply::with_status(json, code))
}
