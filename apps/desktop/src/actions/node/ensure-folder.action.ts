/**
 * @file ensure-folder.action.ts
 * @description 确保文件夹存在 Action
 *
 * 功能说明：
 * - 确保根级文件夹存在
 * - 如果文件夹不存在则创建
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as nodeRepo from "@/repo/node.repo.fn";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";
import type { NodeInterface } from "@/types/node";

/**
 * 确保根级文件夹存在
 *
 * 如果文件夹已存在则返回现有文件夹，否则创建新文件夹。
 * 使用 Repository 层访问数据，通过 Rust 后端持久化。
 *
 * @param workspaceId - 工作区 ID
 * @param folderName - 文件夹名称
 * @param collapsed - 是否折叠（默认 false）
 * @returns TaskEither<AppError, NodeInterface>
 */
export const ensureRootFolder = (
	workspaceId: string,
	folderName: string,
	collapsed: boolean = false,
): TE.TaskEither<AppError, NodeInterface> => {
	logger.info("[Action] 确保根级文件夹存在:", folderName);

	return pipe(
		nodeRepo.getNodesByWorkspace(workspaceId),
		TE.chain((nodes) => {
			// 查找已存在的根级文件夹
			const existing = nodes.find(
				(n) =>
					n.parent === null && n.title === folderName && n.type === "folder",
			);

			if (existing) {
				logger.info("[Action] 文件夹已存在:", existing.id);
				return TE.right(existing);
			}

			// 创建新文件夹
			logger.info("[Action] 创建新文件夹:", folderName);
			return pipe(
				nodeRepo.createNode({
					workspace: workspaceId,
					parent: null,
					type: "folder",
					title: folderName,
					collapsed,
				}),
				TE.tap((folder) => {
					logger.success("[Action] 文件夹创建成功:", folder.id);
					return TE.right(folder);
				}),
			);
		}),
	);
};

/**
 * 确保根级文件夹存在（异步版本）
 *
 * 便捷函数，返回 Promise 而非 TaskEither。
 *
 * @param workspaceId - 工作区 ID
 * @param folderName - 文件夹名称
 * @param collapsed - 是否折叠（默认 false）
 * @returns Promise<NodeInterface>
 */
export async function ensureRootFolderAsync(
	workspaceId: string,
	folderName: string,
	collapsed: boolean = false,
): Promise<NodeInterface> {
	const result = await ensureRootFolder(workspaceId, folderName, collapsed)();

	if (result._tag === "Left") {
		throw new Error(`确保文件夹失败: ${result.left.message}`);
	}

	return result.right;
}

