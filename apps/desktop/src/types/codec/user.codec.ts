/**
 * User Codec - 用户类型转换
 *
 * 负责 Rust 后端 UserResponse 与前端 UserInterface 之间的转换。
 *
 * 架构位置：
 * ```
 * Repository Layer (返回 UserInterface)
 *       │
 *       ▼
 * Codec Layer (类型转换) ← 你在这里
 *       │
 *       ▼
 * rust-api.fn.ts (返回 UserResponse)
 * ```
 */

import type {
	CreateUserRequest,
	UserFeatures as RustUserFeatures,
	UserSettings as RustUserSettings,
	UserState as RustUserState,
	UpdateUserRequest,
	UserResponse,
} from "@/types/rust-api"
import type {
	UserCreateInput,
	UserFeatures,
	UserInterface,
	UserSettings,
	UserState,
	UserUpdateInput,
} from "@/types/user"

// ============================================
// 解码函数 (Rust → 前端)
// ============================================

/**
 * 解码用户功能权限
 */
const decodeUserFeatures = (features: RustUserFeatures | null): UserFeatures | undefined => {
	if (!features) return undefined
	return {
		canExportPDF: features.canExportPdf,
		canUseAllScenes: features.canUseAllScenes,
		canUseCloudSync: features.canUseCloudSync,
		reminderInterval: features.reminderInterval,
		showAds: features.showAds,
	}
}

/**
 * 解码用户应用状态
 */
const decodeUserState = (state: RustUserState | null): UserState | undefined => {
	if (!state) return undefined
	return {
		currentChapter: state.currentChapter ?? "",
		currentProject: state.currentProject ?? "",
		currentScene: state.currentScene ?? "",
		currentTitle: state.currentTitle ?? "",
		currentTyping: state.currentTyping ?? "",
		isUserLoggedIn: state.isUserLoggedIn ?? false,
		lastCloudSave: state.lastCloudSave ?? "",
		lastLocalSave: state.lastLocalSave ?? "",
		lastLocation: state.lastLocation ?? "",
	}
}

/**
 * 解码用户设置
 */
const decodeUserSettings = (settings: RustUserSettings | null): UserSettings | undefined => {
	if (!settings) return undefined
	return {
		autosave: settings.autosave,
		fontSize: settings.fontSize ?? "16px",
		language: settings.language ?? "zh",
		lastLocation: settings.lastLocation,
		spellCheck: settings.spellCheck,
		theme: settings.theme ?? "light",
	}
}

/**
 * 解码单个用户
 * Rust UserResponse → 前端 UserInterface
 */
export const decodeUser = (response: UserResponse): UserInterface => ({
	avatar: response.avatar ?? undefined,
	createDate: new Date(response.createdAt).toISOString(),
	displayName: response.displayName ?? undefined,
	email: response.email ?? undefined,
	features: decodeUserFeatures(response.features),
	id: response.id,
	lastLogin: new Date(response.lastLogin).toISOString(),
	plan: response.plan,
	planExpiresAt: response.planExpiresAt
		? new Date(response.planExpiresAt).toISOString()
		: undefined,
	planStartDate: response.planStartDate
		? new Date(response.planStartDate).toISOString()
		: undefined,
	serverMessage: response.serverMessage ?? undefined,
	settings: decodeUserSettings(response.settings),
	state: decodeUserState(response.state),
	token: response.token ?? undefined,
	trialExpiresAt: response.trialExpiresAt
		? new Date(response.trialExpiresAt).toISOString()
		: undefined,
	username: response.username,
})

/**
 * 解码用户数组
 */
export const decodeUsers = (responses: readonly UserResponse[]): readonly UserInterface[] =>
	responses.map(decodeUser)

/**
 * 解码可选用户
 */
export const decodeUserOptional = (response: UserResponse | null): UserInterface | null =>
	response ? decodeUser(response) : null

// ============================================
// 编码函数 (前端 → Rust)
// ============================================

/**
 * 编码用户功能权限
 */
const encodeUserFeatures = (features?: UserFeatures): RustUserFeatures | undefined => {
	if (!features) return undefined
	return {
		canExportPdf: features.canExportPDF,
		canUseAllScenes: features.canUseAllScenes,
		canUseCloudSync: features.canUseCloudSync,
		reminderInterval: features.reminderInterval,
		showAds: features.showAds,
	}
}

/**
 * 编码用户应用状态
 */
const encodeUserState = (state?: UserState): RustUserState | undefined => {
	if (!state) return undefined
	return {
		currentChapter: state.currentChapter || undefined,
		currentProject: state.currentProject || undefined,
		currentScene: state.currentScene || undefined,
		currentTitle: state.currentTitle || undefined,
		currentTyping: state.currentTyping || undefined,
		isUserLoggedIn: state.isUserLoggedIn,
		lastCloudSave: state.lastCloudSave || undefined,
		lastLocalSave: state.lastLocalSave || undefined,
		lastLocation: state.lastLocation || undefined,
	}
}

/**
 * 编码用户设置
 */
const encodeUserSettings = (settings?: UserSettings): RustUserSettings | undefined => {
	if (!settings) return undefined
	return {
		autosave: settings.autosave,
		fontSize: settings.fontSize || undefined,
		language: settings.language || undefined,
		lastLocation: settings.lastLocation,
		spellCheck: settings.spellCheck,
		theme: settings.theme || undefined,
	}
}

/**
 * 编码创建用户请求
 * 前端 UserCreateInput → Rust CreateUserRequest
 */
export const encodeCreateUser = (input: UserCreateInput): CreateUserRequest => ({
	avatar: input.avatar,
	displayName: input.displayName,
	email: input.email,
	features: encodeUserFeatures(input.features),
	plan: input.plan,
	settings: encodeUserSettings(input.settings),
	username: input.username,
})

/**
 * 编码更新用户请求
 * 前端 UserUpdateInput → Rust UpdateUserRequest
 */
export const encodeUpdateUser = (input: UserUpdateInput): UpdateUserRequest => ({
	avatar: input.avatar !== undefined ? input.avatar : undefined,
	displayName: input.displayName !== undefined ? input.displayName : undefined,
	email: input.email !== undefined ? input.email : undefined,
	features: input.features !== undefined ? encodeUserFeatures(input.features) : undefined,
	lastLogin: input.lastLogin ? new Date(input.lastLogin).getTime() : undefined,
	plan: input.plan,
	planExpiresAt: input.planExpiresAt ? new Date(input.planExpiresAt).getTime() : undefined,
	planStartDate: input.planStartDate ? new Date(input.planStartDate).getTime() : undefined,
	serverMessage: input.serverMessage !== undefined ? input.serverMessage : undefined,
	settings: input.settings !== undefined ? encodeUserSettings(input.settings) : undefined,
	state: input.state !== undefined ? encodeUserState(input.state) : undefined,
	token: input.token !== undefined ? input.token : undefined,
	trialExpiresAt: input.trialExpiresAt ? new Date(input.trialExpiresAt).getTime() : undefined,
	username: input.username,
})
