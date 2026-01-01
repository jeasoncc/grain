//! 应用错误类型定义
//!
//! 统一的错误处理机制，支持错误链和序列化

use serde::Serialize;
use thiserror::Error;

/// 应用错误类型
#[derive(Error, Debug, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    /// 验证错误
    #[error("验证错误: {0}")]
    ValidationError(String),

    /// 数据库错误
    #[error("数据库错误: {0}")]
    DatabaseError(String),

    /// 未找到资源
    #[error("未找到: {entity} (id: {id})")]
    NotFound {
        entity: String,
        id: String,
    },

    /// 加密错误
    #[error("加密错误: {0}")]
    CryptoError(String),

    /// IO 错误
    #[error("IO 错误: {0}")]
    IoError(String),

    /// 序列化错误
    #[error("序列化错误: {0}")]
    SerializationError(String),

    /// 迁移错误
    #[error("迁移错误: {0}")]
    MigrationError(String),

    /// 密钥链错误
    #[error("密钥链错误: {0}")]
    KeyringError(String),

    /// 备份错误
    #[error("备份错误: {0}")]
    BackupError(String),

    /// 内部错误
    #[error("内部错误: {0}")]
    InternalError(String),
}

/// 从 SeaORM 错误转换
impl From<sea_orm::DbErr> for AppError {
    fn from(err: sea_orm::DbErr) -> Self {
        AppError::DatabaseError(err.to_string())
    }
}

/// 从 IO 错误转换
impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::IoError(err.to_string())
    }
}

/// 从 serde_json 错误转换
impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::SerializationError(err.to_string())
    }
}

/// 从 keyring 错误转换
impl From<keyring::Error> for AppError {
    fn from(err: keyring::Error) -> Self {
        AppError::KeyringError(err.to_string())
    }
}

/// 从 zip 错误转换
impl From<zip::result::ZipError> for AppError {
    fn from(err: zip::result::ZipError) -> Self {
        AppError::BackupError(err.to_string())
    }
}

/// 从 walkdir 错误转换
impl From<walkdir::Error> for AppError {
    fn from(err: walkdir::Error) -> Self {
        AppError::IoError(err.to_string())
    }
}

/// 结果类型别名
pub type AppResult<T> = Result<T, AppError>;

/// 将 AppError 转换为前端可读的字符串
impl AppError {
    /// 转换为前端友好的错误消息
    pub fn to_frontend_message(&self) -> String {
        self.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = AppError::NotFound {
            entity: "Node".to_string(),
            id: "123".to_string(),
        };
        assert_eq!(err.to_string(), "未找到: Node (id: 123)");
    }

    #[test]
    fn test_error_serialize() {
        let err = AppError::ValidationError("字段不能为空".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("ValidationError"));
    }
}
