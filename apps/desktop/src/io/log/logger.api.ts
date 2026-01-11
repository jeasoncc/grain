/**
 * @file logger.api.ts
 * @description 函数式日志 API（重构版本）
 *
 * 这个文件现在符合架构规范，只依赖 types 和同层的 simple-logger。
 * 复杂的业务流程通过依赖注入的方式从 flows 层传入。
 */

import * as TE from "fp-ts/TaskEither";
import type { LogLevel, LogConfig, LogQueryOptions, LogQueryResult, LogEntry } from "@/types/log/log.interface";
import type { AppError } from "@/types/error/error.types";
import { logConfigError } from "@/types/error/error.types";
import { DEFAULT_LOG_CONFIG } from "@/types/log/log.interface";

// Simple Logger (符合架构规范)
import {
  createSimpleLogger,
  type SimpleLogger,
  logDebugAsync,
  logInfoAsync,
  logSuccessAsync,
  logWarnAsync,
  logErrorAsync,
  logTraceAsync,
  debug,
  info,
  success,
  warn,
  error,
  trace,
  updateDefaultLoggerConfig,
  getCurrentLoggerConfig,
} from "./simple-logger.api";

// ============================================================================
// 全局日志配置
// ============================================================================

let currentConfig: LogConfig = DEFAULT_LOG_CONFIG;
let currentLogger: SimpleLogger = createSimpleLogger(currentConfig);

/**
 * 更新日志配置
 * 
 * @param config - 新的日志配置
 * @returns TaskEither<AppError, void>
 */
export const updateLogConfig = (config: Partial<LogConfig>): TE.TaskEither<AppError, void> => {
  const validation = updateDefaultLoggerConfig(config);
  
  if (!validation.isValid) {
    return TE.left(logConfigError(
      `Invalid configuration: ${validation.errors.join(", ")}`
    ));
  }
  
  currentConfig = { ...DEFAULT_LOG_CONFIG, ...config };
  currentLogger = createSimpleLogger(currentConfig);
  return TE.right(undefined);
};

/**
 * 获取当前日志配置
 * 
 * @returns 当前配置
 */
export const getCurrentLogConfig = (): LogConfig => getCurrentLoggerConfig();

// ============================================================================
// 异步日志记录函数（返回 TaskEither）
// ============================================================================

// 直接导出 simple-logger 的异步函数
export {
  logDebugAsync,
  logInfoAsync,
  logSuccessAsync,
  logWarnAsync,
  logErrorAsync,
  logTraceAsync,
};

// 向后兼容的别名
export const logDebug = logDebugAsync;
export const logInfo = logInfoAsync;
export const logSuccess = logSuccessAsync;
export const logWarn = logWarnAsync;
export const logError = logErrorAsync;
export const logTrace = logTraceAsync;

// ============================================================================
// 同步日志函数（Fire-and-forget，主要使用接口）
// ============================================================================

// 直接导出 simple-logger 的同步函数
export {
  debug,
  info,
  success,
  warn,
  error,
  trace,
};

// ============================================================================
// 高级功能（通过依赖注入实现）
// ============================================================================

/**
 * 高级日志功能的类型定义
 * 这些功能由 flows 层提供，通过依赖注入使用
 */
export interface AdvancedLogFeatures {
  readonly queryLogs: (options?: LogQueryOptions) => TE.TaskEither<AppError, LogQueryResult>;
  readonly queryLogsPaginated: (page?: number, pageSize?: number, filters?: Omit<LogQueryOptions, 'limit' | 'offset'>) => TE.TaskEither<AppError, LogQueryResult>;
  readonly searchLogs: (searchTerm: string, filters?: Omit<LogQueryOptions, 'messageSearch' | 'limit'>, limit?: number) => TE.TaskEither<AppError, LogQueryResult>;
  readonly getRecentLogs: (limit?: number, levelFilter?: readonly LogLevel[]) => TE.TaskEither<AppError, readonly LogEntry[]>;
  readonly getRecentErrors: (limit?: number, hours?: number) => TE.TaskEither<AppError, readonly LogEntry[]>;
  readonly getLogsBySource: (source: string, limit?: number, levelFilter?: readonly LogLevel[]) => TE.TaskEither<AppError, readonly LogEntry[]>;
  readonly autoCleanupLogs: () => TE.TaskEither<AppError, number>;
  readonly flushPendingLogs: () => TE.TaskEither<AppError, void>;
}

/**
 * 高级功能实例（通过依赖注入设置）
 */
let advancedFeatures: AdvancedLogFeatures | null = null;

/**
 * 注入高级日志功能（由 flows 层调用）
 * 
 * @param features - 高级功能实现
 */
export const injectAdvancedLogFeatures = (features: AdvancedLogFeatures): void => {
  advancedFeatures = features;
};

/**
 * 查询日志条目
 * 
 * @param options - 查询选项
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const queryLogs = (
  options: LogQueryOptions = {},
): TE.TaskEither<AppError, LogQueryResult> => {
  if (!advancedFeatures) {
    return TE.left(logConfigError('Advanced log features not available. Please inject them from flows layer.'));
  }
  return advancedFeatures.queryLogs(options);
};

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
): TE.TaskEither<AppError, LogQueryResult> => {
  if (!advancedFeatures) {
    return TE.left(logConfigError('Advanced log features not available. Please inject them from flows layer.'));
  }
  return advancedFeatures.queryLogsPaginated(page, pageSize, filters);
};

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
): TE.TaskEither<AppError, LogQueryResult> => {
  if (!advancedFeatures) {
    return TE.left(logConfigError('Advanced log features not available. Please inject them from flows layer.'));
  }
  return advancedFeatures.searchLogs(searchTerm, filters, limit);
};

/**
 * 获取最近的日志条目
 * 
 * @param limit - 限制数量
 * @param levelFilter - 级别过滤
 * @returns TaskEither<AppError, LogEntry[]>
 */
export const getRecentLogs = (
  limit = 100,
  levelFilter?: readonly LogLevel[],
) => {
  if (!advancedFeatures) {
    return TE.left(logConfigError('Advanced log features not available. Please inject them from flows layer.'));
  }
  return advancedFeatures.getRecentLogs(limit, levelFilter);
};

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
) => {
  if (!advancedFeatures) {
    return TE.left(logConfigError('Advanced log features not available. Please inject them from flows layer.'));
  }
  return advancedFeatures.getRecentErrors(limit, hours);
};

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
  levelFilter?: readonly LogLevel[],
) => {
  if (!advancedFeatures) {
    return TE.left(logConfigError('Advanced log features not available. Please inject them from flows layer.'));
  }
  return advancedFeatures.getLogsBySource(source, limit, levelFilter);
};

/**
 * 自动清理旧日志
 * 
 * @returns TaskEither<AppError, number>
 */
export const autoCleanupLogs = () => {
  if (!advancedFeatures) {
    return TE.left(logConfigError('Advanced log features not available. Please inject them from flows layer.'));
  }
  return advancedFeatures.autoCleanupLogs();
};

/**
 * 强制刷新待处理的批量日志
 * 
 * @returns TaskEither<AppError, void>
 */
export const flushPendingLogs = () => {
  if (!advancedFeatures) {
    return TE.left(logConfigError('Advanced log features not available. Please inject them from flows layer.'));
  }
  return advancedFeatures.flushPendingLogs();
};

// ============================================================================
// 简化的功能（直接可用）
// ============================================================================

/**
 * 获取当前日志记录器实例
 */
export const getCurrentLogger = (): SimpleLogger => currentLogger;

/**
 * 创建新的日志记录器实例
 * 
 * @param config - 日志配置
 * @returns 日志记录器实例
 */
export const createLogger = (config: Partial<LogConfig> = {}): SimpleLogger => 
  createSimpleLogger(config);

// ============================================================================
// 主要导出（所有函数已在上面定义时直接导出）
// ============================================================================