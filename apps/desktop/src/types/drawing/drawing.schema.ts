/**
 * @file drawing.schema.ts
 * @description Drawing Zod Schema 定义
 *
 * 定义绘图数据运行时校验的 Zod Schema。
 * 这些 Schema 确保创建或更新绘图时的数据完整性。
 *
 * @requirements 2.2
 */

import { z } from "zod";
import { ISODateTimeSchema, UUIDSchema } from "../shared";

/**
 * 默认绘图尺寸
 */
export const DEFAULT_DRAWING_WIDTH = 800;
export const DEFAULT_DRAWING_HEIGHT = 600;

/**
 * 完整 Drawing Schema
 * 校验数据库中的完整绘图记录
 */
export const DrawingSchema = z.object({
	/** 绘图的唯一标识符 */
	id: UUIDSchema,

	/** 此绘图所属的项目/工作区 ID */
	project: UUIDSchema,

	/** 绘图名称/标题 */
	name: z.string().min(1).max(200),

	/** Excalidraw 数据（JSON 字符串） */
	content: z.string(),

	/** 绘图画布宽度（像素） */
	width: z.number().int().positive(),

	/** 绘图画布高度（像素） */
	height: z.number().int().positive(),

	/** ISO 8601 格式的创建时间戳 */
	createDate: ISODateTimeSchema,

	/** ISO 8601 格式的最后更新时间戳 */
	updatedAt: ISODateTimeSchema,
});

/**
 * Drawing 创建 Schema
 * 用于创建新绘图
 * id、createDate 和 updatedAt 自动生成
 */
export const DrawingCreateSchema = z.object({
	/** 可选 id - 如未提供将自动生成 */
	id: UUIDSchema.optional(),

	/** 必需的项目/工作区 ID */
	project: UUIDSchema,

	/** 必需的绘图名称 */
	name: z.string().min(1).max(200),

	/** 可选内容 - 默认为空字符串 */
	content: z.string().optional().default(""),

	/** 可选宽度 - 默认为 DEFAULT_DRAWING_WIDTH */
	width: z.number().int().positive().optional().default(DEFAULT_DRAWING_WIDTH),

	/** 可选高度 - 默认为 DEFAULT_DRAWING_HEIGHT */
	height: z
		.number()
		.int()
		.positive()
		.optional()
		.default(DEFAULT_DRAWING_HEIGHT),

	/** 可选 createDate - 如未提供将自动生成 */
	createDate: ISODateTimeSchema.optional(),

	/** 可选 updatedAt - 如未提供将自动生成 */
	updatedAt: ISODateTimeSchema.optional(),
});

/**
 * Drawing 更新 Schema
 * 用于更新现有绘图
 * 除了用于查找的隐式 id 外，所有字段都是可选的
 */
export const DrawingUpdateSchema = z.object({
	/** 更新的名称 */
	name: z.string().min(1).max(200).optional(),

	/** 更新的内容 */
	content: z.string().optional(),

	/** 更新的宽度 */
	width: z.number().int().positive().optional(),

	/** 更新的高度 */
	height: z.number().int().positive().optional(),

	/** 更新的时间戳 */
	updatedAt: ISODateTimeSchema.optional(),
});

/**
 * 类型推断辅助
 * 使用这些从 Zod Schema 派生 TypeScript 类型
 */
export type DrawingSchemaType = z.infer<typeof DrawingSchema>;
export type DrawingCreateSchemaType = z.infer<typeof DrawingCreateSchema>;
export type DrawingUpdateSchemaType = z.infer<typeof DrawingUpdateSchema>;
