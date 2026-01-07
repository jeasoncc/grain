/**
 * Node Repository - 节点数据访问层
 *
 * 纯函数 + TaskEither 封装，返回前端类型 (NodeInterface)。
 * 通过 Codec 层进行类型转换，确保前后端类型解耦。
 *
 * 架构位置：
 * ```
 * Actions / Query Hooks
 *       │
 *       ▼
 * Repository Layer ← 你在这里
 *       │
 *       ▼
 * Codec Layer (类型转换)
 *       │
 *       ▼
 * rust-api.fn.ts
 * ```
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { api } from "./client.api";
import type { AppError } from "@/types/error";
import {
	decodeNode,
	decodeNodes,
	encodeCreateNode,
	encodeUpdateNode,
} from "@/types/codec";
import type {
	NodeCreateInput,
	NodeInterface,
	NodeType,
	NodeUpdateInput,
} from "@/types/node";

// ============================================
// 查询操作
// ============================================

/**
 * 获取工作区所有节点
 */
export const getNodesByWorkspace = (
	workspaceId: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	pipe(api.getNodesByWorkspace(workspaceId), TE.map(decodeNodes));

/**
 * 获取根节点（parent_id 为 null）
 */
export const getRootNodes = (
	workspaceId: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	pipe(api.getRootNodes(workspaceId), TE.map(decodeNodes));

/**
 * 按父节点获取子节点
 */
export const getNodesByParent = (
	workspaceId: string,
	parentId: string | null,
): TE.TaskEither<AppError, NodeInterface[]> =>
	pipe(api.getNodesByParent(workspaceId, parentId), TE.map(decodeNodes));

/**
 * 获取子节点（通过父节点 ID）
 */
export const getChildNodes = (
	parentId: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	pipe(api.getChildNodes(parentId), TE.map(decodeNodes));

/**
 * 获取单个节点
 */
export const getNode = (
	nodeId: string,
): TE.TaskEither<AppError, NodeInterface | null> =>
	pipe(
		api.getNode(nodeId),
		TE.map((response) => (response ? decodeNode(response) : null)),
	);

/**
 * 获取单个节点（不存在时抛出错误）
 */
export const getNodeByIdOrFail = (
	nodeId: string,
): TE.TaskEither<AppError, NodeInterface> =>
	pipe(
		getNode(nodeId),
		TE.chain((node) =>
			node
				? TE.right(node)
				: TE.left({
						type: "NOT_FOUND",
						message: `节点不存在: ${nodeId}`,
					} as AppError),
		),
	);

/**
 * 获取单个节点（别名，兼容旧 API）
 */
export const getNodeById = getNode;

/**
 * 获取单个节点（别名，兼容旧 API）
 */
export const getNodeByIdOrNull = getNode;

/**
 * 按类型获取节点
 */
export const getNodesByType = (
	workspaceId: string,
	nodeType: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	pipe(api.getNodesByType(workspaceId, nodeType), TE.map(decodeNodes));

/**
 * 获取节点的所有后代
 */
export const getDescendants = (
	nodeId: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	pipe(api.getDescendants(nodeId), TE.map(decodeNodes));

/**
 * 获取下一个排序号
 */
export const getNextSortOrder = (
	workspaceId: string,
	parentId: string | null,
): TE.TaskEither<AppError, number> =>
	api.getNextSortOrder(workspaceId, parentId);

/**
 * 获取下一个排序号（别名，兼容旧 API）
 *
 * @param parentId - 父节点 ID（null 表示根级）
 * @param workspaceId - 工作区 ID
 */
export const getNextOrder = (
	parentId: string | null,
	workspaceId: string,
): TE.TaskEither<AppError, number> => getNextSortOrder(workspaceId, parentId);

// ============================================
// 写入操作
// ============================================

/**
 * 创建节点
 */
export const createNode = (
	input: NodeCreateInput,
	initialContent?: string,
	tags?: string[],
): TE.TaskEither<AppError, NodeInterface> =>
	pipe(
		TE.of(encodeCreateNode(input, initialContent, tags)),
		TE.chain(api.createNode),
		TE.map(decodeNode),
	);

/**
 * 添加节点（别名，兼容旧 API）
 *
 * @param workspace - 工作区 ID
 * @param title - 节点标题
 * @param options - 可选的节点属性
 */
export const addNode = (
	workspace: string,
	title: string,
	options: {
		parent?: string | null;
		type?: NodeType;
		order?: number;
		collapsed?: boolean;
		tags?: string[];
	} = {},
): TE.TaskEither<AppError, NodeInterface> =>
	createNode(
		{
			workspace,
			title,
			parent: options.parent ?? null,
			type: options.type ?? "file",
			order: options.order ?? 0,
			collapsed: options.collapsed ?? true,
		},
		undefined,
		options.tags,
	);

/**
 * 更新节点
 */
export const updateNode = (
	nodeId: string,
	input: NodeUpdateInput,
): TE.TaskEither<AppError, NodeInterface> =>
	pipe(
		TE.of(encodeUpdateNode(input)),
		TE.chain((request) => api.updateNode(nodeId, request)),
		TE.map(decodeNode),
	);

/**
 * 移动节点
 */
export const moveNode = (
	nodeId: string,
	newParentId: string | null,
	newSortOrder: number,
): TE.TaskEither<AppError, NodeInterface> =>
	pipe(
		api.moveNode(nodeId, { newParentId, newSortOrder }),
		TE.map(decodeNode),
	);

/**
 * 删除节点（递归删除子节点）
 */
export const deleteNode = (nodeId: string): TE.TaskEither<AppError, void> =>
	api.deleteNode(nodeId);

/**
 * 批量删除节点
 */
export const deleteNodesBatch = (
	nodeIds: string[],
): TE.TaskEither<AppError, void> => api.deleteNodesBatch(nodeIds);

/**
 * 复制节点
 */
export const duplicateNode = (
	nodeId: string,
	newTitle?: string,
): TE.TaskEither<AppError, NodeInterface> =>
	pipe(api.duplicateNode(nodeId, newTitle), TE.map(decodeNode));

/**
 * 批量重排序节点
 */
export const reorderNodes = (
	nodeIds: string[],
): TE.TaskEither<AppError, void> => api.reorderNodes(nodeIds);

/**
 * 设置节点折叠状态
 *
 * @param nodeId - 节点 ID
 * @param collapsed - 是否折叠
 */
export const setNodeCollapsed = (
	nodeId: string,
	collapsed: boolean,
): TE.TaskEither<AppError, NodeInterface> => updateNode(nodeId, { collapsed });

/**
 * 获取所有节点（跨工作区）
 *
 * 注意：此函数需要先获取所有工作区，然后获取每个工作区的节点
 * 由于 Rust 后端没有直接的 getAllNodes API
 */
export const getAllNodes = (): TE.TaskEither<AppError, NodeInterface[]> =>
	pipe(
		api.getWorkspaces(),
		TE.chain((workspaces) => {
			if (workspaces.length === 0) {
				return TE.right<AppError, NodeInterface[]>([]);
			}
			// 串行获取每个工作区的节点，避免并发问题
			return workspaces.reduce(
				(acc, ws) =>
					pipe(
						acc,
						TE.chain((allNodes) =>
							pipe(
								api.getNodesByWorkspace(ws.id),
								TE.map((nodes) => [...allNodes, ...decodeNodes(nodes)]),
							),
						),
					),
				TE.right<AppError, NodeInterface[]>([]),
			);
		}),
	);
