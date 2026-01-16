/**
 * @file storage.interface.ts
 * @description 存储统计相关类型定义
 */

// ============================================================================
// 清理数据选项
// ============================================================================

/**
 * 清理数据选项
 */
export interface ClearDataOptions {
	/** 是否清理 SQLite 数据（通过 Rust 后端） */
	readonly clearSqlite?: boolean
	/** 是否清理 localStorage */
	readonly clearLocalStorage?: boolean
	/** 是否清理 sessionStorage */
	readonly clearSessionStorage?: boolean
	/** 是否清理 cookies */
	readonly clearCookies?: boolean
	/** 是否清理缓存 */
	readonly clearCaches?: boolean
}
