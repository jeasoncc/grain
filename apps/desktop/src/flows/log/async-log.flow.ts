/**
 * @file async-log.flow.ts
 * @description 异步日志处理流程
 *
 * 实现非阻塞的日志处理机制，包括日志队列、工作线程和优先级处理。
 * 确保日志操作不阻塞主线程，提供高性能的日志处理能力。
 */

/// <reference types="node" />

import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/Task";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import { sortBy } from "es-toolkit";
import type { LogEntry, LogLevel, LogConfig } from "@/types/log/log.interface";
import type { AppError } from "@/types/error/error.types";
import { DEFAULT_LOG_CONFIG } from "@/types/log/log.interface";

// Pipes
import {
  formatLogEntry,
  addConsoleColors,
  shouldLog,
} from "@/pipes/log/log.format.pipe";

// IO
import { saveLogsBatchToSQLite } from "@/io/log/log.storage.api";

// ============================================================================
// 日志队列类型定义
// ============================================================================

/**
 * 日志队列项
 */
interface LogQueueItem {
  readonly id: string;
  readonly entry: LogEntry;
  readonly priority: number;
  readonly timestamp: number;
  readonly retryCount: number;
}

/**
 * 队列处理状态
 */
interface QueueProcessorState {
  readonly isProcessing: boolean;
  readonly processedCount: number;
  readonly errorCount: number;
  readonly lastProcessTime: number;
  readonly averageProcessTime: number;
}

/**
 * 异步日志配置
 */
interface AsyncLogConfig extends LogConfig {
  /** 队列最大大小 */
  readonly maxQueueSize: number;
  /** 处理间隔（毫秒） */
  readonly processInterval: number;
  /** 最大重试次数 */
  readonly maxRetries: number;
  /** 高优先级阈值 */
  readonly highPriorityLevels: readonly LogLevel[];
}

// ============================================================================
// 全局队列状态
// ============================================================================

/**
 * 日志队列
 */
let logQueue: readonly LogQueueItem[] = [];

/**
 * 队列处理器状态
 */
let processorState: QueueProcessorState = {
  isProcessing: false,
  processedCount: 0,
  errorCount: 0,
  lastProcessTime: Date.now(),
  averageProcessTime: 0,
};

/**
 * 队列处理定时器
 */
let queueProcessor: NodeJS.Timeout | null = null;

/**
 * 默认异步日志配置
 */
const DEFAULT_ASYNC_CONFIG: AsyncLogConfig = {
  ...DEFAULT_LOG_CONFIG,
  maxQueueSize: 1000,
  processInterval: 100, // 100ms
  maxRetries: 3,
  highPriorityLevels: ['error', 'warn'],
};

// ============================================================================
// 优先级计算
// ============================================================================

/**
 * 计算日志条目的优先级
 * 
 * @param entry - 日志条目
 * @param config - 异步日志配置
 * @returns 优先级数值（越大越优先）
 */
const calculatePriority = (entry: LogEntry, config: AsyncLogConfig): number => {
  let priority = 0;
  
  // 基于日志级别的优先级
  if (config.highPriorityLevels.includes(entry.level)) {
    priority += 100;
  }
  
  switch (entry.level) {
    case 'error':
      priority += 50;
      break;
    case 'warn':
      priority += 30;
      break;
    case 'info':
      priority += 10;
      break;
    case 'success':
      priority += 10;
      break;
    case 'debug':
      priority += 5;
      break;
    case 'trace':
      priority += 1;
      break;
  }
  
  // 时间因子（越新的日志优先级越高）
  const now = Date.now();
  const entryTime = new Date(entry.timestamp).getTime();
  const timeFactor = Math.max(0, 10 - (now - entryTime) / 1000); // 10秒内的日志有时间加成
  priority += timeFactor;
  
  return priority;
};

// ============================================================================
// 队列管理
// ============================================================================

/**
 * 添加日志条目到异步队列
 * 
 * @param entry - 日志条目
 * @param config - 异步日志配置
 * @returns TaskEither<AppError, void>
 */
export const addLogToAsyncQueue = (
  entry: LogEntry,
  config: AsyncLogConfig = DEFAULT_ASYNC_CONFIG,
): TE.TaskEither<AppError, void> => {
  return TE.tryCatch(
    async () => {
      // 检查队列大小限制
      if (logQueue.length >= config.maxQueueSize) {
        // 移除最旧的低优先级条目
        const sortedQueue = sortBy([...logQueue], [
          item => item.priority,  // 按优先级升序
          item => item.timestamp  // 按时间戳升序
        ]);
        const toRemove = sortedQueue.slice(0, Math.floor(config.maxQueueSize * 0.1)); // 移除10%的最低优先级条目
        const toRemoveIds = new Set(toRemove.map(r => r.id));
        logQueue = logQueue.filter(item => !toRemoveIds.has(item.id));
      }
      
      // 创建队列项
      const queueItem: LogQueueItem = {
        id: entry.id || `queue-${Date.now()}-${Math.random()}`,
        entry,
        priority: calculatePriority(entry, config),
        timestamp: Date.now(),
        retryCount: 0,
      };
      
      // 添加到队列并按优先级排序
      const newQueue = [...logQueue, queueItem];
      logQueue = sortBy(newQueue, [
        item => -item.priority,  // 按优先级降序（负号）
        item => item.timestamp   // 按时间戳升序
      ]);
      
      // 启动队列处理器（如果未运行）
      startQueueProcessor(config);
      
      // 立即控制台输出（如果启用）
      if (config.enableConsole) {
        const consoleOutput = addConsoleColors(entry);
        console.log(consoleOutput);
      }
    },
    (error): AppError => ({
      type: "LOG_QUEUE_ERROR",
      message: `Failed to add log to async queue: ${String(error)}`,
      originalError: error,
    }),
  );
};

/**
 * 启动队列处理器
 * 
 * @param config - 异步日志配置
 */
const startQueueProcessor = (config: AsyncLogConfig): void => {
  if (queueProcessor || !config.enableStorage) {
    return;
  }
  
  queueProcessor = setInterval(() => {
    processLogQueue(config)();
  }, config.processInterval);
};

/**
 * 停止队列处理器
 */
const stopQueueProcessor = (): void => {
  if (queueProcessor) {
    clearInterval(queueProcessor);
    queueProcessor = null;
  }
};

/**
 * 处理日志队列
 * 
 * @param config - 异步日志配置
 * @returns Task<void>
 */
const processLogQueue = (config: AsyncLogConfig): T.Task<void> =>
  () => {
    if (processorState.isProcessing || logQueue.length === 0) {
      return Promise.resolve();
    }
    
    // 更新状态：开始处理
    processorState = {
      ...processorState,
      isProcessing: true,
    };
    const startTime = Date.now();
    
    return (async () => {
      try {
        // 获取一批要处理的日志（最多批量大小）
        const batchSize = Math.min(config.batchSize, logQueue.length);
        const batch = logQueue.slice(0, batchSize);
        const remainingQueue = logQueue.slice(batchSize);
        logQueue = remainingQueue;
        
        if (batch.length === 0) {
          return;
        }
        
        // 提取日志条目
        const entries = batch.map(item => item.entry);
        
        // 批量保存到 SQLite
        const saveResult = await saveLogsBatchToSQLite(entries)();
        
        if (E.isLeft(saveResult)) {
          // 保存失败，重新加入队列（增加重试计数）
          const retriedItems = batch
            .filter(item => item.retryCount < config.maxRetries)
            .map(item => ({
              ...item,
              retryCount: item.retryCount + 1,
              priority: item.priority - 10, // 降低优先级
            }));
          
          logQueue = [...retriedItems, ...logQueue];
          processorState = {
            ...processorState,
            errorCount: processorState.errorCount + (batch.length - retriedItems.length),
          };
        } else {
          // 保存成功
          processorState = {
            ...processorState,
            processedCount: processorState.processedCount + batch.length,
          };
        }
        
        // 更新处理时间统计
        const processTime = Date.now() - startTime;
        processorState = {
          ...processorState,
          averageProcessTime: (processorState.averageProcessTime * 0.9) + (processTime * 0.1),
          lastProcessTime: Date.now(),
        };
        
      } catch (error) {
        console.warn('Queue processor error:', error);
        processorState = {
          ...processorState,
          errorCount: processorState.errorCount + 1,
        };
      } finally {
        processorState = {
          ...processorState,
          isProcessing: false,
        };
      }
    })();
  };

// ============================================================================
// 异步日志记录器
// ============================================================================

/**
 * 创建异步日志流程的高阶函数
 * 
 * @param config - 异步日志配置
 * @returns 异步日志记录函数
 */
export const createAsyncLogFlow = (config: AsyncLogConfig = DEFAULT_ASYNC_CONFIG) => {
  /**
   * 异步记录日志的核心流程
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

    // 添加到异步队列
    return addLogToAsyncQueue(entry, config);
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
    
    // 队列管理
    getQueueSize: () => logQueue.length,
    getProcessorState: () => ({ ...processorState }),
    flushQueue: () => forceFlushAsyncQueue(config),
    clearQueue: () => clearAsyncQueue(),
  };
};

// ============================================================================
// 队列管理函数
// ============================================================================

/**
 * 强制刷新异步队列
 * 
 * @param config - 异步日志配置
 * @returns TaskEither<AppError, void>
 */
export const forceFlushAsyncQueue = (
  config: AsyncLogConfig = DEFAULT_ASYNC_CONFIG,
): TE.TaskEither<AppError, void> => {
  return TE.tryCatch(
    async () => {
      // 停止定时处理器
      stopQueueProcessor();
      
      // 处理所有剩余的日志
      while (logQueue.length > 0 && !processorState.isProcessing) {
        await processLogQueue(config)();
      }
      
      // 重新启动处理器
      startQueueProcessor(config);
    },
    (error): AppError => ({
      type: "LOG_QUEUE_ERROR",
      message: `Failed to flush async queue: ${String(error)}`,
      originalError: error,
    }),
  );
};

/**
 * 清空异步队列
 */
export const clearAsyncQueue = (): void => {
  logQueue = [];
  processorState = {
    isProcessing: false,
    processedCount: 0,
    errorCount: 0,
    lastProcessTime: Date.now(),
    averageProcessTime: 0,
  };
};

/**
 * 获取队列状态
 */
export const getAsyncQueueStatus = () => ({
  queueSize: logQueue.length,
  processorState: { ...processorState },
  queueItems: logQueue.map(item => ({
    id: item.id,
    level: item.entry.level,
    priority: item.priority,
    retryCount: item.retryCount,
    age: Date.now() - item.timestamp,
  })),
});

/**
 * 暂停队列处理
 */
export const pauseAsyncQueue = (): void => {
  stopQueueProcessor();
};

/**
 * 恢复队列处理
 * 
 * @param config - 异步日志配置
 */
export const resumeAsyncQueue = (config: AsyncLogConfig = DEFAULT_ASYNC_CONFIG): void => {
  startQueueProcessor(config);
};

/**
 * 应用关闭时的清理函数
 * 
 * @param config - 异步日志配置
 * @returns TaskEither<AppError, void>
 */
export const shutdownAsyncLogger = (
  config: AsyncLogConfig = DEFAULT_ASYNC_CONFIG,
): TE.TaskEither<AppError, void> => {
  return pipe(
    forceFlushAsyncQueue(config),
    TE.chain(() => TE.fromIO(() => {
      stopQueueProcessor();
      clearAsyncQueue();
    })),
  );
};

// ============================================================================
// 性能监控
// ============================================================================

/**
 * 获取性能统计信息
 */
export const getAsyncLogPerformanceStats = () => ({
  queueSize: logQueue.length,
  processedCount: processorState.processedCount,
  errorCount: processorState.errorCount,
  averageProcessTime: processorState.averageProcessTime,
  isProcessing: processorState.isProcessing,
  lastProcessTime: processorState.lastProcessTime,
  timeSinceLastProcess: Date.now() - processorState.lastProcessTime,
  successRate: processorState.processedCount / (processorState.processedCount + processorState.errorCount) || 0,
});

/**
 * 重置性能统计
 */
export const resetAsyncLogPerformanceStats = (): void => {
  processorState = {
    ...processorState,
    processedCount: 0,
    errorCount: 0,
    averageProcessTime: 0,
    lastProcessTime: Date.now(),
  };
};

// ============================================================================
// 导出默认异步日志实例
// ============================================================================

/**
 * 默认异步日志实例
 */
export const defaultAsyncLogger = createAsyncLogFlow(DEFAULT_ASYNC_CONFIG);

/**
 * 便捷的异步日志函数
 */
export const asyncLogDebug = defaultAsyncLogger.debug;
export const asyncLogInfo = defaultAsyncLogger.info;
export const asyncLogSuccess = defaultAsyncLogger.success;
export const asyncLogWarn = defaultAsyncLogger.warn;
export const asyncLogError = defaultAsyncLogger.error;
export const asyncLogTrace = defaultAsyncLogger.trace;