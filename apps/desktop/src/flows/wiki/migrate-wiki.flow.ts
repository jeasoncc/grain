/**
 * @file migrate-wiki.flow.ts
 * @description Wiki 迁移 Flow
 *
 * 功能说明：
 * - 迁移功能已完成：Wiki 数据现在直接使用 SQLite API
 * - Wiki 条目通过标签系统管理，带 "wiki" 标签
 * - 不再需要从旧数据库迁移
 *
 * 注意：由于 Dexie 已完全移除，迁移功能现在返回无操作结果。
 * Wiki 功能通过 SQLite API 和标签系统实现。
 *
 * @requirements 4.1, 4.2, 4.3, 4.5
 */

import { debug, info } from "@/io/log/logger.api"
import { WIKI_TAG } from "@/pipes/wiki"
import type { AppError } from "@/types/error"

// ==============================
// Types
// ==============================

/**
 * 迁移结果接口
 */
export interface MigrationResult {
	/** 成功迁移的条目数 */
	readonly migrated: number
	/** 失败迁移的错误消息数组 */
	readonly errors: ReadonlyArray<string>
}

// ==============================
// Migration Actions
// ==============================

/**
 * 检查工作区是否需要迁移
 *
 * Note: Since we're removing Dexie entirely, wiki migration is no longer needed.
 * This function now always returns false as the migration is considered complete.
 *
 * @param workspaceId - 要检查的工作区 ID
 * @returns 是否需要迁移 (always false)
 */
export async function checkMigrationNeeded(workspaceId: string): Promise<boolean> {
	debug(
		`Wiki migration check for workspace ${workspaceId}: migration no longer needed (Dexie removed)`,
	)
	return false
}

/**
 * 将 Wiki 数据迁移到文件节点
 *
 * Note: Since we're removing Dexie entirely, this migration is no longer needed.
 * This function now returns a successful result indicating no migration was needed.
 *
 * @param workspaceId - 要迁移的工作区 ID
 * @returns 迁移结果，包含计数和错误
 */
export async function migrateWikiEntriesToFiles(workspaceId: string): Promise<MigrationResult> {
	info(`Wiki migration for workspace ${workspaceId}: no migration needed (Dexie removed)`)
	return { errors: [], migrated: 0 }
}

/**
 * 如果需要则运行工作区迁移
 *
 * Note: Since we're removing Dexie entirely, this migration is no longer needed.
 * This function now always returns null indicating no migration was needed.
 *
 * @param workspaceId - 工作区 ID
 * @returns 迁移结果，如果不需要迁移则返回 null
 */
export async function runMigrationIfNeeded(workspaceId: string): Promise<MigrationResult | null> {
	const needsMigration = await checkMigrationNeeded(workspaceId)

	if (!needsMigration) {
		return null
	}

	info(`Wiki migration needed for workspace ${workspaceId}`)
	return migrateWikiEntriesToFiles(workspaceId)
}
