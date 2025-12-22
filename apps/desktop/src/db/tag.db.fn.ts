/**
 * @file tag.db.fn.ts
 * @description Tag 数据库操作函数
 *
 * 功能说明：
 * - 提供标签聚合缓存的 CRUD 操作
 * - 提供标签同步和重建缓存功能
 * - 提供标签搜索和图形数据查询
 * - 使用 TaskEither 返回类型进行错误处理
 * - 所有操作都有日志记录
 *
 * 注意：标签的真实来源是 nodes.tags 数组，此表是聚合缓存
 *
 * @requirements 3.1, 3.2, 3.3
 */

import dayjs from "dayjs";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { type AppError, dbError, notFoundError } from "@/lib/error.types";
import logger from "@/log";
import { TagBuilder } from "@/types/tag/tag.builder";
import type { TagInterface } from "@/types/tag/tag.interface";
import { database } from "./database";

// ============================================================================
// 基础 CRUD 操作
// ============================================================================

/**
 * 根据 ID 获取标签
 *
 * @param id - 标签 ID
 * @returns TaskEither<AppError, TagInterface | undefined>
 */
export const getTagById = (
	id: string,
): TE.TaskEither<AppError, TagInterface | undefined> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取标签:", id);
			return database.tags.get(id);
		},
		(error): AppError => {
			logger.error("[DB] 获取标签失败:", error);
			return dbError(`获取标签失败: ${error}`);
		},
	);

/**
 * 根据 ID 获取标签（必须存在）
 *
 * @param id - 标签 ID
 * @returns TaskEither<AppError, TagInterface>
 */
export const getTagByIdOrFail = (
	id: string,
): TE.TaskEither<AppError, TagInterface> =>
	pipe(
		getTagById(id),
		TE.chain((tag) =>
			tag ? TE.right(tag) : TE.left(notFoundError(`标签不存在: ${id}`, id)),
		),
	);

/**
 * 获取工作区的所有标签
 *
 * @param workspaceId - 工作区 ID
 * @returns TaskEither<AppError, TagInterface[]>
 */
export const getTagsByWorkspace = (
	workspaceId: string,
): TE.TaskEither<AppError, TagInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取工作区标签:", workspaceId);
			return database.tags.where("workspace").equals(workspaceId).toArray();
		},
		(error): AppError => {
			logger.error("[DB] 获取工作区标签失败:", error);
			return dbError(`获取工作区标签失败: ${error}`);
		},
	);

/**
 * 添加或更新标签到缓存
 *
 * @param tag - 标签对象
 * @returns TaskEither<AppError, void>
 */
export const upsertTag = (tag: TagInterface): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 更新标签缓存:", tag.id);
			await database.tags.put(tag);
			logger.success("[DB] 标签缓存更新成功:", tag.id);
		},
		(error): AppError => {
			logger.error("[DB] 更新标签缓存失败:", error);
			return dbError(`更新标签缓存失败: ${error}`);
		},
	);

/**
 * 删除标签
 *
 * @param id - 标签 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteTag = (id: string): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 删除标签:", id);
			await database.tags.delete(id);
			logger.success("[DB] 标签删除成功:", id);
		},
		(error): AppError => {
			logger.error("[DB] 删除标签失败:", error);
			return dbError(`删除标签失败: ${error}`);
		},
	);

/**
 * 删除工作区的所有标签
 *
 * @param workspaceId - 工作区 ID
 * @returns TaskEither<AppError, number> - 删除的记录数
 */
export const deleteTagsByWorkspace = (
	workspaceId: string,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 删除工作区所有标签:", workspaceId);
			const count = await database.tags
				.where("workspace")
				.equals(workspaceId)
				.delete();
			logger.success("[DB] 工作区标签删除成功:", { workspaceId, count });
			return count;
		},
		(error): AppError => {
			logger.error("[DB] 删除工作区标签失败:", error);
			return dbError(`删除工作区标签失败: ${error}`);
		},
	);

// ============================================================================
// 缓存同步操作
// ============================================================================

/**
 * 同步标签到聚合缓存
 * 在保存带有标签的文档后调用
 *
 * @param workspaceId - 工作区 ID
 * @param tags - 标签名称数组
 * @returns TaskEither<AppError, void>
 */
export const syncTagCache = (
	workspaceId: string,
	tags: string[],
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 同步标签缓存:", { workspaceId, tagCount: tags.length });
			const now = dayjs().toISOString();

			for (const tagName of tags) {
				const tagId = `${workspaceId}:${tagName}`;
				const existing = await database.tags.get(tagId);

				if (existing) {
					await database.tags.update(tagId, { lastUsed: now });
				} else {
					const newTag = new TagBuilder()
						.name(tagName)
						.workspace(workspaceId)
						.build();
					await database.tags.add(newTag);
				}
			}

			// 重新计算计数
			await recalculateTagCountsInternal(workspaceId, tags);

			logger.success("[DB] 标签缓存同步成功:", workspaceId);
		},
		(error): AppError => {
			logger.error("[DB] 同步标签缓存失败:", error);
			return dbError(`同步标签缓存失败: ${error}`);
		},
	);

/**
 * 内部函数：重新计算标签使用计数
 */
const recalculateTagCountsInternal = async (
	workspaceId: string,
	tags: string[],
): Promise<void> => {
	for (const tagName of tags) {
		const tagId = `${workspaceId}:${tagName}`;
		const count = await database.nodes
			.where("tags")
			.equals(tagName)
			.and((node) => node.workspace === workspaceId)
			.count();

		await database.tags.update(tagId, { count });
	}
};

/**
 * 重新计算标签使用计数
 *
 * @param workspaceId - 工作区 ID
 * @param tags - 标签名称数组
 * @returns TaskEither<AppError, void>
 */
export const recalculateTagCounts = (
	workspaceId: string,
	tags: string[],
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 重新计算标签计数:", {
				workspaceId,
				tagCount: tags.length,
			});
			await recalculateTagCountsInternal(workspaceId, tags);
			logger.success("[DB] 标签计数重新计算成功:", workspaceId);
		},
		(error): AppError => {
			logger.error("[DB] 重新计算标签计数失败:", error);
			return dbError(`重新计算标签计数失败: ${error}`);
		},
	);

/**
 * 重建工作区的整个标签缓存
 * 用于数据恢复或初始迁移
 *
 * @param workspaceId - 工作区 ID
 * @returns TaskEither<AppError, void>
 */
export const rebuildTagCache = (
	workspaceId: string,
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 重建标签缓存:", workspaceId);

			const nodes = await database.nodes
				.where("workspace")
				.equals(workspaceId)
				.toArray();

			// 函数式：展平所有标签并使用 reduce 计算出现次数
			const tagCounts = nodes
				.flatMap((node) => node.tags ?? [])
				.reduce<Map<string, number>>(
					(acc, tag) => acc.set(tag, (acc.get(tag) || 0) + 1),
					new Map(),
				);

			// 清除现有缓存
			await database.tags.where("workspace").equals(workspaceId).delete();

			// 函数式：将 Map 条目转换为 TagInterface 数组
			const tagEntries: TagInterface[] = Array.from(
				tagCounts,
				([name, count]) => {
					const tag = new TagBuilder()
						.name(name)
						.workspace(workspaceId)
						.count(count)
						.build();
					return tag;
				},
			);

			if (tagEntries.length > 0) {
				await database.tags.bulkAdd(tagEntries);
			}

			logger.success("[DB] 标签缓存重建成功:", {
				workspaceId,
				tagCount: tagEntries.length,
			});
		},
		(error): AppError => {
			logger.error("[DB] 重建标签缓存失败:", error);
			return dbError(`重建标签缓存失败: ${error}`);
		},
	);

// ============================================================================
// 查询操作
// ============================================================================

/**
 * 按名称前缀搜索标签
 *
 * @param workspaceId - 工作区 ID
 * @param query - 搜索关键词
 * @returns TaskEither<AppError, TagInterface[]>
 */
export const searchTags = (
	workspaceId: string,
	query: string,
): TE.TaskEither<AppError, TagInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 搜索标签:", { workspaceId, query });
			const lowerQuery = query.toLowerCase();
			return database.tags
				.where("workspace")
				.equals(workspaceId)
				.filter((tag) => tag.name.toLowerCase().includes(lowerQuery))
				.toArray();
		},
		(error): AppError => {
			logger.error("[DB] 搜索标签失败:", error);
			return dbError(`搜索标签失败: ${error}`);
		},
	);

/**
 * 获取使用指定标签的节点
 *
 * @param workspaceId - 工作区 ID
 * @param tagName - 标签名称
 * @returns TaskEither<AppError, NodeInterface[]>
 */
export const getNodesByTag = (
	workspaceId: string,
	tagName: string,
): TE.TaskEither<AppError, import("@/types/node").NodeInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取标签关联节点:", { workspaceId, tagName });
			return database.nodes
				.where("tags")
				.equals(tagName)
				.and((node) => node.workspace === workspaceId)
				.toArray();
		},
		(error): AppError => {
			logger.error("[DB] 获取标签关联节点失败:", error);
			return dbError(`获取标签关联节点失败: ${error}`);
		},
	);

/**
 * 标签图形节点类型
 */
export interface TagGraphNode {
	id: string;
	name: string;
	count: number;
}

/**
 * 标签图形边类型
 */
export interface TagGraphEdge {
	source: string;
	target: string;
	weight: number;
}

/**
 * 标签图形数据类型
 */
export interface TagGraphData {
	nodes: TagGraphNode[];
	edges: TagGraphEdge[];
}

/**
 * 获取标签图形数据用于可视化
 *
 * @param workspaceId - 工作区 ID
 * @returns TaskEither<AppError, TagGraphData>
 */
export const getTagGraphData = (
	workspaceId: string,
): TE.TaskEither<AppError, TagGraphData> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取标签图形数据:", workspaceId);

			const tags = await database.tags
				.where("workspace")
				.equals(workspaceId)
				.toArray();
			const nodes = await database.nodes
				.where("workspace")
				.equals(workspaceId)
				.toArray();

			// 构建共现矩阵
			const coOccurrence = new Map<string, Map<string, number>>();

			for (const node of nodes) {
				if (!node.tags || node.tags.length < 2) continue;

				for (let i = 0; i < node.tags.length; i++) {
					for (let j = i + 1; j < node.tags.length; j++) {
						const tag1 = node.tags[i];
						const tag2 = node.tags[j];

						if (!coOccurrence.has(tag1)) {
							coOccurrence.set(tag1, new Map());
						}
						if (!coOccurrence.has(tag2)) {
							coOccurrence.set(tag2, new Map());
						}

						const map1 = coOccurrence.get(tag1);
						const map2 = coOccurrence.get(tag2);

						if (map1 && map2) {
							map1.set(tag2, (map1.get(tag2) || 0) + 1);
							map2.set(tag1, (map2.get(tag1) || 0) + 1);
						}
					}
				}
			}

			// 构建图形节点和边
			const graphNodes: TagGraphNode[] = tags.map((tag) => ({
				id: tag.id,
				name: tag.name,
				count: tag.count,
			}));

			const edges: TagGraphEdge[] = [];
			const addedEdges = new Set<string>();

			for (const [tag1, connections] of coOccurrence) {
				for (const [tag2, weight] of connections) {
					const edgeKey = [tag1, tag2].sort().join(":");
					if (!addedEdges.has(edgeKey)) {
						edges.push({
							source: `${workspaceId}:${tag1}`,
							target: `${workspaceId}:${tag2}`,
							weight,
						});
						addedEdges.add(edgeKey);
					}
				}
			}

			return { nodes: graphNodes, edges };
		},
		(error): AppError => {
			logger.error("[DB] 获取标签图形数据失败:", error);
			return dbError(`获取标签图形数据失败: ${error}`);
		},
	);

// ============================================================================
// 辅助操作
// ============================================================================

/**
 * 检查标签是否存在
 *
 * @param id - 标签 ID
 * @returns TaskEither<AppError, boolean>
 */
export const tagExists = (id: string): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			const count = await database.tags.where("id").equals(id).count();
			return count > 0;
		},
		(error): AppError => {
			logger.error("[DB] 检查标签存在失败:", error);
			return dbError(`检查标签存在失败: ${error}`);
		},
	);

/**
 * 统计工作区的标签数量
 *
 * @param workspaceId - 工作区 ID
 * @returns TaskEither<AppError, number>
 */
export const countTagsByWorkspace = (
	workspaceId: string,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			return database.tags.where("workspace").equals(workspaceId).count();
		},
		(error): AppError => {
			logger.error("[DB] 统计工作区标签数量失败:", error);
			return dbError(`统计工作区标签数量失败: ${error}`);
		},
	);

/**
 * 保存标签（直接保存完整标签对象）
 *
 * @param tag - 标签对象
 * @returns TaskEither<AppError, TagInterface>
 */
export const saveTag = (
	tag: TagInterface,
): TE.TaskEither<AppError, TagInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 保存标签:", tag.id);
			await database.tags.put(tag);
			logger.success("[DB] 标签保存成功:", tag.id);
			return tag;
		},
		(error): AppError => {
			logger.error("[DB] 保存标签失败:", error);
			return dbError(`保存标签失败: ${error}`);
		},
	);
