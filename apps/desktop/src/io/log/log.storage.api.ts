/**
 * @file log.storage.api.ts
 * @description SQLite 日志存储 API
 *
 * 提供与 Rust 后端交互的日志存储功能，使用 TaskEither 进行错误处理。
 * 所有函数都是纯函数，返回 TaskEither 类型。
 */

import { invoke } from "@tauri-apps/api/core";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import type { LogEntry, LogQueryOptions, LogQueryResult } from "@/types/log/log.interface";
import type { AppError } from "@/types/error/error.types";

// ============================================================================
// 日志保存
// ============================================================================

/**
 * 保存单个日志条目到 SQLite
 * 
 * @param entry - 日志条目
 * @returns TaskEither<AppError, void>
 */
export const saveLogToSQLite = (entry: LogEntry): TE.TaskEither<AppError, void> =>
  pipe(
    TE.tryCatch(
      () => invoke<void>("save_log_entry", { entry }),
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to save log entry: ${String(error)}`,
        originalError: error,
      }),
    ),
  );

/**
 * 批量保存日志条目到 SQLite
 * 
 * @param entries - 日志条目数组
 * @returns TaskEither<AppError, void>
 */
export const saveLogsBatchToSQLite = (entries: LogEntry[]): TE.TaskEither<AppError, void> =>
  pipe(
    TE.tryCatch(
      () => invoke<void>("save_logs_batch", { entries }),
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to save log batch: ${String(error)}`,
        originalError: error,
      }),
    ),
  );

// ============================================================================
// 日志查询
// ============================================================================

/**
 * 从 SQLite 查询日志条目
 * 
 * @param options - 查询选项
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const queryLogsFromSQLite = (
  options: LogQueryOptions = {},
): TE.TaskEither<AppError, LogQueryResult> =>
  pipe(
    TE.tryCatch(
      () => invoke<LogQueryResult>("query_logs", { options }),
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to query logs: ${String(error)}`,
        originalError: error,
      }),
    ),
  );

/**
 * 获取日志统计信息
 * 
 * @returns TaskEither<AppError, LogStats>
 */
export const getLogStatsFromSQLite = (): TE.TaskEither<AppError, any> =>
  pipe(
    TE.tryCatch(
      () => invoke<any>("get_log_stats"),
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to get log stats: ${String(error)}`,
        originalError: error,
      }),
    ),
  );

// ============================================================================
// 日志清理
// ============================================================================

/**
 * 清理旧日志条目
 * 
 * @param beforeDate - 清理此日期之前的日志
 * @returns TaskEither<AppError, number> 返回清理的条目数
 */
export const clearOldLogsFromSQLite = (beforeDate: string): TE.TaskEither<AppError, number> =>
  pipe(
    TE.tryCatch(
      () => invoke<number>("clear_old_logs", { beforeDate }),
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to clear old logs: ${String(error)}`,
        originalError: error,
      }),
    ),
  );

/**
 * 清理所有日志条目
 * 
 * @returns TaskEither<AppError, void>
 */
export const clearAllLogsFromSQLite = (): TE.TaskEither<AppError, void> =>
  pipe(
    TE.tryCatch(
      () => invoke<void>("clear_all_logs"),
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to clear all logs: ${String(error)}`,
        originalError: error,
      }),
    ),
  );

// ============================================================================
// 数据库管理
// ============================================================================

/**
 * 初始化日志数据库表
 * 
 * @returns TaskEither<AppError, void>
 */
export const initLogDatabase = (): TE.TaskEither<AppError, void> =>
  pipe(
    TE.tryCatch(
      () => invoke<void>("init_log_database"),
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to initialize log database: ${String(error)}`,
        originalError: error,
      }),
    ),
  );

/**
 * 检查日志数据库是否存在
 * 
 * @returns TaskEither<AppError, boolean>
 */
export const checkLogDatabaseExists = (): TE.TaskEither<AppError, boolean> =>
  pipe(
    TE.tryCatch(
      () => invoke<boolean>("check_log_database_exists"),
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to check log database: ${String(error)}`,
        originalError: error,
      }),
    ),
  );

// ============================================================================
// 迁移相关
// ============================================================================

/**
 * 检查是否需要从 IndexedDB 迁移
 * 
 * @returns TaskEither<AppError, boolean>
 */
export const checkNeedsMigration = (): TE.TaskEither<AppError, boolean> =>
  pipe(
    TE.tryCatch(
      () => invoke<boolean>("check_needs_migration"),
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to check migration status: ${String(error)}`,
        originalError: error,
      }),
    ),
  );

/**
 * 标记迁移完成
 * 
 * @returns TaskEither<AppError, void>
 */
export const markMigrationComplete = (): TE.TaskEither<AppError, void> =>
  pipe(
    TE.tryCatch(
      () => invoke<void>("mark_migration_complete"),
      (error): AppError => ({
        type: "LOG_STORAGE_ERROR",
        message: `Failed to mark migration complete: ${String(error)}`,
        originalError: error,
      }),
    ),
  );