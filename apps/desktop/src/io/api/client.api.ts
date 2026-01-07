/**
 * 统一 API 客户端
 *
 * 高阶函数模式：一次环境判断，返回统一接口
 * 遵循函数式水流哲学，所有操作返回 TaskEither
 *
 * ## 架构
 *
 * ```
 * 前端调用 → api.getWorkspaces()
 *              │
 *              ├─ Tauri 环境 → invoke("get_workspaces")
 *              │
 *              └─ Web 环境 → fetch("/api/workspaces")
 * ```
 */

import { invoke } from "@tauri-apps/api/core";
import * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/types/error";
import { dbError } from "@/types/error";
import logger from "@/log";
import type {
	AttachmentResponse,
	AttachmentType,
	BackupInfo,
	ClearDataResult,
	ContentResponse,
	CreateAttachmentRequest,
	CreateNodeRequest,
	CreateTagRequest,
	CreateUserRequest,
	CreateWorkspaceRequest,
	MoveNodeRequest,
	NodeResponse,
	SaveContentRequest,
	TagGraphData,
	TagResponse,
	UpdateAttachmentRequest,
	UpdateNodeRequest,
	UpdateTagRequest,
	UpdateUserRequest,
	UpdateWorkspaceRequest,
	UserResponse,
	WorkspaceResponse,
} from "@/types/rust-api";

// ============================================
// 环境检测（只执行一次）
// ============================================

/** 检测是否在 Tauri 环境中运行 */
const isTauri =
	typeof window !== "undefined" &&
	"__TAURI__" in window &&
	window.__TAURI__ !== undefined;

/** API 基础 URL（Web 环境使用） */
const getApiBaseUrl = (): string =>
	import.meta.env.VITE_API_URL || "http://localhost:3030";

// ============================================
// 底层调用函数
// ============================================

/**
 * Tauri invoke 封装为 TaskEither
 */
const invokeTE = <T>(
	cmd: string,
	args?: Record<string, unknown>,
): TE.TaskEither<AppError, T> =>
	TE.tryCatch(
		async () => {
			logger.info(`[API:Tauri] ${cmd}`, args);
			const result = await invoke<T>(cmd, args);
			logger.info(`[API:Tauri] ${cmd} 成功`);
			return result;
		},
		(error) => {
			logger.error(`[API:Tauri] ${cmd} 失败`, error);
			return dbError(`${cmd} 失败: ${error}`);
		},
	);

/**
 * HTTP fetch 封装为 TaskEither
 */
const fetchTE = <T>(
	endpoint: string,
	options: RequestInit = {},
): TE.TaskEither<AppError, T> =>
	TE.tryCatch(
		async () => {
			const url = `${getApiBaseUrl()}${endpoint}`;
			const method = options.method || "GET";

			logger.info(`[API:HTTP] ${method} ${endpoint}`);

			const response = await fetch(url, {
				...options,
				headers: {
					"Content-Type": "application/json",
					...options.headers,
				},
			});

			if (!response.ok) {
				const errorBody = await response.text();
				throw new Error(`HTTP ${response.status}: ${errorBody}`);
			}

			const result = await response.json();
			logger.info(`[API:HTTP] ${method} ${endpoint} 成功`);
			return result as T;
		},
		(error) => {
			logger.error(`[API:HTTP] ${endpoint} 失败`, error);
			return dbError(`${endpoint} 失败: ${error}`);
		},
	);

// ============================================
// API 接口定义
// ============================================

/** 统一 API 客户端接口 */
export interface ApiClient {
	// Workspace API
	getWorkspaces: () => TE.TaskEither<AppError, WorkspaceResponse[]>;
	getWorkspace: (
		id: string,
	) => TE.TaskEither<AppError, WorkspaceResponse | null>;
	createWorkspace: (
		request: CreateWorkspaceRequest,
	) => TE.TaskEither<AppError, WorkspaceResponse>;
	updateWorkspace: (
		id: string,
		request: UpdateWorkspaceRequest,
	) => TE.TaskEither<AppError, WorkspaceResponse>;
	deleteWorkspace: (id: string) => TE.TaskEither<AppError, void>;

	// Node API
	getNodesByWorkspace: (
		workspaceId: string,
	) => TE.TaskEither<AppError, NodeResponse[]>;
	getNode: (id: string) => TE.TaskEither<AppError, NodeResponse | null>;
	getChildNodes: (parentId: string) => TE.TaskEither<AppError, NodeResponse[]>;
	getRootNodes: (
		workspaceId: string,
	) => TE.TaskEither<AppError, NodeResponse[]>;
	getNodesByParent: (
		workspaceId: string,
		parentId: string | null,
	) => TE.TaskEither<AppError, NodeResponse[]>;
	getNodesByType: (
		workspaceId: string,
		nodeType: string,
	) => TE.TaskEither<AppError, NodeResponse[]>;
	getDescendants: (nodeId: string) => TE.TaskEither<AppError, NodeResponse[]>;
	getNextSortOrder: (
		workspaceId: string,
		parentId: string | null,
	) => TE.TaskEither<AppError, number>;
	createNode: (
		request: CreateNodeRequest,
	) => TE.TaskEither<AppError, NodeResponse>;
	updateNode: (
		id: string,
		request: UpdateNodeRequest,
	) => TE.TaskEither<AppError, NodeResponse>;
	moveNode: (
		id: string,
		request: MoveNodeRequest,
	) => TE.TaskEither<AppError, NodeResponse>;
	deleteNode: (id: string) => TE.TaskEither<AppError, void>;
	duplicateNode: (
		id: string,
		newTitle?: string,
	) => TE.TaskEither<AppError, NodeResponse>;
	reorderNodes: (nodeIds: string[]) => TE.TaskEither<AppError, void>;
	deleteNodesBatch: (nodeIds: string[]) => TE.TaskEither<AppError, void>;

	// Content API
	getContent: (
		nodeId: string,
	) => TE.TaskEither<AppError, ContentResponse | null>;
	saveContent: (
		request: SaveContentRequest,
	) => TE.TaskEither<AppError, ContentResponse>;
	getContentVersion: (nodeId: string) => TE.TaskEither<AppError, number | null>;

	// Backup API
	createBackup: () => TE.TaskEither<AppError, BackupInfo>;
	restoreBackup: (backupPath: string) => TE.TaskEither<AppError, void>;
	listBackups: () => TE.TaskEither<AppError, BackupInfo[]>;
	deleteBackup: (backupPath: string) => TE.TaskEither<AppError, void>;
	cleanupOldBackups: (keepCount: number) => TE.TaskEither<AppError, number>;

	// Clear Data API
	clearSqliteData: () => TE.TaskEither<AppError, ClearDataResult>;
	clearSqliteDataKeepUsers: () => TE.TaskEither<AppError, ClearDataResult>;

	// User API
	getUsers: () => TE.TaskEither<AppError, UserResponse[]>;
	getUser: (id: string) => TE.TaskEither<AppError, UserResponse | null>;
	getUserByUsername: (
		username: string,
	) => TE.TaskEither<AppError, UserResponse | null>;
	getUserByEmail: (
		email: string,
	) => TE.TaskEither<AppError, UserResponse | null>;
	getCurrentUser: () => TE.TaskEither<AppError, UserResponse | null>;
	createUser: (
		request: CreateUserRequest,
	) => TE.TaskEither<AppError, UserResponse>;
	updateUser: (
		id: string,
		request: UpdateUserRequest,
	) => TE.TaskEither<AppError, UserResponse>;
	updateUserLastLogin: (id: string) => TE.TaskEither<AppError, UserResponse>;
	deleteUser: (id: string) => TE.TaskEither<AppError, void>;

	// Attachment API
	getAttachments: () => TE.TaskEither<AppError, AttachmentResponse[]>;
	getAttachmentsByProject: (
		projectId: string,
	) => TE.TaskEither<AppError, AttachmentResponse[]>;
	getAttachment: (
		id: string,
	) => TE.TaskEither<AppError, AttachmentResponse | null>;
	getAttachmentsByType: (
		projectId: string,
		attachmentType: AttachmentType,
	) => TE.TaskEither<AppError, AttachmentResponse[]>;
	getImagesByProject: (
		projectId: string,
	) => TE.TaskEither<AppError, AttachmentResponse[]>;
	getAudioFilesByProject: (
		projectId: string,
	) => TE.TaskEither<AppError, AttachmentResponse[]>;
	getAttachmentByPath: (
		filePath: string,
	) => TE.TaskEither<AppError, AttachmentResponse | null>;
	createAttachment: (
		request: CreateAttachmentRequest,
	) => TE.TaskEither<AppError, AttachmentResponse>;
	updateAttachment: (
		id: string,
		request: UpdateAttachmentRequest,
	) => TE.TaskEither<AppError, AttachmentResponse>;
	deleteAttachment: (id: string) => TE.TaskEither<AppError, void>;
	deleteAttachmentsByProject: (
		projectId: string,
	) => TE.TaskEither<AppError, number>;

	// Tag API
	getTagsByWorkspace: (
		workspaceId: string,
	) => TE.TaskEither<AppError, TagResponse[]>;
	getTag: (id: string) => TE.TaskEither<AppError, TagResponse | null>;
	getTagByName: (
		workspaceId: string,
		name: string,
	) => TE.TaskEither<AppError, TagResponse | null>;
	getTopTags: (
		workspaceId: string,
		limit: number,
	) => TE.TaskEither<AppError, TagResponse[]>;
	searchTags: (
		workspaceId: string,
		query: string,
	) => TE.TaskEither<AppError, TagResponse[]>;
	getNodesByTag: (
		workspaceId: string,
		tagName: string,
	) => TE.TaskEither<AppError, string[]>;
	getTagGraphData: (
		workspaceId: string,
	) => TE.TaskEither<AppError, TagGraphData>;
	createTag: (
		request: CreateTagRequest,
	) => TE.TaskEither<AppError, TagResponse>;
	updateTag: (
		id: string,
		request: UpdateTagRequest,
	) => TE.TaskEither<AppError, TagResponse>;
	getOrCreateTag: (
		workspaceId: string,
		name: string,
	) => TE.TaskEither<AppError, TagResponse>;
	incrementTagCount: (id: string) => TE.TaskEither<AppError, TagResponse>;
	decrementTagCount: (id: string) => TE.TaskEither<AppError, TagResponse>;
	deleteTag: (id: string) => TE.TaskEither<AppError, void>;
	deleteTagsByWorkspace: (
		workspaceId: string,
	) => TE.TaskEither<AppError, number>;
	syncTagCache: (workspaceId: string) => TE.TaskEither<AppError, void>;
	rebuildTagCache: (workspaceId: string) => TE.TaskEither<AppError, void>;
	recalculateTagCounts: (workspaceId: string) => TE.TaskEither<AppError, void>;
}

// ============================================
// 创建 API 客户端（高阶函数）
// ============================================

/**
 * 创建统一 API 客户端
 *
 * 高阶函数：根据环境返回对应的 API 实现
 * 调用方无需关心底层是 invoke 还是 fetch
 */
export const createApiClient = (): ApiClient => {
	logger.info(`[API] 初始化客户端，环境: ${isTauri ? "Tauri" : "Web"}`);

	return {
		// ============================================
		// Workspace API
		// ============================================
		getWorkspaces: () =>
			isTauri ? invokeTE("get_workspaces") : fetchTE("/api/workspaces"),

		getWorkspace: (id: string) =>
			isTauri
				? invokeTE("get_workspace", { id })
				: fetchTE(`/api/workspaces/${id}`),

		createWorkspace: (request: CreateWorkspaceRequest) =>
			isTauri
				? invokeTE("create_workspace", { request })
				: fetchTE("/api/workspaces", {
						method: "POST",
						body: JSON.stringify(request),
					}),

		updateWorkspace: (id: string, request: UpdateWorkspaceRequest) =>
			isTauri
				? invokeTE("update_workspace", { id, request })
				: fetchTE(`/api/workspaces/${id}`, {
						method: "PUT",
						body: JSON.stringify(request),
					}),

		deleteWorkspace: (id: string) =>
			isTauri
				? invokeTE("delete_workspace", { id })
				: fetchTE(`/api/workspaces/${id}`, { method: "DELETE" }),

		// ============================================
		// Node API
		// ============================================
		getNodesByWorkspace: (workspaceId: string) =>
			isTauri
				? invokeTE("get_nodes_by_workspace", { workspaceId })
				: fetchTE(`/api/workspaces/${workspaceId}/nodes`),

		getNode: (id: string) =>
			isTauri ? invokeTE("get_node", { id }) : fetchTE(`/api/nodes/${id}`),

		getChildNodes: (parentId: string) =>
			isTauri
				? invokeTE("get_child_nodes", { parentId })
				: fetchTE(`/api/nodes/${parentId}/children`),

		getRootNodes: (workspaceId: string) =>
			isTauri
				? invokeTE("get_root_nodes", { workspaceId })
				: fetchTE(`/api/workspaces/${workspaceId}/nodes/root`),

		getNodesByParent: (workspaceId: string, parentId: string | null) =>
			isTauri
				? invokeTE("get_nodes_by_parent", { workspaceId, parentId })
				: fetchTE(
						`/api/workspaces/${workspaceId}/nodes?parentId=${parentId ?? "null"}`,
					),

		getNodesByType: (workspaceId: string, nodeType: string) =>
			isTauri
				? invokeTE("get_nodes_by_type", { workspaceId, nodeType })
				: fetchTE(`/api/workspaces/${workspaceId}/nodes?type=${nodeType}`),

		getDescendants: (nodeId: string) =>
			isTauri
				? invokeTE("get_descendants", { nodeId })
				: fetchTE(`/api/nodes/${nodeId}/descendants`),

		getNextSortOrder: (workspaceId: string, parentId: string | null) =>
			isTauri
				? invokeTE("get_next_sort_order", { workspaceId, parentId })
				: fetchTE(
						`/api/workspaces/${workspaceId}/nodes/next-sort-order?parentId=${parentId ?? "null"}`,
					),

		createNode: (request: CreateNodeRequest) =>
			isTauri
				? invokeTE("create_node", { request })
				: fetchTE("/api/nodes", {
						method: "POST",
						body: JSON.stringify(request),
					}),

		updateNode: (id: string, request: UpdateNodeRequest) =>
			isTauri
				? invokeTE("update_node", { id, request })
				: fetchTE(`/api/nodes/${id}`, {
						method: "PUT",
						body: JSON.stringify(request),
					}),

		moveNode: (id: string, request: MoveNodeRequest) =>
			isTauri
				? invokeTE("move_node", { id, request })
				: fetchTE(`/api/nodes/${id}/move`, {
						method: "PUT",
						body: JSON.stringify(request),
					}),

		deleteNode: (id: string) =>
			isTauri
				? invokeTE("delete_node", { id })
				: fetchTE(`/api/nodes/${id}`, { method: "DELETE" }),

		duplicateNode: (id: string, newTitle?: string) =>
			isTauri
				? invokeTE("duplicate_node", { id, newTitle })
				: fetchTE(`/api/nodes/${id}/duplicate`, {
						method: "POST",
						body: JSON.stringify({ newTitle }),
					}),

		reorderNodes: (nodeIds: string[]) =>
			isTauri
				? invokeTE("reorder_nodes", { nodeIds })
				: fetchTE("/api/nodes/reorder", {
						method: "PUT",
						body: JSON.stringify({ nodeIds }),
					}),

		deleteNodesBatch: (nodeIds: string[]) =>
			isTauri
				? invokeTE("delete_nodes_batch", { nodeIds })
				: fetchTE("/api/nodes/batch", {
						method: "DELETE",
						body: JSON.stringify({ nodeIds }),
					}),

		// ============================================
		// Content API
		// ============================================
		getContent: (nodeId: string) =>
			isTauri
				? invokeTE("get_content", { nodeId })
				: fetchTE(`/api/nodes/${nodeId}/content`),

		saveContent: (request: SaveContentRequest) =>
			isTauri
				? invokeTE("save_content", { request })
				: fetchTE("/api/contents", {
						method: "POST",
						body: JSON.stringify(request),
					}),

		getContentVersion: (nodeId: string) =>
			isTauri
				? invokeTE("get_content_version", { nodeId })
				: fetchTE(`/api/nodes/${nodeId}/content/version`),

		// ============================================
		// Backup API
		// ============================================
		createBackup: () =>
			isTauri
				? invokeTE("create_backup")
				: fetchTE("/api/backups", { method: "POST" }),

		restoreBackup: (backupPath: string) =>
			isTauri
				? invokeTE("restore_backup", { backupPath })
				: fetchTE("/api/backups/restore", {
						method: "POST",
						body: JSON.stringify({ backupPath }),
					}),

		listBackups: () =>
			isTauri ? invokeTE("list_backups") : fetchTE("/api/backups"),

		deleteBackup: (backupPath: string) =>
			isTauri
				? invokeTE("delete_backup", { backupPath })
				: fetchTE(`/api/backups/${encodeURIComponent(backupPath)}`, {
						method: "DELETE",
					}),

		cleanupOldBackups: (keepCount: number) =>
			isTauri
				? invokeTE("cleanup_old_backups", { keepCount })
				: fetchTE("/api/backups/cleanup", {
						method: "POST",
						body: JSON.stringify({ keepCount }),
					}),

		// ============================================
		// Clear Data API
		// ============================================
		clearSqliteData: () =>
			isTauri
				? invokeTE("clear_sqlite_data")
				: fetchTE("/api/data/clear", { method: "DELETE" }),

		clearSqliteDataKeepUsers: () =>
			isTauri
				? invokeTE("clear_sqlite_data_keep_users")
				: fetchTE("/api/data/clear?keepUsers=true", { method: "DELETE" }),

		// ============================================
		// User API
		// ============================================
		getUsers: () => (isTauri ? invokeTE("get_users") : fetchTE("/api/users")),

		getUser: (id: string) =>
			isTauri ? invokeTE("get_user", { id }) : fetchTE(`/api/users/${id}`),

		getUserByUsername: (username: string) =>
			isTauri
				? invokeTE("get_user_by_username", { username })
				: fetchTE(`/api/users/by-username/${encodeURIComponent(username)}`),

		getUserByEmail: (email: string) =>
			isTauri
				? invokeTE("get_user_by_email", { email })
				: fetchTE(`/api/users/by-email/${encodeURIComponent(email)}`),

		getCurrentUser: () =>
			isTauri ? invokeTE("get_current_user") : fetchTE("/api/users/current"),

		createUser: (request: CreateUserRequest) =>
			isTauri
				? invokeTE("create_user", { request })
				: fetchTE("/api/users", {
						method: "POST",
						body: JSON.stringify(request),
					}),

		updateUser: (id: string, request: UpdateUserRequest) =>
			isTauri
				? invokeTE("update_user", { id, request })
				: fetchTE(`/api/users/${id}`, {
						method: "PUT",
						body: JSON.stringify(request),
					}),

		updateUserLastLogin: (id: string) =>
			isTauri
				? invokeTE("update_user_last_login", { id })
				: fetchTE(`/api/users/${id}/last-login`, { method: "PUT" }),

		deleteUser: (id: string) =>
			isTauri
				? invokeTE("delete_user", { id })
				: fetchTE(`/api/users/${id}`, { method: "DELETE" }),

		// ============================================
		// Attachment API
		// ============================================
		getAttachments: () =>
			isTauri ? invokeTE("get_attachments") : fetchTE("/api/attachments"),

		getAttachmentsByProject: (projectId: string) =>
			isTauri
				? invokeTE("get_attachments_by_project", { projectId })
				: fetchTE(`/api/projects/${projectId}/attachments`),

		getAttachment: (id: string) =>
			isTauri
				? invokeTE("get_attachment", { id })
				: fetchTE(`/api/attachments/${id}`),

		getAttachmentsByType: (
			projectId: string,
			attachmentType: AttachmentType,
		) =>
			isTauri
				? invokeTE("get_attachments_by_type", { projectId, attachmentType })
				: fetchTE(
						`/api/projects/${projectId}/attachments?type=${attachmentType}`,
					),

		getImagesByProject: (projectId: string) =>
			isTauri
				? invokeTE("get_images_by_project", { projectId })
				: fetchTE(`/api/projects/${projectId}/attachments?type=image`),

		getAudioFilesByProject: (projectId: string) =>
			isTauri
				? invokeTE("get_audio_files_by_project", { projectId })
				: fetchTE(`/api/projects/${projectId}/attachments?type=audio`),

		getAttachmentByPath: (filePath: string) =>
			isTauri
				? invokeTE("get_attachment_by_path", { filePath })
				: fetchTE(`/api/attachments/by-path/${encodeURIComponent(filePath)}`),

		createAttachment: (request: CreateAttachmentRequest) =>
			isTauri
				? invokeTE("create_attachment", { request })
				: fetchTE("/api/attachments", {
						method: "POST",
						body: JSON.stringify(request),
					}),

		updateAttachment: (id: string, request: UpdateAttachmentRequest) =>
			isTauri
				? invokeTE("update_attachment", { id, request })
				: fetchTE(`/api/attachments/${id}`, {
						method: "PUT",
						body: JSON.stringify(request),
					}),

		deleteAttachment: (id: string) =>
			isTauri
				? invokeTE("delete_attachment", { id })
				: fetchTE(`/api/attachments/${id}`, { method: "DELETE" }),

		deleteAttachmentsByProject: (projectId: string) =>
			isTauri
				? invokeTE("delete_attachments_by_project", { projectId })
				: fetchTE(`/api/projects/${projectId}/attachments`, {
						method: "DELETE",
					}),

		// ============================================
		// Tag API
		// ============================================
		getTagsByWorkspace: (workspaceId: string) =>
			isTauri
				? invokeTE("get_tags_by_workspace", { workspaceId })
				: fetchTE(`/api/workspaces/${workspaceId}/tags`),

		getTag: (id: string) =>
			isTauri
				? invokeTE("get_tag", { id })
				: fetchTE(`/api/tags/${encodeURIComponent(id)}`),

		getTagByName: (workspaceId: string, name: string) =>
			isTauri
				? invokeTE("get_tag_by_name", { workspaceId, name })
				: fetchTE(
						`/api/workspaces/${workspaceId}/tags/by-name/${encodeURIComponent(name)}`,
					),

		getTopTags: (workspaceId: string, limit: number) =>
			isTauri
				? invokeTE("get_top_tags", { workspaceId, limit })
				: fetchTE(`/api/workspaces/${workspaceId}/tags/top?limit=${limit}`),

		searchTags: (workspaceId: string, query: string) =>
			isTauri
				? invokeTE("search_tags", { workspaceId, query })
				: fetchTE(
						`/api/workspaces/${workspaceId}/tags/search?q=${encodeURIComponent(query)}`,
					),

		getNodesByTag: (workspaceId: string, tagName: string) =>
			isTauri
				? invokeTE("get_nodes_by_tag", { workspaceId, tagName })
				: fetchTE(
						`/api/workspaces/${workspaceId}/tags/${encodeURIComponent(tagName)}/nodes`,
					),

		getTagGraphData: (workspaceId: string) =>
			isTauri
				? invokeTE("get_tag_graph_data", { workspaceId })
				: fetchTE(`/api/workspaces/${workspaceId}/tags/graph`),

		createTag: (request: CreateTagRequest) =>
			isTauri
				? invokeTE("create_tag", { request })
				: fetchTE("/api/tags", {
						method: "POST",
						body: JSON.stringify(request),
					}),

		updateTag: (id: string, request: UpdateTagRequest) =>
			isTauri
				? invokeTE("update_tag", { id, request })
				: fetchTE(`/api/tags/${encodeURIComponent(id)}`, {
						method: "PUT",
						body: JSON.stringify(request),
					}),

		getOrCreateTag: (workspaceId: string, name: string) =>
			isTauri
				? invokeTE("get_or_create_tag", { workspaceId, name })
				: fetchTE(`/api/workspaces/${workspaceId}/tags/get-or-create`, {
						method: "POST",
						body: JSON.stringify({ name }),
					}),

		incrementTagCount: (id: string) =>
			isTauri
				? invokeTE("increment_tag_count", { id })
				: fetchTE(`/api/tags/${encodeURIComponent(id)}/increment`, {
						method: "POST",
					}),

		decrementTagCount: (id: string) =>
			isTauri
				? invokeTE("decrement_tag_count", { id })
				: fetchTE(`/api/tags/${encodeURIComponent(id)}/decrement`, {
						method: "POST",
					}),

		deleteTag: (id: string) =>
			isTauri
				? invokeTE("delete_tag", { id })
				: fetchTE(`/api/tags/${encodeURIComponent(id)}`, { method: "DELETE" }),

		deleteTagsByWorkspace: (workspaceId: string) =>
			isTauri
				? invokeTE("delete_tags_by_workspace", { workspaceId })
				: fetchTE(`/api/workspaces/${workspaceId}/tags`, { method: "DELETE" }),

		syncTagCache: (workspaceId: string) =>
			isTauri
				? invokeTE("sync_tag_cache", { workspaceId })
				: fetchTE(`/api/workspaces/${workspaceId}/tags/sync`, {
						method: "POST",
					}),

		rebuildTagCache: (workspaceId: string) =>
			isTauri
				? invokeTE("rebuild_tag_cache", { workspaceId })
				: fetchTE(`/api/workspaces/${workspaceId}/tags/rebuild`, {
						method: "POST",
					}),

		recalculateTagCounts: (workspaceId: string) =>
			isTauri
				? invokeTE("recalculate_tag_counts", { workspaceId })
				: fetchTE(`/api/workspaces/${workspaceId}/tags/recalculate`, {
						method: "POST",
					}),
	};
};

// ============================================
// 导出单例客户端
// ============================================

/** 全局 API 客户端实例 */
export const api = createApiClient();

// ============================================
// 兼容性导出（与 rust-api.fn.ts 保持一致）
// ============================================

// 注意：这些导出已移动到各自的专用 API 文件中
// - workspace.api.ts
// - node.api.ts
// - content.api.ts
// - backup.api.ts
// - clear-data.api.ts
// - user.api.ts
// - tag.api.ts
// - attachment.api.ts
// 
// 请从 @/io/api 导入，它会自动从正确的文件导入

// ============================================
// Promise 版本（兼容性）
// ============================================

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

/** 将 TaskEither 转换为 Promise */
const toPromise = <T>(te: TE.TaskEither<AppError, T>): Promise<T> =>
	te().then((either) =>
		pipe(
			either,
			E.fold(
				(error) => Promise.reject(error),
				(value) => Promise.resolve(value),
			),
		),
	);

// Workspace API (Promise 版本)
export const getWorkspacesAsync = (): Promise<WorkspaceResponse[]> =>
	toPromise(api.getWorkspaces());

// Node API (Promise 版本)
export const getNodesByWorkspaceAsync = (
	workspaceId: string,
): Promise<NodeResponse[]> => toPromise(api.getNodesByWorkspace(workspaceId));

export const createNodeAsync = (
	request: CreateNodeRequest,
): Promise<NodeResponse> => toPromise(api.createNode(request));

export const getRootNodesAsync = (
	workspaceId: string,
): Promise<NodeResponse[]> => toPromise(api.getRootNodes(workspaceId));

export const getNodesByParentAsync = (
	workspaceId: string,
	parentId: string | null,
): Promise<NodeResponse[]> =>
	toPromise(api.getNodesByParent(workspaceId, parentId));

export const getNodesByTypeAsync = (
	workspaceId: string,
	nodeType: string,
): Promise<NodeResponse[]> =>
	toPromise(api.getNodesByType(workspaceId, nodeType));

export const getDescendantsAsync = (nodeId: string): Promise<NodeResponse[]> =>
	toPromise(api.getDescendants(nodeId));

export const getNextSortOrderAsync = (
	workspaceId: string,
	parentId: string | null,
): Promise<number> => toPromise(api.getNextSortOrder(workspaceId, parentId));

export const reorderNodesAsync = (nodeIds: string[]): Promise<void> =>
	toPromise(api.reorderNodes(nodeIds));

export const deleteNodesBatchAsync = (nodeIds: string[]): Promise<void> =>
	toPromise(api.deleteNodesBatch(nodeIds));

// Content API (Promise 版本)
export const saveContentAsync = (
	request: SaveContentRequest,
): Promise<ContentResponse> => toPromise(api.saveContent(request));

export const getContentAsync = (
	nodeId: string,
): Promise<ContentResponse | null> => toPromise(api.getContent(nodeId));
