/**
 * @file batch-log.flow.ts
 * @description 批量日志处理流程
 *
 * 实现日志缓冲区机制和批量写入策略，优化日志写入性能。
 * 使用 TaskEither 进行错误处理和函数组合。
 */

/// <reference types="node" />

import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import dayjs from "dayjs";
import type { LogEntry, LogLevel, LogConfig } from "@/types/log/log.interface";
import type { AppError } from "@/types/error/error.types";
import { DEFAULT_LOG_CONFIG } from "@/types/log/log.interface";

// Pipes
import {
  formatLogEntry,
  addConsoleColors,
  shouldLog,
  filterByLevel,
} from "@/pipes/log/log.format.pipe";

// IO
import { saveLogsBatchToSQLite } from "@/io/log/log.storage.api";
import { info } from "@/io/log/logger.api";

// ============================================================================
// 批量日志缓冲区
// ============================================================================

/**
 * 日志缓冲区状态
 */
interface LogBuffer {
  readonly entries: readonly LogEntry[];
  readonly lastFlushTime: number;
  readonly isFlushPending: boolean;
}

/**
 * 全局日志缓冲区
 */
let logBuffer: LogBuffer = {
  entries: [],
  lastFlushTime: dayjs().valueOf(),
  isFlushPending: false,
};

/**
 * 批量写入定时器
 */
let batchTimer: NodeJS.Timeout | null = null;

// ============================================================================
// 批量日志写入流程
// ============================================================================

/**
 * 添加日志条目到缓冲区
 * 
 * @param entry - 日志条目
 * @param config - 日志配置
 * @returns TaskEither<AppError, void>
 */
export const addLogToBuffer = (
  entry: LogEntry,
  config: LogConfig = DEFAULT_LOG_CONFIG,
): TE.TaskEither<AppError, void> => {
  // 检查是否应该记录此级别的日志
  if (!shouldLog(entry.level, config.minLevel)) {
    return TE.right(undefined);
  }

  // 控制台输出（如果启用）
  if (config.enableConsole) {
    const consoleOutput = addConsoleColors(entry);
    info("[BatchLog] Console output", { output: consoleOutput });
  }

  // 如果不启用存储，直接返回
  if (!config.enableStorage) {
    return TE.right(undefined);
  }

  // 添加到缓冲区（不可变方式）
  logBuffer = {
    ...logBuffer,
    entries: [...logBuffer.entries, entry],
  };

  // 检查是否需要立即刷新
  const shouldFlushImmediately = 
    logBuffer.entries.length >= config.batchSize ||
    entry.level === 'error' || // 错误日志立即写入
    entry.level === 'warn';     // 警告日志立即写入

  if (shouldFlushImmediately) {
    return flushLogBuffer(config);
  }

  // 设置延迟刷新
  scheduleFlush(config);
  
  return TE.right(undefined);
};

/**
 * 刷新日志缓冲区
 * 
 * @param config - 日志配置
 * @returns TaskEither<AppError, void>
 */
export const flushLogBuffer = (
  config: LogConfig = DEFAULT_LOG_CONFIG,
): TE.TaskEither<AppError, void> => {
  // 如果缓冲区为空或正在刷新，直接返回
  if (logBuffer.entries.length === 0 || logBuffer.isFlushPending) {
    return TE.right(undefined);
  }

  // 标记正在刷新（不可变方式）
  logBuffer = {
    ...logBuffer,
    isFlushPending: true,
  };

  // 获取当前缓冲区内容
  const entriesToFlush = [...logBuffer.entries];
  
  // 清空缓冲区（不可变方式）
  logBuffer = {
    ...logBuffer,
    entries: [],
    lastFlushTime: dayjs().valueOf(),
  };

  // 清除定时器
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  // 过滤符合级别要求的日志
  const filteredEntries = filterByLevel(entriesToFlush, config.minLevel);

  if (filteredEntries.length === 0) {
    logBuffer = {
      ...logBuffer,
      isFlushPending: false,
    };
    return TE.right(undefined);
  }

  return pipe(
    saveLogsBatchToSQLite(filteredEntries),
    TE.map(() => {
      logBuffer = {
        ...logBuffer,
        isFlushPending: false,
      };
    }),
    TE.mapLeft((error) => {
      // 刷新失败时，重新添加到缓冲区（避免丢失日志）
      logBuffer = {
        ...logBuffer,
        entries: [...filteredEntries, ...logBuffer.entries],
        isFlushPending: false,
      };
      return error;
    }),
  );
};

/**
 * 调度延迟刷新
 * 
 * @param config - 日志配置
 */
const scheduleFlush = (config: LogConfig): void => {
  // 如果已经有定时器，不重复设置
  if (batchTimer) {
    return;
  }

  batchTimer = setTimeout(() => {
    batchTimer = null;
    flushLogBuffer(config)();
  }, config.batchDelay);
};

// ============================================================================
// 批量日志记录器
// ============================================================================

/**
 * 创建批量日志流程的高阶函数
 * 
 * @param config - 日志配置
 * @returns 批量日志记录函数
 */
export const createBatchLogFlow = (config: LogConfig = DEFAULT_LOG_CONFIG) => {
  /**
   * 批量记录日志的核心流程
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
    // 格式化日志条目
    const entry = formatLogEntry(level, message, context, source);

    // 添加到批量缓冲区
    return addLogToBuffer(entry, config);
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
    
    // 批量操作
    flush: () => flushLogBuffer(config),
    getBufferSize: () => logBuffer.entries.length,
    isFlushPending: () => logBuffer.isFlushPending,
  };
};

// ============================================================================
// 批量日志管理
// ============================================================================

/**
 * 强制刷新所有待处理的日志
 * 
 * @returns TaskEither<AppError, void>
 */
export const forceFlushAllLogs = (): TE.TaskEither<AppError, void> =>
  flushLogBuffer(DEFAULT_LOG_CONFIG);

/**
 * 获取当前缓冲区状态
 * 
 * @returns 缓冲区状态信息
 */
export const getBufferStatus = () => ({
  entryCount: logBuffer.entries.length,
  lastFlushTime: logBuffer.lastFlushTime,
  isFlushPending: logBuffer.isFlushPending,
  timeSinceLastFlush: dayjs().valueOf() - logBuffer.lastFlushTime,
});

/**
 * 清空日志缓冲区（不保存）
 * 
 * @returns void
 */
export const clearLogBuffer = (): void => {
  logBuffer = {
    entries: [],
    lastFlushTime: dayjs().valueOf(),
    isFlushPending: false,
  };
  
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
};

/**
 * 应用关闭时的清理函数
 * 
 * @returns TaskEither<AppError, void>
 */
export const shutdownBatchLogger = (): TE.TaskEither<AppError, void> => {
  // 清除定时器
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  // 强制刷新剩余日志
  return flushLogBuffer(DEFAULT_LOG_CONFIG);
};

// ============================================================================
// 导出默认批量日志实例
// ============================================================================

/**
 * 默认批量日志实例
 */
export const defaultBatchLogger = createBatchLogFlow(DEFAULT_LOG_CONFIG);

/**
 * 便捷的批量日志函数
 */
export const batchLogDebug = defaultBatchLogger.debug;
export const batchLogInfo = defaultBatchLogger.info;
export const batchLogSuccess = defaultBatchLogger.success;
export const batchLogWarn = defaultBatchLogger.warn;
export const batchLogError = defaultBatchLogger.error;
export const batchLogTrace = defaultBatchLogger.trace;