/**
 * Content Repository - 内容数据访问层
 *
 * 纯函数 + TaskEither 封装，返回前端类型 (ContentInterface)。
 * 通过 Codec 层进行类型转换，确保前后端类型解耦。
 */

import { pipe } from "fp-ts/function"
import * as RA from "fp-ts/ReadonlyArray"
import * as TE from "fp-ts/TaskEither"
import { debug } from "@/io/log/logger.api"
import {
	decodeContent,
	decodeContentOptional,
	encodeCreateContent,
	encodeUpdateContent,
} from "@/types/codec"
import type { ContentCreateInput, ContentInterface, ContentType } from "@/types/content"
import type { AppError } from "@/types/error"
import { api } from "./client.api"

// ============================================
// 查询操作
// ============================================

/**
 * 获取节点内容
 */
export const getContentByNodeId = (
	nodeId: string,
): TE.TaskEither<AppError, ContentInterface | null> => {
	debug("[ContentAPI] 获取内容", { nodeId }, "content.api")

	return pipe(
		api.getContent(nodeId),
		TE.map((response) => {
			const content = decodeContentOptional(response)
			if (content) {
				debug(
					"[ContentAPI] 内容获取成功",
					{
						nodeId: content.nodeId,
						contentLength: content.content.length,
						contentType: content.contentType,
					},
					"content.api",
				)
			} else {
				debug("[ContentAPI] 内容不存在")
			}
			return content
		}),
	)
}

/**
 * 获取节点内容（不存在时抛出错误）
 */
export const getContentByNodeIdOrFail = (
	nodeId: string,
): TE.TaskEither<AppError, ContentInterface> =>
	pipe(
		getContentByNodeId(nodeId),
		TE.chain((content) =>
			content
				? TE.right(content)
				: TE.left({
						type: "NOT_FOUND",
						message: `内容不存在: ${nodeId}`,
					} as AppError),
		),
	)

/**
 * 获取内容版本号
 */
export const getContentVersion = (nodeId: string): TE.TaskEither<AppError, number | null> =>
	api.getContentVersion(nodeId)

// ============================================
// 写入操作
// ============================================

/**
 * 创建内容
 */
export const createContent = (
	input: ContentCreateInput,
): TE.TaskEither<AppError, ContentInterface> =>
	pipe(TE.of(encodeCreateContent(input)), TE.chain(api.saveContent), TE.map(decodeContent))

/**
 * 添加内容（别名，兼容旧 API）
 *
 * @param nodeId - 节点 ID
 * @param content - 内容字符串
 * @param contentType - 内容类型（可选，默认 "lexical"）
 */
export const addContent = (
	nodeId: string,
	content: string,
	contentType: ContentType = "lexical",
): TE.TaskEither<AppError, ContentInterface> =>
	createContent({
		nodeId,
		content,
		contentType,
	})

/**
 * 更新节点内容
 *
 * @param nodeId - 节点 ID
 * @param content - 内容字符串
 * @param contentType - 内容类型（可选，目前后端不使用，保留兼容性）
 */
export const updateContentByNodeId = (
	nodeId: string,
	content: string,
	_contentType?: ContentType,
): TE.TaskEither<AppError, ContentInterface> =>
	pipe(
		TE.of(encodeUpdateContent(nodeId, content)),
		TE.chain(api.saveContent),
		TE.map(decodeContent),
	)

/**
 * 保存内容（创建或更新）
 * 统一的保存接口，根据是否存在自动选择创建或更新
 */
export const saveContent = (
	nodeId: string,
	content: string,
	expectedVersion?: number,
): TE.TaskEither<AppError, ContentInterface> =>
	pipe(
		TE.of(encodeUpdateContent(nodeId, content, expectedVersion)),
		TE.chain(api.saveContent),
		TE.map(decodeContent),
	)

/**
 * 批量获取多个节点的内容
 *
 * 由于 Rust 后端没有批量获取 API，这里通过并行调用单个 API 实现
 *
 * @param nodeIds - 节点 ID 数组
 * @returns TaskEither<AppError, readonly ContentInterface[]>
 */
export const getContentsByNodeIds = (
	nodeIds: readonly string[],
): TE.TaskEither<AppError, readonly ContentInterface[]> => {
	if (nodeIds.length === 0) {
		return TE.right([])
	}

	return pipe(
		nodeIds,
		RA.map((nodeId) =>
			pipe(
				api.getContent(nodeId),
				TE.map((response) => (response ? decodeContent(response) : null)),
			),
		),
		RA.sequence(TE.ApplicativePar),
		TE.map((results) => results.filter((c): c is ContentInterface => c !== null)),
	)
}
