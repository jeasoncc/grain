/**
 * @file log.flow.ts
 * @description 日志业务流程
 *
 * 组合 pipes 和 io 操作，实现完整的日志业务流程。
 * 使用 TaskEither 进行错误处理和函数组合。
 */

import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/Task";
import { pipe } from "fp-ts/function";
import type { LogEntry, LogLevel, LogConfig, LogQueryOptions, LogQueryResult } from "@/types/log/log.interface";
import type { AppError } from "@/types/error/error.types";
import { DEFAULT_LOG_CONFIG } from "@/types/log/log.interface";

// Pipes
import {
  formatLogEntry,
  addConsoleColors,
  shouldLog,
  filterByLevel,
  sortByTimestamp,
  isValidLogConfig,
} from "@/pipes/log/log.format.pipe";

// IO
import {
  saveLogToSQLite,
  saveLogsBatchToSQLite,
  queryLogsFromSQLite,
  clearOldLogsFromSQLite,
} from "@/io/log/log.storage.api";

// ============================================================================
// 日志记录流程
// ============================================================================

/**
 * 创建日志流程的高阶函数
 * 
 * @param config - 日志配置
 * @returns 日志记录函数
 */
export const createLogFlow = (config: LogConfig = DEFAULT_LOG_CONFIG) => {
  /**
   * 记录日志的核心流程
   * 
   * @param level - 日志级别
   * @param message - 日志消息
   * @param context - 上下文信息
   * @param source - 日志来源
   * @returns TaskEither<AppError, void>
   */
  const logEntry = (
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    source?: string,
  ): TE.TaskEither<AppError, void> => {
    // 检查是否应该记录此级别的日志
    if (!shouldLog(level, config.minLevel)) {
      return TE.right(undefined);
    }

    // 格式化日志条目
    const entry = formatLogEntry(level, message, context, source);

    // 控制台输出（如果启用）
    if (config.enableConsole) {
      const consoleOutput = addConsoleColors(entry);
      console.log(consoleOutput);
    }

    // 持久化存储（如果启用）
    if (config.enableStorage) {
      return saveLogToSQLite(entry);
    }

    return TE.right(undefined);
  };

  return {
    logEntry,
    debug: (message: string, context?: Record<string, unknown>, source?: string) =>
      logEntry('debug', message, context, source),
    info: (message: string, context?: Record<string, unknown>, source?: string) =>
      logEntry('info', message, context, source),
    success: (message: string, context?: Record<string, unknown>, source?: string) =>
      logEntry('success', message, context, source),
    warn: (message: string, context?: Record<string, unknown>, source?: string) =>
      logEntry('warn', message, context, source),
    error: (message: string, context?: Record<string, unknown>, source?: string) =>
      logEntry('error', message, context, source),
    trace: (message: string, context?: Record<string, unknown>, source?: string) =>
      logEntry('trace', message, context, source),
  };
};

// ============================================================================
// 批量日志处理流程
// ============================================================================

/**
 * 批量保存日志条目
 * 
 * @param entries - 日志条目数组
 * @param config - 日志配置
 * @returns TaskEither<AppError, void>
 */
export const saveBatchLogFlow = (
  entries: LogEntry[],
  config: LogConfig = DEFAULT_LOG_CONFIG,
): TE.TaskEither<AppError, void> => {
  if (!config.enableStorage || entries.length === 0) {
    return TE.right(undefined);
  }

  // 过滤符合级别要求的日志
  const filteredEntries = filterByLevel(entries, config.minLevel);

  if (filteredEntries.length === 0) {
    return TE.right(undefined);
  }

  return saveLogsBatchToSQLite(filteredEntries);
};

// ============================================================================
// 日志查询流程
// ============================================================================

/**
 * 查询日志条目流程
 * 
 * @param options - 查询选项
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const queryLogFlow = (
  options: LogQueryOptions = {},
): TE.TaskEither<AppError, LogQueryResult> =>
  pipe(
    queryLogsFromSQLite(options),
    TE.map((result) => ({
      ...result,
      entries: pipe(
        result.entries,
        (entries) => sortByTimestamp(entries, false), // 最新的在前
      ),
    })),
  );

/**
 * 获取最近的日志条目
 * 
 * @param limit - 限制数量
 * @param levelFilter - 级别过滤
 * @returns TaskEither<AppError, LogEntry[]>
 */
export const getRecentLogsFlow = (
  limit = 100,
  levelFilter?: LogLevel[],
): TE.TaskEither<AppError, LogEntry[]> =>
  pipe(
    queryLogsFromSQLite({
      limit,
      levelFilter,
      offset: 0,
    }),
    TE.map((result) => result.entries),
  );

// ============================================================================
// 日志清理流程
// ============================================================================

/**
 * 自动清理旧日志流程
 * 
 * @param config - 日志配置
 * @returns TaskEither<AppError, number> 返回清理的条目数
 */
export const autoCleanupLogFlow = (): TE.TaskEither<AppError, number> => {
  // 计算清理日期（保留最近的 maxEntries 条目对应的时间范围）
  const cleanupDate = new Date();
  cleanupDate.setDate(cleanupDate.getDate() - 30); // 默认保留30天

  return clearOldLogsFromSQLite(cleanupDate.toISOString());
};

// ============================================================================
// 配置验证流程
// ============================================================================

/**
 * 验证并应用日志配置
 * 
 * @param config - 日志配置
 * @returns TaskEither<AppError, LogConfig>
 */
export const validateLogConfigFlow = (
  config: Partial<LogConfig>,
): TE.TaskEither<AppError, LogConfig> => {
  const mergedConfig = { ...DEFAULT_LOG_CONFIG, ...config };

  if (!isValidLogConfig(mergedConfig)) {
    return TE.left({
      type: "LOG_CONFIG_ERROR",
      message: "Invalid log configuration provided",
    });
  }

  return TE.right(mergedConfig);
};

// ============================================================================
// 错误处理流程
// ============================================================================

/**
 * 日志错误处理流程
 * 
 * 当日志操作失败时的降级策略
 * 
 * @param error - 错误信息
 * @param fallbackMessage - 降级消息
 * @returns Task<void>
 */
export const handleLogErrorFlow = (
  error: AppError,
  fallbackMessage?: string,
): T.Task<void> =>
  T.of(() => {
    // 降级到控制台输出
    const message = fallbackMessage || `Log operation failed: ${error.message}`;
    console.warn(`⚠️ [LOG_FALLBACK] ${message}`);
    
    // 可以在这里添加其他降级策略，如发送到远程日志服务
  });

// ============================================================================
// 导出默认日志实例
// ============================================================================

/**
 * 默认日志实例
 */
export const defaultLogger = createLogFlow(DEFAULT_LOG_CONFIG);

/**
 * 便捷的日志函数
 */
export const logDebug = defaultLogger.debug;
export const logInfo = defaultLogger.info;
export const logSuccess = defaultLogger.success;
export const logWarn = defaultLogger.warn;
export const logError = defaultLogger.error;
export const logTrace = defaultLogger.trace;