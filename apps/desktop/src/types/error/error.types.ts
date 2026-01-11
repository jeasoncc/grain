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
	| { type: "VALIDATION_ERROR"; message: string; field?: string }
	| { type: "DB_ERROR"; message: string }
	| { type: "NOT_FOUND"; message: string; id?: string }
	| { type: "CYCLE_ERROR"; message: string }
	| { type: "EXPORT_ERROR"; message: string }
	| { type: "IMPORT_ERROR"; message: string }
	| { type: "LOG_STORAGE_ERROR"; message: string; originalError?: unknown }
	| { type: "LOG_FORMAT_ERROR"; message: string; originalError?: unknown }
	| { type: "LOG_CONFIG_ERROR"; message: string; originalError?: unknown }
	| { type: "LOG_QUEUE_ERROR"; message: string; originalError?: unknown }
	| { type: "UNKNOWN_ERROR"; message: string };

/**
 * 错误类型枚举，用于类型安全的错误创建
 */
export const ErrorType = {
	VALIDATION_ERROR: "VALIDATION_ERROR",
	DB_ERROR: "DB_ERROR",
	NOT_FOUND: "NOT_FOUND",
	CYCLE_ERROR: "CYCLE_ERROR",
	EXPORT_ERROR: "EXPORT_ERROR",
	IMPORT_ERROR: "IMPORT_ERROR",
	LOG_STORAGE_ERROR: "LOG_STORAGE_ERROR",
	LOG_FORMAT_ERROR: "LOG_FORMAT_ERROR",
	LOG_CONFIG_ERROR: "LOG_CONFIG_ERROR",
	LOG_QUEUE_ERROR: "LOG_QUEUE_ERROR",
	UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

// ============================================================================
// 类型守卫函数
// ============================================================================

/**
 * 判断是否为验证错误
 */
export const isValidationError = (
	e: AppError,
): e is { type: "VALIDATION_ERROR"; message: string; field?: string } =>
	e.type === "VALIDATION_ERROR";

/**
 * 判断是否为数据库错误
 */
export const isDbError = (
	e: AppError,
): e is { type: "DB_ERROR"; message: string } => e.type === "DB_ERROR";

/**
 * 判断是否为未找到错误
 */
export const isNotFoundError = (
	e: AppError,
): e is { type: "NOT_FOUND"; message: string; id?: string } =>
	e.type === "NOT_FOUND";

/**
 * 判断是否为循环引用错误
 */
export const isCycleError = (
	e: AppError,
): e is { type: "CYCLE_ERROR"; message: string } => e.type === "CYCLE_ERROR";

/**
 * 判断是否为导出错误
 */
export const isExportError = (
	e: AppError,
): e is { type: "EXPORT_ERROR"; message: string } => e.type === "EXPORT_ERROR";

/**
 * 判断是否为导入错误
 */
export const isImportError = (
	e: AppError,
): e is { type: "IMPORT_ERROR"; message: string } => e.type === "IMPORT_ERROR";

/**
 * 判断是否为未知错误
 */
export const isUnknownError = (
	e: AppError,
): e is { type: "UNKNOWN_ERROR"; message: string } =>
	e.type === "UNKNOWN_ERROR";

// ============================================================================
// 错误创建辅助函数（工厂函数）
// ============================================================================

/**
 * 创建验证错误
 */
export const validationError = (message: string, field?: string): AppError => ({
	type: "VALIDATION_ERROR",
	message,
	field,
});

/**
 * 创建数据库错误
 */
export const dbError = (message: string): AppError => ({
	type: "DB_ERROR",
	message,
});

/**
 * 创建未找到错误
 */
export const notFoundError = (message: string, id?: string): AppError => ({
	type: "NOT_FOUND",
	message,
	id,
});

/**
 * 创建循环引用错误
 */
export const cycleError = (message: string): AppError => ({
	type: "CYCLE_ERROR",
	message,
});

/**
 * 创建导出错误
 */
export const exportError = (message: string): AppError => ({
	type: "EXPORT_ERROR",
	message,
});

/**
 * 创建导入错误
 */
export const importError = (message: string): AppError => ({
	type: "IMPORT_ERROR",
	message,
});

/**
 * 创建未知错误
 */
export const unknownError = (message: string): AppError => ({
	type: "UNKNOWN_ERROR",
	message,
});

/**
 * 创建日志存储错误
 */
export const logStorageError = (message: string, originalError?: unknown): AppError => ({
	type: "LOG_STORAGE_ERROR",
	message,
	originalError,
});

/**
 * 创建日志格式错误
 */
export const logFormatError = (message: string, originalError?: unknown): AppError => ({
	type: "LOG_FORMAT_ERROR",
	message,
	originalError,
});

/**
 * 创建日志配置错误
 */
export const logConfigError = (message: string, originalError?: unknown): AppError => ({
	type: "LOG_CONFIG_ERROR",
	message,
	originalError,
});

/**
 * 创建日志队列错误
 */
export const logQueueError = (message: string, originalError?: unknown): AppError => ({
	type: "LOG_QUEUE_ERROR",
	message,
	originalError,
});
