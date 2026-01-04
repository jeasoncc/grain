/**
 * @file node.schema.ts
 * @description Node Zod Schema 定义
 *
 * 定义用于运行时验证节点数据的 Zod schemas。
 * 这些 schemas 确保创建或更新节点时的数据完整性。
 *
 * @requirements 2.2
 */

import { z } from "zod";
import { ISODateTimeSchema, UUIDSchema } from "@/types/shared";

/**
 * 节点类型 Zod Schema（单一来源）
 *
 * 所有 NodeType 的定义都从这里派生，确保一致性。
 *
 * 类型说明：
 * - folder: 容器节点，可以包含子节点
 * - file: 通用文本文件，使用 Lexical 编辑器
 * - diary: 日记条目
 * - wiki: Wiki 知识条目
 * - todo: 待办事项
 * - note: 笔记
 * - ledger: 记账条目
 * - drawing: Excalidraw 绘图文件
 * - plantuml: PlantUML 图表
 * - mermaid: Mermaid 图表
 * - code: 代码文件，使用 Lexical 编辑器代码块
 */
export const NodeTypeSchema = z.enum([
	"folder",
	"file",
	"diary",
	"wiki",
	"todo",
	"note",
	"ledger",
	"drawing",
	"plantuml",
	"mermaid",
	"code",
]);

/**
 * 完整的 Node schema
 * 验证来自数据库的完整节点记录
 */
export const NodeSchema = z.object({
	/** 节点的唯一标识符 */
	id: UUIDSchema,

	/** 父工作区/项目的引用 */
	workspace: UUIDSchema,

	/** 父节点 ID，根级节点为 null */
	parent: UUIDSchema.nullable(),

	/** 节点类型（folder, file, canvas, diary） */
	type: NodeTypeSchema,

	/** 节点的显示标题 */
	title: z.string().min(1).max(500),

	/** 兄弟节点间的排序顺序（从 0 开始） */
	order: z.number().int().min(0),

	/** 文件夹在树视图中是否折叠 */
	collapsed: z.boolean().optional(),

	/** ISO 8601 格式的创建时间戳 */
	createDate: ISODateTimeSchema,

	/** ISO 8601 格式的最后修改时间戳 */
	lastEdit: ISODateTimeSchema,

	/** 用于分类的标签数组 */
	tags: z.array(z.string()).optional(),
});

/**
 * 节点创建 schema
 * 用于创建新节点
 * id、createDate 和 lastEdit 自动生成
 */
export const NodeCreateSchema = z.object({
	/** 可选 id - 如果未提供将自动生成 */
	id: UUIDSchema.optional(),

	/** 必需的父工作区引用 */
	workspace: UUIDSchema,

	/** 可选的父节点 ID - 根级节点为 null */
	parent: UUIDSchema.nullable().optional().default(null),

	/** 可选类型 - 默认为 "file" */
	type: NodeTypeSchema.optional().default("file"),

	/** 必需的显示标题 */
	title: z.string().min(1).max(500),

	/** 可选顺序 - 默认为 0 */
	order: z.number().int().min(0).optional().default(0),

	/** 可选折叠状态 - 文件夹默认为 true */
	collapsed: z.boolean().optional(),

	/** 可选 createDate - 如果未提供将自动生成 */
	createDate: ISODateTimeSchema.optional(),

	/** 可选 lastEdit - 如果未提供将自动生成 */
	lastEdit: ISODateTimeSchema.optional(),
});

/**
 * 节点更新 schema
 * 用于更新现有节点
 * 除了用于查找的隐式 id 外，所有字段都是可选的
 */
export const NodeUpdateSchema = z.object({
	/** 更新的父节点 ID */
	parent: UUIDSchema.nullable().optional(),

	/** 更新的类型 */
	type: NodeTypeSchema.optional(),

	/** 更新的标题 */
	title: z.string().min(1).max(500).optional(),

	/** 更新的顺序 */
	order: z.number().int().min(0).optional(),

	/** 更新的折叠状态 */
	collapsed: z.boolean().optional(),

	/** 更新的 lastEdit - 通常自动生成 */
	lastEdit: ISODateTimeSchema.optional(),
});

/**
 * 类型推断辅助
 * 使用这些从 Zod schemas 派生 TypeScript 类型
 */
export type NodeSchemaType = z.infer<typeof NodeSchema>;
export type NodeCreateSchemaType = z.infer<typeof NodeCreateSchema>;
export type NodeUpdateSchemaType = z.infer<typeof NodeUpdateSchema>;

/**
 * 从 Schema 推断的 NodeType 类型（单一来源）
 */
export type NodeType = z.infer<typeof NodeTypeSchema>;
