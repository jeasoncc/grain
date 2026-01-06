/**
 * @file rename-node.action.ts
 * @description 重命名节点 Action
 *
 * 功能说明：
 * - 更新节点标题
 * - 验证标题不为空
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { type AppError, validationError } from "@/utils/error.util";
import logger from "@/log";
import * as nodeRepo from "@/io/api/node.api";

/**
 * 重命名节点参数
 */
export interface RenameNodeParams {
	/** 节点 ID */
	readonly nodeId: string;
	/** 新标题 */
	readonly title: string;
}

/**
 * 重命名节点
 *
 * 更新节点的标题。标题不能为空。
 * 使用 Repository 层访问数据，通过 Rust 后端持久化。
 *
 * @param params - 重命名节点参数
 * @returns TaskEither<AppError, void>
 */
export const renameNode = (
	params: RenameNodeParams,
): TE.TaskEither<AppError, void> => {
	logger.start("[Action] 重命名节点:", params.nodeId);

	// 验证标题
	const trimmedTitle = params.title.trim();
	if (!trimmedTitle) {
		logger.error("[Action] 重命名节点失败: 标题不能为空");
		return TE.left(validationError("标题不能为空", "title"));
	}

	return pipe(
		nodeRepo.updateNode(params.nodeId, { title: trimmedTitle }),
		TE.tap(() => {
			logger.success("[Action] 节点重命名成功:", {
				nodeId: params.nodeId,
				title: trimmedTitle,
			});
			return TE.right(undefined);
		}),
		TE.map(() => undefined),
	);
};
