/**
 * @file query-optimization.flow.ts
 * @description 日志查询优化流程
 *
 * 实现高效的日志查询功能，包括分页、过滤、搜索和缓存优化。
 * 使用 TaskEither 进行错误处理和函数组合。
 */

import dayjs from "dayjs"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
// IO
import { getLogStatsFromSQLite, queryLogsFromSQLite } from "@/io/log/log.storage.api"
// Pipes
import { searchInMessage, sortByTimestamp } from "@/pipes/log/log.format.pipe"
import type { AppError } from "@/types/error/error.types"
import type {
	LogEntry,
	LogLevel,
	LogQueryOptions,
	LogQueryResult,
	LogStatsFormatted,
} from "@/types/log/log.interface"

// ============================================================================
// 查询缓存
// ============================================================================

/**
 * 查询缓存条目
 */
interface QueryCacheEntry {
	readonly key: string
	readonly result: LogQueryResult
	readonly timestamp: number
	readonly ttl: number
}

/**
 * 查询缓存
 */
let queryCache: ReadonlyMap<string, QueryCacheEntry> = new Map()

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
	maxSize: 50, // 最大缓存条目数
	defaultTTL: 30000, // 默认缓存时间（30秒）
	cleanupInterval: 60000, // 清理间隔（1分钟）
} as const

/**
 * 生成查询缓存键
 *
 * @param options - 查询选项
 * @returns 缓存键
 */
const generateCacheKey = (options: LogQueryOptions): string => {
	const normalized = {
		limit: options.limit || 100,
		offset: options.offset || 0,
		levelFilter: options.levelFilter ? [...Array.from(options.levelFilter)].toSorted() : [],
		startTime: options.startTime || "",
		endTime: options.endTime || "",
		sourceFilter: options.sourceFilter || "",
		messageSearch: options.messageSearch || "",
	}

	return JSON.stringify(normalized)
}

/**
 * 从缓存获取查询结果
 *
 * @param key - 缓存键
 * @returns Option<LogQueryResult>
 */
const getFromCache = (key: string): O.Option<LogQueryResult> => {
	const entry = queryCache.get(key)

	if (!entry) {
		return O.none
	}

	// 检查是否过期
	if (dayjs().valueOf() > entry.timestamp + entry.ttl) {
		// Create new map without the expired entry
		const entries = Array.from(queryCache.entries()).filter(([k]) => k !== key)
		queryCache = new Map(entries)
		return O.none
	}

	return O.some(entry.result)
}

/**
 * 将查询结果存入缓存
 *
 * @param key - 缓存键
 * @param result - 查询结果
 * @param ttl - 缓存时间
 */
const setToCache = (
	key: string,
	result: LogQueryResult,
	ttl: number = CACHE_CONFIG.defaultTTL,
): void => {
	// If cache is full, remove oldest entry
	if (queryCache.size >= CACHE_CONFIG.maxSize) {
		const entries = Array.from(queryCache.entries())
		const sortedEntries = entries.toSorted(([, a], [, b]) => a.timestamp - b.timestamp)
		const oldestEntry = sortedEntries[0]
		if (oldestEntry) {
			const filteredEntries = entries.filter(([k]) => k !== oldestEntry[0])
			queryCache = new Map(filteredEntries)
		}
	}

	// Add new entry
	queryCache = new Map([
		...queryCache,
		[
			key,
			{
				key,
				result,
				timestamp: dayjs().valueOf(),
				ttl,
			},
		],
	])
}

/**
 * 清理过期缓存
 */
const cleanupCache = (): void => {
	const now = dayjs().valueOf()
	const entries = Array.from(queryCache.entries())
	const validEntries = entries.filter(([, entry]) => now <= entry.timestamp + entry.ttl)
	queryCache = new Map(validEntries)
}

// 设置定期清理
setInterval(cleanupCache, CACHE_CONFIG.cleanupInterval)

// ============================================================================
// 优化的查询流程
// ============================================================================

/**
 * 优化的日志查询流程
 *
 * @param options - 查询选项
 * @param useCache - 是否使用缓存
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const optimizedQueryLogsFlow = (
	options: LogQueryOptions = {},
	useCache: boolean = true,
): TE.TaskEither<AppError, LogQueryResult> => {
	const cacheKey = generateCacheKey(options)

	// Try to get from cache
	if (useCache) {
		const cached = getFromCache(cacheKey)
		if (O.isSome(cached)) {
			return TE.right(cached.value)
		}
	}

	// Query from database
	return pipe(
		queryLogsFromSQLite(options),
		TE.map((result) => {
			// Apply frontend filtering and sorting optimization
			const optimizedEntries = pipe(
				result.entries as readonly LogEntry[], // Ensure readonly
				(entries) =>
					options.messageSearch ? searchInMessage(entries, options.messageSearch) : entries,
				(entries) => sortByTimestamp(entries, false), // Latest first
			)

			const optimizedResult = {
				...result,
				entries: optimizedEntries,
			}

			// Store in cache
			if (useCache) {
				setToCache(cacheKey, optimizedResult)
			}

			return optimizedResult
		}),
	)
}

/**
 * 分页查询日志
 *
 * @param page - 页码（从1开始）
 * @param pageSize - 每页大小
 * @param filters - 过滤条件
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const paginatedQueryLogsFlow = (
	page: number = 1,
	pageSize: number = 50,
	filters: Omit<LogQueryOptions, "limit" | "offset"> = {},
): TE.TaskEither<AppError, LogQueryResult> => {
	const offset = (page - 1) * pageSize

	const options: LogQueryOptions = {
		...filters,
		limit: pageSize,
		offset,
	}

	return optimizedQueryLogsFlow(options)
}

/**
 * 搜索日志条目
 *
 * @param searchTerm - 搜索关键词
 * @param filters - 其他过滤条件
 * @param limit - 结果限制
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const searchLogsFlow = (
	searchTerm: string,
	filters: Omit<LogQueryOptions, "messageSearch" | "limit"> = {},
	limit: number = 100,
): TE.TaskEither<AppError, LogQueryResult> => {
	const options: LogQueryOptions = {
		...filters,
		messageSearch: searchTerm,
		limit,
	}

	return optimizedQueryLogsFlow(options, false) // 搜索结果不缓存
}

/**
 * 按级别统计日志
 *
 * @param timeRange - 时间范围
 * @returns TaskEither<AppError, Record<LogLevel, number>>
 */
export const getLogLevelStatsFlow = (_timeRange?: {
	readonly startTime?: string
	readonly endTime?: string
}): TE.TaskEither<AppError, Record<LogLevel, number>> => {
	return pipe(
		getLogStatsFromSQLite(),
		TE.map((stats: LogStatsFormatted) => stats.byLevel),
	)
}

/**
 * 获取最近的错误日志
 *
 * @param limit - 限制数量
 * @param hours - 最近几小时
 * @returns TaskEither<AppError, LogEntry[]>
 */
export const getRecentErrorLogsFlow = (
	limit: number = 20,
	hours: number = 24,
): TE.TaskEither<AppError, ReadonlyArray<LogEntry>> => {
	const startTime = dayjs().subtract(hours, "hour")

	const options: LogQueryOptions = {
		levelFilter: ["error"],
		startTime: startTime.toISOString(),
		limit,
		offset: 0,
	}

	return pipe(
		optimizedQueryLogsFlow(options),
		TE.map((result) => result.entries),
	)
}

/**
 * 获取特定来源的日志
 *
 * @param source - 日志来源
 * @param limit - 限制数量
 * @param levelFilter - 级别过滤
 * @returns TaskEither<AppError, LogEntry[]>
 */
export const getLogsBySourceFlow = (
	source: string,
	limit: number = 100,
	levelFilter?: ReadonlyArray<LogLevel>,
): TE.TaskEither<AppError, ReadonlyArray<LogEntry>> => {
	const options: LogQueryOptions = {
		sourceFilter: source,
		levelFilter,
		limit,
		offset: 0,
	}

	return pipe(
		optimizedQueryLogsFlow(options),
		TE.map((result) => result.entries),
	)
}

// ============================================================================
// 高级查询功能
// ============================================================================

/**
 * 时间范围查询
 *
 * @param startTime - 开始时间
 * @param endTime - 结束时间
 * @param filters - 其他过滤条件
 * @returns TaskEither<AppError, LogQueryResult>
 */
export const queryLogsByTimeRangeFlow = (
	startTime: string,
	endTime: string,
	filters: Omit<LogQueryOptions, "startTime" | "endTime"> = {},
): TE.TaskEither<AppError, LogQueryResult> => {
	const options: LogQueryOptions = {
		...filters,
		startTime,
		endTime,
	}

	return optimizedQueryLogsFlow(options)
}

/**
 * 多级别查询
 *
 * @param levels - 日志级别数组
 * @param limit - 限制数量
 * @param timeRange - 时间范围
 * @returns TaskEither<AppError, LogEntry[]>
 */
export const queryLogsByLevelsFlow = (
	levels: ReadonlyArray<LogLevel>,
	limit: number = 100,
	timeRange?: { readonly startTime?: string; readonly endTime?: string },
): TE.TaskEither<AppError, ReadonlyArray<LogEntry>> => {
	const options: LogQueryOptions = {
		levelFilter: levels,
		limit,
		offset: 0,
		...timeRange,
	}

	return pipe(
		optimizedQueryLogsFlow(options),
		TE.map((result) => result.entries),
	)
}

// ============================================================================
// 缓存管理
// ============================================================================

/**
 * 清空查询缓存
 */
export const clearQueryCache = (): void => {
	queryCache = new Map()
}

/**
 * 获取缓存统计信息
 */
export const getCacheStats = () => ({
	size: queryCache.size,
	maxSize: CACHE_CONFIG.maxSize,
	entries: Array.from(queryCache.values()).map((entry) => ({
		key: entry.key,
		timestamp: entry.timestamp,
		ttl: entry.ttl,
		age: dayjs().valueOf() - entry.timestamp,
	})),
})

/**
 * 预热缓存（预加载常用查询）
 *
 * @returns TaskEither<AppError, void>
 */
export const warmupQueryCache = (): TE.TaskEither<AppError, void> => {
	const commonQueries: ReadonlyArray<LogQueryOptions> = [
		// Recent logs
		{ limit: 50, offset: 0 },
		// Recent errors
		{ levelFilter: ["error"], limit: 20, offset: 0 },
		// Recent warnings and errors
		{ levelFilter: ["warn", "error"], limit: 30, offset: 0 },
	]

	const warmupTasks = commonQueries.map((options) => optimizedQueryLogsFlow(options, true))

	return pipe(
		TE.sequenceArray(warmupTasks),
		TE.map(() => undefined),
	)
}
