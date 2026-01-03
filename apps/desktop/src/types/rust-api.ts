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
