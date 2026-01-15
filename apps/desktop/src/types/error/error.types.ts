/**
 * @file types/error/error.types.ts
 * @description 应用错误类型定义和工厂函数
 *
 * 功能说明：
 * - 定义 AppError 联合类型，用于函数式错误处理
 * - 提供类型守卫函数，用于错误类型判断
 * - 提供错误工厂函数，用于创建错误对象
 * - 与 fp-ts Either 类型配合使用
 */

/**
 * 应用错误联合类型
 *
 * 用于 fp-ts Either 类型的错误处理，所有可能失败的操作
 * 都应该返回 Either<AppError, T> 类型
 */
export type AppError =
	| { readonly type: "VALIDATION_ERROR"; readonly message: string; readonly field?: string }
	| { readonly type: "DB_ERROR"; readonly message: string }
	| { readonly type: "NOT_FOUND"; readonly message: string; readonly id?: string }
	| { readonly type: "CYCLE_ERROR"; readonly message: string }
	| { readonly type: "EXPORT_ERROR"; readonly message: string }
	| { readonly type: "IMPORT_ERROR"; readonly message: string }
	| {
			readonly type: "LOG_STORAGE_ERROR"
			readonly message: string
			readonly originalError?: unknown
	  }
	| {
			readonly type: "LOG_FORMAT_ERROR"
			readonly message: string
			readonly originalError?: unknown
	  }
	| {
			readonly type: "LOG_CONFIG_ERROR"
			readonly message: string
			readonly originalError?: unknown
	  }
	| { readonly type: "LOG_QUEUE_ERROR"; readonly message: string; readonly originalError?: unknown }
	| { readonly type: "UNKNOWN_ERROR"; readonly message: string }

/**
 * 错误类型枚举，用于类型安全的错误创建
 */
export const ErrorType = {
	CYCLE_ERROR: "CYCLE_ERROR",
	DB_ERROR: "DB_ERROR",
	EXPORT_ERROR: "EXPORT_ERROR",
	IMPORT_ERROR: "IMPORT_ERROR",
	LOG_CONFIG_ERROR: "LOG_CONFIG_ERROR",
	LOG_FORMAT_ERROR: "LOG_FORMAT_ERROR",
	LOG_QUEUE_ERROR: "LOG_QUEUE_ERROR",
	LOG_STORAGE_ERROR: "LOG_STORAGE_ERROR",
	NOT_FOUND: "NOT_FOUND",
	UNKNOWN_ERROR: "UNKNOWN_ERROR",
	VALIDATION_ERROR: "VALIDATION_ERROR",
} as const

// ============================================================================
// 类型守卫函数
// ============================================================================

/**
 * 判断是否为验证错误
 */
export const isValidationError = (
	e: AppError,
): e is { readonly type: "VALIDATION_ERROR"; readonly message: string; readonly field?: string } =>
	e.type === "VALIDATION_ERROR"

/**
 * 判断是否为数据库错误
 */
export const isDbError = (
	e: AppError,
): e is { readonly type: "DB_ERROR"; readonly message: string } => e.type === "DB_ERROR"

/**
 * 判断是否为未找到错误
 */
export const isNotFoundError = (
	e: AppError,
): e is { readonly type: "NOT_FOUND"; readonly message: string; readonly id?: string } =>
	e.type === "NOT_FOUND"

/**
 * 判断是否为循环引用错误
 */
export const isCycleError = (
	e: AppError,
): e is { readonly type: "CYCLE_ERROR"; readonly message: string } => e.type === "CYCLE_ERROR"

/**
 * 判断是否为导出错误
 */
export const isExportError = (
	e: AppError,
): e is { readonly type: "EXPORT_ERROR"; readonly message: string } => e.type === "EXPORT_ERROR"

/**
 * 判断是否为导入错误
 */
export const isImportError = (
	e: AppError,
): e is { readonly type: "IMPORT_ERROR"; readonly message: string } => e.type === "IMPORT_ERROR"

/**
 * 判断是否为未知错误
 */
export const isUnknownError = (
	e: AppError,
): e is { readonly type: "UNKNOWN_ERROR"; readonly message: string } => e.type === "UNKNOWN_ERROR"

// ============================================================================
// 错误创建辅助函数（工厂函数）
// ============================================================================

/**
 * 创建验证错误
 */
export const validationError = (message: string, field?: string): AppError => ({
	field,
	message,
	type: "VALIDATION_ERROR",
})

/**
 * 创建数据库错误
 */
export const dbError = (message: string): AppError => ({
	message,
	type: "DB_ERROR",
})

/**
 * 创建未找到错误
 */
export const notFoundError = (message: string, id?: string): AppError => ({
	id,
	message,
	type: "NOT_FOUND",
})

/**
 * 创建循环引用错误
 */
export const cycleError = (message: string): AppError => ({
	message,
	type: "CYCLE_ERROR",
})

/**
 * 创建导出错误
 */
export const exportError = (message: string): AppError => ({
	message,
	type: "EXPORT_ERROR",
})

/**
 * 创建导入错误
 */
export const importError = (message: string): AppError => ({
	message,
	type: "IMPORT_ERROR",
})

/**
 * 创建未知错误
 */
export const unknownError = (message: string): AppError => ({
	message,
	type: "UNKNOWN_ERROR",
})

/**
 * 创建日志存储错误
 */
export const logStorageError = (message: string, originalError?: unknown): AppError => ({
	message,
	originalError,
	type: "LOG_STORAGE_ERROR",
})

/**
 * 创建日志格式错误
 */
export const logFormatError = (message: string, originalError?: unknown): AppError => ({
	message,
	originalError,
	type: "LOG_FORMAT_ERROR",
})

/**
 * 创建日志配置错误
 */
export const logConfigError = (message: string, originalError?: unknown): AppError => ({
	message,
	originalError,
	type: "LOG_CONFIG_ERROR",
})

/**
 * 创建日志队列错误
 */
export const logQueueError = (message: string, originalError?: unknown): AppError => ({
	message,
	originalError,
	type: "LOG_QUEUE_ERROR",
})
