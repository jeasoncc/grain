	/**
 * @file attachment.interface.ts
 * @description Attachment 接口定义
 *
 * 定义存储项目相关文件附件的 AttachmentInterface。
 * 支持图片、音频文件和其他文件类型。
 *
 * @requirements 2.1
 */

import type { ISODateString, UUID } from "../shared";

/**
 * 附件类型枚举
 * 定义支持的附件文件类型
 */
export type AttachmentType = "image" | "audio" | "file";

/**
 * Attachment 接口 - 文件附件
 *
 * 包含所有附件相关数据，包括文件元数据。
 * 附件可以关联到特定项目，也可以是全局附件。
 */
export interface AttachmentInterface {
	/** 附件的唯一标识符（UUID） */
	readonly id: UUID;

	/** 关联的项目 ID（可选 - 可以是全局附件） */
	readonly project?: UUID;

	/** 附件类型（image/audio/file） */
	readonly type: AttachmentType;

	/** 原始文件名 */
	readonly fileName: string;

	/** 文件存储路径 */
	readonly filePath: string;

	/** 上传时间戳 */
	readonly uploadedAt: ISODateString;

	/** 文件大小（字节，可选） */
	readonly size?: number;

	/** MIME 类型（可选） */
	readonly mimeType?: string;
}

/**
 * Attachment 创建输入类型
 * 用于创建新附件
 * id 和 uploadedAt 自动生成
 */
export interface AttachmentCreateInput {
	readonly project?: UUID;
	readonly type: AttachmentType;
	readonly fileName: string;
	readonly filePath: string;
	readonly size?: number;
	readonly mimeType?: string;
}

/**
 * Attachment 更新输入类型
 * 用于更新现有附件
 * 只有可变字段可以更新
 */
export interface AttachmentUpdateInput {
	readonly project?: UUID;
	readonly type?: AttachmentType;
	readonly fileName?: string;
	readonly filePath?: string;
	readonly size?: number;
	readonly mimeType?: string;
}
