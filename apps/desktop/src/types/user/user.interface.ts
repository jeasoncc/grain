/**
 * @file types/user/user.interface.ts
 * @description 用户接口定义
 *
 * 定义用户信息、订阅状态、功能权限和应用状态的接口。
 *
 * @requirements 2.1
 */

import type { ISODateString, UUID } from "../shared"

/**
 * 用户订阅计划类型
 */
export type UserPlan = "free" | "premium"

/**
 * Token 验证状态
 */
export type TokenStatus = "valid" | "invalid" | "unchecked"

/**
 * 用户功能权限
 * 根据订阅状态控制高级功能的访问
 */
export interface UserFeatures {
	/** 是否可以使用所有场景 */
	readonly canUseAllScenes?: boolean
	/** 是否可以导出 PDF */
	readonly canExportPDF?: boolean
	/** 是否可以使用云同步 */
	readonly canUseCloudSync?: boolean
	/** 是否显示广告（免费版） */
	readonly showAds?: boolean
	/** 提醒/广告弹窗间隔（秒） */
	readonly reminderInterval?: number
	/** 灵活的功能标志，用于未来扩展 */
	readonly featureFlags?: Record<string, boolean>
}

/**
 * 用户应用状态
 * 存储用户当前的编辑上下文，用于会话恢复
 */
export interface UserState {
	/** 最后打开的位置/路由 */
	readonly lastLocation: string
	/** 当前打开的项目 ID */
	readonly currentProject: string
	/** 当前编辑的章节 ID（兼容旧版） */
	readonly currentChapter: string
	/** 当前编辑的场景 ID（兼容旧版） */
	readonly currentScene: string
	/** 当前编辑的标题 */
	readonly currentTitle: string
	/** 当前输入的文本 */
	readonly currentTyping: string
	/** 最后云端保存时间戳 */
	readonly lastCloudSave: string
	/** 最后本地保存时间戳 */
	readonly lastLocalSave: string
	/** 用户是否已登录 */
	readonly isUserLoggedIn: boolean
}

/**
 * 用户设置/偏好
 */
export interface UserSettings {
	/** UI 主题（light/dark） */
	readonly theme: string
	/** 应用语言（zh/en） */
	readonly language: string
	/** 启用自动保存 */
	readonly autosave?: boolean
	/** 启用拼写检查 */
	readonly spellCheck?: boolean
	/** 记住最后编辑位置 */
	readonly lastLocation?: boolean
	/** 编辑器字体大小 */
	readonly fontSize: string
}

/**
 * 用户数据的数据库版本信息
 */
export interface UserDBVersion {
	/** 版本记录 ID */
	readonly id: string
	/** 数据库版本字符串 */
	readonly version: string
	/** 最后更新时间戳 */
	readonly updatedAt: string
	/** 迁移说明 */
	readonly migrationNotes?: string
}

/**
 * 主用户接口
 * 包含所有用户相关数据，包括个人资料、订阅和设置
 */
export interface UserInterface {
	/** 唯一用户标识符（UUID） */
	readonly id: UUID

	/** 登录用户名 */
	readonly username: string

	/** 显示名称（可选） */
	readonly displayName?: string

	/** 头像 URL（可选） */
	readonly avatar?: string

	/** 用户邮箱（可选） */
	readonly email?: string

	/** 最后登录时间戳 */
	readonly lastLogin: ISODateString

	/** 账户创建时间戳 */
	readonly createDate: ISODateString

	// 订阅信息
	/** 用户订阅计划 */
	readonly plan: UserPlan

	/** 订阅开始日期 */
	readonly planStartDate?: ISODateString

	/** 订阅到期日期（高级版） */
	readonly planExpiresAt?: ISODateString

	/** 试用到期日期 */
	readonly trialExpiresAt?: ISODateString

	// Token 和认证
	/** 认证 Token */
	readonly token?: string

	/** Token 验证状态 */
	readonly tokenStatus?: TokenStatus

	/** 最后 Token 检查时间戳 */
	readonly lastTokenCheck?: ISODateString

	/** 服务器消息（订阅通知等） */
	readonly serverMessage?: string

	// 嵌套对象
	/** 功能权限 */
	readonly features?: UserFeatures

	/** 应用状态 */
	readonly state?: UserState

	/** 用户设置/偏好 */
	readonly settings?: UserSettings

	/** 数据库版本信息 */
	readonly dbVersion?: UserDBVersion
}

/**
 * 用户创建输入类型
 * 创建新用户时使用
 * id、createDate 和 lastLogin 自动生成
 */
export interface UserCreateInput {
	readonly username: string
	readonly displayName?: string
	readonly avatar?: string
	readonly email?: string
	readonly plan?: UserPlan
	readonly features?: UserFeatures
	readonly settings?: UserSettings
}

/**
 * 用户更新输入类型
 * 更新现有用户时使用
 * 只有可变字段可以更新
 */
export interface UserUpdateInput {
	readonly username?: string
	readonly displayName?: string
	readonly avatar?: string
	readonly email?: string
	readonly lastLogin?: ISODateString
	readonly plan?: UserPlan
	readonly planStartDate?: ISODateString
	readonly planExpiresAt?: ISODateString
	readonly trialExpiresAt?: ISODateString
	readonly token?: string
	readonly tokenStatus?: TokenStatus
	readonly lastTokenCheck?: ISODateString
	readonly serverMessage?: string
	readonly features?: UserFeatures
	readonly state?: UserState
	readonly settings?: UserSettings
	readonly dbVersion?: UserDBVersion
}
