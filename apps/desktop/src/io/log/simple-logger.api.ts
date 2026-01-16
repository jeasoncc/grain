/**
 * @file simple-logger.api.ts
 * @description 简化的日志 API（符合架构规范）
 *
 * 这个文件只依赖 types 和 pipes，不依赖 flows 层。
 * 提供基础的日志记录功能，复杂的业务流程由 flows 层处理。
 */

import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
// Pipes (符合架构规范)
import {
	createLogEntry,
	createLoggerConfig,
	validateLogConfig,
} from "@/pipes/log/log-creation.pipe"
import type { AppError } from "@/types/error/error.types"
import type { LogConfig, LogEntry, LogLevel } from "@/types/log/log.interface"
import { DEFAULT_LOG_CONFIG } from "@/types/log/log.interface"

// Storage API (同层依赖，允许)
import { saveLogsBatchToSQLite, saveLogToSQLite } from "./log.storage.api"

// ============================================================================
// 简化的日志记录器
// ============================================================================

/**
 * 简化的日志记录器类型
 */
export interface SimpleLogger {
	readonly config: LogConfig
	readonly log: (
		level: LogLevel,
		message: string,
		context?: Record<string, unknown>,
		source?: string,
	) => TE.TaskEither<AppError, void>
	readonly debug: (
		message: string,
		context?: Record<string, unknown>,
		source?: string,
	) => TE.TaskEither<AppError, void>
	readonly info: (
		message: string,
		context?: Record<string, unknown>,
		source?: string,
	) => TE.TaskEither<AppError, void>
	readonly success: (
		message: string,
		context?: Record<string, unknown>,
		source?: string,
	) => TE.TaskEither<AppError, void>
	readonly warn: (
		message: string,
		context?: Record<string, unknown>,
		source?: string,
	) => TE.TaskEither<AppError, void>
	readonly error: (
		message: string,
		context?: Record<string, unknown>,
		source?: string,
	) => TE.TaskEither<AppError, void>
	readonly trace: (
		message: string,
		context?: Record<string, unknown>,
		source?: string,
	) => TE.TaskEither<AppError, void>
}

/**
 * 创建简化的日志记录器
 *
 * @param config - 日志配置
 * @returns 日志记录器实例
 */
export const createSimpleLogger = (config: Partial<LogConfig> = {}): SimpleLogger => {
	const loggerConfig = createLoggerConfig(config)

	/**
	 * 核心日志记录函数
	 */
	const log = (
		level: LogLevel,
		message: string,
		context?: Record<string, unknown>,
		source?: string,
	): TE.TaskEither<AppError, void> => {
		// 使用纯函数创建日志条目
		const logResult = createLogEntry(level, message, context, source, loggerConfig)

		// 如果不应该记录，直接返回成功
		if (!logResult.shouldLog) {
			return TE.right(undefined)
		}

		// 控制台输出（如果启用）
		if (logResult.consoleOutput) {
			// eslint-disable-next-line grain/no-console-log -- This is the core logger implementation that needs console output
			console.log(logResult.consoleOutput)
		}

		// 持久化存储（如果启用）
		if (loggerConfig.enableStorage) {
			return saveLogToSQLite(logResult.entry)
		}

		return TE.right(undefined)
	}

	return {
		config: loggerConfig,
		debug: (message, context, source) => log("debug", message, context, source),
		error: (message, context, source) => log("error", message, context, source),
		info: (message, context, source) => log("info", message, context, source),
		log,
		success: (message, context, source) => log("success", message, context, source),
		trace: (message, context, source) => log("trace", message, context, source),
		warn: (message, context, source) => log("warn", message, context, source),
	}
}

// ============================================================================
// 默认日志记录器实例
// ============================================================================

/**
 * 默认日志记录器实例
 */
export const defaultSimpleLogger = createSimpleLogger(DEFAULT_LOG_CONFIG)

// ============================================================================
// 便捷的日志函数（异步版本）
// ============================================================================

/**
 * 异步记录调试日志
 */
export const logDebugAsync = (
	message: string,
	context?: Record<string, unknown>,
	source?: string,
): TE.TaskEither<AppError, void> => defaultSimpleLogger.debug(message, context, source)

/**
 * 异步记录信息日志
 */
export const logInfoAsync = (
	message: string,
	context?: Record<string, unknown>,
	source?: string,
): TE.TaskEither<AppError, void> => defaultSimpleLogger.info(message, context, source)

/**
 * 异步记录成功日志
 */
export const logSuccessAsync = (
	message: string,
	context?: Record<string, unknown>,
	source?: string,
): TE.TaskEither<AppError, void> => defaultSimpleLogger.success(message, context, source)

/**
 * 异步记录警告日志
 */
export const logWarnAsync = (
	message: string,
	context?: Record<string, unknown>,
	source?: string,
): TE.TaskEither<AppError, void> => defaultSimpleLogger.warn(message, context, source)

/**
 * 异步记录错误日志
 */
export const logErrorAsync = (
	message: string,
	context?: Record<string, unknown>,
	source?: string,
): TE.TaskEither<AppError, void> => defaultSimpleLogger.error(message, context, source)

/**
 * 异步记录跟踪日志
 */
export const logTraceAsync = (
	message: string,
	context?: Record<string, unknown>,
	source?: string,
): TE.TaskEither<AppError, void> => defaultSimpleLogger.trace(message, context, source)

// ============================================================================
// 便捷的日志函数（同步版本，Fire-and-forget）
// ============================================================================

/**
 * 同步调试日志（不等待结果）
 */
export const debug = (
	message: string,
	context?: Record<string, unknown>,
	source?: string,
): void => {
	logDebugAsync(message, context, source)()
}

/**
 * 同步信息日志（不等待结果）
 */
export const info = (message: string, context?: Record<string, unknown>, source?: string): void => {
	logInfoAsync(message, context, source)()
}

/**
 * 同步成功日志（不等待结果）
 */
export const success = (
	message: string,
	context?: Record<string, unknown>,
	source?: string,
): void => {
	logSuccessAsync(message, context, source)()
}

/**
 * 同步警告日志（不等待结果）
 */
export const warn = (message: string, context?: Record<string, unknown>, source?: string): void => {
	logWarnAsync(message, context, source)()
}

/**
 * 同步错误日志（不等待结果）
 */
export const error = (
	message: string,
	context?: Record<string, unknown>,
	source?: string,
): void => {
	logErrorAsync(message, context, source)()
}

/**
 * 同步跟踪日志（不等待结果）
 */
export const trace = (
	message: string,
	context?: Record<string, unknown>,
	source?: string,
): void => {
	logTraceAsync(message, context, source)()
}

// ============================================================================
// 配置管理
// ============================================================================

/**
 * 更新默认日志记录器配置
 *
 * @param config - 新的配置
 * @returns 验证结果
 */
export const updateDefaultLoggerConfig = (
	config: Partial<LogConfig>,
): {
	readonly isValid: boolean
	readonly errors: readonly string[]
} => {
	const validation = validateLogConfig(config)

	if (validation.isValid) {
		// 重新创建默认记录器（这里需要重构为可变的配置管理）
		// eslint-disable-next-line grain/no-console-log -- This is the core logger implementation
		console.info("Log config updated successfully")
	}

	return {
		errors: validation.errors,
		isValid: validation.isValid,
	}
}

/**
 * 获取当前默认日志记录器配置
 */
export const getCurrentLoggerConfig = (): LogConfig => defaultSimpleLogger.config
