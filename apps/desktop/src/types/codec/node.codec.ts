/**
 * Node Codec - 节点类型转换
 *
 * 负责 Rust 后端类型 (NodeResponse) 与前端类型 (NodeInterface) 之间的转换。
 * 这是类型边界层，确保前后端类型解耦。
 */

import type { NodeInterface, NodeCreateInput, NodeUpdateInput } from "@/types/node";
import type {
  NodeResponse,
  CreateNodeRequest,
  UpdateNodeRequest,
} from "@/types/rust-api";

// ============================================
// 解码：Rust 类型 → 前端类型
// ============================================

/**
 * 解码单个节点：NodeResponse → NodeInterface
 *
 * 将 Rust 后端返回的节点数据转换为前端使用的接口类型
 */
export const decodeNode = (response: NodeResponse): NodeInterface => ({
  id: response.id,
  workspace: response.workspaceId,
  parent: response.parentId,
  title: response.title,
  type: response.nodeType,
  collapsed: response.isCollapsed,
  order: response.sortOrder,
  tags: response.tags ?? undefined,
  createDate: new Date(response.createdAt).toISOString(),
  lastEdit: new Date(response.updatedAt).toISOString(),
});

/**
 * 批量解码节点：NodeResponse[] → NodeInterface[]
 */
export const decodeNodes = (responses: NodeResponse[]): NodeInterface[] =>
  responses.map(decodeNode);

// ============================================
// 编码：前端类型 → Rust 请求类型
// ============================================

/**
 * 编码创建节点请求：NodeCreateInput → CreateNodeRequest
 */
export const encodeCreateNode = (
  input: NodeCreateInput,
  initialContent?: string
): CreateNodeRequest => ({
  workspaceId: input.workspace,
  parentId: input.parent ?? null,
  title: input.title,
  nodeType: input.type ?? "file",
  tags: undefined,
  initialContent,
});

/**
 * 编码更新节点请求：NodeUpdateInput → UpdateNodeRequest
 */
export const encodeUpdateNode = (input: NodeUpdateInput): UpdateNodeRequest => ({
  title: input.title,
  isCollapsed: input.collapsed,
  sortOrder: input.order,
  tags: input.tags,
});

/**
 * 从 NodeInterface 编码创建请求
 * 用于从完整节点对象创建请求
 */
export const encodeNodeToCreateRequest = (
  node: Partial<NodeInterface>,
  initialContent?: string
): CreateNodeRequest => ({
  workspaceId: node.workspace!,
  parentId: node.parent ?? null,
  title: node.title!,
  nodeType: node.type ?? "file",
  tags: node.tags,
  initialContent,
});

/**
 * 从 NodeInterface 编码更新请求
 * 用于从完整节点对象创建更新请求
 */
export const encodeNodeToUpdateRequest = (
  node: Partial<NodeInterface>
): UpdateNodeRequest => ({
  title: node.title,
  isCollapsed: node.collapsed,
  sortOrder: node.order,
  tags: node.tags,
});
