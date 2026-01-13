//! 日志数据库操作函数
//!
//! 提供日志相关的数据库操作，包括：
//! - 创建日志条目
//! - 查询日志条目
//! - 清理旧日志
//! - 统计日志信息

use sea_orm::*;
use std::collections::HashMap;
use uuid::Uuid;

use crate::types::{
    error::{AppError, AppResult},
    log::{
        entity::{LogEntity, LogLevel, Model as LogModel},
        request::{CreateLogEntryRequest, LogQueryOptions},
        response::{LogEntryResponse, LogQueryResult, LogStats},
    },
};

/// 初始化日志数据库表
pub async fn init_log_database(db: &DatabaseConnection) -> AppResult<()> {
    // 创建日志表的 SQL
    let sql = r#"
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            timestamp TEXT NOT NULL,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            context TEXT,
            source TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
        CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
        CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
    "#;

    db.execute_unprepared(sql)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to initialize log database: {}", e)))?;

    Ok(())
}

/// 检查日志数据库是否存在
pub async fn check_log_database_exists(db: &DatabaseConnection) -> AppResult<bool> {
    let result = db
        .query_one(Statement::from_string(
            DatabaseBackend::Sqlite,
            "SELECT name FROM sqlite_master WHERE type='table' AND name='logs'".to_string(),
        ))
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to check log database: {}", e)))?;

    Ok(result.is_some())
}

/// 保存单个日志条目
pub async fn save_log_entry(
    db: &DatabaseConnection,
    request: CreateLogEntryRequest,
) -> AppResult<LogEntryResponse> {
    let uuid = request.uuid.unwrap_or_else(|| Uuid::new_v4().to_string());
    let context_json = request
        .context
        .map(|ctx| serde_json::to_string(&ctx))
        .transpose()
        .map_err(|e| AppError::ValidationError(format!("Invalid context JSON: {}", e)))?;

    let log_entry = crate::types::log::entity::ActiveModel {
        uuid: Set(uuid.clone()),
        timestamp: Set(request.timestamp),
        level: Set(request.level),
        message: Set(request.message),
        context: Set(context_json),
        source: Set(request.source),
        created_at: Set(chrono::Utc::now()),
        ..Default::default()
    };

    let result = LogEntity::insert(log_entry)
        .exec_with_returning(db)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to save log entry: {}", e)))?;

    Ok(log_model_to_response(result))
}

/// 批量保存日志条目
pub async fn save_logs_batch(
    db: &DatabaseConnection,
    entries: Vec<CreateLogEntryRequest>,
) -> AppResult<Vec<LogEntryResponse>> {
    if entries.is_empty() {
        return Ok(vec![]);
    }

    let mut active_models = Vec::new();
    
    for request in entries {
        let uuid = request.uuid.unwrap_or_else(|| Uuid::new_v4().to_string());
        let context_json = request
            .context
            .map(|ctx| serde_json::to_string(&ctx))
            .transpose()
            .map_err(|e| AppError::ValidationError(format!("Invalid context JSON: {}", e)))?;

        let log_entry = crate::types::log::entity::ActiveModel {
            uuid: Set(uuid),
            timestamp: Set(request.timestamp),
            level: Set(request.level),
            message: Set(request.message),
            context: Set(context_json),
            source: Set(request.source),
            created_at: Set(chrono::Utc::now()),
            ..Default::default()
        };
        
        active_models.push(log_entry);
    }

    let results = LogEntity::insert_many(active_models)
        .exec_with_returning(db)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to save log batch: {}", e)))?;

    Ok(results.into_iter().map(log_model_to_response).collect())
}

/// 查询日志条目
pub async fn query_logs(
    db: &DatabaseConnection,
    options: LogQueryOptions,
) -> AppResult<LogQueryResult> {
    let mut query = LogEntity::find();

    // 应用级别过滤
    if let Some(levels) = &options.level_filter {
        query = query.filter(crate::types::log::entity::Column::Level.is_in(levels.clone()));
    }

    // 应用时间范围过滤
    if let Some(start_time) = &options.start_time {
        query = query.filter(crate::types::log::entity::Column::Timestamp.gte(start_time));
    }
    if let Some(end_time) = &options.end_time {
        query = query.filter(crate::types::log::entity::Column::Timestamp.lte(end_time));
    }

    // 应用来源过滤
    if let Some(source) = &options.source_filter {
        query = query.filter(crate::types::log::entity::Column::Source.eq(source));
    }

    // 应用消息搜索
    if let Some(search) = &options.message_search {
        query = query.filter(crate::types::log::entity::Column::Message.contains(search));
    }

    // 获取总数
    let total = query.clone().count(db).await
        .map_err(|e| AppError::DbError(format!("Failed to count logs: {}", e)))?;

    // 应用排序（按时间戳降序）
    query = query.order_by_desc(crate::types::log::entity::Column::Timestamp);

    // 应用分页
    let offset = options.offset.unwrap_or(0);
    let limit = options.limit.unwrap_or(100);
    
    if offset > 0 {
        query = query.offset(offset as u64);
    }
    query = query.limit(limit as u64);

    let entries = query.all(db).await
        .map_err(|e| AppError::DbError(format!("Failed to query logs: {}", e)))?;

    let has_more = (offset + limit) < total as i32;
    let response_entries = entries.into_iter().map(log_model_to_response).collect();

    Ok(LogQueryResult {
        entries: response_entries,
        total,
        has_more,
    })
}

/// 清理旧日志条目
pub async fn clear_old_logs(
    db: &DatabaseConnection,
    before_date: &str,
) -> AppResult<i64> {
    let result = LogEntity::delete_many()
        .filter(crate::types::log::entity::Column::Timestamp.lt(before_date))
        .exec(db)
        .await
        .map_err(|e| AppError::DbError(format!("Failed to clear old logs: {}", e)))?;

    Ok(result.rows_affected as i64)
}

/// 清理所有日志条目
pub async fn clear_all_logs(db: &DatabaseConnection) -> AppResult<i64> {
    let result = LogEntity::delete_many()
        .exec(db)
        .await
        .map_err(|e| AppError::DbError(format!("Failed to clear all logs: {}", e)))?;

    Ok(result.rows_affected as i64)
}

/// 获取日志统计信息
pub async fn get_log_stats(db: &DatabaseConnection) -> AppResult<LogStats> {
    // 获取总条目数
    let total_entries = LogEntity::find().count(db).await
        .map_err(|e| AppError::DbError(format!("Failed to count total logs: {}", e)))?;

    // 按级别统计
    let level_stats = LogEntity::find()
        .select_only()
        .column(crate::types::log::entity::Column::Level)
        .column_as(crate::types::log::entity::Column::Id.count(), "count")
        .group_by(crate::types::log::entity::Column::Level)
        .into_tuple::<(LogLevel, i64)>()
        .all(db)
        .await
        .map_err(|e| AppError::DbError(format!("Failed to get level stats: {}", e)))?;

    let mut by_level = HashMap::new();
    for (level, count) in level_stats {
        by_level.insert(level, count);
    }

    // 获取最早和最新的日志时间
    let earliest_entry = LogEntity::find()
        .select_only()
        .column(crate::types::log::entity::Column::Timestamp)
        .order_by_asc(crate::types::log::entity::Column::Timestamp)
        .limit(1)
        .into_tuple::<String>()
        .one(db)
        .await
        .map_err(|e| AppError::DbError(format!("Failed to get earliest log: {}", e)))?;

    let latest_entry = LogEntity::find()
        .select_only()
        .column(crate::types::log::entity::Column::Timestamp)
        .order_by_desc(crate::types::log::entity::Column::Timestamp)
        .limit(1)
        .into_tuple::<String>()
        .one(db)
        .await
        .map_err(|e| AppError::DbError(format!("Failed to get latest log: {}", e)))?;

    // 估算存储大小（简单估算：每条日志平均 200 字节）
    let storage_size = total_entries as i64 * 200;

    Ok(LogStats {
        total_entries,
        by_level,
        earliest_entry,
        latest_entry,
        storage_size,
    })
}

/// 将日志模型转换为响应格式
fn log_model_to_response(model: LogModel) -> LogEntryResponse {
    let context = model.context
        .and_then(|ctx| serde_json::from_str(&ctx).ok());

    LogEntryResponse {
        id: model.id,
        uuid: model.uuid,
        timestamp: model.timestamp,
        level: model.level,
        message: model.message,
        context,
        source: model.source,
        created_at: model.created_at.to_rfc3339(),
    }
}