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
import { DEFAULT_LOG_CONFIG } from "@/types/log/log.interface";

// Flows
import {
  createLogFlow,
  queryLogFlow,
  getRecentLogsFlow,
  autoCleanupLogFlow,
  validateLogConfigFlow,
  handleLogErrorFlow,
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
    TE.map((validConfig) => {
      currentConfig = validConfig;
      currentLogger = createLogFlow(validConfig);
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

// ============================================================================
// 日志管理函数
// ============================================================================

/**
 * 自动清理旧日志
 * 
 * @returns TaskEither<AppError, number>
 */
export const autoCleanupLogs = () => autoCleanupLogFlow(currentConfig);

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
  getRecentLogs,
  autoCleanupLogs,
  updateLogConfig,
  getCurrentLogConfig,
};