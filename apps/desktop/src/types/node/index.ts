/**
 * @file types/node/index.ts
 * @description Node 类型模块统一导出
 *
 * 导出所有 Node 相关的类型、schemas 和 builder。
 * 遵循 Interface + Builder + Zod Schema 模式。
 *
 * @requirements 2.1
 */

// Builder 导出
export { NodeBuilder } from "./node.builder"

// Interface 导出
export type {
	FileNodeType,
	FlatTreeNode,
	NodeCreateInput,
	NodeInterface,
	NodeType,
	NodeUpdateInput,
} from "./node.interface"

// Schema 类型推断导出
export type {
	NodeCreateSchemaType,
	NodeSchemaType,
	NodeUpdateSchemaType,
} from "./node.schema"

// Schema 导出
export {
	NodeCreateSchema,
	NodeSchema,
	NodeTypeSchema,
	NodeUpdateSchema,
} from "./node.schema"
