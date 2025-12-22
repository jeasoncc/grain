/**
 * @file attachment.db.fn.ts
 * @description Attachment 数据库操作函数
 *
 * 功能说明：
 * - 提供附件的 CRUD 操作
 * - 提供按项目、类型查询附件
 * - 使用 TaskEither 返回类型进行错误处理
 * - 所有操作都有日志记录
 *
 * @requirements 3.1, 3.2, 3.3
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { type AppError, dbError, notFoundError } from "@/lib/error.types";
import logger from "@/log";
import { AttachmentBuilder } from "@/types/attachment/attachment.builder";
import type {
	AttachmentInterface,
	AttachmentType,
	AttachmentUpdateInput,
} from "@/types/attachment/attachment.interface";
import { database } from "./database";

// ============================================================================
// 基础 CRUD 操作
// ============================================================================

/**
 * 添加新附件
 *
 * @param fileName - 文件名
 * @param filePath - 文件路径
 * @param type - 附件类型
 * @param options - 可选的附件属性
 * @returns TaskEither<AppError, AttachmentInterface>
 */
export const addAttachment = (
	fileName: string,
	filePath: string,
	type: AttachmentType,
	options: {
		project?: string;
		size?: number;
		mimeType?: string;
	} = {},
): TE.TaskEither<AppError, AttachmentInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 添加附件:", { fileName, type });

			const builder = new AttachmentBuilder()
				.fileName(fileName)
				.filePath(filePath)
				.type(type);

			if (options.project) {
				builder.project(options.project);
			}
			if (options.size !== undefined) {
				builder.size(options.size);
			}
			if (options.mimeType) {
				builder.mimeType(options.mimeType);
			}

			const attachment = builder.build();
			await database.attachments.add(attachment);

			logger.success("[DB] 附件添加成功:", attachment.id);
			return attachment;
		},
		(error): AppError => {
			logger.error("[DB] 添加附件失败:", error);
			return dbError(`添加附件失败: ${error}`);
		},
	);

/**
 * 更新附件
 *
 * @param id - 附件 ID
 * @param updates - 更新的字段
 * @returns TaskEither<AppError, number> - 更新的记录数（0 或 1）
 */
export const updateAttachment = (
	id: string,
	updates: AttachmentUpdateInput,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 更新附件:", { id, updates });

			const count = await database.attachments.update(id, updates);

			if (count > 0) {
				logger.success("[DB] 附件更新成功:", id);
			} else {
				logger.warn("[DB] 附件未找到:", id);
			}

			return count;
		},
		(error): AppError => {
			logger.error("[DB] 更新附件失败:", error);
			return dbError(`更新附件失败: ${error}`);
		},
	);

/**
 * 删除附件
 *
 * @param id - 附件 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteAttachment = (id: string): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 删除附件:", id);
			await database.attachments.delete(id);
			logger.success("[DB] 附件删除成功:", id);
		},
		(error): AppError => {
			logger.error("[DB] 删除附件失败:", error);
			return dbError(`删除附件失败: ${error}`);
		},
	);

// ============================================================================
// 查询操作
// ============================================================================

/**
 * 根据 ID 获取附件
 *
 * @param id - 附件 ID
 * @returns TaskEither<AppError, AttachmentInterface | undefined>
 */
export const getAttachmentById = (
	id: string,
): TE.TaskEither<AppError, AttachmentInterface | undefined> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取附件:", id);
			return database.attachments.get(id);
		},
		(error): AppError => {
			logger.error("[DB] 获取附件失败:", error);
			return dbError(`获取附件失败: ${error}`);
		},
	);

/**
 * 根据 ID 获取附件（必须存在）
 *
 * @param id - 附件 ID
 * @returns TaskEither<AppError, AttachmentInterface>
 */
export const getAttachmentByIdOrFail = (
	id: string,
): TE.TaskEither<AppError, AttachmentInterface> =>
	pipe(
		getAttachmentById(id),
		TE.chain((attachment) =>
			attachment
				? TE.right(attachment)
				: TE.left(notFoundError(`附件不存在: ${id}`, id)),
		),
	);

/**
 * 获取所有附件
 * 按 uploadedAt 降序排列（最近上传的在前）
 *
 * @returns TaskEither<AppError, AttachmentInterface[]>
 */
export const getAllAttachments = (): TE.TaskEither<
	AppError,
	AttachmentInterface[]
> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取所有附件");
			const attachments = await database.attachments.toArray();
			return attachments.sort(
				(a, b) =>
					new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
			);
		},
		(error): AppError => {
			logger.error("[DB] 获取所有附件失败:", error);
			return dbError(`获取所有附件失败: ${error}`);
		},
	);

/**
 * 获取项目的所有附件
 *
 * @param projectId - 项目 ID
 * @returns TaskEither<AppError, AttachmentInterface[]>
 */
export const getAttachmentsByProject = (
	projectId: string,
): TE.TaskEither<AppError, AttachmentInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取项目附件:", projectId);
			const attachments = await database.attachments
				.where("project")
				.equals(projectId)
				.toArray();
			return attachments.sort(
				(a, b) =>
					new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
			);
		},
		(error): AppError => {
			logger.error("[DB] 获取项目附件失败:", error);
			return dbError(`获取项目附件失败: ${error}`);
		},
	);

/**
 * 获取指定类型的附件
 *
 * @param type - 附件类型
 * @returns TaskEither<AppError, AttachmentInterface[]>
 */
export const getAttachmentsByType = (
	type: AttachmentType,
): TE.TaskEither<AppError, AttachmentInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取指定类型附件:", type);
			const attachments = await database.attachments.toArray();
			return attachments
				.filter((a) => a.type === type)
				.sort(
					(a, b) =>
						new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
				);
		},
		(error): AppError => {
			logger.error("[DB] 获取指定类型附件失败:", error);
			return dbError(`获取指定类型附件失败: ${error}`);
		},
	);

/**
 * 获取项目中指定类型的附件
 *
 * @param projectId - 项目 ID
 * @param type - 附件类型
 * @returns TaskEither<AppError, AttachmentInterface[]>
 */
export const getAttachmentsByProjectAndType = (
	projectId: string,
	type: AttachmentType,
): TE.TaskEither<AppError, AttachmentInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取项目指定类型附件:", { projectId, type });
			const attachments = await database.attachments
				.where("project")
				.equals(projectId)
				.toArray();
			return attachments
				.filter((a) => a.type === type)
				.sort(
					(a, b) =>
						new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
				);
		},
		(error): AppError => {
			logger.error("[DB] 获取项目指定类型附件失败:", error);
			return dbError(`获取项目指定类型附件失败: ${error}`);
		},
	);

/**
 * 获取全局附件（未关联项目的附件）
 *
 * @returns TaskEither<AppError, AttachmentInterface[]>
 */
export const getGlobalAttachments = (): TE.TaskEither<
	AppError,
	AttachmentInterface[]
> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取全局附件");
			const attachments = await database.attachments.toArray();
			return attachments
				.filter((a) => !a.project)
				.sort(
					(a, b) =>
						new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
				);
		},
		(error): AppError => {
			logger.error("[DB] 获取全局附件失败:", error);
			return dbError(`获取全局附件失败: ${error}`);
		},
	);

// ============================================================================
// 便捷方法
// ============================================================================

/**
 * 获取项目的图片附件
 *
 * @param projectId - 项目 ID
 * @returns TaskEither<AppError, AttachmentInterface[]>
 */
export const getImagesByProject = (
	projectId: string,
): TE.TaskEither<AppError, AttachmentInterface[]> =>
	getAttachmentsByProjectAndType(projectId, "image");

/**
 * 获取项目的音频附件
 *
 * @param projectId - 项目 ID
 * @returns TaskEither<AppError, AttachmentInterface[]>
 */
export const getAudioFilesByProject = (
	projectId: string,
): TE.TaskEither<AppError, AttachmentInterface[]> =>
	getAttachmentsByProjectAndType(projectId, "audio");

// ============================================================================
// 辅助操作
// ============================================================================

/**
 * 检查附件是否存在
 *
 * @param id - 附件 ID
 * @returns TaskEither<AppError, boolean>
 */
export const attachmentExists = (
	id: string,
): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			const count = await database.attachments.where("id").equals(id).count();
			return count > 0;
		},
		(error): AppError => {
			logger.error("[DB] 检查附件存在失败:", error);
			return dbError(`检查附件存在失败: ${error}`);
		},
	);

/**
 * 统计所有附件数量
 *
 * @returns TaskEither<AppError, number>
 */
export const countAttachments = (): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			return database.attachments.count();
		},
		(error): AppError => {
			logger.error("[DB] 统计附件数量失败:", error);
			return dbError(`统计附件数量失败: ${error}`);
		},
	);

/**
 * 统计项目的附件数量
 *
 * @param projectId - 项目 ID
 * @returns TaskEither<AppError, number>
 */
export const countAttachmentsByProject = (
	projectId: string,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			return database.attachments.where("project").equals(projectId).count();
		},
		(error): AppError => {
			logger.error("[DB] 统计项目附件数量失败:", error);
			return dbError(`统计项目附件数量失败: ${error}`);
		},
	);

/**
 * 删除项目的所有附件
 *
 * @param projectId - 项目 ID
 * @returns TaskEither<AppError, number> - 删除的记录数
 */
export const deleteAttachmentsByProject = (
	projectId: string,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 删除项目所有附件:", projectId);
			const count = await database.attachments
				.where("project")
				.equals(projectId)
				.delete();
			logger.success("[DB] 项目附件删除成功:", { projectId, count });
			return count;
		},
		(error): AppError => {
			logger.error("[DB] 删除项目附件失败:", error);
			return dbError(`删除项目附件失败: ${error}`);
		},
	);

/**
 * 获取项目附件的总大小
 *
 * @param projectId - 项目 ID
 * @returns TaskEither<AppError, number> - 总大小（字节）
 */
export const getTotalSizeByProject = (
	projectId: string,
): TE.TaskEither<AppError, number> =>
	pipe(
		getAttachmentsByProject(projectId),
		TE.map((attachments) =>
			attachments.reduce((total, a) => total + (a.size || 0), 0),
		),
	);

/**
 * 保存附件（直接保存完整附件对象）
 *
 * @param attachment - 附件对象
 * @returns TaskEither<AppError, AttachmentInterface>
 */
export const saveAttachment = (
	attachment: AttachmentInterface,
): TE.TaskEither<AppError, AttachmentInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 保存附件:", attachment.id);
			await database.attachments.put(attachment);
			logger.success("[DB] 附件保存成功:", attachment.id);
			return attachment;
		},
		(error): AppError => {
			logger.error("[DB] 保存附件失败:", error);
			return dbError(`保存附件失败: ${error}`);
		},
	);
