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
	readonly title: string;
	/** 作者名称 */
	readonly author?: string;
	/** 项目描述 */
	readonly description?: string;
	/** 出版商信息 */
	readonly publisher?: string;
	/** 项目语言（如 "zh", "en"） */
	readonly language?: string;
	/** 团队成员（用户 ID 数组） */
	readonly members?: readonly string[];
	/** 所有者用户 ID */
	readonly owner?: string;
}

/** 更新工作区请求 - 对应 Rust UpdateWorkspaceRequest */
export interface UpdateWorkspaceRequest {
	/** 工作区标题 */
	readonly title?: string;
	/** 作者名称 */
	readonly author?: string;
	/** 项目描述 (null 表示清除) */
	readonly description?: string | null;
	/** 出版商信息 */
	readonly publisher?: string;
	/** 项目语言 */
	readonly language?: string;
	/** 最后打开时间（毫秒时间戳） */
	readonly lastOpen?: number;
	/** 团队成员 */
	readonly members?: readonly string[];
	/** 所有者用户 ID */
	readonly owner?: string;
}

/** 工作区响应 - 对应 Rust WorkspaceResponse */
export interface WorkspaceResponse {
	/** 工作区 ID (UUID) */
	readonly id: string;
	/** 工作区标题 */
	readonly title: string;
	/** 作者名称 */
	readonly author: string;
	/** 项目描述 */
	readonly description: string;
	/** 出版商信息 */
	readonly publisher: string;
	/** 项目语言 */
	readonly language: string;
	/** 最后打开时间（毫秒时间戳） */
	readonly lastOpen: number;
	/** 创建时间戳 (毫秒) */
	readonly createdAt: number;
	/** 更新时间戳 (毫秒) */
	readonly updatedAt: number;
	/** 团队成员（用户 ID 数组） */
	readonly members?: readonly string[];
	/** 所有者用户 ID */
	readonly owner?: string;
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
	readonly workspaceId: string;
	/** 父节点 ID (根节点为 null) */
	readonly parentId?: string | null;
	/** 节点标题 */
	readonly title: string;
	/** 节点类型 */
	readonly nodeType: NodeTypeValue;
	/** 标签列表 */
	readonly tags?: readonly string[];
	/** 初始内容 (JSON 字符串) */
	readonly initialContent?: string;
}

/** 更新节点请求 */
export interface UpdateNodeRequest {
	/** 节点标题 */
	readonly title?: string;
	/** 是否折叠 */
	readonly isCollapsed?: boolean;
	/** 排序顺序 */
	readonly sortOrder?: number;
	/** 标签列表 (null 表示清除) */
	readonly tags?: readonly string[] | null;
}

/** 移动节点请求 */
export interface MoveNodeRequest {
	/** 新父节点 ID (null 表示移动到根) */
	readonly newParentId?: string | null;
	/** 新排序顺序 */
	readonly newSortOrder: number;
}

/** 节点响应 */
export interface NodeResponse {
	/** 节点 ID (UUID) */
	readonly id: string;
	/** 所属工作区 ID */
	readonly workspaceId: string;
	/** 父节点 ID */
	readonly parentId: string | null;
	/** 节点标题 */
	readonly title: string;
	/** 节点类型 */
	readonly nodeType: NodeTypeValue;
	/** 是否折叠 */
	readonly isCollapsed: boolean;
	/** 排序顺序 */
	readonly sortOrder: number;
	/** 标签列表 */
	readonly tags: readonly string[] | null;
	/** 创建时间戳 (毫秒) */
	readonly createdAt: number;
	/** 更新时间戳 (毫秒) */
	readonly updatedAt: number;
}

// ============================================
// Content 类型
// ============================================

/** 保存内容请求 */
export interface SaveContentRequest {
	/** 节点 ID */
	readonly nodeId: string;
	/** 内容 (JSON 字符串) */
	readonly content: string;
	/** 期望版本号 (用于乐观锁) */
	readonly expectedVersion?: number;
}

/** 内容响应 */
export interface ContentResponse {
	/** 内容 ID (UUID) */
	readonly id: string;
	/** 节点 ID */
	readonly nodeId: string;
	/** 内容 (JSON 字符串) */
	readonly content: string;
	/** 版本号 */
	readonly version: number;
	/** 创建时间戳 (毫秒) */
	readonly createdAt: number;
	/** 更新时间戳 (毫秒) */
	readonly updatedAt: number;
}

// ============================================
// Backup 类型
// ============================================

/** 备份信息 */
export interface BackupInfo {
	/** 备份文件名 */
	readonly filename: string;
	/** 备份文件完整路径 */
	readonly path: string;
	/** 创建时间戳 (毫秒) */
	readonly createdAt: number;
	/** 文件大小 (字节) */
	readonly size: number;
}

// ============================================
// Clear Data 类型
// ============================================

/** 清除数据结果 - 对应 Rust ClearDataResult */
export interface ClearDataResult {
	/** 删除的用户数 */
	readonly usersDeleted: number;
	/** 删除的工作区数 */
	readonly workspacesDeleted: number;
	/** 删除的节点数 */
	readonly nodesDeleted: number;
	/** 删除的内容数 */
	readonly contentsDeleted: number;
	/** 删除的标签数 */
	readonly tagsDeleted: number;
	/** 删除的附件数 */
	readonly attachmentsDeleted: number;
}

// ============================================
// User 类型（与 Rust 后端 user_interface.rs 对应）
// ============================================

/** 用户订阅计划 */
export type UserPlan = "free" | "premium";

/** 用户功能权限 */
export interface UserFeatures {
	readonly canUseAllScenes?: boolean;
	readonly canExportPdf?: boolean;
	readonly canUseCloudSync?: boolean;
	readonly showAds?: boolean;
	readonly reminderInterval?: number;
}

/** 用户应用状态 */
export interface UserState {
	readonly lastLocation?: string;
	readonly currentProject?: string;
	readonly currentChapter?: string;
	readonly currentScene?: string;
	readonly currentTitle?: string;
	readonly currentTyping?: string;
	readonly lastCloudSave?: string;
	readonly lastLocalSave?: string;
	readonly isUserLoggedIn?: boolean;
}

/** 用户设置 */
export interface UserSettings {
	readonly theme?: string;
	readonly language?: string;
	readonly autosave?: boolean;
	readonly spellCheck?: boolean;
	readonly lastLocation?: boolean;
	readonly fontSize?: string;
}

/** 创建用户请求 - 对应 Rust CreateUserRequest */
export interface CreateUserRequest {
	/** 用户名 */
	readonly username: string;
	/** 显示名称 */
	readonly displayName?: string;
	/** 头像 URL */
	readonly avatar?: string;
	/** 邮箱 */
	readonly email?: string;
	/** 订阅计划 */
	readonly plan?: UserPlan;
	/** 功能权限 */
	readonly features?: UserFeatures;
	/** 用户设置 */
	readonly settings?: UserSettings;
}

/** 更新用户请求 - 对应 Rust UpdateUserRequest */
export interface UpdateUserRequest {
	/** 用户名 */
	readonly username?: string;
	/** 显示名称 (null 表示清除) */
	readonly displayName?: string | null;
	/** 头像 URL (null 表示清除) */
	readonly avatar?: string | null;
	/** 邮箱 (null 表示清除) */
	readonly email?: string | null;
	/** 最后登录时间戳（毫秒） */
	readonly lastLogin?: number;
	/** 订阅计划 */
	readonly plan?: UserPlan;
	/** 订阅开始时间戳（毫秒） */
	readonly planStartDate?: number | null;
	/** 订阅到期时间戳（毫秒） */
	readonly planExpiresAt?: number | null;
	/** 试用到期时间戳（毫秒） */
	readonly trialExpiresAt?: number | null;
	/** 认证 Token (null 表示清除) */
	readonly token?: string | null;
	/** 服务器消息 (null 表示清除) */
	readonly serverMessage?: string | null;
	/** 功能权限 (null 表示清除) */
	readonly features?: UserFeatures | null;
	/** 应用状态 (null 表示清除) */
	readonly state?: UserState | null;
	/** 用户设置 (null 表示清除) */
	readonly settings?: UserSettings | null;
}

/** 用户响应 - 对应 Rust UserResponse */
export interface UserResponse {
	/** 用户 ID (UUID) */
	readonly id: string;
	/** 用户名 */
	readonly username: string;
	/** 显示名称 */
	readonly displayName: string | null;
	/** 头像 URL */
	readonly avatar: string | null;
	/** 邮箱 */
	readonly email: string | null;
	/** 最后登录时间戳（毫秒） */
	readonly lastLogin: number;
	/** 创建时间戳（毫秒） */
	readonly createdAt: number;
	/** 订阅计划 */
	readonly plan: UserPlan;
	/** 订阅开始时间戳（毫秒） */
	readonly planStartDate: number | null;
	/** 订阅到期时间戳（毫秒） */
	readonly planExpiresAt: number | null;
	/** 试用到期时间戳（毫秒） */
	readonly trialExpiresAt: number | null;
	/** 认证 Token */
	readonly token: string | null;
	/** 服务器消息 */
	readonly serverMessage: string | null;
	/** 功能权限 */
	readonly features: UserFeatures | null;
	/** 应用状态 */
	readonly state: UserState | null;
	/** 用户设置 */
	readonly settings: UserSettings | null;
}

// ============================================
// Attachment 类型（与 Rust 后端 attachment_interface.rs 对应）
// ============================================

/** 附件类型 */
export type AttachmentType = "image" | "audio" | "file";

/** 创建附件请求 - 对应 Rust CreateAttachmentRequest */
export interface CreateAttachmentRequest {
	/** 关联的项目/工作区 ID */
	readonly projectId?: string;
	/** 附件类型 */
	readonly attachmentType: AttachmentType;
	/** 原始文件名 */
	readonly fileName: string;
	/** 文件存储路径 */
	readonly filePath: string;
	/** 文件大小（字节） */
	readonly size?: number;
	/** MIME 类型 */
	readonly mimeType?: string;
}

/** 更新附件请求 - 对应 Rust UpdateAttachmentRequest */
export interface UpdateAttachmentRequest {
	/** 原始文件名 */
	readonly fileName?: string;
	/** 文件存储路径 */
	readonly filePath?: string;
	/** 文件大小（字节） (null 表示清除) */
	readonly size?: number | null;
	/** MIME 类型 (null 表示清除) */
	readonly mimeType?: string | null;
}

/** 附件响应 - 对应 Rust AttachmentResponse */
export interface AttachmentResponse {
	/** 附件 ID (UUID) */
	readonly id: string;
	/** 关联的项目/工作区 ID */
	readonly projectId: string | null;
	/** 附件类型 */
	readonly attachmentType: AttachmentType;
	/** 原始文件名 */
	readonly fileName: string;
	/** 文件存储路径 */
	readonly filePath: string;
	/** 上传时间戳（毫秒） */
	readonly uploadedAt: number;
	/** 文件大小（字节） */
	readonly size: number | null;
	/** MIME 类型 */
	readonly mimeType: string | null;
}

// ============================================
// Tag 类型（与 Rust 后端 tag_interface.rs 对应）
// ============================================

/** 创建标签请求 - 对应 Rust CreateTagRequest */
export interface CreateTagRequest {
	/** 标签名称 */
	readonly name: string;
	/** 所属工作区 ID */
	readonly workspaceId: string;
}

/** 更新标签请求 - 对应 Rust UpdateTagRequest */
export interface UpdateTagRequest {
	/** 标签名称 */
	readonly name?: string;
	/** 使用计数 */
	readonly count?: number;
	/** 最后使用时间戳（毫秒） */
	readonly lastUsed?: number;
}

/** 标签响应 - 对应 Rust TagResponse */
export interface TagResponse {
	/** 标签 ID (格式: workspaceId:name) */
	readonly id: string;
	/** 标签名称 */
	readonly name: string;
	/** 所属工作区 ID */
	readonly workspaceId: string;
	/** 使用计数 */
	readonly count: number;
	/** 最后使用时间戳（毫秒） */
	readonly lastUsed: number;
	/** 创建时间戳（毫秒） */
	readonly createdAt: number;
}

/** 标签图形节点 - 对应 Rust TagGraphNode */
export interface TagGraphNode {
	/** 标签 ID */
	readonly id: string;
	/** 标签名称 */
	readonly name: string;
	/** 使用此标签的文档数量 */
	readonly count: number;
}

/** 标签图形边 - 对应 Rust TagGraphEdge */
export interface TagGraphEdge {
	/** 源标签 ID */
	readonly source: string;
	/** 目标标签 ID */
	readonly target: string;
	/** 权重（共同出现的次数） */
	readonly weight: number;
}

/** 标签图形数据 - 对应 Rust TagGraphData */
export interface TagGraphData {
	/** 图形节点（标签） */
	readonly nodes: readonly TagGraphNode[];
	/** 图形边（标签之间的关系） */
	readonly edges: readonly TagGraphEdge[];
}
