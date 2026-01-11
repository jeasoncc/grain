/**
 * @file log.interface.ts
 * @description 日志系统类型定义
 *
 * 定义函数式日志系统的核心类型，包括日志级别、日志条目、配置等。
 * 所有类型都是不可变的，符合函数式编程原则。
 */

/**
 * 日志级别枚举
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'trace';

/**
 * 日志条目接口
 * 
 * 表示单个日志记录的完整信息
 */
export interface LogEntry {
  /** 日志唯一标识符 */
  readonly id?: string;
  /** 时间戳（ISO 8601 格式） */
  readonly timestamp: string;
  /** 日志级别 */
  readonly level: LogLevel;
  /** 日志消息 */
  readonly message: string;
  /** 上下文信息（可选） */
  readonly context?: Record<string, unknown>;
  /** 日志来源（可选） */
  readonly source?: string;
}

/**
 * 日志配置接口
 * 
 * 控制日志系统的行为
 */
export interface LogConfig {
  /** 是否启用控制台输出 */
  readonly enableConsole: boolean;
  /** 是否启用持久化存储 */
  readonly enableStorage: boolean;
  /** 最小日志级别 */
  readonly minLevel: LogLevel;
  /** 最大存储条目数 */
  readonly maxEntries: number;
  /** 批量写入大小 */
  readonly batchSize: number;
  /** 批量写入延迟（毫秒） */
  readonly batchDelay: number;
}

/**
 * 日志查询选项
 */
export interface LogQueryOptions {
  /** 限制返回条目数 */
  readonly limit?: number;
  /** 偏移量 */
  readonly offset?: number;
  /** 日志级别过滤 */
  readonly levelFilter?: LogLevel[];
  /** 开始时间 */
  readonly startTime?: string;
  /** 结束时间 */
  readonly endTime?: string;
  /** 来源过滤 */
  readonly sourceFilter?: string;
  /** 消息关键词搜索 */
  readonly messageSearch?: string;
}

/**
 * 日志查询结果
 */
export interface LogQueryResult {
  /** 日志条目列表 */
  readonly entries: LogEntry[];
  /** 总条目数 */
  readonly total: number;
  /** 是否有更多数据 */
  readonly hasMore: boolean;
}

/**
 * 日志级别优先级映射
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  success: 2, // 与 info 同级
  warn: 3,
  error: 4,
} as const;

/**
 * 默认日志配置
 */
export const DEFAULT_LOG_CONFIG: LogConfig = {
  enableConsole: true,
  enableStorage: true,
  minLevel: 'info',
  maxEntries: 10000,
  batchSize: 50,
  batchDelay: 1000,
} as const;

/**
 * 日志级别颜色映射（用于控制台输出）
 */
export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  trace: '\x1b[37m',    // 白色
  debug: '\x1b[35m',    // 紫色
  info: '\x1b[36m',     // 青色
  success: '\x1b[32m',  // 绿色
  warn: '\x1b[33m',     // 黄色
  error: '\x1b[31m',    // 红色
} as const;

/**
 * 日志级别图标映射
 */
export const LOG_LEVEL_ICONS: Record<LogLevel, string> = {
  trace: '🔍',
  debug: '🐛',
  info: 'ℹ️',
  success: '✅',
  warn: '⚠️',
  error: '❌',
} as const;

/**
 * 日志错误类型
 */
export interface LogError {
  readonly type: 'LOG_STORAGE_ERROR' | 'LOG_FORMAT_ERROR' | 'LOG_CONFIG_ERROR';
  readonly message: string;
  readonly originalError?: unknown;
}

/**
 * 日志统计信息
 */
export interface LogStats {
  /** 总日志条目数 */
  readonly totalEntries: number;
  /** 按级别分组的统计 */
  readonly byLevel: Record<LogLevel, number>;
  /** 最早日志时间 */
  readonly earliestEntry?: string;
  /** 最新日志时间 */
  readonly latestEntry?: string;
  /** 存储大小（字节） */
  readonly storageSize: number;
}