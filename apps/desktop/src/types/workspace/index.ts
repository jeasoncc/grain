/**
 * @file types/workspace/index.ts
 * @description Workspace 类型模块统一导出
 *
 * 导出所有 Workspace 相关的类型、schemas 和 builder。
 * 遵循 Interface + Builder + Zod Schema 模式。
 *
 * @requirements 2.1
 */

// Builder 导出
export { WorkspaceBuilder } from "./workspace.builder";

// Interface 导出
export type {
	WorkspaceCreateInput,
	WorkspaceInterface,
	WorkspaceUpdateInput,
} from "./workspace.interface";

// Schema 类型推断导出
export type {
	WorkspaceCreateSchemaType,
	WorkspaceSchemaType,
	WorkspaceUpdateSchemaType,
} from "./workspace.schema";

// Schema 导出
export {
	WorkspaceCreateSchema,
	WorkspaceSchema,
	WorkspaceUpdateSchema,
} from "./workspace.schema";
