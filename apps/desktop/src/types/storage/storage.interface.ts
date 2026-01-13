/**
 * @file storage.interface.ts
 * @description 存储统计相关类型定义
 */

// ============================================================================
// 表数据统计
// ============================================================================

/**
 * 表数据统计
 */
export interface TableStats {
	readonly users: number;
	readonly workspaces: number;
	readonly nodes: number;
	readonly contents: number;
	readonly drawings: number;
	readonly attachments: number;
	readonly tags: number;
}

/**
 * 表大小统计（字节）
 */
export interface TableSizes {
	readonly users: number;
	readonly workspaces: number;
	readonly nodes: number;
	readonly contents: number;
	readonly drawings: number;
	readonly attachments: number;
	readonly tags: number;
}

// ============================================================================
// IndexedDB 统计信息
// ============================================================================

/**
 * IndexedDB 统计信息
 */
export interface IndexedDBStats {
	readonly size: number;
	readonly tables: TableStats;
	readonly tableSizes: TableSizes;
}

// ============================================================================
// 存储统计信息
// ============================================================================

/**
 * 存储统计信息
 */
export interface StorageStats {
	readonly indexedDB: IndexedDBStats;
	readonly localStorage: { readonly size: number; readonly keys: number };
	readonly sessionStorage: { readonly size: number; readonly keys: number };
	readonly cookies: { readonly count: number };
}

// ============================================================================
// 清理数据选项
// ============================================================================

/**
 * 清理数据选项
 */
export interface ClearDataOptions {
	/** 是否清理 SQLite 数据（通过 Rust 后端） */
	readonly clearSqlite?: boolean;
	/** 是否清理 IndexedDB 数据 */
	readonly clearIndexedDB?: boolean;
	/** 是否清理 localStorage */
	readonly clearLocalStorage?: boolean;
	/** 是否清理 sessionStorage */
	readonly clearSessionStorage?: boolean;
	/** 是否清理 cookies */
	readonly clearCookies?: boolean;
	/** 是否清理缓存 */
	readonly clearCaches?: boolean;
}
