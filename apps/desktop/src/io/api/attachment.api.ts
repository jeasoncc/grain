/**
 * Attachment Repository - 附件数据访问层
 *
 * 纯函数 + TaskEither 封装，返回前端类型 (AttachmentInterface)。
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

import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import type {
	AttachmentCreateInput,
	AttachmentInterface,
	AttachmentType,
	AttachmentUpdateInput,
} from "@/types/attachment"
import {
	decodeAttachment,
	decodeAttachmentOptional,
	decodeAttachments,
	encodeCreateAttachment,
	encodeUpdateAttachment,
} from "@/types/codec"
import type { AppError } from "@/types/error"
import { api } from "./client.api"

// ============================================
// 查询操作
// ============================================

/**
 * 获取所有附件
 */
export const getAttachments = (): TE.TaskEither<AppError, readonly AttachmentInterface[]> =>
	pipe(api.getAttachments(), TE.map(decodeAttachments))

/**
 * 获取项目下的所有附件
 */
export const getAttachmentsByProject = (
	projectId: string,
): TE.TaskEither<AppError, readonly AttachmentInterface[]> =>
	pipe(api.getAttachmentsByProject(projectId), TE.map(decodeAttachments))

/**
 * 获取单个附件
 */
export const getAttachment = (id: string): TE.TaskEither<AppError, AttachmentInterface | null> =>
	pipe(api.getAttachment(id), TE.map(decodeAttachmentOptional))

/**
 * 获取单个附件（不存在时抛出错误）
 */
export const getAttachmentOrFail = (id: string): TE.TaskEither<AppError, AttachmentInterface> =>
	pipe(
		getAttachment(id),
		TE.chain((attachment) =>
			attachment
				? TE.right(attachment)
				: TE.left({
						message: `附件不存在: ${id}`,
						type: "NOT_FOUND",
					} as AppError),
		),
	)

/**
 * 按类型获取项目附件
 */
export const getAttachmentsByType = (
	projectId: string,
	attachmentType: AttachmentType,
): TE.TaskEither<AppError, readonly AttachmentInterface[]> =>
	pipe(api.getAttachmentsByType(projectId, attachmentType), TE.map(decodeAttachments))

/**
 * 获取项目下的所有图片附件
 */
export const getImagesByProject = (
	projectId: string,
): TE.TaskEither<AppError, readonly AttachmentInterface[]> =>
	pipe(api.getImagesByProject(projectId), TE.map(decodeAttachments))

/**
 * 获取项目下的所有音频附件
 */
export const getAudioFilesByProject = (
	projectId: string,
): TE.TaskEither<AppError, readonly AttachmentInterface[]> =>
	pipe(api.getAudioFilesByProject(projectId), TE.map(decodeAttachments))

/**
 * 按文件路径获取附件
 */
export const getAttachmentByPath = (
	filePath: string,
): TE.TaskEither<AppError, AttachmentInterface | null> =>
	pipe(api.getAttachmentByPath(filePath), TE.map(decodeAttachmentOptional))

// ============================================
// 写入操作
// ============================================

/**
 * 创建附件
 */
export const createAttachment = (
	input: AttachmentCreateInput,
): TE.TaskEither<AppError, AttachmentInterface> =>
	pipe(
		TE.of(encodeCreateAttachment(input)),
		TE.chain(api.createAttachment),
		TE.map(decodeAttachment),
	)

/**
 * 更新附件
 */
export const updateAttachment = (
	id: string,
	input: AttachmentUpdateInput,
): TE.TaskEither<AppError, AttachmentInterface> =>
	pipe(
		TE.of(encodeUpdateAttachment(input)),
		TE.chain((request) => api.updateAttachment(id, request)),
		TE.map(decodeAttachment),
	)

/**
 * 删除附件
 */
export const deleteAttachment = (id: string): TE.TaskEither<AppError, void> =>
	api.deleteAttachment(id)

/**
 * 删除项目下的所有附件
 */
export const deleteAttachmentsByProject = (projectId: string): TE.TaskEither<AppError, number> =>
	api.deleteAttachmentsByProject(projectId)

// ============================================
// 兼容性别名
// ============================================

/**
 * 获取附件（别名，兼容旧 API）
 */
export const getAttachmentById = getAttachment

/**
 * 获取附件（别名，兼容旧 API）
 */
export const getAttachmentByIdOrNull = getAttachment

/**
 * 添加附件（别名，兼容旧 API）
 */
export const addAttachment = createAttachment
