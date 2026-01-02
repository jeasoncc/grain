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
import * as rustApi from "@/db/rust-api.fn";
import type { AppError } from "@/lib/error.types";
import {
	decodeNode,
	decodeNodes,
	encodeCreateNode,
	encodeUpdateNode,
} from "@/types/codec";
import type {
	NodeCreateInput,
	NodeInterface,
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
	pipe(rustApi.getNodesByWorkspace(workspaceId), TE.map(decodeNodes));

/**
 * 获取根节点（parent_id 为 null）
 */
export const getRootNodes = (
	workspaceId: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	pipe(rustApi.getRootNodes(workspaceId), TE.map(decodeNodes));

/**
 * 按父节点获取子节点
 */
export const getNodesByParent = (
	workspaceId: string,
	parentId: string | null,
): TE.TaskEither<AppError, NodeInterface[]> =>
	pipe(rustApi.getNodesByParent(workspaceId, parentId), TE.map(decodeNodes));

/**
 * 获取子节点（通过父节点 ID）
 */
export const getChildNodes = (
	parentId: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	pipe(rustApi.getChildNodes(parentId), TE.map(decodeNodes));

/**
 * 获取单个节点
 */
export const getNode = (
	nodeId: string,
): TE.TaskEither<AppError, NodeInterface | null> =>
	pipe(
		rustApi.getNode(nodeId),
		TE.map((response) => (response ? decodeNode(response) : null)),
	);

/**
 * 按类型获取节点
 */
export const getNodesByType = (
	workspaceId: string,
	nodeType: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	pipe(rustApi.getNodesByType(workspaceId, nodeType), TE.map(decodeNodes));

/**
 * 获取节点的所有后代
 */
export const getDescendants = (
	nodeId: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	pipe(rustApi.getDescendants(nodeId), TE.map(decodeNodes));

/**
 * 获取下一个排序号
 */
export const getNextSortOrder = (
	workspaceId: string,
	parentId: string | null,
): TE.TaskEither<AppError, number> =>
	rustApi.getNextSortOrder(workspaceId, parentId);

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
		TE.chain(rustApi.createNode),
		TE.map(decodeNode),
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
		TE.chain((request) => rustApi.updateNode(nodeId, request)),
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
		rustApi.moveNode(nodeId, { newParentId, newSortOrder }),
		TE.map(decodeNode),
	);

/**
 * 删除节点（递归删除子节点）
 */
export const deleteNode = (nodeId: string): TE.TaskEither<AppError, void> =>
	rustApi.deleteNode(nodeId);

/**
 * 批量删除节点
 */
export const deleteNodesBatch = (
	nodeIds: string[],
): TE.TaskEither<AppError, void> => rustApi.deleteNodesBatch(nodeIds);

/**
 * 复制节点
 */
export const duplicateNode = (
	nodeId: string,
	newTitle?: string,
): TE.TaskEither<AppError, NodeInterface> =>
	pipe(rustApi.duplicateNode(nodeId, newTitle), TE.map(decodeNode));

/**
 * 批量重排序节点
 */
export const reorderNodes = (
	nodeIds: string[],
): TE.TaskEither<AppError, void> => rustApi.reorderNodes(nodeIds);
