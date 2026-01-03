//! Warp Rejection 处理
//!
//! 提供统一的错误处理机制，将 AppError 转换为 Warp rejection。
//!
//! ## 设计原则
//!
//! - **统一错误格式**：所有错误返回一致的 JSON 结构
//! - **正确的 HTTP 状态码**：根据错误类型返回对应状态码
//! - **详细错误信息**：包含错误代码和消息

use serde::Serialize;
use std::convert::Infallible;
use warp::{http::StatusCode, reject::Reject, Rejection, Reply};

use crate::types::error::AppError;

// ============================================================================
// AppRejection - Warp Rejection 包装器
// ============================================================================

/// AppError 的 Warp Rejection 包装器
///
/// 实现 `warp::reject::Reject` trait，使 AppError 可以作为 Warp rejection 使用。
#[derive(Debug)]
pub struct AppRejection(pub AppError);

impl Reject for AppRejection {}

impl From<AppError> for AppRejection {
    fn from(err: AppError) -> Self {
        AppRejection(err)
    }
}

// ============================================================================
// 错误响应结构
// ============================================================================

/// 错误响应 JSON 结构
///
/// 统一的错误响应格式，包含错误代码和消息。
#[derive(Serialize)]
struct ErrorResponse {
    /// 错误代码（如 "NOT_FOUND", "VALIDATION_ERROR"）
    code: &'static str,
    /// 错误消息
    message: String,
}

/// API 响应包装器
///
/// 统一的 API 响应格式，包含 success 标志和数据/错误。
#[derive(Serialize)]
struct ApiResponse<T: Serialize> {
    /// 是否成功
    success: bool,
    /// 成功时的数据
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
    /// 失败时的错误
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<ErrorResponse>,
}

// ============================================================================
// Rejection Handler
// ============================================================================

/// 处理 Warp rejection
///
/// 将所有 rejection 转换为统一的 JSON 错误响应。
///
/// ## 处理的错误类型
///
/// - `AppRejection` - 业务逻辑错误
/// - `warp::reject::MethodNotAllowed` - 方法不允许
/// - `warp::reject::InvalidHeader` - 无效请求头
/// - `warp::reject::MissingHeader` - 缺少请求头
/// - `warp::reject::InvalidQuery` - 无效查询参数
/// - `warp::reject::PayloadTooLarge` - 请求体过大
/// - `warp::reject::UnsupportedMediaType` - 不支持的媒体类型
/// - 其他 - 内部服务器错误
///
/// ## 返回格式
///
/// ```json
/// {
///   "success": false,
///   "error": {
///     "code": "NOT_FOUND",
///     "message": "未找到: 资源"
///   }
/// }
/// ```
pub async fn handle_rejection(err: Rejection) -> Result<impl Reply, Infallible> {
    let (status, code, message) = if let Some(app_rejection) = err.find::<AppRejection>() {
        // 业务逻辑错误
        let app_error = &app_rejection.0;
        (
            StatusCode::from_u16(app_error.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            app_error.error_code(),
            app_error.to_string(),
        )
    } else if err.is_not_found() {
        // 路由未找到
        (
            StatusCode::NOT_FOUND,
            "NOT_FOUND",
            "路由未找到".to_string(),
        )
    } else if let Some(_) = err.find::<warp::reject::MethodNotAllowed>() {
        // 方法不允许
        (
            StatusCode::METHOD_NOT_ALLOWED,
            "METHOD_NOT_ALLOWED",
            "方法不允许".to_string(),
        )
    } else if let Some(_) = err.find::<warp::reject::InvalidHeader>() {
        // 无效请求头
        (
            StatusCode::BAD_REQUEST,
            "INVALID_HEADER",
            "无效的请求头".to_string(),
        )
    } else if let Some(_) = err.find::<warp::reject::MissingHeader>() {
        // 缺少请求头
        (
            StatusCode::BAD_REQUEST,
            "MISSING_HEADER",
            "缺少必要的请求头".to_string(),
        )
    } else if let Some(_) = err.find::<warp::reject::InvalidQuery>() {
        // 无效查询参数
        (
            StatusCode::BAD_REQUEST,
            "INVALID_QUERY",
            "无效的查询参数".to_string(),
        )
    } else if let Some(_) = err.find::<warp::reject::PayloadTooLarge>() {
        // 请求体过大
        (
            StatusCode::PAYLOAD_TOO_LARGE,
            "PAYLOAD_TOO_LARGE",
            "请求体过大".to_string(),
        )
    } else if let Some(_) = err.find::<warp::reject::UnsupportedMediaType>() {
        // 不支持的媒体类型
        (
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            "UNSUPPORTED_MEDIA_TYPE",
            "不支持的媒体类型".to_string(),
        )
    } else if let Some(_) = err.find::<warp::body::BodyDeserializeError>() {
        // JSON 解析错误
        (
            StatusCode::BAD_REQUEST,
            "INVALID_JSON",
            "无效的 JSON 格式".to_string(),
        )
    } else {
        // 其他未知错误
        tracing::error!("未处理的 rejection: {:?}", err);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR",
            "内部服务器错误".to_string(),
        )
    };

    let response = ApiResponse::<()> {
        success: false,
        data: None,
        error: Some(ErrorResponse { code, message }),
    };

    Ok(warp::reply::with_status(
        warp::reply::json(&response),
        status,
    ))
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_rejection_from_app_error() {
        let error = AppError::not_found("测试资源");
        let rejection = AppRejection::from(error.clone());
        assert_eq!(rejection.0.error_code(), "NOT_FOUND");
    }

    #[test]
    fn test_error_response_serialization() {
        let response = ApiResponse::<()> {
            success: false,
            data: None,
            error: Some(ErrorResponse {
                code: "NOT_FOUND",
                message: "未找到: 资源".to_string(),
            }),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"success\":false"));
        assert!(json.contains("\"code\":\"NOT_FOUND\""));
        assert!(json.contains("\"message\":\"未找到: 资源\""));
    }

    #[tokio::test]
    async fn test_handle_rejection_app_error() {
        let error = AppError::not_found("测试");
        let rejection = warp::reject::custom(AppRejection(error));
        
        let result = handle_rejection(rejection).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_handle_rejection_not_found() {
        let rejection = warp::reject::not_found();
        
        let result = handle_rejection(rejection).await;
        assert!(result.is_ok());
    }
}
