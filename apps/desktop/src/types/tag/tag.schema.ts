/**
 * @file types/tag/tag.schema.ts
 * @description 标签 Zod Schema 定义
 *
 * 定义用于运行时校验标签数据的 Zod Schema。
 * 这些 Schema 确保创建或更新标签时的数据完整性。
 *
 * @requirements 2.2
 */

import { z } from "zod"
import { ISODateTimeSchema, UUIDSchema } from "../shared"

/**
 * 完整标签 Schema
 * 校验数据库中的完整标签记录
 */
export const TagSchema = z.object({
	/** 使用此标签的文档数量 */
	count: z.number().int().min(0, "计数不能为负数"),

	/** 首次创建此标签的时间 */
	createDate: ISODateTimeSchema,
	/** 标签名称作为 ID（每个工作区唯一） */
	id: z.string().min(1, "标签 ID 不能为空"),

	/** 最后使用此标签的时间 */
	lastUsed: ISODateTimeSchema,

	/** 标签显示名称 */
	name: z.string().min(1, "标签名称不能为空").max(100, "标签名称不能超过 100 个字符"),

	/** 标签所属的工作区 */
	workspace: UUIDSchema,
})

/**
 * 标签创建 Schema
 * 创建新标签时使用
 * id、count、lastUsed 和 createDate 自动生成
 */
export const TagCreateSchema = z.object({
	/** 可选计数 - 默认为 1 */
	count: z.number().int().min(0).optional().default(1),

	/** 可选 createDate - 如果未提供将自动生成 */
	createDate: ISODateTimeSchema.optional(),
	/** 可选 id - 如果未提供将从 name 生成 */
	id: z.string().min(1).optional(),

	/** 可选 lastUsed - 如果未提供将自动生成 */
	lastUsed: ISODateTimeSchema.optional(),

	/** 必填标签名称 */
	name: z.string().min(1, "标签名称不能为空").max(100, "标签名称不能超过 100 个字符"),

	/** 必填工作区 ID */
	workspace: UUIDSchema,
})

/**
 * 标签更新 Schema
 * 更新现有标签时使用
 * 除了用于查找的隐式 id 外，所有字段都是可选的
 */
export const TagUpdateSchema = z.object({
	/** 更新的计数 */
	count: z.number().int().min(0).optional(),

	/** 更新的 lastUsed 时间戳 */
	lastUsed: ISODateTimeSchema.optional(),
	/** 更新的标签名称 */
	name: z.string().min(1).max(100).optional(),
})

/**
 * 类型推断辅助
 * 使用这些从 Zod Schema 派生 TypeScript 类型
 */
export type TagSchemaType = z.infer<typeof TagSchema>
export type TagCreateSchemaType = z.infer<typeof TagCreateSchema>
export type TagUpdateSchemaType = z.infer<typeof TagUpdateSchema>
