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
} from "@/pipes/log/log.format.pipe";

// IO (符合架构规范)
import {
  createSimpleLogger,
  type SimpleLogger,
} from "@/io/log/simple-logger.api";
import {
  saveLogsBatchToSQLite,
} from "@/io/log/log.storage.api";
import { warn } from "@/io/log/logger.api";

// Batch logging
import {
  createBatchLogFlow,
  forceFlushAllLogs,
  getBufferStatus,
} from "./batch-log.flow";

// Query optimization
import {
  optimizedQueryLogsFlow,
  paginatedQueryLogsFlow,
  searchLogsFlow,
  getRecentErrorLogsFlow,
  getLogsBySourceFlow as getLogsBySourceOptimizedFlow,
  clearQueryCache,
  warmupQueryCache,
} from "./query-optimization.flow";

// Auto-cleanup
import {
  executeAutoCleanup,
  checkNeedsCleanup,
  getStorageMonitorInfo,
  initAutoCleanup,
  shutdownAutoCleanup,
} from "./auto-cleanup.flow";

// Configuration
import {
  getCurrentLogConfig as getCurrentExtendedLogConfig,
  updateLogConfig as updateExtendedLogConfig,
  validateLogConfigFlow as validateLogConfig,
  applyLogConfigPreset,
  getLogConfigPresets,
} from "./config.flow";

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
  // 使用简化的日志记录器（符合架构规范）
  const simpleLogger = createSimpleLogger(config);
  
  // 根据配置决定使用哪种日志模式
  const useBatchLogging = config.batchSize > 1 && config.batchDelay > 0;
  const useAsyncLogging = config.batchDelay === 0; // 如果延迟为0，使用异步队列模式
  
  if (useAsyncLogging) {
    // 使用异步队列日志流程 - 需要实现
    warn("[LogFlow] Async logging not yet implemented, falling back to direct mode");
  }
  
  if (useBatchLogging) {
    // 使用批量日志流程
    return createBatchLogFlow(config);
  }

  return {
    logEntry: simpleLogger.log,
    debug: simpleLogger.debug,
    info: simpleLogger.info,
    success: simpleLogger.success,
    warn: simpleLogger.warn,
    error: simpleLogger.error,
    trace: simpleLogger.trace,
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
  entries: readonly LogEntry[],
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
 * 查询日志条目流程（优化版本）
 * 
 * @param options - 查询选项
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const queryLogFlow = (
  options: LogQueryOptions = {},
): TE.TaskEither<AppError, LogQueryResult> =>
  optimizedQueryLogsFlow(options);

/**
 * 分页查询日志条目
 * 
 * @param page - 页码（从1开始）
 * @param pageSize - 每页大小
 * @param filters - 过滤条件
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const paginatedQueryLogFlow = (
  page: number = 1,
  pageSize: number = 50,
  filters: Omit<LogQueryOptions, 'limit' | 'offset'> = {},
): TE.TaskEither<AppError, LogQueryResult> =>
  paginatedQueryLogsFlow(page, pageSize, filters);

/**
 * 搜索日志条目
 * 
 * @param searchTerm - 搜索关键词
 * @param filters - 其他过滤条件
 * @param limit - 结果限制
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const searchLogFlow = (
  searchTerm: string,
  filters: Omit<LogQueryOptions, 'messageSearch' | 'limit'> = {},
  limit: number = 100,
): TE.TaskEither<AppError, LogQueryResult> =>
  searchLogsFlow(searchTerm, filters, limit);

/**
 * 获取最近的日志条目
 * 
 * @param limit - 限制数量
 * @param levelFilter - 级别过滤
 * @returns TaskEither<AppError, LogEntry[]>
 */
export const getRecentLogsFlow = (
  limit = 100,
  levelFilter?: readonly LogLevel[],
): TE.TaskEither<AppError, readonly LogEntry[]> =>
  pipe(
    optimizedQueryLogsFlow({
      limit,
      levelFilter,
      offset: 0,
    }),
    TE.map((result) => result.entries),
  );

/**
 * 获取最近的错误日志
 * 
 * @param limit - 限制数量
 * @param hours - 最近几小时
 * @returns TaskEither<AppError, LogEntry[]>
 */
export const getRecentErrorsFlow = (
  limit: number = 20,
  hours: number = 24,
): TE.TaskEither<AppError, readonly LogEntry[]> =>
  getRecentErrorLogsFlow(limit, hours);

/**
 * 按来源获取日志
 * 
 * @param source - 日志来源
 * @param limit - 限制数量
 * @param levelFilter - 级别过滤
 * @returns TaskEither<AppError, LogEntry[]>
 */
export const getLogsBySourceFlow = (
  source: string,
  limit: number = 100,
  levelFilter?: readonly LogLevel[],
): TE.TaskEither<AppError, readonly LogEntry[]> =>
  getLogsBySourceOptimizedFlow(source, limit, levelFilter);

// ============================================================================
// 日志管理函数
// ============================================================================

/**
 * 自动清理旧日志流程
 * 
 * @returns TaskEither<AppError, number> 返回清理的条目数
 */
export const autoCleanupLogFlow = (): TE.TaskEither<AppError, number> =>
  pipe(
    executeAutoCleanup(),
    TE.map((stats) => stats.entriesRemoved),
  );

/**
 * 检查是否需要清理
 * 
 * @returns TaskEither<AppError, boolean>
 */
export const checkNeedsCleanupFlow = (): TE.TaskEither<AppError, boolean> =>
  checkNeedsCleanup();

/**
 * 获取存储监控信息
 * 
 * @returns TaskEither<AppError, StorageMonitorInfo>
 */
export const getStorageMonitorInfoFlow = () => getStorageMonitorInfo();

/**
 * 初始化自动清理系统
 * 
 * @returns TaskEither<AppError, void>
 */
export const initAutoCleanupFlow = () => initAutoCleanup();

/**
 * 关闭自动清理系统
 * 
 * @returns void
 */
export const shutdownAutoCleanupFlow = () => shutdownAutoCleanup();

/**
 * 强制刷新所有待处理的批量日志
 * 
 * @returns TaskEither<AppError, void>
 */
export const flushPendingLogsFlow = (): TE.TaskEither<AppError, void> =>
  forceFlushAllLogs();

/**
 * 获取日志缓冲区状态
 * 
 * @returns 缓冲区状态信息
 */
export const getLogBufferStatusFlow = () => getBufferStatus();

/**
 * 清空查询缓存
 * 
 * @returns void
 */
export const clearLogQueryCacheFlow = () => clearQueryCache();

/**
 * 预热查询缓存
 * 
 * @returns TaskEither<AppError, void>
 */
export const warmupLogQueryCacheFlow = () => warmupQueryCache();

/**
 * 强制刷新异步队列
 * 
 * @returns TaskEither<AppError, void>
 */
export const flushAsyncQueueFlow = () => {
  warn("[LogFlow] Async queue not implemented yet");
  return TE.right(undefined);
};

/**
 * 获取异步队列状态
 * 
 * @returns 队列状态信息
 */
export const getAsyncQueueStatusFlow = () => ({
  queueSize: 0,
  isProcessing: false,
  totalProcessed: 0,
});

/**
 * 暂停异步队列处理
 * 
 * @returns void
 */
export const pauseAsyncQueueFlow = () => {
  warn("[LogFlow] Async queue not implemented yet");
};

/**
 * 恢复异步队列处理
 * 
 * @returns void
 */
export const resumeAsyncQueueFlow = () => {
  warn("[LogFlow] Async queue not implemented yet");
};

// ============================================================================
// 配置管理流程
// ============================================================================

/**
 * 获取当前扩展日志配置
 * 
 * @returns 扩展日志配置
 */
export const getCurrentExtendedLogConfigFlow = () => getCurrentExtendedLogConfig();

/**
 * 更新扩展日志配置
 * 
 * @param config - 新的配置
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const updateExtendedLogConfigFlow = (config: any) => updateExtendedLogConfig(config);

/**
 * 验证日志配置
 * 
 * @param config - 要验证的配置
 * @returns TaskEither<AppError, LogConfigValidationResult>
 */
export const validateLogConfigFlow = (config: any) => validateLogConfig(config);

/**
 * 应用日志配置预设
 * 
 * @param presetName - 预设名称
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const applyLogConfigPresetFlow = (presetName: string) => applyLogConfigPreset(presetName);

/**
 * 获取所有日志配置预设
 * 
 * @returns 配置预设列表
 */
export const getLogConfigPresetsFlow = () => getLogConfigPresets();

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
  T.fromIO(() => {
    // 降级到控制台输出
    const message = fallbackMessage || `Log operation failed: ${error.message}`;
    warn(`⚠️ [LOG_FALLBACK] ${message}`);
    
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