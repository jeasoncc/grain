/**
 * @file reorder-node.action.ts
 * @description 重新排序节点 Action
 *
 * 功能说明：
 * - 重新排序同级节点
 * - 支持批量更新排序
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { type AppError, validationError } from "@/lib/error.types";
import logger from "@/log";
import * as nodeRepo from "@/io/api/node.api";

/**
 * 重新排序节点参数
 */
export interface ReorderNodesParams {
	/** 按新顺序排列的节点 ID 数组 */
	readonly nodeIds: readonly string[];
}

/**
 * 重新排序节点
 *
 * 根据提供的节点 ID 数组顺序更新节点的排序位置。
 * 数组中的第一个节点 order 为 0，依次递增。
 * 使用 Repository 层访问数据，通过 Rust 后端持久化。
 *
 * @param params - 重新排序参数
 * @returns TaskEither<AppError, void>
 */
export const reorderNodes = (
	params: ReorderNodesParams,
): TE.TaskEither<AppError, void> => {
	logger.start("[Action] 重新排序节点:", { count: params.nodeIds.length });

	// 验证参数
	if (params.nodeIds.length === 0) {
		logger.warn("[Action] 重新排序节点: 节点列表为空");
		return TE.right(undefined);
	}

	// 检查是否有重复的节点 ID
	const uniqueIds = new Set(params.nodeIds);
	if (uniqueIds.size !== params.nodeIds.length) {
		logger.error("[Action] 重新排序节点失败: 存在重复的节点 ID");
		return TE.left(validationError("节点 ID 列表中存在重复项", "nodeIds"));
	}

	return pipe(
		nodeRepo.reorderNodes([...params.nodeIds]),
		TE.tap(() => {
			logger.success("[Action] 节点重新排序成功:", {
				count: params.nodeIds.length,
			});
			return TE.right(undefined);
		}),
	);
};
