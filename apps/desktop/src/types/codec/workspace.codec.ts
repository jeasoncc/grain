/**
 * Workspace Codec - 工作区类型转换
 *
 * 负责 Rust 后端类型 (WorkspaceResponse) 与前端类型 (WorkspaceInterface) 之间的转换。
 * 这是类型边界层，确保前后端类型解耦。
 */

import type {
	CreateWorkspaceRequest,
	UpdateWorkspaceRequest,
	WorkspaceResponse,
} from "@/types/rust-api";
import type {
	WorkspaceCreateInput,
	WorkspaceInterface,
	WorkspaceUpdateInput,
} from "@/types/workspace";

// ============================================
// 解码：Rust 类型 → 前端类型
// ============================================

/**
 * 解码单个工作区：WorkspaceResponse → WorkspaceInterface
 *
 * 将 Rust 后端返回的工作区数据转换为前端使用的接口类型
 * 注意：后端只存储 name 和 description，其他字段使用默认值
 */
export const decodeWorkspace = (
	response: WorkspaceResponse,
): WorkspaceInterface => ({
	id: response.id,
	title: response.name,
	description: response.description ?? "",
	author: "",
	publisher: "",
	language: "zh",
	lastOpen: new Date(response.updatedAt).toISOString(),
	createDate: new Date(response.createdAt).toISOString(),
});

/**
 * 批量解码工作区：WorkspaceResponse[] → WorkspaceInterface[]
 */
export const decodeWorkspaces = (
	responses: WorkspaceResponse[],
): WorkspaceInterface[] => responses.map(decodeWorkspace);

// ============================================
// 编码：前端类型 → Rust 请求类型
// ============================================

/**
 * 编码创建工作区请求：WorkspaceCreateInput → CreateWorkspaceRequest
 */
export const encodeCreateWorkspace = (
	input: WorkspaceCreateInput,
): CreateWorkspaceRequest => ({
	name: input.title,
	description: input.description,
});

/**
 * 编码更新工作区请求：WorkspaceUpdateInput → UpdateWorkspaceRequest
 */
export const encodeUpdateWorkspace = (
	input: WorkspaceUpdateInput,
): UpdateWorkspaceRequest => ({
	name: input.title,
	description: input.description,
});

/**
 * 从 WorkspaceInterface 编码创建请求
 */
export const encodeWorkspaceToCreateRequest = (
	workspace: Partial<WorkspaceInterface>,
): CreateWorkspaceRequest => ({
	name: workspace.title!,
	description: workspace.description,
});

/**
 * 从 WorkspaceInterface 编码更新请求
 */
export const encodeWorkspaceToUpdateRequest = (
	workspace: Partial<WorkspaceInterface>,
): UpdateWorkspaceRequest => ({
	name: workspace.title,
	description: workspace.description,
});
