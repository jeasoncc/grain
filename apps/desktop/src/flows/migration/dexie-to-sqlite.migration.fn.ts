/**
 * @file dexie-to-sqlite.migration.fn.ts
 * @description SQLite 迁移工具（Dexie 支持已移除）
 *
 * 功能说明：
 * - 迁移状态管理（保留向后兼容性）
 * - 提供迁移相关的接口和类型定义
 * - 所有 Dexie 相关功能已被移除或转为 no-op
 *
 * 迁移策略：
 * - 所有迁移函数现在返回空结果或完成状态
 * - 保留接口以维持向后兼容性
 * - 应用现在完全依赖 SQLite 作为唯一数据源
 *
 * 注意：此文件保留是为了向后兼容，实际上不再执行任何迁移操作
 *
 * @requirements 5.1, 5.2, 5.3, 5.4
 */

import dayjs from "dayjs"
import * as TE from "fp-ts/TaskEither"
import { info, warn } from "@/io/log/logger.api"
import type { ContentInterface } from "@/types/content"
import { type AppError, dbError } from "@/types/error"
import type { NodeInterface } from "@/types/node"
import type { UserInterface } from "@/types/user"
import type { WorkspaceInterface } from "@/types/workspace"

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 迁移状态
 */
export type MigrationStatus = "not_started" | "in_progress" | "completed" | "failed" | "rolled_back"

/**
 * ID 映射表
 * 用于跟踪旧 ID 到新 ID 的映射关系
 */
export interface IdMapping {
	readonly workspaces: ReadonlyMap<string, string>
	readonly nodes: ReadonlyMap<string, string>
	readonly users: ReadonlyMap<string, string>
}

/**
 * 迁移结果
 */
export interface MigrationResult {
	readonly status: MigrationStatus
	readonly migratedCounts: {
		readonly workspaces: number
		readonly nodes: number
		readonly contents: number
		readonly users: number
	}
	readonly errors: ReadonlyArray<string>
	readonly startedAt: string
	readonly completedAt?: string
	readonly idMapping?: IdMapping
}

/**
 * Dexie 数据快照
 */
export interface DexieDataSnapshot {
	readonly workspaces: ReadonlyArray<WorkspaceInterface>
	readonly nodes: ReadonlyArray<NodeInterface>
	readonly contents: ReadonlyArray<ContentInterface>
	readonly users: ReadonlyArray<UserInterface>
}

// ============================================================================
// 迁移状态管理
// ============================================================================

const MIGRATION_STATUS_KEY = "grain_dexie_to_sqlite_migration_status"

/**
 * 获取迁移状态
 */
export const getMigrationStatus = (): MigrationStatus => {
	try {
		const status = localStorage.getItem(MIGRATION_STATUS_KEY)
		if (status) {
			return status as MigrationStatus
		}
		return "not_started"
	} catch {
		return "not_started"
	}
}

/**
 * 设置迁移状态
 */
export const setMigrationStatus = (status: MigrationStatus): void => {
	try {
		localStorage.setItem(MIGRATION_STATUS_KEY, status)
	} catch (err) {
		warn("[Migration] 设置 SQLite 迁移状态失败", { error: err }, "dexie-to-sqlite.migration.fn")
	}
}

/**
 * 清除迁移状态
 */
export const clearMigrationStatus = (): void => {
	try {
		localStorage.removeItem(MIGRATION_STATUS_KEY)
	} catch (err) {
		warn("[Migration] 清除 SQLite 迁移状态失败", { error: err }, "dexie-to-sqlite.migration.fn")
	}
}

// ============================================================================
// Dexie 数据检测
// ============================================================================

/**
 * 检测 Dexie 数据是否存在
 * 
 * @deprecated Dexie support has been removed. This function now always returns false.
 */
export const hasDexieData = (): TE.TaskEither<AppError, boolean> =>
	TE.right(false)

/**
 * 检查是否需要迁移
 * 
 * @deprecated Dexie support has been removed. This function now always returns false.
 */
export const needsMigration = (): TE.TaskEither<AppError, boolean> =>
	TE.right(false)

// ============================================================================
// 数据读取
// ============================================================================

/**
 * 读取 Dexie 数据快照
 * 
 * @deprecated Dexie support has been removed. This function now returns empty data.
 */
export const readDexieData = (): TE.TaskEither<AppError, DexieDataSnapshot> =>
	TE.right({
		contents: [],
		nodes: [],
		users: [],
		workspaces: [],
	})

// ============================================================================
// 数据写入
// ============================================================================

// ============================================================================
// 主迁移函数
// ============================================================================

/**
 * 执行数据迁移
 * 
 * @deprecated Dexie support has been removed. This function now returns a completed status without performing any migration.
 */
export const migrateData = (): TE.TaskEither<AppError, MigrationResult> => {
	const startTime = dayjs().toISOString()
	const completedTime = dayjs().toISOString()
	
	return TE.right({
		completedAt: completedTime,
		errors: [],
		migratedCounts: { contents: 0, nodes: 0, users: 0, workspaces: 0 },
		startedAt: startTime,
		status: "completed",
	} as MigrationResult)
}

// ============================================================================
// 回滚函数
// ============================================================================

/**
 * 回滚迁移
 *
 * 注意：回滚只是重置迁移状态，不会删除已迁移的数据
 * 由于 Dexie 支持已移除，此函数主要用于状态管理
 */
export const rollbackMigration = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			warn("[Migration] 回滚 SQLite 迁移状态...")
			setMigrationStatus("rolled_back")
			info("[Migration] SQLite 迁移状态已回滚")
		},
		(err): AppError => {
			warn("[Migration] 回滚 SQLite 迁移失败", { error: err }, "dexie-to-sqlite.migration.fn")
			return dbError(`回滚 SQLite 迁移失败: ${err instanceof Error ? err.message : String(err)}`)
		},
	)

/**
 * 重置迁移状态（允许重新迁移）
 */
export const resetMigrationStatus = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			info("[Migration] 重置 SQLite 迁移状态...")
			clearMigrationStatus()
			info("[Migration] SQLite 迁移状态已重置")
		},
		(err): AppError => {
			warn("[Migration] 重置 SQLite 迁移状态失败", { error: err }, "dexie-to-sqlite.migration.fn")
			return dbError(`重置 SQLite 迁移状态失败: ${err instanceof Error ? err.message : String(err)}`)
		},
	)

// ============================================================================
// 清理函数
// ============================================================================

/**
 * 清理 Dexie 数据（迁移完成后调用）
 * 
 * @deprecated Dexie support has been removed. This function is now a no-op.
 */
export const clearDexieData = (): TE.TaskEither<AppError, void> =>
	TE.right(undefined)

/**
 * 完整迁移流程（迁移 + 清理）
 * 
 * @deprecated Dexie support has been removed. This function now returns a completed status without performing any migration.
 */
export const migrateAndCleanup = (): TE.TaskEither<AppError, MigrationResult> =>
	migrateData()
