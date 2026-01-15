/**
 * @file content.schema.ts
 * @description Content Zod Schema 定义
 *
 * 定义用于内容数据运行时校验的 Zod Schema。
 * 这些 Schema 确保创建或更新内容时的数据完整性。
 *
 * @requirements 2.2
 */

import { z } from "zod"
import { ISODateTimeSchema, UUIDSchema } from "../shared"

/**
 * 内容类型 Schema
 * 校验 contentType 是允许的值之一
 */
export const ContentTypeSchema = z.enum(["lexical", "excalidraw", "text"])

/**
 * 完整 Content Schema
 * 校验来自数据库的完整内容记录
 */
export const ContentSchema = z.object({
	/** 实际内容（Lexical JSON、Excalidraw JSON 或纯文本） */
	content: z.string(),

	/** 存储的内容类型 */
	contentType: ContentTypeSchema,
	/** 内容记录的唯一标识符 */
	id: UUIDSchema,

	/** ISO 8601 格式的最后修改时间戳 */
	lastEdit: ISODateTimeSchema,

	/** 父节点的引用 */
	nodeId: UUIDSchema,
})

/**
 * 内容创建 Schema
 * 创建新内容记录时使用
 * id 和 lastEdit 自动生成，所以是可选的
 */
export const ContentCreateSchema = z.object({
	/** 可选内容 - 默认为空字符串 */
	content: z.string().optional().default(""),

	/** 可选内容类型 - 默认为 "lexical" */
	contentType: ContentTypeSchema.optional().default("lexical"),
	/** 可选 id - 如果未提供将自动生成 */
	id: UUIDSchema.optional(),

	/** 可选 lastEdit - 如果未提供将自动生成 */
	lastEdit: ISODateTimeSchema.optional(),

	/** 必需的父节点引用 */
	nodeId: UUIDSchema,
})

/**
 * 内容更新 Schema
 * 更新现有内容记录时使用
 * 除了用于查找的隐式 id 外，所有字段都是可选的
 */
export const ContentUpdateSchema = z.object({
	/** 更新的内容 */
	content: z.string().optional(),

	/** 更新的内容类型 */
	contentType: ContentTypeSchema.optional(),

	/** 更新的 lastEdit - 通常自动生成 */
	lastEdit: ISODateTimeSchema.optional(),
})

/**
 * 类型推断辅助
 * 使用这些从 Zod Schema 派生 TypeScript 类型
 */
export type ContentSchemaType = z.infer<typeof ContentSchema>
export type ContentCreateSchemaType = z.infer<typeof ContentCreateSchema>
export type ContentUpdateSchemaType = z.infer<typeof ContentUpdateSchema>
export type ContentTypeSchemaType = z.infer<typeof ContentTypeSchema>
