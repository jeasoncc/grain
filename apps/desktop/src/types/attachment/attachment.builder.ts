/**
 * @file attachment.builder.ts
 * @description Attachment Builder
 *
 * 实现 Attachment 对象的 Builder 模式。
 * 提供链式方法的流畅 API 来设置属性。
 *
 * @requirements 3.1, 3.2
 */

import dayjs from "dayjs"
import { v4 as uuidv4 } from "uuid"
import type { AttachmentInterface, AttachmentType } from "./attachment.interface"
import { AttachmentSchema } from "./attachment.schema"

/**
 * Builder 内部使用的可变类型
 * 用于在构建过程中修改数据
 */
type MutableAttachment = {
	-readonly [K in keyof AttachmentInterface]: AttachmentInterface[K]
}

/**
 * AttachmentBuilder 类
 *
 * 提供构建 Attachment 对象的流畅 API：
 * - 可选属性的合理默认值
 * - 方法链式调用，代码清晰易读
 * - build() 时进行 Zod 校验
 * - 返回不可变对象（Object.freeze）
 */
export class AttachmentBuilder {
	private data: Partial<MutableAttachment> = {}

	constructor() {
		// 设置合理的默认值
		const now = dayjs().toISOString()
		this.data = {
			fileName: "",
			filePath: "",
			id: uuidv4(),
			type: "file",
			uploadedAt: now,
		}
	}

	/**
	 * 设置附件 ID（可选，默认自动生成）
	 * @param id - 附件的 UUID
	 * @returns 返回 this 以支持链式调用
	 */
	id(id: string): this {
		this.data.id = id
		return this
	}

	/**
	 * 设置关联的项目 ID
	 * @param projectId - 项目的 UUID
	 * @returns 返回 this 以支持链式调用
	 */
	project(projectId: string): this {
		this.data.project = projectId
		return this
	}

	/**
	 * 设置附件类型
	 * @param type - 附件类型（image/audio/file）
	 * @returns 返回 this 以支持链式调用
	 */
	type(type: AttachmentType): this {
		this.data.type = type
		return this
	}

	/**
	 * 设置文件名
	 * @param fileName - 原始文件名
	 * @returns 返回 this 以支持链式调用
	 */
	fileName(fileName: string): this {
		this.data.fileName = fileName
		return this
	}

	/**
	 * 设置文件路径
	 * @param filePath - 文件存储路径
	 * @returns 返回 this 以支持链式调用
	 */
	filePath(filePath: string): this {
		this.data.filePath = filePath
		return this
	}

	/**
	 * 设置上传时间戳（可选，默认自动生成）
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns 返回 this 以支持链式调用
	 */
	uploadedAt(timestamp: string): this {
		this.data.uploadedAt = timestamp
		return this
	}

	/**
	 * 设置文件大小
	 * @param size - 文件大小（字节）
	 * @returns 返回 this 以支持链式调用
	 */
	size(size: number): this {
		this.data.size = size
		return this
	}

	/**
	 * 设置 MIME 类型
	 * @param mimeType - MIME 类型字符串
	 * @returns 返回 this 以支持链式调用
	 */
	mimeType(mimeType: string): this {
		this.data.mimeType = mimeType
		return this
	}

	/**
	 * 从现有 Attachment 对象初始化
	 * @param attachment - 现有的 Attachment 对象
	 * @returns 返回 this 以支持链式调用
	 */
	from(attachment: AttachmentInterface): this {
		this.data = { ...attachment }
		return this
	}

	/**
	 * 构建并校验 Attachment 对象
	 * @returns 经过校验的不可变 AttachmentInterface 对象
	 * @throws 校验失败时抛出 ZodError
	 */
	build(): AttachmentInterface {
		// 确保 uploadedAt 已设置
		if (!this.data.uploadedAt) {
			this.data.uploadedAt = dayjs().toISOString()
		}

		// 校验并返回不可变对象
		const result = AttachmentSchema.parse(this.data)
		return Object.freeze(result) as AttachmentInterface
	}

	/**
	 * 构建用于更新操作的部分 Attachment 对象
	 * 不需要所有字段，只校验提供的字段
	 * @returns 部分 AttachmentInterface 对象
	 */
	buildPartial(): Partial<AttachmentInterface> {
		return Object.freeze({ ...this.data }) as Partial<AttachmentInterface>
	}

	/**
	 * 重置 builder 到初始状态
	 * 用于复用同一个 builder 实例
	 * @returns 返回 this 以支持链式调用
	 */
	reset(): this {
		const now = dayjs().toISOString()
		this.data = {
			fileName: "",
			filePath: "",
			id: uuidv4(),
			type: "file",
			uploadedAt: now,
		}
		return this
	}
}
