/**
 * Tag Repository - 标签数据访问层
 *
 * 纯函数 + TaskEither 封装，返回前端类型 (TagInterface)。
 * 通过 Codec 层进行类型转换，确保前后端类型解耦。
 *
 * 架构位置：
 * ```
 * Actions / Query Hooks
 *       │
 *       ▼
 * Repository Layer ← 你在这里
 *       │
 *       ▼
 * Codec Layer (类型转换)
 *       │
 *       ▼
 * api-client.fn.ts
 * ```
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as api from "./client.api";
import type { AppError } from "@/utils/error.util";
import {
	decodeTag,
	decodeTagGraphData,
	decodeTagOptional,
	decodeTags,
	encodeCreateTag,
	encodeUpdateTag,
	type TagGraphData,
} from "@/types/codec";
import type { TagCreateInput, TagInterface, TagUpdateInput } from "@/types/tag";

// ============================================
// 查询操作
// ============================================

/**
 * 获取工作区所有标签
 */
export const getTagsByWorkspace = (
	workspaceId: string,
): TE.TaskEither<AppError, TagInterface[]> =>
	pipe(api.getTagsByWorkspace(workspaceId), TE.map(decodeTags));

/**
 * 获取单个标签
 */
export const getTag = (
	id: string,
): TE.TaskEither<AppError, TagInterface | null> =>
	pipe(api.getTag(id), TE.map(decodeTagOptional));

/**
 * 获取单个标签（不存在时抛出错误）
 */
export const getTagOrFail = (
	id: string,
): TE.TaskEither<AppError, TagInterface> =>
	pipe(
		getTag(id),
		TE.chain((tag) =>
			tag
				? TE.right(tag)
				: TE.left({
						type: "NOT_FOUND",
						message: `标签不存在: ${id}`,
					} as AppError),
		),
	);

/**
 * 按名称获取标签
 */
export const getTagByName = (
	workspaceId: string,
	name: string,
): TE.TaskEither<AppError, TagInterface | null> =>
	pipe(api.getTagByName(workspaceId, name), TE.map(decodeTagOptional));

/**
 * 获取热门标签
 */
export const getTopTags = (
	workspaceId: string,
	limit: number,
): TE.TaskEither<AppError, TagInterface[]> =>
	pipe(api.getTopTags(workspaceId, limit), TE.map(decodeTags));

/**
 * 搜索标签
 */
export const searchTags = (
	workspaceId: string,
	query: string,
): TE.TaskEither<AppError, TagInterface[]> =>
	pipe(api.searchTags(workspaceId, query), TE.map(decodeTags));

/**
 * 获取包含指定标签的节点 ID 列表
 */
export const getNodesByTag = (
	workspaceId: string,
	tagName: string,
): TE.TaskEither<AppError, string[]> => api.getNodesByTag(workspaceId, tagName);

/**
 * 获取标签图形数据
 */
export const getTagGraphData = (
	workspaceId: string,
): TE.TaskEither<AppError, TagGraphData> =>
	pipe(api.getTagGraphData(workspaceId), TE.map(decodeTagGraphData));

// ============================================
// 写入操作
// ============================================

/**
 * 创建标签
 */
export const createTag = (
	input: TagCreateInput,
): TE.TaskEither<AppError, TagInterface> =>
	pipe(
		TE.of(encodeCreateTag(input)),
		TE.chain(api.createTag),
		TE.map(decodeTag),
	);

/**
 * 更新标签
 */
export const updateTag = (
	id: string,
	input: TagUpdateInput,
): TE.TaskEither<AppError, TagInterface> =>
	pipe(
		TE.of(encodeUpdateTag(input)),
		TE.chain((request) => api.updateTag(id, request)),
		TE.map(decodeTag),
	);

/**
 * 获取或创建标签
 */
export const getOrCreateTag = (
	workspaceId: string,
	name: string,
): TE.TaskEither<AppError, TagInterface> =>
	pipe(api.getOrCreateTag(workspaceId, name), TE.map(decodeTag));

/**
 * 增加标签使用计数
 */
export const incrementTagCount = (
	id: string,
): TE.TaskEither<AppError, TagInterface> =>
	pipe(api.incrementTagCount(id), TE.map(decodeTag));

/**
 * 减少标签使用计数
 */
export const decrementTagCount = (
	id: string,
): TE.TaskEither<AppError, TagInterface> =>
	pipe(api.decrementTagCount(id), TE.map(decodeTag));

/**
 * 删除标签
 */
export const deleteTag = (id: string): TE.TaskEither<AppError, void> =>
	api.deleteTag(id);

/**
 * 删除工作区所有标签
 */
export const deleteTagsByWorkspace = (
	workspaceId: string,
): TE.TaskEither<AppError, number> => api.deleteTagsByWorkspace(workspaceId);

// ============================================
// 同步操作
// ============================================

/**
 * 同步标签缓存
 * 从 nodes 表的 tags 字段同步到 tags 表
 */
export const syncTagCache = (
	workspaceId: string,
): TE.TaskEither<AppError, void> => api.syncTagCache(workspaceId);

/**
 * 重建标签缓存
 * 删除所有标签并从 nodes 表重新构建
 */
export const rebuildTagCache = (
	workspaceId: string,
): TE.TaskEither<AppError, void> => api.rebuildTagCache(workspaceId);

/**
 * 重新计算标签计数
 * 只更新计数，不创建或删除标签
 */
export const recalculateTagCounts = (
	workspaceId: string,
): TE.TaskEither<AppError, void> => api.recalculateTagCounts(workspaceId);

// ============================================
// 兼容性别名
// ============================================

/**
 * 获取标签（别名，兼容旧 API）
 */
export const getTagById = getTag;

/**
 * 添加标签（别名，兼容旧 API）
 */
export const addTag = createTag;
