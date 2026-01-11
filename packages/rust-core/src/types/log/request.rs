//! 日志请求类型定义
//!
//! 定义日志相关的请求数据结构

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::entity::LogLevel;

/// 创建日志条目请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLogEntryRequest {
    /// 日志唯一标识符（可选，如果不提供会自动生成）
    pub uuid: Option<String>,
    
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
}

/// 批量创建日志条目请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLogsBatchRequest {
    /// 日志条目列表
    pub entries: Vec<CreateLogEntryRequest>,
}

/// 日志查询选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogQueryOptions {
    /// 限制返回条目数
    pub limit: Option<i32>,
    
    /// 偏移量
    pub offset: Option<i32>,
    
    /// 日志级别过滤
    pub level_filter: Option<Vec<LogLevel>>,
    
    /// 开始时间（ISO 8601 格式）
    pub start_time: Option<String>,
    
    /// 结束时间（ISO 8601 格式）
    pub end_time: Option<String>,
    
    /// 来源过滤
    pub source_filter: Option<String>,
    
    /// 消息关键词搜索
    pub message_search: Option<String>,
}

impl Default for LogQueryOptions {
    fn default() -> Self {
        Self {
            limit: Some(100),
            offset: Some(0),
            level_filter: None,
            start_time: None,
            end_time: None,
            source_filter: None,
            message_search: None,
        }
    }
}

/// 清理旧日志请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClearOldLogsRequest {
    /// 清理此日期之前的日志（ISO 8601 格式）
    pub before_date: String,
}

/// 日志配置请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogConfigRequest {
    /// 是否启用控制台输出
    pub enable_console: Option<bool>,
    
    /// 是否启用持久化存储
    pub enable_storage: Option<bool>,
    
    /// 最小日志级别
    pub min_level: Option<LogLevel>,
    
    /// 最大存储条目数
    pub max_entries: Option<i32>,
    
    /// 批量写入大小
    pub batch_size: Option<i32>,
    
    /// 批量写入延迟（毫秒）
    pub batch_delay: Option<i32>,
}