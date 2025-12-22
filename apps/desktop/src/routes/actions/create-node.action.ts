/**
 * @file create-node.action.ts
 * @description 创建节点 Action
 *
 * 功能说明：
 * - 创建新节点（文件、文件夹、画布、日记）
 * - 自动创建关联的内容记录（非文件夹类型）
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { addContent } from "@/db/content.db.fn";
import { addNode, getNextOrder } from "@/db/node.db.fn";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";
import type { NodeInterface, NodeType } from "@/types/node";

/**
 * 创建节点参数
 */
export interface CreateNodeParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 父节点 ID（null 表示根级） */
	readonly parentId: string | null;
	/** 节点类型 */
	readonly type: NodeType;
	/** 节点标题 */
	readonly title: string;
	/** 初始内容（可选） */
	readonly content?: string;
}

/**
 * 创建新节点
 *
 * 创建节点并为非文件夹类型自动创建关联的内容记录。
 *
 * @param params - 创建节点参数
 * @returns TaskEither<AppError, NodeInterface>
 */
export const createNode = (
	params: CreateNodeParams,
): TE.TaskEither<AppError, NodeInterface> => {
	logger.start("[Action] 创建节点...");

	return pipe(
		// 1. 获取下一个排序号
		getNextOrder(params.parentId, params.workspaceId),
		// 2. 创建节点
		TE.chain((order) =>
			addNode(params.workspaceId, params.title, {
				parent: params.parentId,
				type: params.type,
				order,
				collapsed: true,
			}),
		),
		// 3. 为非文件夹类型创建内容记录
		TE.chainFirst((node) => {
			if (node.type !== "folder") {
				return addContent(node.id, params.content || "");
			}
			return TE.right(undefined);
		}),
		// 4. 记录成功日志
		TE.tap((node) => {
			logger.success("[Action] 节点创建成功:", node.id);
			return TE.right(node);
		}),
	);
};
