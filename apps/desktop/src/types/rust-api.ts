/**
 * Rust 后端 API 类型定义
 *
 * 与 Tauri Commands 对应的 TypeScript 类型
 */

// ============================================
// Workspace 类型（与 Rust 后端 workspace_interface.rs 对应）
// ============================================

/** 创建工作区请求 - 对应 Rust CreateWorkspaceRequest */
export interface CreateWorkspaceRequest {
	/** 工作区标题 */
	title: string;
	/** 作者名称 */
	author?: string;
	/** 项目描述 */
	description?: string;
	/** 出版商信息 */
	publisher?: string;
	/** 项目语言（如 "zh", "en"） */
	language?: string;
	/** 团队成员（用户 ID 数组） */
	members?: string[];
	/** 所有者用户 ID */
	owner?: string;
}

/** 更新工作区请求 - 对应 Rust UpdateWorkspaceRequest */
export interface UpdateWorkspaceRequest {
	/** 工作区标题 */
	title?: string;
	/** 作者名称 */
	author?: string;
	/** 项目描述 (null 表示清除) */
	description?: string | null;
	/** 出版商信息 */
	publisher?: string;
	/** 项目语言 */
	language?: string;
	/** 最后打开时间（毫秒时间戳） */
	lastOpen?: number;
	/** 团队成员 */
	members?: string[];
	/** 所有者用户 ID */
	owner?: string;
}

/** 工作区响应 - 对应 Rust WorkspaceResponse */
export interface WorkspaceResponse {
	/** 工作区 ID (UUID) */
	id: string;
	/** 工作区标题 */
	title: string;
	/** 作者名称 */
	author: string;
	/** 项目描述 */
	description: string;
	/** 出版商信息 */
	publisher: string;
	/** 项目语言 */
	language: string;
	/** 最后打开时间（毫秒时间戳） */
	lastOpen: number;
	/** 创建时间戳 (毫秒) */
	createdAt: number;
	/** 更新时间戳 (毫秒) */
	updatedAt: number;
	/** 团队成员（用户 ID 数组） */
	members?: string[];
	/** 所有者用户 ID */
	owner?: string;
}

// ============================================
// Node 类型
// ============================================

/** 节点类型（与前端 NodeType 保持一致） */
export type NodeTypeValue =
	| "folder"
	| "file"
	| "diary"
	| "wiki"
	| "todo"
	| "note"
	| "ledger"
	| "drawing"
	| "plantuml"
	| "mermaid"
	| "code";

/** 创建节点请求 */
export interface CreateNodeRequest {
	/** 所属工作区 ID */
	workspaceId: string;
	/** 父节点 ID (根节点为 null) */
	parentId?: string | null;
	/** 节点标题 */
	title: string;
	/** 节点类型 */
	nodeType: NodeTypeValue;
	/** 标签列表 */
	tags?: string[];
	/** 初始内容 (JSON 字符串) */
	initialContent?: string;
}

/** 更新节点请求 */
export interface UpdateNodeRequest {
	/** 节点标题 */
	title?: string;
	/** 是否折叠 */
	isCollapsed?: boolean;
	/** 排序顺序 */
	sortOrder?: number;
	/** 标签列表 (null 表示清除) */
	tags?: string[] | null;
}

/** 移动节点请求 */
export interface MoveNodeRequest {
	/** 新父节点 ID (null 表示移动到根) */
	newParentId?: string | null;
	/** 新排序顺序 */
	newSortOrder: number;
}

/** 节点响应 */
export interface NodeResponse {
	/** 节点 ID (UUID) */
	id: string;
	/** 所属工作区 ID */
	workspaceId: string;
	/** 父节点 ID */
	parentId: string | null;
	/** 节点标题 */
	title: string;
	/** 节点类型 */
	nodeType: NodeTypeValue;
	/** 是否折叠 */
	isCollapsed: boolean;
	/** 排序顺序 */
	sortOrder: number;
	/** 标签列表 */
	tags: string[] | null;
	/** 创建时间戳 (毫秒) */
	createdAt: number;
	/** 更新时间戳 (毫秒) */
	updatedAt: number;
}

// ============================================
// Content 类型
// ============================================

/** 保存内容请求 */
export interface SaveContentRequest {
	/** 节点 ID */
	nodeId: string;
	/** 内容 (JSON 字符串) */
	content: string;
	/** 期望版本号 (用于乐观锁) */
	expectedVersion?: number;
}

/** 内容响应 */
export interface ContentResponse {
	/** 内容 ID (UUID) */
	id: string;
	/** 节点 ID */
	nodeId: string;
	/** 内容 (JSON 字符串) */
	content: string;
	/** 版本号 */
	version: number;
	/** 创建时间戳 (毫秒) */
	createdAt: number;
	/** 更新时间戳 (毫秒) */
	updatedAt: number;
}

// ============================================
// Backup 类型
// ============================================

/** 备份信息 */
export interface BackupInfo {
	/** 备份文件名 */
	filename: string;
	/** 备份文件完整路径 */
	path: string;
	/** 创建时间戳 (毫秒) */
	createdAt: number;
	/** 文件大小 (字节) */
	size: number;
}

// ============================================
// Clear Data 类型
// ============================================

/** 清除数据结果 - 对应 Rust ClearDataResult */
export interface ClearDataResult {
	/** 删除的用户数 */
	usersDeleted: number;
	/** 删除的工作区数 */
	workspacesDeleted: number;
	/** 删除的节点数 */
	nodesDeleted: number;
	/** 删除的内容数 */
	contentsDeleted: number;
	/** 删除的标签数 */
	tagsDeleted: number;
	/** 删除的附件数 */
	attachmentsDeleted: number;
}

// ============================================
// User 类型（与 Rust 后端 user_interface.rs 对应）
// ============================================

/** 用户订阅计划 */
export type UserPlan = "free" | "premium";

/** 用户功能权限 */
export interface UserFeatures {
	canUseAllScenes?: boolean;
	canExportPdf?: boolean;
	canUseCloudSync?: boolean;
	showAds?: boolean;
	reminderInterval?: number;
}

/** 用户应用状态 */
export interface UserState {
	lastLocation?: string;
	currentProject?: string;
	currentChapter?: string;
	currentScene?: string;
	currentTitle?: string;
	currentTyping?: string;
	lastCloudSave?: string;
	lastLocalSave?: string;
	isUserLoggedIn?: boolean;
}

/** 用户设置 */
export interface UserSettings {
	theme?: string;
	language?: string;
	autosave?: boolean;
	spellCheck?: boolean;
	lastLocation?: boolean;
	fontSize?: string;
}

/** 创建用户请求 - 对应 Rust CreateUserRequest */
export interface CreateUserRequest {
	/** 用户名 */
	username: string;
	/** 显示名称 */
	displayName?: string;
	/** 头像 URL */
	avatar?: string;
	/** 邮箱 */
	email?: string;
	/** 订阅计划 */
	plan?: UserPlan;
	/** 功能权限 */
	features?: UserFeatures;
	/** 用户设置 */
	settings?: UserSettings;
}

/** 更新用户请求 - 对应 Rust UpdateUserRequest */
export interface UpdateUserRequest {
	/** 用户名 */
	username?: string;
	/** 显示名称 (null 表示清除) */
	displayName?: string | null;
	/** 头像 URL (null 表示清除) */
	avatar?: string | null;
	/** 邮箱 (null 表示清除) */
	email?: string | null;
	/** 最后登录时间戳（毫秒） */
	lastLogin?: number;
	/** 订阅计划 */
	plan?: UserPlan;
	/** 订阅开始时间戳（毫秒） */
	planStartDate?: number | null;
	/** 订阅到期时间戳（毫秒） */
	planExpiresAt?: number | null;
	/** 试用到期时间戳（毫秒） */
	trialExpiresAt?: number | null;
	/** 认证 Token (null 表示清除) */
	token?: string | null;
	/** 服务器消息 (null 表示清除) */
	serverMessage?: string | null;
	/** 功能权限 (null 表示清除) */
	features?: UserFeatures | null;
	/** 应用状态 (null 表示清除) */
	state?: UserState | null;
	/** 用户设置 (null 表示清除) */
	settings?: UserSettings | null;
}

/** 用户响应 - 对应 Rust UserResponse */
export interface UserResponse {
	/** 用户 ID (UUID) */
	id: string;
	/** 用户名 */
	username: string;
	/** 显示名称 */
	displayName: string | null;
	/** 头像 URL */
	avatar: string | null;
	/** 邮箱 */
	email: string | null;
	/** 最后登录时间戳（毫秒） */
	lastLogin: number;
	/** 创建时间戳（毫秒） */
	createdAt: number;
	/** 订阅计划 */
	plan: UserPlan;
	/** 订阅开始时间戳（毫秒） */
	planStartDate: number | null;
	/** 订阅到期时间戳（毫秒） */
	planExpiresAt: number | null;
	/** 试用到期时间戳（毫秒） */
	trialExpiresAt: number | null;
	/** 认证 Token */
	token: string | null;
	/** 服务器消息 */
	serverMessage: string | null;
	/** 功能权限 */
	features: UserFeatures | null;
	/** 应用状态 */
	state: UserState | null;
	/** 用户设置 */
	settings: UserSettings | null;
}


// ============================================
// Attachment 类型（与 Rust 后端 attachment_interface.rs 对应）
// ============================================

/** 附件类型 */
export type AttachmentType = "image" | "audio" | "file";

/** 创建附件请求 - 对应 Rust CreateAttachmentRequest */
export interface CreateAttachmentRequest {
	/** 关联的项目/工作区 ID */
	projectId?: string;
	/** 附件类型 */
	attachmentType: AttachmentType;
	/** 原始文件名 */
	fileName: string;
	/** 文件存储路径 */
	filePath: string;
	/** 文件大小（字节） */
	size?: number;
	/** MIME 类型 */
	mimeType?: string;
}

/** 更新附件请求 - 对应 Rust UpdateAttachmentRequest */
export interface UpdateAttachmentRequest {
	/** 原始文件名 */
	fileName?: string;
	/** 文件存储路径 */
	filePath?: string;
	/** 文件大小（字节） (null 表示清除) */
	size?: number | null;
	/** MIME 类型 (null 表示清除) */
	mimeType?: string | null;
}

/** 附件响应 - 对应 Rust AttachmentResponse */
export interface AttachmentResponse {
	/** 附件 ID (UUID) */
	id: string;
	/** 关联的项目/工作区 ID */
	projectId: string | null;
	/** 附件类型 */
	attachmentType: AttachmentType;
	/** 原始文件名 */
	fileName: string;
	/** 文件存储路径 */
	filePath: string;
	/** 上传时间戳（毫秒） */
	uploadedAt: number;
	/** 文件大小（字节） */
	size: number | null;
	/** MIME 类型 */
	mimeType: string | null;
}
