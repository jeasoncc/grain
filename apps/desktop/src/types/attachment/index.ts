/**
 * @file types/attachment/index.ts
 * @description Attachment 类型模块统一导出
 *
 * 导出所有 Attachment 相关的类型、接口、Schema 和 Builder。
 *
 * @requirements 2.1
 */

// Builder 导出
export { AttachmentBuilder } from "./attachment.builder"

// Interface 导出
export type {
	AttachmentCreateInput,
	AttachmentInterface,
	AttachmentType,
	AttachmentUpdateInput,
} from "./attachment.interface"

// Schema 类型推断导出
export type {
	AttachmentCreateSchemaType,
	AttachmentSchemaType,
	AttachmentUpdateSchemaType,
} from "./attachment.schema"

// Schema 导出
export {
	AttachmentCreateSchema,
	AttachmentSchema,
	AttachmentTypeSchema,
	AttachmentUpdateSchema,
} from "./attachment.schema"
