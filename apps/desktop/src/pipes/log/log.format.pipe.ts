/**
 * @file log.format.pipe.ts
 * @description 日志格式化纯函数
 *
 * 包含日志条目格式化、控制台输出格式化、日志级别过滤等纯函数。
 * 所有函数无副作用，相同输入产生相同输出。
 *
 * 使用 fp-ts pipe 进行函数组合。
 */

import * as A from "fp-ts/Array";
import * as Ord from "fp-ts/Ord";
import { pipe } from "fp-ts/function";
import { v4 as uuidv4 } from "uuid";
import type {
  LogEntry,
  LogLevel,
  LogConfig,
} from "@/types/log/log.interface";
import {
  LOG_LEVEL_PRIORITY,
  LOG_LEVEL_COLORS,
  LOG_LEVEL_ICONS,
} from "@/types/log/log.interface";

// ============================================================================
// ID 生成
// ============================================================================

/**
 * 生成日志条目唯一 ID
 * 
 * @returns 唯一标识符字符串
 */
export const generateLogId = (): string => uuidv4();

// ============================================================================
// 日志条目格式化
// ============================================================================

/**
 * 格式化日志条目
 * 
 * 纯函数：根据输入参数创建完整的日志条目对象
 * 
 * @param level - 日志级别
 * @param message - 日志消息
 * @param context - 上下文信息（可选）
 * @param source - 日志来源（可选）
 * @returns 格式化的日志条目
 */
export const formatLogEntry = (
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  source?: string,
): LogEntry => ({
  id: generateLogId(),
  timestamp: new Date().toISOString(),
  level,
  message,
  context,
  source,
});

/**
 * 添加时间戳到日志条目
 * 
 * @param entry - 日志条目
 * @param timestamp - 时间戳（可选，默认使用当前时间）
 * @returns 带时间戳的日志条目
 */
export const addTimestamp = (
  entry: Omit<LogEntry, 'timestamp'>,
  timestamp?: string,
): LogEntry => ({
  ...entry,
  timestamp: timestamp || new Date().toISOString(),
});

/**
 * 添加日志级别到条目
 * 
 * @param entry - 不含级别的日志条目
 * @param level - 日志级别
 * @returns 带级别的日志条目
 */
export const addLogLevel = (
  entry: Omit<LogEntry, 'level'>,
  level: LogLevel,
): LogEntry => ({
  ...entry,
  level,
});

// ============================================================================
// 控制台输出格式化
// ============================================================================

/**
 * 为日志条目添加控制台颜色
 * 
 * 纯函数：根据日志级别添加 ANSI 颜色代码
 * 
 * @param entry - 日志条目
 * @returns 带颜色的控制台输出字符串
 */
export const addConsoleColors = (entry: LogEntry): string => {
  const color = LOG_LEVEL_COLORS[entry.level];
  const icon = LOG_LEVEL_ICONS[entry.level];
  const reset = '\x1b[0m';
  
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  const levelText = entry.level.toUpperCase().padEnd(7);
  const sourceText = entry.source ? ` [${entry.source}]` : '';
  
  return `${color}${timestamp} ${icon} ${levelText}${reset}${sourceText} ${entry.message}`;
};

/**
 * 格式化控制台输出（无颜色）
 * 
 * @param entry - 日志条目
 * @returns 纯文本控制台输出字符串
 */
export const formatConsoleOutput = (entry: LogEntry): string => {
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  const icon = LOG_LEVEL_ICONS[entry.level];
  const levelText = entry.level.toUpperCase().padEnd(7);
  const sourceText = entry.source ? ` [${entry.source}]` : '';
  
  return `${timestamp} ${icon} ${levelText}${sourceText} ${entry.message}`;
};

// ============================================================================
// 日志级别过滤
// ============================================================================

/**
 * 检查日志级别是否应该被记录
 * 
 * 纯函数：根据最小级别配置判断是否应该记录日志
 * 
 * @param level - 要检查的日志级别
 * @param minLevel - 最小日志级别
 * @returns 是否应该记录
 */
export const shouldLog = (level: LogLevel, minLevel: LogLevel): boolean => {
  const levelPriority = LOG_LEVEL_PRIORITY[level];
  const minPriority = LOG_LEVEL_PRIORITY[minLevel];
  return levelPriority >= minPriority;
};

/**
 * 按级别过滤日志条目
 * 
 * 纯函数：过滤出符合最小级别要求的日志条目
 * 
 * @param entries - 日志条目数组
 * @param minLevel - 最小日志级别
 * @returns 过滤后的日志条目数组
 */
export const filterByLevel = (entries: LogEntry[], minLevel: LogLevel): LogEntry[] =>
  pipe(
    entries,
    A.filter((entry) => shouldLog(entry.level, minLevel)),
  );

/**
 * 按多个级别过滤日志条目
 * 
 * @param entries - 日志条目数组
 * @param levels - 允许的日志级别数组
 * @returns 过滤后的日志条目数组
 */
export const filterByLevels = (entries: LogEntry[], levels: LogLevel[]): LogEntry[] =>
  pipe(
    entries,
    A.filter((entry) => levels.includes(entry.level)),
  );

// ============================================================================
// 时间范围过滤
// ============================================================================

/**
 * 按时间范围过滤日志条目
 * 
 * @param entries - 日志条目数组
 * @param startTime - 开始时间（ISO 字符串）
 * @param endTime - 结束时间（ISO 字符串）
 * @returns 过滤后的日志条目数组
 */
export const filterByTimeRange = (
  entries: LogEntry[],
  startTime?: string,
  endTime?: string,
): LogEntry[] =>
  pipe(
    entries,
    A.filter((entry) => {
      const entryTime = new Date(entry.timestamp).getTime();
      
      if (startTime && entryTime < new Date(startTime).getTime()) {
        return false;
      }
      
      if (endTime && entryTime > new Date(endTime).getTime()) {
        return false;
      }
      
      return true;
    }),
  );

// ============================================================================
// 来源过滤
// ============================================================================

/**
 * 按来源过滤日志条目
 * 
 * @param entries - 日志条目数组
 * @param source - 来源字符串
 * @returns 过滤后的日志条目数组
 */
export const filterBySource = (entries: LogEntry[], source: string): LogEntry[] =>
  pipe(
    entries,
    A.filter((entry) => entry.source === source),
  );

/**
 * 按消息内容搜索日志条目
 * 
 * @param entries - 日志条目数组
 * @param searchTerm - 搜索关键词
 * @returns 匹配的日志条目数组
 */
export const searchByMessage = (entries: LogEntry[], searchTerm: string): LogEntry[] =>
  pipe(
    entries,
    A.filter((entry) => 
      entry.message.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  );

// ============================================================================
// 排序和分页
// ============================================================================

/**
 * 按时间戳排序日志条目
 * 
 * @param entries - 日志条目数组
 * @param ascending - 是否升序排列（默认 false，即最新的在前）
 * @returns 排序后的日志条目数组
 */
export const sortByTimestamp = (entries: LogEntry[], ascending = false): LogEntry[] =>
  pipe(
    entries,
    A.sort(Ord.fromCompare((a: LogEntry, b: LogEntry) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      const diff = timeA - timeB;
      if (ascending) {
        return diff < 0 ? -1 : diff > 0 ? 1 : 0;
      } else {
        return diff < 0 ? 1 : diff > 0 ? -1 : 0;
      }
    })),
  );

/**
 * 分页日志条目
 * 
 * @param entries - 日志条目数组
 * @param offset - 偏移量
 * @param limit - 限制数量
 * @returns 分页后的日志条目数组
 */
export const paginateEntries = (
  entries: LogEntry[],
  offset = 0,
  limit = 100,
): LogEntry[] => entries.slice(offset, offset + limit);

// ============================================================================
// 配置验证
// ============================================================================

/**
 * 验证日志配置
 * 
 * @param config - 日志配置
 * @returns 是否有效
 */
export const isValidLogConfig = (config: LogConfig): boolean => {
  return (
    typeof config.enableConsole === 'boolean' &&
    typeof config.enableStorage === 'boolean' &&
    typeof config.minLevel === 'string' &&
    Object.keys(LOG_LEVEL_PRIORITY).includes(config.minLevel) &&
    typeof config.maxEntries === 'number' &&
    config.maxEntries > 0 &&
    typeof config.batchSize === 'number' &&
    config.batchSize > 0 &&
    typeof config.batchDelay === 'number' &&
    config.batchDelay >= 0
  );
};

// ============================================================================
// 统计函数
// ============================================================================

/**
 * 计算日志统计信息
 * 
 * @param entries - 日志条目数组
 * @returns 统计信息
 */
export const calculateLogStats = (entries: LogEntry[]) => {
  const byLevel = entries.reduce((acc, entry) => {
    acc[entry.level] = (acc[entry.level] || 0) + 1;
    return acc;
  }, {} as Record<LogLevel, number>);

  const timestamps = entries.map(e => e.timestamp).sort();
  const earliestEntry = timestamps[0];
  const latestEntry = timestamps[timestamps.length - 1];

  // 估算存储大小（JSON 序列化后的字节数）
  const storageSize = new Blob([JSON.stringify(entries)]).size;

  return {
    totalEntries: entries.length,
    byLevel,
    earliestEntry,
    latestEntry,
    storageSize,
  };
};