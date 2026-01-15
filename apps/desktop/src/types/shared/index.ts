/**
 * @file types/shared/index.ts
 * @description 共享类型统一导出
 *
 * 导出所有共享类型、接口和 Zod Schema，
 * 供所有数据模型使用。
 *
 * @requirements 2.1
 */

// 基础接口类型
export type {
	BaseEntity,
	BaseEntityCreate,
	BaseEntityUpdate,
	ISODateString,
	UUID,
} from "./base.interface"

// Zod Schema 类型推断
export type {
	BaseEntityCreateSchemaType,
	BaseEntitySchemaType,
	BaseEntityUpdateSchemaType,
} from "./base.schema"

// Zod Schema 用于校验
export {
	BaseEntityCreateSchema,
	BaseEntitySchema,
	BaseEntityUpdateSchema,
	ISODateTimeSchema,
	UUIDSchema,
} from "./base.schema"
