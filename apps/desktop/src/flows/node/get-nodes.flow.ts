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
): TE.TaskEither<AppError, NodeInterface[]> => {
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
