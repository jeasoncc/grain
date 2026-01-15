/**
 * @file get-node.flow.ts
 * @description 获取节点 Flow
 *
 * 封装节点获取操作
 */

import type * as TE from "fp-ts/TaskEither"
import { getNodeById as getNodeByIdApi, setNodeCollapsed as setNodeCollapsedApi } from "@/io/api"
import type { AppError } from "@/types/error"
import type { NodeInterface } from "@/types/node"

/**
 * 获取节点详情
 *
 * @param nodeId - 节点 ID
 * @returns TaskEither<AppError, NodeInterface | null>
 */
export const getNodeById = (nodeId: string): TE.TaskEither<AppError, NodeInterface | null> =>
	getNodeByIdApi(nodeId)

/**
 * 设置节点折叠状态
 *
 * @param nodeId - 节点 ID
 * @param collapsed - 是否折叠
 * @returns TaskEither<AppError, NodeInterface>
 */
export const setNodeCollapsed = (
	nodeId: string,
	collapsed: boolean,
): TE.TaskEither<AppError, NodeInterface> => setNodeCollapsedApi(nodeId, collapsed)
