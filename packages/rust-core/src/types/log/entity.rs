//! 日志实体定义
//!
//! 定义日志数据库实体和相关类型

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// 日志级别枚举
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(Some(10))")]
pub enum LogLevel {
    #[sea_orm(string_value = "trace")]
    Trace,
    #[sea_orm(string_value = "debug")]
    Debug,
    #[sea_orm(string_value = "info")]
    Info,
    #[sea_orm(string_value = "success")]
    Success,
    #[sea_orm(string_value = "warn")]
    Warn,
    #[sea_orm(string_value = "error")]
    Error,
}

impl LogLevel {
    /// 获取日志级别的优先级（数字越大优先级越高）
    pub fn priority(&self) -> u8 {
        match self {
            LogLevel::Trace => 0,
            LogLevel::Debug => 1,
            LogLevel::Info => 2,
            LogLevel::Success => 2, // 与 Info 同级
            LogLevel::Warn => 3,
            LogLevel::Error => 4,
        }
    }

    /// 从字符串解析日志级别
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "trace" => Some(LogLevel::Trace),
            "debug" => Some(LogLevel::Debug),
            "info" => Some(LogLevel::Info),
            "success" => Some(LogLevel::Success),
            "warn" => Some(LogLevel::Warn),
            "error" => Some(LogLevel::Error),
            _ => None,
        }
    }

    /// 转换为字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            LogLevel::Trace => "trace",
            LogLevel::Debug => "debug",
            LogLevel::Info => "info",
            LogLevel::Success => "success",
            LogLevel::Warn => "warn",
            LogLevel::Error => "error",
        }
    }
}

/// 日志条目实体
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "logs")]
pub struct Model {
    /// 日志 ID（主键）
    #[sea_orm(primary_key)]
    pub id: i32,
    
    /// 日志唯一标识符（UUID）
    #[sea_orm(unique)]
    pub uuid: String,
    
    /// 时间戳（ISO 8601 格式）
    pub timestamp: String,
    
    /// 日志级别
    pub level: LogLevel,
    
    /// 日志消息
    pub message: String,
    
    /// 上下文信息（JSON 格式，可选）
    #[sea_orm(column_type = "Text", nullable)]
    pub context: Option<String>,
    
    /// 日志来源（可选）
    #[sea_orm(nullable)]
    pub source: Option<String>,
    
    /// 创建时间（数据库记录创建时间）
    pub created_at: DateTimeUtc,
}

/// 日志关联关系
#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

/// 日志活动模型实现
impl ActiveModelBehavior for ActiveModel {}

/// 日志实体
pub type LogEntity = Entity;