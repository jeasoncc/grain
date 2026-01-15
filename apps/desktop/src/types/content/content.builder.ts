/**
 * @file content.builder.ts
 * @description Content Builder
 *
 * 实现 Builder 模式用于创建 Content 对象。
 * 提供带有链式方法的流畅 API 来设置属性。
 *
 * @requirements 3.1, 3.2, 3.4, 3.5
 */

import dayjs from "dayjs"
import { v4 as uuidv4 } from "uuid"
import type { ContentInterface, ContentType } from "./content.interface"
import { ContentSchema } from "./content.schema"

/**
 * Builder 内部使用的可变类型
 * 用于在构建过程中修改数据
 */
type MutableContent = {
	-readonly [K in keyof ContentInterface]: ContentInterface[K]
}

/**
 * ContentBuilder 类
 *
 * 提供用于构建 Content 对象的流畅 API：
 * - 可选属性的合理默认值
 * - 方法链式调用，代码清晰易读
 * - build() 时进行 Zod 校验
 * - 使用 Object.freeze() 确保不可变性
 */
export class ContentBuilder {
	private data: Partial<MutableContent> = {}

	constructor() {
		// 设置合理的默认值
		this.data = {
			content: "",
			contentType: "lexical",
			id: uuidv4(),
			lastEdit: dayjs().toISOString(),
		}
	}

	/**
	 * 设置此内容所属的节点 ID
	 * @param id - 父节点的 UUID
	 * @returns this builder 用于链式调用
	 */
	nodeId(id: string): this {
		this.data.nodeId = id
		return this
	}

	/**
	 * 设置内容字符串
	 * @param content - 内容（Lexical JSON、Excalidraw JSON 或纯文本）
	 * @returns this builder 用于链式调用
	 */
	content(content: string): this {
		this.data.content = content
		return this
	}

	/**
	 * 设置内容类型
	 * @param type - 内容类型（"lexical" | "excalidraw" | "text"）
	 * @returns this builder 用于链式调用
	 */
	contentType(type: ContentType): this {
		this.data.contentType = type
		return this
	}

	/**
	 * 设置自定义 ID（可选，默认自动生成）
	 * @param id - 内容记录的 UUID
	 * @returns this builder 用于链式调用
	 */
	id(id: string): this {
		this.data.id = id
		return this
	}

	/**
	 * 设置自定义 lastEdit 时间戳（可选，默认自动生成）
	 * @param timestamp - ISO 8601 日期时间字符串
	 * @returns this builder 用于链式调用
	 */
	lastEdit(timestamp: string): this {
		this.data.lastEdit = timestamp
		return this
	}

	/**
	 * 从现有 Content 对象复制数据
	 * @param content - 要复制的 Content 对象
	 * @returns this builder 用于链式调用
	 */
	from(content: ContentInterface): this {
		this.data = { ...content }
		return this
	}

	/**
	 * 构建并校验 Content 对象
	 * @returns 经过校验的不可变 ContentInterface 对象
	 * @throws ZodError 如果校验失败
	 */
	build(): ContentInterface {
		// 如果未显式设置，更新 lastEdit 为当前时间
		if (!this.data.lastEdit) {
			this.data.lastEdit = dayjs().toISOString()
		}

		// 校验并返回不可变对象
		const result = ContentSchema.parse(this.data)
		return Object.freeze(result) as ContentInterface
	}

	/**
	 * 构建用于更新操作的部分 Content 对象
	 * 不需要所有字段，只校验提供的字段
	 * @returns 带有更新的 lastEdit 的部分 ContentInterface 对象
	 */
	buildPartial(): Partial<ContentInterface> {
		// 部分构建时始终更新 lastEdit
		this.data.lastEdit = dayjs().toISOString()
		return Object.freeze({ ...this.data }) as Partial<ContentInterface>
	}

	/**
	 * 重置 builder 到初始状态
	 * 用于重用同一个 builder 实例
	 * @returns this builder 用于链式调用
	 */
	reset(): this {
		this.data = {
			content: "",
			contentType: "lexical",
			id: uuidv4(),
			lastEdit: dayjs().toISOString(),
		}
		return this
	}
}
