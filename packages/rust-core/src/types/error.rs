//! 统一错误类型
//!
//! 所有错误都通过此类型传递，确保前后端一致。
//!
//! ## 错误类型
//!
//! - `NotFound` - 资源未找到 (404)
//! - `ValidationError` - 验证失败 (400)
//! - `DatabaseError` - 数据库错误 (500)
//! - `Unauthorized` - 未授权 (401)
//! - `InternalError` - 内部错误 (500)

use thiserror::Error;

/// 应用错误类型
///
/// 统一的错误类型，用于所有业务逻辑错误处理。
/// 可以转换为 HTTP 状态码或 Tauri 错误字符串。
#[derive(Error, Debug, Clone)]
pub enum AppError {
    /// 资源未找到
    #[error("未找到: {0}")]
    NotFound(String),

    /// 验证失败
    #[error("验证失败: {0}")]
    ValidationError(String),

    /// 数据库错误
    #[error("数据库错误: {0}")]
    DatabaseError(String),

    /// 未授权
    #[error("未授权: {0}")]
    Unauthorized(String),

    /// 内部错误
    #[error("内部错误: {0}")]
    InternalError(String),

    /// IO 错误
    #[error("IO 错误: {0}")]
    IoError(String),

    /// 序列化错误
    #[error("序列化错误: {0}")]
    SerializationError(String),
}

/// 应用结果类型别名
pub type AppResult<T> = Result<T, AppError>;

impl AppError {
    /// 转换为 HTTP 状态码
    ///
    /// # 返回值
    ///
    /// - `NotFound` → 404
    /// - `ValidationError` → 400
    /// - `DatabaseError` → 500
    /// - `Unauthorized` → 401
    /// - `InternalError` → 500
    /// - `IoError` → 500
    /// - `SerializationError` → 400
    pub fn status_code(&self) -> u16 {
        match self {
            AppError::NotFound(_) => 404,
            AppError::ValidationError(_) => 400,
            AppError::DatabaseError(_) => 500,
            AppError::Unauthorized(_) => 401,
            AppError::InternalError(_) => 500,
            AppError::IoError(_) => 500,
            AppError::SerializationError(_) => 400,
        }
    }

    /// 获取错误代码字符串
    pub fn error_code(&self) -> &'static str {
        match self {
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::ValidationError(_) => "VALIDATION_ERROR",
            AppError::DatabaseError(_) => "DATABASE_ERROR",
            AppError::Unauthorized(_) => "UNAUTHORIZED",
            AppError::InternalError(_) => "INTERNAL_ERROR",
            AppError::IoError(_) => "IO_ERROR",
            AppError::SerializationError(_) => "SERIALIZATION_ERROR",
        }
    }

    /// 创建未找到错误
    pub fn not_found(msg: impl Into<String>) -> Self {
        AppError::NotFound(msg.into())
    }

    /// 创建验证错误
    pub fn validation(msg: impl Into<String>) -> Self {
        AppError::ValidationError(msg.into())
    }

    /// 创建数据库错误
    pub fn database(msg: impl Into<String>) -> Self {
        AppError::DatabaseError(msg.into())
    }

    /// 创建未授权错误
    pub fn unauthorized(msg: impl Into<String>) -> Self {
        AppError::Unauthorized(msg.into())
    }

    /// 创建内部错误
    pub fn internal(msg: impl Into<String>) -> Self {
        AppError::InternalError(msg.into())
    }
}

// ============================================
// 从其他错误类型转换
// ============================================

impl From<sea_orm::DbErr> for AppError {
    fn from(err: sea_orm::DbErr) -> Self {
        AppError::DatabaseError(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::IoError(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::SerializationError(err.to_string())
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::InternalError(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Property 6: HTTP Status Code Mapping
    /// Feature: rust-unified-backend, Property 6
    #[test]
    fn test_error_status_codes() {
        assert_eq!(AppError::NotFound("test".into()).status_code(), 404);
        assert_eq!(AppError::ValidationError("test".into()).status_code(), 400);
        assert_eq!(AppError::DatabaseError("test".into()).status_code(), 500);
        assert_eq!(AppError::Unauthorized("test".into()).status_code(), 401);
        assert_eq!(AppError::InternalError("test".into()).status_code(), 500);
        assert_eq!(AppError::IoError("test".into()).status_code(), 500);
        assert_eq!(AppError::SerializationError("test".into()).status_code(), 400);
    }

    #[test]
    fn test_error_codes() {
        assert_eq!(AppError::NotFound("test".into()).error_code(), "NOT_FOUND");
        assert_eq!(
            AppError::ValidationError("test".into()).error_code(),
            "VALIDATION_ERROR"
        );
        assert_eq!(
            AppError::DatabaseError("test".into()).error_code(),
            "DATABASE_ERROR"
        );
        assert_eq!(
            AppError::Unauthorized("test".into()).error_code(),
            "UNAUTHORIZED"
        );
        assert_eq!(
            AppError::InternalError("test".into()).error_code(),
            "INTERNAL_ERROR"
        );
    }

    #[test]
    fn test_error_display() {
        let err = AppError::NotFound("用户".into());
        assert_eq!(err.to_string(), "未找到: 用户");

        let err = AppError::ValidationError("邮箱格式错误".into());
        assert_eq!(err.to_string(), "验证失败: 邮箱格式错误");
    }

    #[test]
    fn test_error_constructors() {
        let err = AppError::not_found("资源");
        assert!(matches!(err, AppError::NotFound(_)));

        let err = AppError::validation("无效输入");
        assert!(matches!(err, AppError::ValidationError(_)));

        let err = AppError::database("连接失败");
        assert!(matches!(err, AppError::DatabaseError(_)));

        let err = AppError::unauthorized("需要登录");
        assert!(matches!(err, AppError::Unauthorized(_)));

        let err = AppError::internal("未知错误");
        assert!(matches!(err, AppError::InternalError(_)));
    }
}
