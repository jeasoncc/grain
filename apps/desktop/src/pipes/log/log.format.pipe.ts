/**
 * @file log.format.pipe.ts
 * @description 日志格式化纯函数
 *
 * 包含日志条目格式化、控制台输出格式化、日志级别过滤等纯函数。
 * 所有函数无副作用，相同输入产生相同输出。
 *
 * 使用 fp-ts pipe 进行函数组合。
 */

import dayjs from "dayjs"
import { pipe } from "fp-ts/function"
import * as Ord from "fp-ts/Ord"
import * as RA from "fp-ts/ReadonlyArray"
import { v4 as uuidv4 } from "uuid"
import type { LogConfig, LogEntry, LogLevel } from "@/types/log/log.interface"
import { LOG_LEVEL_COLORS, LOG_LEVEL_ICONS, LOG_LEVEL_PRIORITY } from "@/types/log/log.interface"

// ============================================================================
// ID 生成
// ============================================================================

/**
 * 生成日志条目唯一 ID
 *
 * @returns 唯一标识符字符串
 */
export const generateLogId = (): string => uuidv4()

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
	context,
	id: generateLogId(),
	level,
	message,
	source,
	timestamp: dayjs().toISOString(),
})

/**
 * 添加时间戳到日志条目
 *
 * @param entry - 日志条目
 * @param timestamp - 时间戳（可选，默认使用当前时间）
 * @returns 带时间戳的日志条目
 */
export const addTimestamp = (entry: Omit<LogEntry, "timestamp">, timestamp?: string): LogEntry => ({
	...entry,
	timestamp: timestamp || dayjs().toISOString(),
})

/**
 * 添加日志级别到条目
 *
 * @param entry - 不含级别的日志条目
 * @param level - 日志级别
 * @returns 带级别的日志条目
 */
export const addLogLevel = (entry: Omit<LogEntry, "level">, level: LogLevel): LogEntry => ({
	...entry,
	level,
})

// ============================================================================
// 控制台输出格式化
// ============================================================================

/**
 * 检测是否在浏览器环境中
 */
const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * 为日志条目添加控制台颜色
 *
 * 纯函数：根据日志级别添加 ANSI 颜色代码
 * 在浏览器环境中自动禁用颜色代码
 *
 * @param entry - 日志条目
 * @returns 带颜色的控制台输出字符串
 */
export const addConsoleColors = (entry: LogEntry): string => {
	const timestamp = dayjs(entry.timestamp).format("HH:mm:ss")
	const icon = LOG_LEVEL_ICONS[entry.level]
	const levelText = entry.level.toUpperCase().padEnd(7)
	const sourceText = entry.source ? ` [${entry.source}]` : ""

	// 在浏览器环境中不使用 ANSI 颜色代码
	if (isBrowser()) {
		return `${timestamp} ${icon} ${levelText}${sourceText} ${entry.message}`
	}

	// 在 Node.js 环境中使用颜色代码
	const color = LOG_LEVEL_COLORS[entry.level]
	const reset = "\x1b[0m"

	return `${color}${timestamp} ${icon} ${levelText}${reset}${sourceText} ${entry.message}`
}

/**
 * 格式化控制台输出（无颜色）
 *
 * @param entry - 日志条目
 * @returns 纯文本控制台输出字符串
 */
export const formatConsoleOutput = (entry: LogEntry): string => {
	const timestamp = dayjs(entry.timestamp).format("HH:mm:ss")
	const icon = LOG_LEVEL_ICONS[entry.level]
	const levelText = entry.level.toUpperCase().padEnd(7)
	const sourceText = entry.source ? ` [${entry.source}]` : ""

	return `${timestamp} ${icon} ${levelText}${sourceText} ${entry.message}`
}

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
	const levelPriority = LOG_LEVEL_PRIORITY[level]
	const minPriority = LOG_LEVEL_PRIORITY[minLevel]
	return levelPriority >= minPriority
}

/**
 * 按级别过滤日志条目
 *
 * 纯函数：过滤出符合最小级别要求的日志条目
 *
 * @param entries - 日志条目数组
 * @param minLevel - 最小日志级别
 * @returns 过滤后的日志条目数组
 */
export const filterByLevel = (
	entries: readonly LogEntry[],
	minLevel: LogLevel,
): readonly LogEntry[] =>
	pipe(
		entries,
		RA.filter((entry) => shouldLog(entry.level, minLevel)),
	)

/**
 * 按多个级别过滤日志条目
 *
 * @param entries - 日志条目数组
 * @param levels - 允许的日志级别数组
 * @returns 过滤后的日志条目数组
 */
export const filterByLevels = (
	entries: readonly LogEntry[],
	levels: readonly LogLevel[],
): readonly LogEntry[] =>
	pipe(
		entries,
		RA.filter((entry) => levels.includes(entry.level)),
	)

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
	entries: ReadonlyArray<LogEntry>,
	startTime?: string,
	endTime?: string,
): ReadonlyArray<LogEntry> =>
	pipe(
		entries,
		RA.filter((entry) => {
			const entryTime = dayjs(entry.timestamp).valueOf()

			if (startTime && entryTime < dayjs(startTime).valueOf()) {
				return false
			}

			if (endTime && entryTime > dayjs(endTime).valueOf()) {
				return false
			}

			return true
		}),
	)

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
export const filterBySource = (
	entries: ReadonlyArray<LogEntry>,
	source: string,
): ReadonlyArray<LogEntry> =>
	pipe(
		entries,
		RA.filter((entry) => entry.source === source),
	)

/**
 * 按消息内容搜索日志条目
 *
 * @param entries - 日志条目数组
 * @param searchTerm - 搜索关键词
 * @returns 匹配的日志条目数组
 */
export const searchByMessage = (
	entries: readonly LogEntry[],
	searchTerm: string,
): readonly LogEntry[] =>
	pipe(
		entries,
		RA.filter((entry) => entry.message.toLowerCase().includes(searchTerm.toLowerCase())),
	)

/**
 * 在消息中搜索（别名函数，用于查询优化）
 *
 * @param entries - 日志条目数组
 * @param searchTerm - 搜索关键词
 * @returns 匹配的日志条目数组
 */
export const searchInMessage = searchByMessage

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
export const sortByTimestamp = (
	entries: readonly LogEntry[],
	ascending = false,
): readonly LogEntry[] =>
	pipe(
		entries,
		RA.sort(
			Ord.fromCompare((a: LogEntry, b: LogEntry) => {
				const timeA = dayjs(a.timestamp).valueOf()
				const timeB = dayjs(b.timestamp).valueOf()
				const diff = timeA - timeB
				if (ascending) {
					return diff < 0 ? -1 : diff > 0 ? 1 : 0
				} else {
					return diff < 0 ? 1 : diff > 0 ? -1 : 0
				}
			}),
		),
	)

/**
 * 分页日志条目
 *
 * @param entries - 日志条目数组
 * @param offset - 偏移量
 * @param limit - 限制数量
 * @returns 分页后的日志条目数组
 */
export const paginateEntries = (
	entries: ReadonlyArray<LogEntry>,
	offset = 0,
	limit = 100,
): ReadonlyArray<LogEntry> => entries.slice(offset, offset + limit)

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
		typeof config.enableConsole === "boolean" &&
		typeof config.enableStorage === "boolean" &&
		typeof config.minLevel === "string" &&
		Object.keys(LOG_LEVEL_PRIORITY).includes(config.minLevel) &&
		typeof config.maxEntries === "number" &&
		config.maxEntries > 0 &&
		typeof config.batchSize === "number" &&
		config.batchSize > 0 &&
		typeof config.batchDelay === "number" &&
		config.batchDelay >= 0
	)
}

// ============================================================================
// 统计函数
// ============================================================================

/**
 * 计算日志统计信息
 *
 * @param entries - 日志条目数组
 * @returns 统计信息
 */
export const calculateLogStats = (entries: ReadonlyArray<LogEntry>) => {
	// Use functional approach instead of mutation
	const byLevel = entries.reduce(
		(acc, entry) => ({
			...acc,
			[entry.level]: (acc[entry.level] || 0) + 1,
		}),
		{} as Record<LogLevel, number>,
	)

	const timestamps = entries.map((e) => e.timestamp).toSorted()
	const earliestEntry = timestamps[0]
	const latestEntry = timestamps[timestamps.length - 1]

	// 估算存储大小（JSON 序列化后的字节数）
	const storageSize = new Blob([JSON.stringify(entries)]).size

	return {
		byLevel,
		earliestEntry,
		latestEntry,
		storageSize,
		totalEntries: entries.length,
	}
}
