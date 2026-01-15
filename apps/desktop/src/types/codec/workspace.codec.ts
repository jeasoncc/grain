/**
 * Workspace Codec - 工作区类型转换
 *
 * 负责 Rust 后端类型 (WorkspaceResponse) 与前端类型 (WorkspaceInterface) 之间的转换。
 * 这是类型边界层，确保前后端类型解耦。
 *
 * 注意：前端和后端现在使用相同的字段名（title），无需转换。
 */

import type {
	CreateWorkspaceRequest,
	UpdateWorkspaceRequest,
	WorkspaceResponse,
} from "@/types/rust-api"
import type {
	WorkspaceCreateInput,
	WorkspaceInterface,
	WorkspaceUpdateInput,
} from "@/types/workspace"

// ============================================
// 解码：Rust 类型 → 前端类型
// ============================================

/**
 * 解码单个工作区：WorkspaceResponse → WorkspaceInterface
 *
 * 将 Rust 后端返回的工作区数据转换为前端使用的接口类型
 */
export const decodeWorkspace = (response: WorkspaceResponse): WorkspaceInterface => ({
	author: response.author,
	createDate: new Date(response.createdAt).toISOString(),
	description: response.description,
	id: response.id,
	language: response.language,
	lastOpen: new Date(response.lastOpen).toISOString(),
	members: response.members,
	owner: response.owner,
	publisher: response.publisher,
	title: response.title,
})

/**
 * 批量解码工作区：WorkspaceResponse[] → WorkspaceInterface[]
 */
export const decodeWorkspaces = (
	responses: readonly WorkspaceResponse[],
): readonly WorkspaceInterface[] => responses.map(decodeWorkspace)

// ============================================
// 编码：前端类型 → Rust 请求类型
// ============================================

/**
 * 编码创建工作区请求：WorkspaceCreateInput → CreateWorkspaceRequest
 *
 * 前端和后端使用相同的字段名，直接传递
 */
export const encodeCreateWorkspace = (input: WorkspaceCreateInput): CreateWorkspaceRequest => ({
	author: input.author,
	description: input.description,
	language: input.language,
	members: input.members,
	owner: input.owner,
	publisher: input.publisher,
	title: input.title,
})

/**
 * 编码更新工作区请求：WorkspaceUpdateInput → UpdateWorkspaceRequest
 */
export const encodeUpdateWorkspace = (input: WorkspaceUpdateInput): UpdateWorkspaceRequest => ({
	author: input.author,
	description: input.description,
	language: input.language,
	lastOpen: input.lastOpen ? new Date(input.lastOpen).getTime() : undefined,
	members: input.members,
	owner: input.owner,
	publisher: input.publisher,
	title: input.title,
})

/**
 * 从 WorkspaceInterface 编码创建请求
 */
export const encodeWorkspaceToCreateRequest = (
	workspace: Partial<WorkspaceInterface>,
): CreateWorkspaceRequest => ({
	author: workspace.author,
	description: workspace.description,
	language: workspace.language,
	members: workspace.members,
	owner: workspace.owner,
	publisher: workspace.publisher,
	title: workspace.title!,
})

/**
 * 从 WorkspaceInterface 编码更新请求
 */
export const encodeWorkspaceToUpdateRequest = (
	workspace: Partial<WorkspaceInterface>,
): UpdateWorkspaceRequest => ({
	author: workspace.author,
	description: workspace.description,
	language: workspace.language,
	lastOpen: workspace.lastOpen ? new Date(workspace.lastOpen).getTime() : undefined,
	members: workspace.members,
	owner: workspace.owner,
	publisher: workspace.publisher,
	title: workspace.title,
})
