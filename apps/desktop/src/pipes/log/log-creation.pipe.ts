/**
 * @file log-creation.pipe.ts
 * @description 日志创建纯函数
 *
 * 包含日志记录的核心逻辑，不依赖外部 IO 或状态。
 * 这些函数可以被 flows 和 io 层安全地使用。
 */

import type { LogConfig, LogEntry, LogLevel } from "@/types/log/log.interface"
import { DEFAULT_LOG_CONFIG } from "@/types/log/log.interface"
import { addConsoleColors, formatLogEntry, shouldLog } from "./log.format.pipe"

// ============================================================================
// 日志创建核心函数
// ============================================================================

/**
 * 创建日志条目（纯函数）
 *
 * @param level - 日志级别
 * @param message - 日志消息
 * @param context - 上下文信息
 * @param source - 日志来源
 * @param config - 日志配置
 * @returns 格式化的日志条目和控制台输出信息
 */
export const createLogEntry = (
	level: LogLevel,
	message: string,
	context?: Record<string, unknown>,
	source?: string,
	config: LogConfig = DEFAULT_LOG_CONFIG,
): {
	readonly entry: LogEntry
	readonly shouldLog: boolean
	readonly consoleOutput?: string
} => {
	// 检查是否应该记录此级别的日志
	const shouldLogEntry = shouldLog(level, config.minLevel)

	if (!shouldLogEntry) {
		return {
			entry: formatLogEntry(level, message, context, source),
			shouldLog: false,
		}
	}

	// 格式化日志条目
	const entry = formatLogEntry(level, message, context, source)

	// 生成控制台输出（如果启用）
	const consoleOutput = config.enableConsole ? addConsoleColors(entry) : undefined

	return {
		entry,
		shouldLog: true,
		consoleOutput,
	}
}

/**
 * 批量创建日志条目（纯函数）
 *
 * @param entries - 日志条目参数数组
 * @param config - 日志配置
 * @returns 处理后的日志条目数组
 */
export const createLogEntries = (
	entries: ReadonlyArray<{
		readonly level: LogLevel
		readonly message: string
		readonly context?: Record<string, unknown>
		readonly source?: string
	}>,
	config: LogConfig = DEFAULT_LOG_CONFIG,
): ReadonlyArray<{
	readonly entry: LogEntry
	readonly shouldLog: boolean
	readonly consoleOutput?: string
}> => {
	return entries.map(({ level, message, context, source }) =>
		createLogEntry(level, message, context, source, config),
	)
}

/**
 * 验证日志配置（纯函数）
 *
 * @param config - 要验证的配置
 * @returns 验证结果
 */
export const validateLogConfig = (
	config: Partial<LogConfig>,
): {
	readonly isValid: boolean
	readonly errors: ReadonlyArray<string>
	readonly mergedConfig: LogConfig
} => {
	const mergedConfig = { ...DEFAULT_LOG_CONFIG, ...config }

	// Use functional approach to collect validation errors
	const validationErrors = [
		// 验证 minLevel
		config.minLevel &&
		!["trace", "debug", "info", "success", "warn", "error"].includes(config.minLevel)
			? `Invalid minLevel: ${config.minLevel}`
			: null,

		// 验证 maxEntries
		config.maxEntries !== undefined && (config.maxEntries <= 0 || config.maxEntries > 100000)
			? `maxEntries must be between 1 and 100000, got: ${config.maxEntries}`
			: null,

		// 验证 batchSize
		config.batchSize !== undefined && (config.batchSize <= 0 || config.batchSize > 1000)
			? `batchSize must be between 1 and 1000, got: ${config.batchSize}`
			: null,

		// 验证 batchDelay
		config.batchDelay !== undefined && (config.batchDelay < 0 || config.batchDelay > 60000)
			? `batchDelay must be between 0 and 60000ms, got: ${config.batchDelay}`
			: null,
	].filter((error): error is string => error !== null)

	return {
		isValid: validationErrors.length === 0,
		errors: validationErrors as ReadonlyArray<string>,
		mergedConfig,
	}
}

/**
 * 创建日志记录器配置（纯函数）
 *
 * @param config - 部分配置
 * @returns 完整的日志配置
 */
export const createLoggerConfig = (config: Partial<LogConfig> = {}): LogConfig => {
	const validation = validateLogConfig(config)

	if (!validation.isValid) {
		console.warn("Invalid log config, using defaults:", validation.errors)
		return DEFAULT_LOG_CONFIG
	}

	return validation.mergedConfig
}

/**
 * 日志级别比较（纯函数）
 *
 * @param level1 - 第一个日志级别
 * @param level2 - 第二个日志级别
 * @returns 比较结果 (-1, 0, 1)
 */
export const compareLogLevels = (level1: LogLevel, level2: LogLevel): number => {
	const priorities = {
		trace: 0,
		debug: 1,
		info: 2,
		success: 2,
		warn: 3,
		error: 4,
	}

	const priority1 = priorities[level1]
	const priority2 = priorities[level2]

	return priority1 < priority2 ? -1 : priority1 > priority2 ? 1 : 0
}
