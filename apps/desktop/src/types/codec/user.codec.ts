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
} from "@/types/rust-api";
import type {
	UserCreateInput,
	UserFeatures,
	UserInterface,
	UserSettings,
	UserState,
	UserUpdateInput,
} from "@/types/user";

// ============================================
// 解码函数 (Rust → 前端)
// ============================================

/**
 * 解码用户功能权限
 */
const decodeUserFeatures = (
	features: RustUserFeatures | null,
): UserFeatures | undefined => {
	if (!features) return undefined;
	return {
		canUseAllScenes: features.canUseAllScenes,
		canExportPDF: features.canExportPdf,
		canUseCloudSync: features.canUseCloudSync,
		showAds: features.showAds,
		reminderInterval: features.reminderInterval,
	};
};

/**
 * 解码用户应用状态
 */
const decodeUserState = (
	state: RustUserState | null,
): UserState | undefined => {
	if (!state) return undefined;
	return {
		lastLocation: state.lastLocation ?? "",
		currentProject: state.currentProject ?? "",
		currentChapter: state.currentChapter ?? "",
		currentScene: state.currentScene ?? "",
		currentTitle: state.currentTitle ?? "",
		currentTyping: state.currentTyping ?? "",
		lastCloudSave: state.lastCloudSave ?? "",
		lastLocalSave: state.lastLocalSave ?? "",
		isUserLoggedIn: state.isUserLoggedIn ?? false,
	};
};

/**
 * 解码用户设置
 */
const decodeUserSettings = (
	settings: RustUserSettings | null,
): UserSettings | undefined => {
	if (!settings) return undefined;
	return {
		theme: settings.theme ?? "light",
		language: settings.language ?? "zh",
		autosave: settings.autosave,
		spellCheck: settings.spellCheck,
		lastLocation: settings.lastLocation,
		fontSize: settings.fontSize ?? "16px",
	};
};

/**
 * 解码单个用户
 * Rust UserResponse → 前端 UserInterface
 */
export const decodeUser = (response: UserResponse): UserInterface => ({
	id: response.id,
	username: response.username,
	displayName: response.displayName ?? undefined,
	avatar: response.avatar ?? undefined,
	email: response.email ?? undefined,
	lastLogin: new Date(response.lastLogin).toISOString(),
	createDate: new Date(response.createdAt).toISOString(),
	plan: response.plan,
	planStartDate: response.planStartDate
		? new Date(response.planStartDate).toISOString()
		: undefined,
	planExpiresAt: response.planExpiresAt
		? new Date(response.planExpiresAt).toISOString()
		: undefined,
	trialExpiresAt: response.trialExpiresAt
		? new Date(response.trialExpiresAt).toISOString()
		: undefined,
	token: response.token ?? undefined,
	serverMessage: response.serverMessage ?? undefined,
	features: decodeUserFeatures(response.features),
	state: decodeUserState(response.state),
	settings: decodeUserSettings(response.settings),
});

/**
 * 解码用户数组
 */
export const decodeUsers = (responses: UserResponse[]): UserInterface[] =>
	responses.map(decodeUser);

/**
 * 解码可选用户
 */
export const decodeUserOptional = (
	response: UserResponse | null,
): UserInterface | null => (response ? decodeUser(response) : null);

// ============================================
// 编码函数 (前端 → Rust)
// ============================================

/**
 * 编码用户功能权限
 */
const encodeUserFeatures = (
	features?: UserFeatures,
): RustUserFeatures | undefined => {
	if (!features) return undefined;
	return {
		canUseAllScenes: features.canUseAllScenes,
		canExportPdf: features.canExportPDF,
		canUseCloudSync: features.canUseCloudSync,
		showAds: features.showAds,
		reminderInterval: features.reminderInterval,
	};
};

/**
 * 编码用户应用状态
 */
const encodeUserState = (state?: UserState): RustUserState | undefined => {
	if (!state) return undefined;
	return {
		lastLocation: state.lastLocation || undefined,
		currentProject: state.currentProject || undefined,
		currentChapter: state.currentChapter || undefined,
		currentScene: state.currentScene || undefined,
		currentTitle: state.currentTitle || undefined,
		currentTyping: state.currentTyping || undefined,
		lastCloudSave: state.lastCloudSave || undefined,
		lastLocalSave: state.lastLocalSave || undefined,
		isUserLoggedIn: state.isUserLoggedIn,
	};
};

/**
 * 编码用户设置
 */
const encodeUserSettings = (
	settings?: UserSettings,
): RustUserSettings | undefined => {
	if (!settings) return undefined;
	return {
		theme: settings.theme || undefined,
		language: settings.language || undefined,
		autosave: settings.autosave,
		spellCheck: settings.spellCheck,
		lastLocation: settings.lastLocation,
		fontSize: settings.fontSize || undefined,
	};
};

/**
 * 编码创建用户请求
 * 前端 UserCreateInput → Rust CreateUserRequest
 */
export const encodeCreateUser = (
	input: UserCreateInput,
): CreateUserRequest => ({
	username: input.username,
	displayName: input.displayName,
	avatar: input.avatar,
	email: input.email,
	plan: input.plan,
	features: encodeUserFeatures(input.features),
	settings: encodeUserSettings(input.settings),
});

/**
 * 编码更新用户请求
 * 前端 UserUpdateInput → Rust UpdateUserRequest
 */
export const encodeUpdateUser = (
	input: UserUpdateInput,
): UpdateUserRequest => ({
	username: input.username,
	displayName: input.displayName !== undefined ? input.displayName : undefined,
	avatar: input.avatar !== undefined ? input.avatar : undefined,
	email: input.email !== undefined ? input.email : undefined,
	lastLogin: input.lastLogin ? new Date(input.lastLogin).getTime() : undefined,
	plan: input.plan,
	planStartDate: input.planStartDate
		? new Date(input.planStartDate).getTime()
		: undefined,
	planExpiresAt: input.planExpiresAt
		? new Date(input.planExpiresAt).getTime()
		: undefined,
	trialExpiresAt: input.trialExpiresAt
		? new Date(input.trialExpiresAt).getTime()
		: undefined,
	token: input.token !== undefined ? input.token : undefined,
	serverMessage:
		input.serverMessage !== undefined ? input.serverMessage : undefined,
	features:
		input.features !== undefined
			? encodeUserFeatures(input.features)
			: undefined,
	state: input.state !== undefined ? encodeUserState(input.state) : undefined,
	settings:
		input.settings !== undefined
			? encodeUserSettings(input.settings)
			: undefined,
});
