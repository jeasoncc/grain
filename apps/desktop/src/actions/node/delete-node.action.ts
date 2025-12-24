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
import { deleteNodeWithChildren } from "@/db/node.db.fn";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";

/**
 * 删除节点及其子节点
 *
 * 递归删除节点及其所有后代节点，同时删除关联的内容记录。
 *
 * @param nodeId - 要删除的节点 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteNode = (nodeId: string): TE.TaskEither<AppError, void> => {
	logger.start("[Action] 删除节点:", nodeId);

	return pipe(
		deleteNodeWithChildren(nodeId),
		TE.tap(() => {
			logger.success("[Action] 节点删除成功:", nodeId);
			return TE.right(undefined);
		}),
	);
};
