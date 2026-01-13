/**
 * @file get-attachments.flow.ts
 * @description 获取附件 Flow
 *
 * 封装附件查询操作，供 hooks/queries 使用
 */

import * as TE from "fp-ts/TaskEither";
import * as attachmentRepo from "@/io/api/attachment.api";
import type { AttachmentInterface, AttachmentType } from "@/types/attachment";
import type { AppError } from "@/types/error";

/**
 * 获取所有附件
 */
export const getAttachments = (): TE.TaskEither<
	AppError,
	readonly AttachmentInterface[]
> => {
	return attachmentRepo.getAttachments();
};

/**
 * 获取单个附件
 */
export const getAttachment = (
	attachmentId: string,
): TE.TaskEither<AppError, AttachmentInterface | null> => {
	return attachmentRepo.getAttachment(attachmentId);
};

/**
 * 获取项目下的所有附件
 */
export const getAttachmentsByProject = (
	projectId: string,
): TE.TaskEither<AppError, readonly AttachmentInterface[]> => {
	return attachmentRepo.getAttachmentsByProject(projectId);
};

/**
 * 按类型获取项目附件
 */
export const getAttachmentsByType = (
	projectId: string,
	attachmentType: AttachmentType,
): TE.TaskEither<AppError, readonly AttachmentInterface[]> => {
	return attachmentRepo.getAttachmentsByType(projectId, attachmentType);
};

/**
 * 获取项目下的所有图片附件
 */
export const getImagesByProject = (
	projectId: string,
): TE.TaskEither<AppError, readonly AttachmentInterface[]> => {
	return attachmentRepo.getImagesByProject(projectId);
};

/**
 * 获取项目下的所有音频附件
 */
export const getAudioFilesByProject = (
	projectId: string,
): TE.TaskEither<AppError, readonly AttachmentInterface[]> => {
	return attachmentRepo.getAudioFilesByProject(projectId);
};

/**
 * 按文件路径获取附件
 */
export const getAttachmentByPath = (
	filePath: string,
): TE.TaskEither<AppError, AttachmentInterface | null> => {
	return attachmentRepo.getAttachmentByPath(filePath);
};
