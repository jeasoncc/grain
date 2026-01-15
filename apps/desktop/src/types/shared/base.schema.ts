/**
 * @file base.schema.ts
 * @description 基础 Zod Schema 定义
 *
 * 定义所有数据模型共享的 Zod Schema。
 * 这些 Schema 提供运行时数据完整性校验。
 *
 * @requirements 2.2
 */

import { z } from "zod"

/**
 * UUID Schema - 校验 UUID v4 格式
 * 用于所有实体标识符
 */
export const UUIDSchema = z.string().uuid("无效的 UUID 格式")

/**
 * ISO DateTime Schema - 校验 ISO 8601 日期字符串
 * 用于所有时间戳字段（createDate, lastEdit 等）
 */
export const ISODateTimeSchema = z.string().datetime({
	message: "无效的 ISO 8601 日期时间格式",
})

/**
 * 基础实体 Schema
 * 所有持久化实体都应包含这些字段
 */
export const BaseEntitySchema = z.object({
	/** ISO 8601 格式的创建时间戳 */
	createDate: ISODateTimeSchema,
	/** 使用 UUID v4 格式的唯一标识符 */
	id: UUIDSchema,

	/** ISO 8601 格式的最后修改时间戳 */
	lastEdit: ISODateTimeSchema,
})

/**
 * 创建新实体的 Schema
 * 所有字段可选，因为可以自动生成
 */
export const BaseEntityCreateSchema = BaseEntitySchema.partial()

/**
 * 更新现有实体的 Schema
 * 只有 lastEdit 可以更新（id 和 createDate 不可变）
 */
export const BaseEntityUpdateSchema = z.object({
	lastEdit: ISODateTimeSchema.optional(),
})

/**
 * 类型推断辅助
 * 使用这些从 Zod Schema 派生 TypeScript 类型
 */
export type BaseEntitySchemaType = z.infer<typeof BaseEntitySchema>
export type BaseEntityCreateSchemaType = z.infer<typeof BaseEntityCreateSchema>
export type BaseEntityUpdateSchemaType = z.infer<typeof BaseEntityUpdateSchema>
