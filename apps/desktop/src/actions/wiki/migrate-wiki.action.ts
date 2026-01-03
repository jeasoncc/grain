/**
 * @file migrate-wiki.action.ts
 * @description Wiki 迁移 Action
 *
 * 功能说明：
 * - 一次性迁移：从 wikiEntries 表迁移到文件节点
 * - Wiki 条目迁移到 wiki/ 文件夹，带 "wiki" 标签
 * - 迁移完成后删除原始条目
 *
 * 注意：此服务直接访问旧的 wikiEntries 表，因为 WikiRepository 已被移除。
 * 该表将在数据库 v11 迁移完成后删除。
 *
 * @requirements 4.1, 4.2, 4.3, 4.5
 */

import * as E from "fp-ts/Either";
import { ensureRootFolderAsync } from "@/actions/node";
import { database } from "@/db/database";
import { WIKI_ROOT_FOLDER, WIKI_TAG } from "@/fn/wiki";
import logger from "@/log/index";
import { addContent, addNode, getNextOrder, updateNode } from "@/repo";

/**
 * 旧版 WikiInterface，用于迁移
 * 匹配旧的 wikiEntries 表结构
 */
interface LegacyWikiEntry {
	id: string;
	project: string;
	name: string;
	alias: string[];
	tags: string[];
	content: string;
	createDate: string;
	updatedAt: string;
}

// ==============================
// Types
// ==============================

/**
 * 迁移结果接口
 */
export interface MigrationResult {
	/** 成功迁移的条目数 */
	migrated: number;
	/** 失败迁移的错误消息数组 */
	errors: string[];
}

// ==============================
// Migration Actions
// ==============================

/**
 * 检查工作区是否需要迁移
 * 如果 wikiEntries 表中存在条目则返回 true
 *
 * @param workspaceId - 要检查的工作区 ID
 * @returns 是否需要迁移
 */
export async function checkMigrationNeeded(
	workspaceId: string,
): Promise<boolean> {
	try {
		// 直接访问旧的 wikiEntries 表
		// 如果已迁移到 v11，该表可能不存在
		const table = database.table("wikiEntries");
		if (!table) {
			return false;
		}
		const count = await table.where("project").equals(workspaceId).count();
		return count > 0;
	} catch (error) {
		// 迁移后表可能不存在
		logger.debug(
			`Wiki entries table not found or empty for workspace ${workspaceId}:`,
			error,
		);
		return false;
	}
}

/**
 * 将 wiki 条目从 wikiEntries 表迁移到文件节点
 * 在 wiki/ 文件夹中创建带 "wiki" 标签的文件
 *
 * @param workspaceId - 要迁移的工作区 ID
 * @returns 迁移结果，包含计数和错误
 */
export async function migrateWikiEntriesToFiles(
	workspaceId: string,
): Promise<MigrationResult> {
	const result: MigrationResult = {
		migrated: 0,
		errors: [],
	};

	try {
		// 从旧表获取此工作区的所有 wiki 条目
		const table = database.table("wikiEntries");
		if (!table) {
			logger.info(`Wiki entries table not found for workspace ${workspaceId}`);
			return result;
		}
		const wikiEntries = (await table
			.where("project")
			.equals(workspaceId)
			.toArray()) as LegacyWikiEntry[];

		if (wikiEntries.length === 0) {
			logger.info(`No wiki entries to migrate for workspace ${workspaceId}`);
			return result;
		}

		logger.info(
			`Starting migration of ${wikiEntries.length} wiki entries for workspace ${workspaceId}`,
		);

		// 确保 wiki 文件夹存在
		const wikiFolder = await ensureRootFolderAsync(
			workspaceId,
			WIKI_ROOT_FOLDER,
		);

		// 迁移每个条目
		for (const entry of wikiEntries) {
			try {
				await migrateWikiEntry(entry, wikiFolder.id, workspaceId);
				result.migrated++;
			} catch (error) {
				const errorMessage = `Failed to migrate wiki entry "${entry.name}" (${entry.id}): ${error instanceof Error ? error.message : String(error)}`;
				result.errors.push(errorMessage);
				logger.error(errorMessage);
				// 继续处理剩余条目
			}
		}

		logger.success(
			`Migration complete for workspace ${workspaceId}: ${result.migrated} migrated, ${result.errors.length} errors`,
		);

		return result;
	} catch (error) {
		const errorMessage = `Migration failed for workspace ${workspaceId}: ${error instanceof Error ? error.message : String(error)}`;
		result.errors.push(errorMessage);
		logger.error(errorMessage);
		return result;
	}
}

/**
 * 迁移单个 wiki 条目到文件节点
 *
 * @param entry - 要迁移的 wiki 条目
 * @param wikiFolderId - wiki 文件夹节点 ID
 * @param workspaceId - 工作区 ID
 */
async function migrateWikiEntry(
	entry: LegacyWikiEntry,
	wikiFolderId: string,
	workspaceId: string,
): Promise<void> {
	// 获取新文件的下一个顺序
	const nextOrderResult = await getNextOrder(wikiFolderId, workspaceId)();
	const nextOrder = E.isRight(nextOrderResult) ? nextOrderResult.right : 0;

	// 创建文件节点
	const nodeResult = await addNode(workspaceId, entry.name, {
		parent: wikiFolderId,
		type: "file",
		order: nextOrder,
	})();

	if (E.isLeft(nodeResult)) {
		throw new Error(`Failed to create node: ${nodeResult.left.message}`);
	}

	const node = nodeResult.right;

	// 应用 "wiki" 标签并保留原始标签
	const tags =
		entry.tags?.length > 0
			? [...new Set([WIKI_TAG, ...entry.tags])]
			: [WIKI_TAG];

	await updateNode(node.id, { tags })();

	// 创建内容记录
	await addContent(node.id, entry.content || "", "lexical")();

	// 成功迁移后删除原始 wiki 条目
	const table = database.table("wikiEntries");
	if (table) {
		await table.delete(entry.id);
	}

	logger.debug(`Migrated wiki entry "${entry.name}" to node ${node.id}`);
}

/**
 * 如果需要则运行工作区迁移
 * 这是工作区初始化期间迁移的主入口点
 *
 * @param workspaceId - 工作区 ID
 * @returns 迁移结果，如果不需要迁移则返回 null
 */
export async function runMigrationIfNeeded(
	workspaceId: string,
): Promise<MigrationResult | null> {
	const needsMigration = await checkMigrationNeeded(workspaceId);

	if (!needsMigration) {
		return null;
	}

	logger.info(`Wiki migration needed for workspace ${workspaceId}`);
	return migrateWikiEntriesToFiles(workspaceId);
}
