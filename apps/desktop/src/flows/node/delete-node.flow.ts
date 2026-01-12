/**
 * @file delete-node.flow.ts
 * @description 删除节点 Flow
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
import * as nodeRepo from "@/io/api/node.api";
import { info, success } from "@/io/log/logger.api";
import type { AppError } from "@/types/error";

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
	info("[Action] 删除节点", { nodeId }, "delete-node.flow");

	return pipe(
		nodeRepo.deleteNode(nodeId),
		TE.tap(() => {
			success("[Action] 节点删除成功", { nodeId }, "delete-node");
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
	info("[Action] 批量删除节点", { count: nodeIds.length }, "delete-node.flow");

	return pipe(
		nodeRepo.deleteNodesBatch(nodeIds),
		TE.tap(() => {
			success("[Action] 批量删除成功", { count: nodeIds.length }, "delete-node");
			return TE.right(undefined);
		}),
	);
};
