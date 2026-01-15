/**
 * @file types/user/user.schema.ts
 * @description 用户 Zod Schema 定义
 *
 * 定义用于运行时校验用户数据的 Zod Schema。
 * 这些 Schema 确保创建或更新用户时的数据完整性。
 *
 * @requirements 2.2
 */

import { z } from "zod"
import { ISODateTimeSchema, UUIDSchema } from "../shared"

/**
 * 用户计划 Schema
 */
export const UserPlanSchema = z.enum(["free", "premium"])

/**
 * Token 状态 Schema
 */
export const TokenStatusSchema = z.enum(["valid", "invalid", "unchecked"])

/**
 * 用户功能 Schema
 */
export const UserFeaturesSchema = z.object({
	canExportPDF: z.boolean().optional(),
	canUseAllScenes: z.boolean().optional(),
	canUseCloudSync: z.boolean().optional(),
	featureFlags: z.record(z.string(), z.boolean()).optional(),
	reminderInterval: z.number().int().min(0).optional(),
	showAds: z.boolean().optional(),
})

/**
 * 用户状态 Schema
 */
export const UserStateSchema = z.object({
	currentChapter: z.string(),
	currentProject: z.string(),
	currentScene: z.string(),
	currentTitle: z.string(),
	currentTyping: z.string(),
	isUserLoggedIn: z.boolean(),
	lastCloudSave: z.string(),
	lastLocalSave: z.string(),
	lastLocation: z.string(),
})

/**
 * 用户设置 Schema
 */
export const UserSettingsSchema = z.object({
	autosave: z.boolean().optional(),
	fontSize: z.string(),
	language: z.string(),
	lastLocation: z.boolean().optional(),
	spellCheck: z.boolean().optional(),
	theme: z.string(),
})

/**
 * 用户数据库版本 Schema
 */
export const UserDBVersionSchema = z.object({
	id: z.string(),
	migrationNotes: z.string().optional(),
	updatedAt: z.string(),
	version: z.string(),
})

/**
 * 完整用户 Schema
 * 校验数据库中的完整用户记录
 */
export const UserSchema = z.object({
	/** 头像 URL */
	avatar: z.string().url().optional().or(z.literal("")),

	/** 账户创建时间戳 */
	createDate: ISODateTimeSchema,

	/** 数据库版本信息 */
	dbVersion: UserDBVersionSchema.optional(),

	/** 显示名称 */
	displayName: z.string().max(200).optional(),

	/** 用户邮箱 */
	email: z.string().email().optional().or(z.literal("")),

	// 嵌套对象
	/** 功能权限 */
	features: UserFeaturesSchema.optional(),
	/** 唯一用户标识符 */
	id: UUIDSchema,

	/** 最后登录时间戳 */
	lastLogin: ISODateTimeSchema,

	/** 最后 Token 检查时间戳 */
	lastTokenCheck: ISODateTimeSchema.optional(),

	// 订阅信息
	/** 用户订阅计划 */
	plan: UserPlanSchema,

	/** 订阅到期日期 */
	planExpiresAt: ISODateTimeSchema.optional(),

	/** 订阅开始日期 */
	planStartDate: ISODateTimeSchema.optional(),

	/** 服务器消息 */
	serverMessage: z.string().optional(),

	/** 用户设置 */
	settings: UserSettingsSchema.optional(),

	/** 应用状态 */
	state: UserStateSchema.optional(),

	// Token 和认证
	/** 认证 Token */
	token: z.string().optional(),

	/** Token 验证状态 */
	tokenStatus: TokenStatusSchema.optional(),

	/** 试用到期日期 */
	trialExpiresAt: ISODateTimeSchema.optional(),

	/** 登录用户名 */
	username: z.string().min(1).max(100),
})

/**
 * 用户创建 Schema
 * 创建新用户时使用
 * id、createDate 和 lastLogin 自动生成
 */
export const UserCreateSchema = z.object({
	/** 可选头像 URL */
	avatar: z.string().url().optional().or(z.literal("")),

	/** 可选 createDate - 如果未提供将自动生成 */
	createDate: ISODateTimeSchema.optional(),

	/** 可选显示名称 */
	displayName: z.string().max(200).optional(),

	/** 可选邮箱 */
	email: z.string().email().optional().or(z.literal("")),

	/** 可选功能 */
	features: UserFeaturesSchema.optional(),
	/** 可选 id - 如果未提供将自动生成 */
	id: UUIDSchema.optional(),

	/** 可选 lastLogin - 如果未提供将自动生成 */
	lastLogin: ISODateTimeSchema.optional(),

	/** 可选计划 - 默认为 "free" */
	plan: UserPlanSchema.optional().default("free"),

	/** 可选设置 */
	settings: UserSettingsSchema.optional(),

	/** 必填用户名 */
	username: z.string().min(1).max(100),
})

/**
 * 用户更新 Schema
 * 更新现有用户时使用
 * 除了用于查找的隐式 id 外，所有字段都是可选的
 */
export const UserUpdateSchema = z.object({
	/** 更新的头像 URL */
	avatar: z.string().url().optional().or(z.literal("")),

	/** 更新的数据库版本 */
	dbVersion: UserDBVersionSchema.optional(),

	/** 更新的显示名称 */
	displayName: z.string().max(200).optional(),

	/** 更新的邮箱 */
	email: z.string().email().optional().or(z.literal("")),

	/** 更新的功能 */
	features: UserFeaturesSchema.optional(),

	/** 更新的 lastLogin 时间戳 */
	lastLogin: ISODateTimeSchema.optional(),

	/** 更新的最后 Token 检查时间戳 */
	lastTokenCheck: ISODateTimeSchema.optional(),

	/** 更新的计划 */
	plan: UserPlanSchema.optional(),

	/** 更新的计划到期日期 */
	planExpiresAt: ISODateTimeSchema.optional(),

	/** 更新的计划开始日期 */
	planStartDate: ISODateTimeSchema.optional(),

	/** 更新的服务器消息 */
	serverMessage: z.string().optional(),

	/** 更新的设置 */
	settings: UserSettingsSchema.optional(),

	/** 更新的状态 */
	state: UserStateSchema.optional(),

	/** 更新的 Token */
	token: z.string().optional(),

	/** 更新的 Token 状态 */
	tokenStatus: TokenStatusSchema.optional(),

	/** 更新的试用到期日期 */
	trialExpiresAt: ISODateTimeSchema.optional(),
	/** 更新的用户名 */
	username: z.string().min(1).max(100).optional(),
})

/**
 * 类型推断辅助
 * 使用这些从 Zod Schema 派生 TypeScript 类型
 */
export type UserSchemaType = z.infer<typeof UserSchema>
export type UserCreateSchemaType = z.infer<typeof UserCreateSchema>
export type UserUpdateSchemaType = z.infer<typeof UserUpdateSchema>
export type UserFeaturesSchemaType = z.infer<typeof UserFeaturesSchema>
export type UserStateSchemaType = z.infer<typeof UserStateSchema>
export type UserSettingsSchemaType = z.infer<typeof UserSettingsSchema>
