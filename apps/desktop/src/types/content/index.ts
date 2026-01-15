/**
 * @file types/content/index.ts
 * @description Content 类型模块统一导出
 *
 * 导出所有 Content 相关的类型、Schema 和 Builder。
 * 从 '@/types/content' 导入以访问所有 Content 类型功能。
 *
 * @requirements 2.1
 */

// Builder 用于创建 Content 对象
export { ContentBuilder } from "./content.builder"

// 接口类型
export type {
	ContentCreateInput,
	ContentInterface,
	ContentType,
	ContentUpdateInput,
} from "./content.interface"

// Zod Schema 类型推断
export type {
	ContentCreateSchemaType,
	ContentSchemaType,
	ContentTypeSchemaType,
	ContentUpdateSchemaType,
} from "./content.schema"

// Zod Schema 用于校验
export {
	ContentCreateSchema,
	ContentSchema,
	ContentTypeSchema,
	ContentUpdateSchema,
} from "./content.schema"
