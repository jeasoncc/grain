//! 日志响应类型定义
//!
//! 定义日志相关的响应数据结构

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::entity::LogLevel;

/// 日志条目响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntryResponse {
    /// 日志 ID
    pub id: i32,
    
    /// 日志唯一标识符
    pub uuid: String,
    
    /// 时间戳（ISO 8601 格式）
    pub timestamp: String,
    
    /// 日志级别
    pub level: LogLevel,
    
    /// 日志消息
    pub message: String,
    
    /// 上下文信息（可选）
    pub context: Option<HashMap<String, serde_json::Value>>,
    
    /// 日志来源（可选）
    pub source: Option<String>,
    
    /// 创建时间
    pub created_at: String,
}

/// 日志查询结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogQueryResult {
    /// 日志条目列表
    pub entries: Vec<LogEntryResponse>,
    
    /// 总条目数
    pub total: i64,
    
    /// 是否有更多数据
    pub has_more: bool,
}

/// 日志统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogStats {
    /// 总日志条目数
    pub total_entries: i64,
    
    /// 按级别分组的统计
    pub by_level: HashMap<LogLevel, i64>,
    
    /// 最早日志时间
    pub earliest_entry: Option<String>,
    
    /// 最新日志时间
    pub latest_entry: Option<String>,
    
    /// 存储大小（字节，估算值）
    pub storage_size: i64,
}

/// 清理日志结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClearLogsResult {
    /// 清理的条目数
    pub cleared_count: i64,
    
    /// 清理操作是否成功
    pub success: bool,
    
    /// 错误消息（如果有）
    pub error_message: Option<String>,
}

/// 日志配置响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogConfigResponse {
    /// 是否启用控制台输出
    pub enable_console: bool,
    
    /// 是否启用持久化存储
    pub enable_storage: bool,
    
    /// 最小日志级别
    pub min_level: LogLevel,
    
    /// 最大存储条目数
    pub max_entries: i32,
    
    /// 批量写入大小
    pub batch_size: i32,
    
    /// 批量写入延迟（毫秒）
    pub batch_delay: i32,
}

impl Default for LogConfigResponse {
    fn default() -> Self {
        Self {
            enable_console: true,
            enable_storage: true,
            min_level: LogLevel::Info,
            max_entries: 10000,
            batch_size: 50,
            batch_delay: 1000,
        }
    }
}