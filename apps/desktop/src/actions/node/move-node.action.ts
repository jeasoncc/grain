/**
 * @file move-node.action.ts
 * @description 移动节点 Action
 *
 * 功能说明：
 * - 移动节点到新的父节点
 * - 检测循环引用
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { wouldCreateCycle } from "@/fn/node/node.tree.fn";
import { type AppError, cycleError, notFoundError } from "@/utils/error.util";
import logger from "@/log";
import * as nodeRepo from "@/io/api/node.api";

/**
 * 移动节点参数
 */
export interface MoveNodeParams {
	/** 要移动的节点 ID */
	readonly nodeId: string;
	/** 新的父节点 ID（null 表示移动到根级） */
	readonly newParentId: string | null;
	/** 新的排序位置（可选，不指定则追加到末尾） */
	readonly newOrder?: number;
}

/**
 * 移动节点到新的父节点
 *
 * 移动节点前会检查是否会创建循环引用。
 * 如果不指定 newOrder，节点会被追加到新父节点的子节点末尾。
 * 使用 Repository 层访问数据，通过 Rust 后端持久化。
 *
 * @param params - 移动节点参数
 * @returns TaskEither<AppError, void>
 */
export const moveNode = (
	params: MoveNodeParams,
): TE.TaskEither<AppError, void> => {
	logger.start("[Action] 移动节点:", params.nodeId);

	return pipe(
		// 1. 获取节点信息
		nodeRepo.getNode(params.nodeId),
		TE.chain((node) =>
			node
				? TE.right(node)
				: TE.left(notFoundError("节点不存在", params.nodeId)),
		),
		// 2. 获取工作区所有节点用于循环检测
		TE.chain((node) =>
			pipe(
				nodeRepo.getNodesByWorkspace(node.workspace),
				TE.map((nodes) => ({ node, nodes })),
			),
		),
		// 3. 检查是否会创建循环引用
		TE.chain(({ node, nodes }) => {
			if (wouldCreateCycle(nodes, params.nodeId, params.newParentId)) {
				logger.error("[Action] 移动节点失败: 会创建循环引用");
				return TE.left(cycleError("移动节点会创建循环引用"));
			}
			return TE.right(node);
		}),
		// 4. 计算新的排序位置（如果未指定）
		TE.chain((node) => {
			if (params.newOrder !== undefined) {
				return TE.right({ node, order: params.newOrder });
			}
			return pipe(
				nodeRepo.getNextSortOrder(node.workspace, params.newParentId),
				TE.map((order) => ({ node, order })),
			);
		}),
		// 5. 执行移动
		TE.chain(({ order }) =>
			nodeRepo.moveNode(params.nodeId, params.newParentId, order),
		),
		// 6. 记录成功日志
		TE.tap(() => {
			logger.success("[Action] 节点移动成功:", params.nodeId);
			return TE.right(undefined);
		}),
		// 7. 返回 void
		TE.map(() => undefined),
	);
};
