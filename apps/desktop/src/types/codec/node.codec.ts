/**
 * Node Codec - 节点类型转换
 *
 * 负责 Rust 后端类型 (NodeResponse) 与前端类型 (NodeInterface) 之间的转换。
 * 这是类型边界层，确保前后端类型解耦。
 */

import dayjs from "dayjs"

import type { NodeCreateInput, NodeInterface, NodeUpdateInput } from "@/types/node"
import type { CreateNodeRequest, NodeResponse, UpdateNodeRequest } from "@/types/rust-api"

// ============================================
// 解码：Rust 类型 → 前端类型
// ============================================

/**
 * 解码单个节点：NodeResponse → NodeInterface
 *
 * 将 Rust 后端返回的节点数据转换为前端使用的接口类型
 */
export const decodeNode = (response: NodeResponse): NodeInterface => ({
	collapsed: response.isCollapsed,
	createDate: dayjs(response.createdAt).toISOString(),
	id: response.id,
	lastEdit: dayjs(response.updatedAt).toISOString(),
	order: response.sortOrder,
	parent: response.parentId,
	tags: response.tags ?? undefined,
	title: response.title,
	type: response.nodeType,
	workspace: response.workspaceId,
})

/**
 * 批量解码节点：NodeResponse[] → NodeInterface[]
 */
export const decodeNodes = (responses: readonly NodeResponse[]): readonly NodeInterface[] =>
	responses.map(decodeNode)

// ============================================
// 编码：前端类型 → Rust 请求类型
// ============================================

/**
 * 编码创建节点请求：NodeCreateInput → CreateNodeRequest
 */
export const encodeCreateNode = (
	input: NodeCreateInput,
	initialContent?: string,
	tags?: readonly string[],
): CreateNodeRequest => ({
	initialContent,
	nodeType: input.type ?? "file",
	parentId: input.parent ?? null,
	tags,
	title: input.title,
	workspaceId: input.workspace,
})

/**
 * 编码更新节点请求：NodeUpdateInput → UpdateNodeRequest
 */
export const encodeUpdateNode = (input: NodeUpdateInput): UpdateNodeRequest => ({
	isCollapsed: input.collapsed,
	sortOrder: input.order,
	tags: input.tags,
	title: input.title,
})

/**
 * 从 NodeInterface 编码创建请求
 * 用于从完整节点对象创建请求
 */
export const encodeNodeToCreateRequest = (
	node: Partial<NodeInterface>,
	initialContent?: string,
): CreateNodeRequest => ({
	initialContent,
	nodeType: node.type ?? "file",
	parentId: node.parent ?? null,
	tags: node.tags,
	title: node.title!,
	workspaceId: node.workspace!,
})

/**
 * 从 NodeInterface 编码更新请求
 * 用于从完整节点对象创建更新请求
 */
export const encodeNodeToUpdateRequest = (node: Partial<NodeInterface>): UpdateNodeRequest => ({
	isCollapsed: node.collapsed,
	sortOrder: node.order,
	tags: node.tags,
	title: node.title,
})
