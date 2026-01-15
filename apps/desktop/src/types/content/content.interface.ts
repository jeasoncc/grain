/**
 * @file content.interface.ts
 * @description Content 接口定义
 *
 * 定义 ContentInterface 用于独立的内容表。
 * 内容与节点分开存储，以实现懒加载和更好的大文档性能（5000+ 字符）。
 *
 * @requirements 2.1, 5.1
 */

import type { ISODateString, UUID } from "../shared"

/**
 * 内容类型枚举
 * 定义可存储的不同内容类型
 */
export type ContentType = "lexical" | "excalidraw" | "text"

/**
 * 内容接口 - 独立内容表
 *
 * 此接口表示与节点元数据分开存储的文档内容。
 * 这种分离允许：
 * - 加载节点树时不加载重量级内容
 * - 仅在需要时懒加载内容
 * - 大文档更好的性能
 */
export interface ContentInterface {
	/** 内容记录的唯一标识符 */
	readonly id: UUID

	/** 父节点的引用 */
	readonly nodeId: UUID

	/** 实际内容（Lexical JSON、Excalidraw JSON 或纯文本） */
	readonly content: string

	/** 存储的内容类型 */
	readonly contentType: ContentType

	/** ISO 8601 格式的最后修改时间戳 */
	readonly lastEdit: ISODateString
}

/**
 * 内容创建输入类型
 * 创建新内容记录时使用
 * id 和 lastEdit 自动生成
 */
export interface ContentCreateInput {
	readonly nodeId: UUID
	readonly content?: string
	readonly contentType?: ContentType
}

/**
 * 内容更新输入类型
 * 更新现有内容记录时使用
 * 只有 content 和 contentType 可以更新
 */
export interface ContentUpdateInput {
	readonly content?: string
	readonly contentType?: ContentType
}
