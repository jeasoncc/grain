/**
 * @file types/user/index.ts
 * @description 用户类型模块统一导出
 *
 * 导出所有用户相关的类型、Schema 和 Builder。
 *
 * @requirements 2.1
 */

// Builder 导出
export { UserBuilder } from "./user.builder"

// Interface 导出
export type {
	TokenStatus,
	UserCreateInput,
	UserDBVersion,
	UserFeatures,
	UserInterface,
	UserPlan,
	UserSettings,
	UserState,
	UserUpdateInput,
} from "./user.interface"

// Schema 类型推断导出
export type {
	UserCreateSchemaType,
	UserFeaturesSchemaType,
	UserSchemaType,
	UserSettingsSchemaType,
	UserStateSchemaType,
	UserUpdateSchemaType,
} from "./user.schema"

// Schema 导出
export {
	TokenStatusSchema,
	UserCreateSchema,
	UserDBVersionSchema,
	UserFeaturesSchema,
	UserPlanSchema,
	UserSchema,
	UserSettingsSchema,
	UserStateSchema,
	UserUpdateSchema,
} from "./user.schema"
