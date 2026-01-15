/**
 * @file types/workspace/workspace.schema.ts
 * @description Workspace Zod Schema 定义
 *
 * 定义 Zod schemas 用于工作区数据的运行时校验。
 * 这些 schemas 确保创建或更新工作区时的数据完整性。
 *
 * @requirements 2.2
 */

import { z } from "zod"
import { ISODateTimeSchema, UUIDSchema } from "../shared"

/**
 * 完整 Workspace schema
 * 校验数据库中的完整工作区记录
 */
export const WorkspaceSchema = z.object({
	/** 作者名称 */
	author: z.string().max(200),

	/** 创建时间（ISO 8601 格式） */
	createDate: ISODateTimeSchema,

	/** 项目描述 */
	description: z.string().max(2000),
	/** 工作区唯一标识符 */
	id: UUIDSchema,

	/** 项目语言（如 "zh", "en"） */
	language: z.string().max(10),

	/** 最后打开时间 */
	lastOpen: ISODateTimeSchema,

	/** 可选：团队成员（用户 ID 数组），用于协作工作区 */
	members: z.array(z.string()).optional(),

	/** 可选：所有者用户 ID */
	owner: UUIDSchema.optional(),

	/** 出版商信息 */
	publisher: z.string().max(200),

	/** 工作区显示标题 */
	title: z.string().min(1).max(200),
})

/**
 * Workspace 创建 schema
 * 用于创建新工作区
 * id、createDate 和 lastOpen 会自动生成
 */
export const WorkspaceCreateSchema = z.object({
	/** 可选作者 - 默认为空字符串 */
	author: z.string().max(200).optional().default(""),

	/** 可选 createDate - 如果未提供将自动生成 */
	createDate: ISODateTimeSchema.optional(),

	/** 可选描述 - 默认为空字符串 */
	description: z.string().max(2000).optional().default(""),
	/** 可选 id - 如果未提供将自动生成 */
	id: UUIDSchema.optional(),

	/** 可选语言 - 默认为 "zh" */
	language: z.string().max(10).optional().default("zh"),

	/** 可选 lastOpen - 如果未提供将自动生成 */
	lastOpen: ISODateTimeSchema.optional(),

	/** 可选团队成员 */
	members: z.array(z.string()).optional(),

	/** 可选所有者用户 ID */
	owner: UUIDSchema.optional(),

	/** 可选出版商 - 默认为空字符串 */
	publisher: z.string().max(200).optional().default(""),

	/** 必填显示标题 */
	title: z.string().min(1).max(200),
})

/**
 * Workspace 更新 schema
 * 用于更新现有工作区
 * 除了用于查找的隐式 id 外，所有字段都是可选的
 */
export const WorkspaceUpdateSchema = z.object({
	/** 更新的作者 */
	author: z.string().max(200).optional(),

	/** 更新的描述 */
	description: z.string().max(2000).optional(),

	/** 更新的语言 */
	language: z.string().max(10).optional(),

	/** 更新的 lastOpen 时间戳 */
	lastOpen: ISODateTimeSchema.optional(),

	/** 更新的团队成员 */
	members: z.array(z.string()).optional(),

	/** 更新的所有者 */
	owner: UUIDSchema.optional(),

	/** 更新的出版商 */
	publisher: z.string().max(200).optional(),
	/** 更新的标题 */
	title: z.string().min(1).max(200).optional(),
})

/**
 * 类型推断辅助
 * 使用这些从 Zod schemas 派生 TypeScript 类型
 */
export type WorkspaceSchemaType = z.infer<typeof WorkspaceSchema>
export type WorkspaceCreateSchemaType = z.infer<typeof WorkspaceCreateSchema>
export type WorkspaceUpdateSchemaType = z.infer<typeof WorkspaceUpdateSchema>
