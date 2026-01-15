/**
 * Attachment TanStack Query Hooks
 *
 * 使用 TanStack Query 包装 Repository 层的 TaskEither。
 *
 * 设计原则：
 * - 读取操作使用 useQuery
 * - 写入操作使用纯 TaskEither 管道（在 actions 中）
 */

import { useQuery } from "@tanstack/react-query"
import { orderBy } from "es-toolkit"
import * as E from "fp-ts/Either"
import * as attachmentApi from "@/io/api/attachment.api"
import type { AttachmentInterface, AttachmentType } from "@/types/attachment"
import { queryKeys } from "./query-keys"

/**
 * 获取所有附件
 */
export const useAttachments = () => {
	return useQuery({
		queryKey: queryKeys.attachments.all,
		queryFn: async (): Promise<readonly AttachmentInterface[]> => {
			const result = await attachmentApi.getAttachments()()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			// 按上传时间排序（最新的在前）
			return orderBy(result.right, [(item) => new Date(item.uploadedAt).getTime()], ["desc"])
		},
	})
}

/**
 * 获取单个附件
 */
export const useAttachment = (attachmentId: string | null | undefined) => {
	return useQuery({
		enabled: !!attachmentId,
		queryKey: queryKeys.attachments.detail(attachmentId ?? ""),
		queryFn: async (): Promise<AttachmentInterface | null> => {
			if (!attachmentId) return null
			const result = await attachmentApi.getAttachment(attachmentId)()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			return result.right
		},
	})
}

/**
 * 获取项目下的所有附件
 */
export const useAttachmentsByProject = (projectId: string | null | undefined) => {
	return useQuery({
		enabled: !!projectId,
		queryKey: queryKeys.attachments.byProject(projectId ?? ""),
		queryFn: async (): Promise<readonly AttachmentInterface[]> => {
			if (!projectId) return []
			const result = await attachmentApi.getAttachmentsByProject(projectId)()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			// 按上传时间排序（最新的在前）
			return orderBy(result.right, [(item) => new Date(item.uploadedAt).getTime()], ["desc"])
		},
	})
}

/**
 * 按类型获取项目附件
 */
export const useAttachmentsByType = (
	projectId: string | null | undefined,
	attachmentType: AttachmentType | null | undefined,
) => {
	return useQuery({
		enabled: !!projectId && !!attachmentType,
		queryKey: queryKeys.attachments.byType(projectId ?? "", attachmentType ?? ""),
		queryFn: async (): Promise<readonly AttachmentInterface[]> => {
			if (!projectId || !attachmentType) return []
			const result = await attachmentApi.getAttachmentsByType(projectId, attachmentType)()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			// 按上传时间排序（最新的在前）
			return orderBy(result.right, [(item) => new Date(item.uploadedAt).getTime()], ["desc"])
		},
	})
}

/**
 * 获取项目下的所有图片附件
 */
export const useImagesByProject = (projectId: string | null | undefined) => {
	return useQuery({
		enabled: !!projectId,
		queryKey: queryKeys.attachments.imagesByProject(projectId ?? ""),
		queryFn: async (): Promise<readonly AttachmentInterface[]> => {
			if (!projectId) return []
			const result = await attachmentApi.getImagesByProject(projectId)()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			// 按上传时间排序（最新的在前）
			return orderBy(result.right, [(item) => new Date(item.uploadedAt).getTime()], ["desc"])
		},
	})
}

/**
 * 获取项目下的所有音频附件
 */
export const useAudioFilesByProject = (projectId: string | null | undefined) => {
	return useQuery({
		enabled: !!projectId,
		queryKey: queryKeys.attachments.audioByProject(projectId ?? ""),
		queryFn: async (): Promise<readonly AttachmentInterface[]> => {
			if (!projectId) return []
			const result = await attachmentApi.getAudioFilesByProject(projectId)()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			// 按上传时间排序（最新的在前）
			return orderBy(result.right, [(item) => new Date(item.uploadedAt).getTime()], ["desc"])
		},
	})
}

/**
 * 按文件路径获取附件
 */
export const useAttachmentByPath = (filePath: string | null | undefined) => {
	return useQuery({
		enabled: !!filePath,
		queryKey: queryKeys.attachments.byPath(filePath ?? ""),
		queryFn: async (): Promise<AttachmentInterface | null> => {
			if (!filePath) return null
			const result = await attachmentApi.getAttachmentByPath(filePath)()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			return result.right
		},
	})
}
