/**
 * @file content.db.fn.ts
 * @description Content 数据库操作函数
 *
 * 功能说明：
 * - 提供内容的 CRUD 操作
 * - 使用 TaskEither 返回类型进行错误处理
 * - 所有操作都有日志记录
 *
 * @requirements 3.1, 3.2, 3.3
 */

import dayjs from "dayjs";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { type AppError, dbError, notFoundError } from "@/lib/error.types";
import logger from "@/log";
import { ContentBuilder } from "@/types/content/content.builder";
import type {
	ContentInterface,
	ContentType,
	ContentUpdateInput,
} from "@/types/content/content.interface";
import { database } from "./database";

// ============================================================================
// 基础 CRUD 操作
// ============================================================================

/**
 * 添加新内容记录
 *
 * @param nodeId - 父节点 ID
 * @param content - 内容字符串（可选，默认为空）
 * @param contentType - 内容类型（可选，默认为 "lexical"）
 * @returns TaskEither<AppError, ContentInterface>
 */
export const addContent = (
	nodeId: string,
	content: string = "",
	contentType: ContentType = "lexical",
): TE.TaskEither<AppError, ContentInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 添加内容:", { nodeId, contentType });

			const contentRecord = new ContentBuilder()
				.nodeId(nodeId)
				.content(content)
				.contentType(contentType)
				.build();

			await database.contents.add(contentRecord);

			logger.success("[DB] 内容添加成功:", contentRecord.id);
			return contentRecord;
		},
		(error): AppError => {
			logger.error("[DB] 添加内容失败:", error);
			return dbError(`添加内容失败: ${error}`);
		},
	);

/**
 * 更新内容记录
 *
 * @param id - 内容记录 ID
 * @param updates - 更新的字段
 * @returns TaskEither<AppError, number> - 更新的记录数（0 或 1）
 */
export const updateContent = (
	id: string,
	updates: ContentUpdateInput,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 更新内容:", { id });

			const count = await database.contents.update(id, {
				...updates,
				lastEdit: dayjs().toISOString(),
			});

			if (count > 0) {
				logger.success("[DB] 内容更新成功:", id);
			} else {
				logger.warn("[DB] 内容未找到:", id);
			}

			return count;
		},
		(error): AppError => {
			logger.error("[DB] 更新内容失败:", error);
			return dbError(`更新内容失败: ${error}`);
		},
	);

/**
 * 根据节点 ID 更新内容
 * 如果内容不存在则创建新记录
 *
 * @param nodeId - 父节点 ID
 * @param content - 新内容字符串
 * @param contentType - 内容类型（可选）
 * @returns TaskEither<AppError, ContentInterface>
 */
export const updateContentByNodeId = (
	nodeId: string,
	content: string,
	contentType?: ContentType,
): TE.TaskEither<AppError, ContentInterface> =>
	pipe(
		getContentByNodeId(nodeId),
		TE.chain((existing) => {
			if (existing) {
				// 更新现有内容
				const updates: ContentUpdateInput = contentType
					? { content, contentType }
					: { content };

				return pipe(
					updateContent(existing.id, updates),
					TE.map(() => ({
						...existing,
						...updates,
						lastEdit: dayjs().toISOString(),
					})),
				);
			}

			// 创建新内容
			return addContent(nodeId, content, contentType || "lexical");
		}),
	);

/**
 * 删除内容记录
 *
 * @param id - 内容记录 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteContent = (id: string): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 删除内容:", id);
			await database.contents.delete(id);
			logger.success("[DB] 内容删除成功:", id);
		},
		(error): AppError => {
			logger.error("[DB] 删除内容失败:", error);
			return dbError(`删除内容失败: ${error}`);
		},
	);

/**
 * 根据节点 ID 删除内容
 *
 * @param nodeId - 父节点 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteContentByNodeId = (
	nodeId: string,
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 删除节点内容:", nodeId);
			await database.contents.where("nodeId").equals(nodeId).delete();
			logger.success("[DB] 节点内容删除成功:", nodeId);
		},
		(error): AppError => {
			logger.error("[DB] 删除节点内容失败:", error);
			return dbError(`删除节点内容失败: ${error}`);
		},
	);

// ============================================================================
// 查询操作
// ============================================================================

/**
 * 根据 ID 获取内容
 *
 * @param id - 内容记录 ID
 * @returns TaskEither<AppError, ContentInterface | undefined>
 */
export const getContentById = (
	id: string,
): TE.TaskEither<AppError, ContentInterface | undefined> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取内容:", id);
			return database.contents.get(id);
		},
		(error): AppError => {
			logger.error("[DB] 获取内容失败:", error);
			return dbError(`获取内容失败: ${error}`);
		},
	);

/**
 * 根据 ID 获取内容（必须存在）
 *
 * @param id - 内容记录 ID
 * @returns TaskEither<AppError, ContentInterface>
 */
export const getContentByIdOrFail = (
	id: string,
): TE.TaskEither<AppError, ContentInterface> =>
	pipe(
		getContentById(id),
		TE.chain((content) =>
			content
				? TE.right(content)
				: TE.left(notFoundError(`内容不存在: ${id}`, id)),
		),
	);

/**
 * 根据节点 ID 获取内容
 *
 * @param nodeId - 父节点 ID
 * @returns TaskEither<AppError, ContentInterface | undefined>
 */
export const getContentByNodeId = (
	nodeId: string,
): TE.TaskEither<AppError, ContentInterface | undefined> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取节点内容:", nodeId);
			return database.contents.where("nodeId").equals(nodeId).first();
		},
		(error): AppError => {
			logger.error("[DB] 获取节点内容失败:", error);
			return dbError(`获取节点内容失败: ${error}`);
		},
	);

/**
 * 根据节点 ID 获取内容（必须存在）
 *
 * @param nodeId - 父节点 ID
 * @returns TaskEither<AppError, ContentInterface>
 */
export const getContentByNodeIdOrFail = (
	nodeId: string,
): TE.TaskEither<AppError, ContentInterface> =>
	pipe(
		getContentByNodeId(nodeId),
		TE.chain((content) =>
			content
				? TE.right(content)
				: TE.left(notFoundError(`节点内容不存在: ${nodeId}`, nodeId)),
		),
	);

/**
 * 获取多个节点的内容
 * 用于批量操作如导出
 *
 * @param nodeIds - 节点 ID 数组
 * @returns TaskEither<AppError, ContentInterface[]>
 */
export const getContentsByNodeIds = (
	nodeIds: string[],
): TE.TaskEither<AppError, ContentInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 批量获取内容:", { count: nodeIds.length });
			return database.contents.where("nodeId").anyOf(nodeIds).toArray();
		},
		(error): AppError => {
			logger.error("[DB] 批量获取内容失败:", error);
			return dbError(`批量获取内容失败: ${error}`);
		},
	);

/**
 * 获取所有内容记录
 *
 * @returns TaskEither<AppError, ContentInterface[]>
 */
export const getAllContents = (): TE.TaskEither<AppError, ContentInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取所有内容");
			return database.contents.toArray();
		},
		(error): AppError => {
			logger.error("[DB] 获取所有内容失败:", error);
			return dbError(`获取所有内容失败: ${error}`);
		},
	);

// ============================================================================
// 辅助操作
// ============================================================================

/**
 * 检查节点是否有内容
 *
 * @param nodeId - 父节点 ID
 * @returns TaskEither<AppError, boolean>
 */
export const contentExistsForNode = (
	nodeId: string,
): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			const count = await database.contents
				.where("nodeId")
				.equals(nodeId)
				.count();
			return count > 0;
		},
		(error): AppError => {
			logger.error("[DB] 检查内容存在失败:", error);
			return dbError(`检查内容存在失败: ${error}`);
		},
	);

/**
 * 保存内容（直接保存完整内容对象）
 *
 * @param content - 内容对象
 * @returns TaskEither<AppError, ContentInterface>
 */
export const saveContent = (
	content: ContentInterface,
): TE.TaskEither<AppError, ContentInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 保存内容:", content.id);
			await database.contents.put(content);
			logger.success("[DB] 内容保存成功:", content.id);
			return content;
		},
		(error): AppError => {
			logger.error("[DB] 保存内容失败:", error);
			return dbError(`保存内容失败: ${error}`);
		},
	);

/**
 * 批量保存内容
 *
 * @param contents - 内容对象数组
 * @returns TaskEither<AppError, void>
 */
export const saveContents = (
	contents: ContentInterface[],
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 批量保存内容:", { count: contents.length });
			await database.contents.bulkPut(contents);
			logger.success("[DB] 批量保存内容成功:", { count: contents.length });
		},
		(error): AppError => {
			logger.error("[DB] 批量保存内容失败:", error);
			return dbError(`批量保存内容失败: ${error}`);
		},
	);

/**
 * 批量删除内容
 *
 * @param ids - 内容 ID 数组
 * @returns TaskEither<AppError, void>
 */
export const deleteContents = (ids: string[]): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 批量删除内容:", { count: ids.length });
			await database.contents.bulkDelete(ids);
			logger.success("[DB] 批量删除内容成功:", { count: ids.length });
		},
		(error): AppError => {
			logger.error("[DB] 批量删除内容失败:", error);
			return dbError(`批量删除内容失败: ${error}`);
		},
	);

/**
 * 根据节点 ID 批量删除内容
 *
 * @param nodeIds - 节点 ID 数组
 * @returns TaskEither<AppError, void>
 */
export const deleteContentsByNodeIds = (
	nodeIds: string[],
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 批量删除节点内容:", { count: nodeIds.length });
			await database.contents.where("nodeId").anyOf(nodeIds).delete();
			logger.success("[DB] 批量删除节点内容成功:", { count: nodeIds.length });
		},
		(error): AppError => {
			logger.error("[DB] 批量删除节点内容失败:", error);
			return dbError(`批量删除节点内容失败: ${error}`);
		},
	);

/**
 * 统计内容记录数量
 *
 * @returns TaskEither<AppError, number>
 */
export const countContents = (): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			return database.contents.count();
		},
		(error): AppError => {
			logger.error("[DB] 统计内容数量失败:", error);
			return dbError(`统计内容数量失败: ${error}`);
		},
	);
