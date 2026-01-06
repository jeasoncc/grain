/**
 * @file delete-node.action.ts
 * @description 删除节点 Action
 *
 * 功能说明：
 * - 删除节点及其所有子节点
 * - 同时删除关联的内容记录
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";
import * as nodeRepo from "@/io/api/node.api";

/**
 * 删除节点及其子节点
 *
 * 递归删除节点及其所有后代节点，同时删除关联的内容记录。
 * 使用 Repository 层访问数据，通过 Rust 后端持久化。
 *
 * @param nodeId - 要删除的节点 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteNode = (nodeId: string): TE.TaskEither<AppError, void> => {
	logger.start("[Action] 删除节点:", nodeId);

	return pipe(
		nodeRepo.deleteNode(nodeId),
		TE.tap(() => {
			logger.success("[Action] 节点删除成功:", nodeId);
			return TE.right(undefined);
		}),
	);
};

/**
 * 批量删除节点
 *
 * @param nodeIds - 要删除的节点 ID 数组
 * @returns TaskEither<AppError, void>
 */
export const deleteNodesBatch = (
	nodeIds: string[],
): TE.TaskEither<AppError, void> => {
	logger.start("[Action] 批量删除节点:", nodeIds.length);

	return pipe(
		nodeRepo.deleteNodesBatch(nodeIds),
		TE.tap(() => {
			logger.success("[Action] 批量删除成功:", nodeIds.length);
			return TE.right(undefined);
		}),
	);
};
