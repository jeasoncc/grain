/**
 * @deprecated This file is deprecated. Use the new model-based architecture instead:
 * - Import types from "@/db/models" (e.g., NodeInterface, WorkspaceInterface, etc.)
 * - Import schemas from "@/db/models" (e.g., NodeSchema, WorkspaceSchema, etc.)
 * 
 * This file is kept for backward compatibility during migration.
 */

// ==============================
// 小说编辑器数据库接口汇总 - 简化版 (DEPRECATED)
// ==============================

// ---------- 数据库版本信息 ----------
/**
 * 存储本地数据库版本信息，用于初始化、升级和迁移检查
 */
export interface DBVersionInterface {
	id: string; // 数据库记录唯一标识，使用 UUID
	version: string; // 当前数据库版本号（例如 "1.0.0"）
	updatedAt: string; // 更新时间 ISO 格式
	migrationNotes?: string; // 可选，记录升级迁移说明
}

// ---------- 应用状态 ----------
/**
 * 存储用户在应用中的当前状态，用于恢复上次编辑上下文
 */
export interface StateInterface {
	lastLocation: string; // 上次打开位置
	currentProject: string; // 当前打开项目 ID
	currentChapter: string; // 当前编辑章节 ID (保留兼容)
	currentScene: string; // 当前编辑场景 ID (保留兼容)
	currentTitle: string; // 当前编辑标题
	currentTyping: string; // 当前输入文本
	lastCloudSave: string; // 最近一次云保存时间
	lastLocalSave: string; // 最近一次本地保存时间
	isUserLoggedIn: boolean; // 当前用户登录状态
}

// ---------- 系统/全局设置 ----------
/**
 * 存储用户偏好设置，如主题、语言、编辑器配置等
 */
export interface SettingInterface {
	theme: string; // 界面主题，例如 light / dark
	language: string; // 应用语言，例如 zh / en
	autosave?: boolean; // 是否启用自动保存
	spellCheck?: boolean; // 是否启用拼写检查
	lastLocation?: boolean; // 是否记录上次编辑位置
	fontSize: string; // 编辑器字体大小
}

// ---------- 用户信息 ----------
/**
 * 用户基础信息、订阅状态、功能权限、应用状态及远程验证
 */
export interface UserInterface {
	id: string; // 用户唯一标识，使用 UUID
	username: string; // 登录用户名
	displayName?: string; // 显示名称
	avatar?: string; // 用户头像 URL
	email?: string; // 用户邮箱
	lastLogin: string; // 最近登录时间
	createDate: string; // 创建时间

	// --------------------------
	// 订阅与版本信息
	// --------------------------
	plan: "free" | "premium"; // 用户订阅类型
	planStartDate?: string; // 当前订阅开始日期
	planExpiresAt?: string; // 当前订阅结束日期（premium）
	trialExpiresAt?: string; // 免费试用到期时间（如果有）

	// --------------------------
	// Token 与远程验证
	// --------------------------
	token?: string; // 本地保存的认证 token
	tokenStatus?: "valid" | "invalid" | "unchecked"; // token 校验状态
	lastTokenCheck?: string; // 上次远程校验时间
	serverMessage?: string; // 服务器返回的提示信息（订阅过期、权限限制等）

	// --------------------------
	// 功能权限控制
	// --------------------------
	features?: {
		canUseAllScenes?: boolean; // 是否允许使用全部场景
		canExportPDF?: boolean; // 是否允许导出 PDF
		canUseCloudSync?: boolean; // 是否允许云同步
		showAds?: boolean; // 免费版是否显示广告
		reminderInterval?: number; // 提示或广告弹窗间隔（单位：秒）
		featureFlags?: Record<string, boolean>; // 功能开关，可灵活扩展
	};

	// --------------------------
	// 用户应用状态与设置
	// --------------------------
	state?: StateInterface; // 当前用户的应用状态
	settings?: SettingInterface; // 用户偏好设置

	// --------------------------
	// 数据库版本
	// --------------------------
	dbVersion?: DBVersionInterface; // 用户数据库版本信息
}

// ---------- 工作空间/项目 ----------
/**
 * 存储工作空间的元信息
 */
export interface ProjectInterface {
	id: string; // 项目唯一标识，使用 UUID
	title: string; // 工作空间名称
	author: string; // 作者名称
	description: string; // 项目描述
	publisher: string; // 出版方信息
	language: string; // 项目语言
	lastOpen: string; // 最近一次打开时间
	createDate: string; // 创建时间
	members?: string[]; // 多用户/团队模式，可选，存储用户ID
	owner?: string; // 项目拥有者ID，可选
}

// ---------- 绘图 ----------
/**
 * 存储项目级别的绘图数据
 */
export interface DrawingInterface {
	id: string; // 绘图唯一标识，使用 UUID
	project: string; // 所属项目 ID
	name: string; // 绘图名称
	content: string; // Excalidraw 数据，JSON 字符串格式
	width: number; // 绘图宽度
	height: number; // 绘图高度
	createDate: string; // 创建时间
	updatedAt: string; // 最近更新时间
}

// ---------- 附件 ----------
/**
 * 存储项目相关的附件信息
 */
export interface AttachmentInterface {
	id: string; // 附件唯一标识，使用 UUID
	project?: string; // 所属项目 ID，可选
	type: "image" | "audio" | "file"; // 附件类型
	fileName: string; // 文件名
	filePath: string; // 文件路径
	uploadedAt: string; // 上传时间
	size?: number; // 文件大小，可选
	mimeType?: string; // 文件类型，可选
}

// ---------- 节点类型 ----------
/**
 * 节点类型定义，用于文件树结构
 * - folder: 文件夹，可包含子节点
 * - file: 文本文件，使用 Lexical 编辑器
 * - canvas: 画布文件，使用 Excalidraw
 * - diary: 日记文件
 */
export type NodeType = "folder" | "file" | "canvas" | "diary";

// ---------- 节点 ----------
/**
 * 统一的节点接口，用于构建无限层级的文件树结构
 */
export interface NodeInterface {
	id: string; // 节点唯一标识，使用 UUID
	workspace: string; // 所属工作空间 ID（即 Project ID）
	parent: string | null; // 父节点 ID，null 表示根节点
	type: NodeType; // 节点类型
	title: string; // 节点标题
	order: number; // 同级排序顺序
	content?: string; // 文件内容（Lexical JSON 或 Excalidraw JSON）
	collapsed?: boolean; // 文件夹是否折叠
	createDate: string; // 创建时间 ISO 格式
	lastEdit: string; // 最后编辑时间 ISO 格式
}
