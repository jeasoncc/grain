/**
 * @file attachment.schema.ts
 * @description Attachment Zod Schema 定义
 *
 * 定义附件数据运行时校验的 Zod Schema。
 * 这些 Schema 确保创建或更新附件时的数据完整性。
 *
 * @requirements 2.2
 */

import { z } from "zod";
import { ISODateTimeSchema, UUIDSchema } from "../shared";

/**
 * 附件类型 Schema
 */
export const AttachmentTypeSchema = z.enum(["image", "audio", "file"]);

/**
 * 完整 Attachment Schema
 * 校验数据库中的完整附件记录
 */
export const AttachmentSchema = z.object({
	/** 附件的唯一标识符 */
	id: UUIDSchema,

	/** 关联的项目 ID（可选） */
	project: UUIDSchema.optional(),

	/** 附件类型 */
	type: AttachmentTypeSchema,

	/** 原始文件名 */
	fileName: z.string().min(1).max(500),

	/** 文件存储路径 */
	filePath: z.string().min(1).max(2000),

	/** 上传时间戳 */
	uploadedAt: ISODateTimeSchema,

	/** 文件大小（字节，可选） */
	size: z.number().int().min(0).optional(),

	/** MIME 类型（可选） */
	mimeType: z.string().max(200).optional(),
});

/**
 * Attachment 创建 Schema
 * 用于创建新附件
 * id 和 uploadedAt 自动生成
 */
export const AttachmentCreateSchema = z.object({
	/** 可选 id - 如未提供将自动生成 */
	id: UUIDSchema.optional(),

	/** 关联的项目 ID（可选） */
	project: UUIDSchema.optional(),

	/** 必需的附件类型 */
	type: AttachmentTypeSchema,

	/** 必需的文件名 */
	fileName: z.string().min(1).max(500),

	/** 必需的文件路径 */
	filePath: z.string().min(1).max(2000),

	/** 可选 uploadedAt - 如未提供将自动生成 */
	uploadedAt: ISODateTimeSchema.optional(),

	/** 可选文件大小 */
	size: z.number().int().min(0).optional(),

	/** 可选 MIME 类型 */
	mimeType: z.string().max(200).optional(),
});

/**
 * Attachment 更新 Schema
 * 用于更新现有附件
 * 除了用于查找的隐式 id 外，所有字段都是可选的
 */
export const AttachmentUpdateSchema = z.object({
	/** 更新的项目 ID */
	project: UUIDSchema.optional(),

	/** 更新的附件类型 */
	type: AttachmentTypeSchema.optional(),

	/** 更新的文件名 */
	fileName: z.string().min(1).max(500).optional(),

	/** 更新的文件路径 */
	filePath: z.string().min(1).max(2000).optional(),

	/** 更新的文件大小 */
	size: z.number().int().min(0).optional(),

	/** 更新的 MIME 类型 */
	mimeType: z.string().max(200).optional(),
});

/**
 * 类型推断辅助
 * 使用这些从 Zod Schema 派生 TypeScript 类型
 */
export type AttachmentSchemaType = z.infer<typeof AttachmentSchema>;
export type AttachmentCreateSchemaType = z.infer<typeof AttachmentCreateSchema>;
export type AttachmentUpdateSchemaType = z.infer<typeof AttachmentUpdateSchema>;
