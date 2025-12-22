/**
 * @file types/tag/index.ts
 * @description 标签类型模块统一导出
 *
 * 导出所有标签相关的类型、Schema 和 Builder。
 *
 * @requirements 2.1
 */

// Builder 导出
export { TagBuilder } from "./tag.builder";

// Interface 导出
export type {
	TagCreateInput,
	TagInterface,
	TagUpdateInput,
} from "./tag.interface";

// Schema 类型推断导出
export type {
	TagCreateSchemaType,
	TagSchemaType,
	TagUpdateSchemaType,
} from "./tag.schema";

// Schema 导出
export { TagCreateSchema, TagSchema, TagUpdateSchema } from "./tag.schema";
