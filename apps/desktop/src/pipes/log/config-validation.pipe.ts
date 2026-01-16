/**
 * @file config-validation.pipe.ts
 * @description 日志配置验证纯函数
 *
 * 职责：验证日志配置的各项规则
 * 依赖规则：pipes/ 只能依赖 utils/, types/
 */

import type { LogLevel } from "@/types/log/log.interface"
import { LOG_LEVEL_PRIORITY } from "@/types/log/log.interface"

// ============================================================================
// 类型定义
// ============================================================================

export interface AutoCleanupConfigPartial {
	readonly enabled?: boolean
	readonly maxEntries?: number
}

export interface LogConfigPartial {
	readonly batchSize?: number
	readonly batchDelay?: number
	readonly maxEntries?: number
	readonly minLevel?: LogLevel
	readonly autoCleanup?: AutoCleanupConfigPartial
}

// ============================================================================
// 验证纯函数
// ============================================================================

/**
 * 验证批量配置
 */
export const validateBatchConfig = (config: LogConfigPartial): readonly string[] => {
	if (config.batchSize && config.batchDelay !== undefined) {
		if (config.batchSize > 1 && config.batchDelay === 0) {
			return ["批量大小 > 1 但延迟为 0，将使用异步队列模式"]
		}
	}
	return []
}

/**
 * 验证条目数配置
 */
export const validateEntriesConfig = (config: LogConfigPartial): readonly string[] => {
	if (config.maxEntries && config.autoCleanup?.maxEntries) {
		if (config.autoCleanup.maxEntries > config.maxEntries) {
			return ["自动清理的最大条目数大于日志配置的最大条目数"]
		}
	}
	return []
}

/**
 * 验证日志级别配置
 */
export const validateLogLevelConfig = (config: LogConfigPartial): readonly string[] => {
	if (config.minLevel) {
		const levelPriority = LOG_LEVEL_PRIORITY[config.minLevel]
		if (levelPriority >= LOG_LEVEL_PRIORITY.warn) {
			return [`最小日志级别设置为 ${config.minLevel}，可能会丢失重要的调试信息`]
		}
	}
	return []
}

/**
 * 验证自动清理配置
 */
export const validateAutoCleanupConfig = (config: LogConfigPartial): readonly string[] => {
	if (config.autoCleanup?.enabled === false && config.maxEntries) {
		if (config.maxEntries > 50000) {
			return ["禁用自动清理且最大条目数较大，可能导致存储空间不足"]
		}
	}
	return []
}

/**
 * 收集所有警告
 */
export const collectConfigWarnings = (config: LogConfigPartial): readonly string[] => [
	...validateBatchConfig(config),
	...validateEntriesConfig(config),
	...validateLogLevelConfig(config),
	...validateAutoCleanupConfig(config),
]
