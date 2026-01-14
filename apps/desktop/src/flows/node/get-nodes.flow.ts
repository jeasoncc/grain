/**
 * @file get-nodes.flow.ts
 * @description 获取节点 Flow
 *
 * 封装节点查询操作，供 hooks/queries 使用
 */

import * as TE from "fp-ts/TaskEither";
import * as nodeRepo from "@/io/api/node.api";
import type { NodeInterface } from "@/types/node";
import type { AppError } from "@/types/error";

/**
 * 获取工作区所有节点
 */
export const getNodesByWorkspace = (
	workspaceId: string,
): TE.TaskEither<AppError, readonly NodeInterface[]> => {
	return nodeRepo.getNodesByWorkspace(workspaceId);
};

/**
 * 获取单个节点
 */
export const getNode = (
	nodeId: string,
): TE.TaskEither<AppError, NodeInterface | null> => {
	return nodeRepo.getNode(nodeId);
};

/**
 * 获取根节点
 */
export const getRootNodes = (
	workspaceId: string,
): TE.TaskEither<AppError, readonly NodeInterface[]> => {
	return nodeRepo.getRootNodes(workspaceId);
};

/**
 * 获取子节点（通过父节点 ID）
 */
export const getChildNodes = (
	parentId: string,
): TE.TaskEither<AppError, readonly NodeInterface[]> => {
	return nodeRepo.getChildNodes(parentId);
};

/**
 * 按父节点获取子节点（支持 null 表示根节点）
 */
export const getNodesByParent = (
	workspaceId: string,
	parentId: string | null,
): TE.TaskEither<AppError, readonly NodeInterface[]> => {
	return nodeRepo.getNodesByParent(workspaceId, parentId);
};

/**
 * 按类型获取节点
 */
export const getNodesByType = (
	workspaceId: string,
	nodeType: string,
): TE.TaskEither<AppError, readonly NodeInterface[]> => {
	return nodeRepo.getNodesByType(workspaceId, nodeType);
};

/**
 * 获取节点的所有后代
 */
export const getDescendants = (
	nodeId: string,
): TE.TaskEither<AppError, readonly NodeInterface[]> => {
	return nodeRepo.getDescendants(nodeId);
};
