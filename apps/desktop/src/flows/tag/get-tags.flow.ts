/**
 * @file get-tags.flow.ts
 * @description 获取标签 Flow
 *
 * 封装标签查询操作，供 hooks/queries 使用
 */

import type * as TE from "fp-ts/TaskEither"
import * as tagRepo from "@/io/api/tag.api"
import type { TagGraphData } from "@/types/codec"
import type { AppError } from "@/types/error"
import type { TagInterface } from "@/types/tag"

/**
 * 获取工作区所有标签
 */
export const getTagsByWorkspace = (
	workspaceId: string,
): TE.TaskEither<AppError, readonly TagInterface[]> => {
	return tagRepo.getTagsByWorkspace(workspaceId)
}

/**
 * 获取单个标签
 */
export const getTag = (tagId: string): TE.TaskEither<AppError, TagInterface | null> => {
	return tagRepo.getTag(tagId)
}

/**
 * 按名称获取标签
 */
export const getTagByName = (
	workspaceId: string,
	name: string,
): TE.TaskEither<AppError, TagInterface | null> => {
	return tagRepo.getTagByName(workspaceId, name)
}

/**
 * 获取热门标签
 */
export const getTopTags = (
	workspaceId: string,
	limit: number,
): TE.TaskEither<AppError, readonly TagInterface[]> => {
	return tagRepo.getTopTags(workspaceId, limit)
}

/**
 * 搜索标签
 */
export const searchTags = (
	workspaceId: string,
	query: string,
): TE.TaskEither<AppError, readonly TagInterface[]> => {
	return tagRepo.searchTags(workspaceId, query)
}

/**
 * 获取包含指定标签的节点 ID 列表
 */
export const getNodesByTag = (
	workspaceId: string,
	tagName: string,
): TE.TaskEither<AppError, readonly string[]> => {
	return tagRepo.getNodesByTag(workspaceId, tagName)
}

/**
 * 获取标签图数据
 */
export const getTagGraphData = (workspaceId: string): TE.TaskEither<AppError, TagGraphData> => {
	return tagRepo.getTagGraphData(workspaceId)
}
