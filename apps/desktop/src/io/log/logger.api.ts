/**
 * @file logger.api.ts
 * @description 函数式日志 API
 *
 * 提供简洁的日志记录接口，内部使用 TaskEither 进行错误处理。
 * 这是应用程序的主要日志接口。
 */

import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import type { LogLevel, LogConfig, LogQueryOptions, LogQueryResult } from "@/types/log/log.interface";
import type { AppError } from "@/types/error/error.types";
import { logConfigError } from "@/types/error/error.types";
import { DEFAULT_LOG_CONFIG } from "@/types/log/log.interface";

// Flows
import {
  createLogFlow,
  queryLogFlow,
  paginatedQueryLogFlow,
  searchLogFlow,
  getRecentLogsFlow,
  getRecentErrorsFlow,
  getLogsBySourceFlow,
  autoCleanupLogFlow,
  validateLogConfigFlow,
  handleLogErrorFlow,
  flushPendingLogsFlow,
  getLogBufferStatusFlow,
  clearLogQueryCacheFlow,
  warmupLogQueryCacheFlow,
  flushAsyncQueueFlow,
  getAsyncQueueStatusFlow,
  pauseAsyncQueueFlow,
  resumeAsyncQueueFlow,
  checkNeedsCleanupFlow,
  getStorageMonitorInfoFlow,
  initAutoCleanupFlow,
  shutdownAutoCleanupFlow,
  getCurrentExtendedLogConfigFlow,
  updateExtendedLogConfigFlow,
  applyLogConfigPresetFlow,
  getLogConfigPresetsFlow,
} from "@/flows/log/log.flow";

// ============================================================================
// 全局日志配置
// ============================================================================

let currentConfig: LogConfig = DEFAULT_LOG_CONFIG;
let currentLogger = createLogFlow(currentConfig);

/**
 * 更新日志配置
 * 
 * @param config - 新的日志配置
 * @returns TaskEither<AppError, void>
 */
export const updateLogConfig = (config: Partial<LogConfig>): TE.TaskEither<AppError, void> =>
  pipe(
    validateLogConfigFlow(config),
    TE.chain((validationResult) => {
      if (!validationResult.isValid) {
        return TE.left(logConfigError(
          `Invalid configuration: ${validationResult.errors.join(", ")}`
        ));
      }
      
      currentConfig = { ...DEFAULT_LOG_CONFIG, ...config };
      currentLogger = createLogFlow(currentConfig);
      return TE.right(undefined);
    }),
  );

/**
 * 获取当前日志配置
 * 
 * @returns 当前配置
 */
export const getCurrentLogConfig = (): LogConfig => currentConfig;

// ============================================================================
// 基础日志记录函数
// ============================================================================

/**
 * 记录调试日志
 * 
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 * @returns TaskEither<AppError, void>
 */
export const logDebug = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): TE.TaskEither<AppError, void> =>
  pipe(
    currentLogger.debug(message, context, source),
    TE.orElse((error) =>
      pipe(
        handleLogErrorFlow(error, `Debug log failed: ${message}`),
        TE.fromTask,
      ),
    ),
  );

/**
 * 记录信息日志
 * 
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 * @returns TaskEither<AppError, void>
 */
export const logInfo = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): TE.TaskEither<AppError, void> =>
  pipe(
    currentLogger.info(message, context, source),
    TE.orElse((error) =>
      pipe(
        handleLogErrorFlow(error, `Info log failed: ${message}`),
        TE.fromTask,
      ),
    ),
  );

/**
 * 记录成功日志
 * 
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 * @returns TaskEither<AppError, void>
 */
export const logSuccess = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): TE.TaskEither<AppError, void> =>
  pipe(
    currentLogger.success(message, context, source),
    TE.orElse((error) =>
      pipe(
        handleLogErrorFlow(error, `Success log failed: ${message}`),
        TE.fromTask,
      ),
    ),
  );

/**
 * 记录警告日志
 * 
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 * @returns TaskEither<AppError, void>
 */
export const logWarn = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): TE.TaskEither<AppError, void> =>
  pipe(
    currentLogger.warn(message, context, source),
    TE.orElse((error) =>
      pipe(
        handleLogErrorFlow(error, `Warning log failed: ${message}`),
        TE.fromTask,
      ),
    ),
  );

/**
 * 记录错误日志
 * 
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 * @returns TaskEither<AppError, void>
 */
export const logError = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): TE.TaskEither<AppError, void> =>
  pipe(
    currentLogger.error(message, context, source),
    TE.orElse((error) =>
      pipe(
        handleLogErrorFlow(error, `Error log failed: ${message}`),
        TE.fromTask,
      ),
    ),
  );

/**
 * 记录跟踪日志
 * 
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 * @returns TaskEither<AppError, void>
 */
export const logTrace = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): TE.TaskEither<AppError, void> =>
  pipe(
    currentLogger.trace(message, context, source),
    TE.orElse((error) =>
      pipe(
        handleLogErrorFlow(error, `Trace log failed: ${message}`),
        TE.fromTask,
      ),
    ),
  );

// ============================================================================
// 便捷的同步日志函数（Fire-and-forget）
// ============================================================================

/**
 * 同步调试日志（不等待结果）
 * 
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 */
export const debug = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): void => {
  logDebug(message, context, source)();
};

/**
 * 同步信息日志（不等待结果）
 * 
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 */
export const info = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): void => {
  logInfo(message, context, source)();
};

/**
 * 同步成功日志（不等待结果）
 * 
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 */
export const success = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): void => {
  logSuccess(message, context, source)();
};

/**
 * 同步警告日志（不等待结果）
 * 
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 */
export const warn = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): void => {
  logWarn(message, context, source)();
};

/**
 * 同步错误日志（不等待结果）
 * 
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 */
export const error = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): void => {
  logError(message, context, source)();
};

/**
 * 同步跟踪日志（不等待结果）
 * 
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 */
export const trace = (
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): void => {
  logTrace(message, context, source)();
};

// ============================================================================
// 日志查询函数
// ============================================================================

/**
 * 查询日志条目
 * 
 * @param options - 查询选项
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const queryLogs = (
  options: LogQueryOptions = {},
): TE.TaskEither<AppError, LogQueryResult> => queryLogFlow(options);

/**
 * 分页查询日志条目
 * 
 * @param page - 页码（从1开始）
 * @param pageSize - 每页大小
 * @param filters - 过滤条件
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const queryLogsPaginated = (
  page: number = 1,
  pageSize: number = 50,
  filters: Omit<LogQueryOptions, 'limit' | 'offset'> = {},
): TE.TaskEither<AppError, LogQueryResult> => paginatedQueryLogFlow(page, pageSize, filters);

/**
 * 搜索日志条目
 * 
 * @param searchTerm - 搜索关键词
 * @param filters - 其他过滤条件
 * @param limit - 结果限制
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const searchLogs = (
  searchTerm: string,
  filters: Omit<LogQueryOptions, 'messageSearch' | 'limit'> = {},
  limit: number = 100,
): TE.TaskEither<AppError, LogQueryResult> => searchLogFlow(searchTerm, filters, limit);

/**
 * 获取最近的日志条目
 * 
 * @param limit - 限制数量
 * @param levelFilter - 级别过滤
 * @returns TaskEither<AppError, LogEntry[]>
 */
export const getRecentLogs = (
  limit = 100,
  levelFilter?: LogLevel[],
) => getRecentLogsFlow(limit, levelFilter);

/**
 * 获取最近的错误日志
 * 
 * @param limit - 限制数量
 * @param hours - 最近几小时
 * @returns TaskEither<AppError, LogEntry[]>
 */
export const getRecentErrors = (
  limit: number = 20,
  hours: number = 24,
) => getRecentErrorsFlow(limit, hours);

/**
 * 按来源获取日志
 * 
 * @param source - 日志来源
 * @param limit - 限制数量
 * @param levelFilter - 级别过滤
 * @returns TaskEither<AppError, LogEntry[]>
 */
export const getLogsBySource = (
  source: string,
  limit: number = 100,
  levelFilter?: LogLevel[],
) => getLogsBySourceFlow(source, limit, levelFilter);

// ============================================================================
// 日志管理函数
// ============================================================================

/**
 * 自动清理旧日志
 * 
 * @returns TaskEither<AppError, number>
 */
export const autoCleanupLogs = () => autoCleanupLogFlow();

/**
 * 检查是否需要清理
 * 
 * @returns TaskEither<AppError, boolean>
 */
export const checkNeedsCleanup = () => checkNeedsCleanupFlow();

/**
 * 获取存储监控信息
 * 
 * @returns TaskEither<AppError, StorageMonitorInfo>
 */
export const getStorageMonitorInfo = () => getStorageMonitorInfoFlow();

/**
 * 初始化自动清理系统
 * 
 * @returns TaskEither<AppError, void>
 */
export const initAutoCleanup = () => initAutoCleanupFlow();

/**
 * 关闭自动清理系统
 * 
 * @returns void
 */
export const shutdownAutoCleanup = () => shutdownAutoCleanupFlow();

/**
 * 强制刷新待处理的批量日志
 * 
 * @returns TaskEither<AppError, void>
 */
export const flushPendingLogs = () => flushPendingLogsFlow();

/**
 * 获取日志缓冲区状态
 * 
 * @returns 缓冲区状态信息
 */
export const getLogBufferStatus = () => getLogBufferStatusFlow();

/**
 * 清空查询缓存
 * 
 * @returns void
 */
export const clearQueryCache = () => clearLogQueryCacheFlow();

/**
 * 预热查询缓存
 * 
 * @returns TaskEither<AppError, void>
 */
export const warmupQueryCache = () => warmupLogQueryCacheFlow();

/**
 * 强制刷新异步队列
 * 
 * @returns TaskEither<AppError, void>
 */
export const flushAsyncQueue = () => flushAsyncQueueFlow();

/**
 * 获取异步队列状态
 * 
 * @returns 队列状态信息
 */
export const getAsyncQueueStatus = () => getAsyncQueueStatusFlow();

/**
 * 暂停异步队列处理
 * 
 * @returns void
 */
export const pauseAsyncQueue = () => pauseAsyncQueueFlow();

/**
 * 恢复异步队列处理
 * 
 * @returns void
 */
export const resumeAsyncQueue = () => resumeAsyncQueueFlow();

/**
 * 关闭异步日志系统
 * 
 * @returns TaskEither<AppError, void>
 */
export const shutdownAsyncLogger = () => {
  console.warn("Async logger not implemented yet");
  return TE.right(undefined);
};

// ============================================================================
// 配置管理函数
// ============================================================================

/**
 * 获取当前扩展日志配置
 * 
 * @returns 扩展日志配置
 */
export const getCurrentExtendedLogConfig = () => getCurrentExtendedLogConfigFlow();

/**
 * 更新扩展日志配置
 * 
 * @param config - 新的配置
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const updateExtendedLogConfig = (config: any) => updateExtendedLogConfigFlow(config);

/**
 * 应用配置预设
 * 
 * @param presetName - 预设名称
 * @returns TaskEither<AppError, ExtendedLogConfig>
 */
export const applyLogConfigPreset = (presetName: string) => applyLogConfigPresetFlow(presetName);

/**
 * 获取配置预设列表
 * 
 * @returns 配置预设列表
 */
export const getLogConfigPresets = () => getLogConfigPresetsFlow();

// ============================================================================
// 默认导出（向后兼容）
// ============================================================================

/**
 * 默认日志对象（向后兼容旧的 logger 接口）
 */
export default {
  debug,
  info,
  success,
  warn,
  error,
  trace,
  // 异步版本
  logDebug,
  logInfo,
  logSuccess,
  logWarn,
  logError,
  logTrace,
  // 查询和管理
  queryLogs,
  queryLogsPaginated,
  searchLogs,
  getRecentLogs,
  getRecentErrors,
  getLogsBySource,
  autoCleanupLogs,
  flushPendingLogs,
  getLogBufferStatus,
  clearQueryCache,
  warmupQueryCache,
  // 异步队列管理
  flushAsyncQueue,
  getAsyncQueueStatus,
  pauseAsyncQueue,
  resumeAsyncQueue,
  shutdownAsyncLogger,
  // 自动清理管理
  checkNeedsCleanup,
  getStorageMonitorInfo,
  initAutoCleanup,
  shutdownAutoCleanup,
  // 配置管理
  updateLogConfig,
  getCurrentLogConfig,
  getCurrentExtendedLogConfig,
  updateExtendedLogConfig,
  applyLogConfigPreset,
  getLogConfigPresets,
};