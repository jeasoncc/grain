/**
 * @file ensure-folder.flow.ts
 * @description 确保文件夹存在 Flow
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
import * as nodeRepo from "@/io/api/node.api";
import { info, debug, warn, error, success } from "@/io/log/logger.api";
import type { NodeInterface } from "@/types/node";
import type { AppError } from "@/types/error";

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
	info("[Action] 确保根级文件夹存在", { folderName }, "ensure-folder.flow");

	return pipe(
		nodeRepo.getNodesByWorkspace(workspaceId),
		TE.chain((nodes) => {
			// 查找已存在的根级文件夹
			const existing = nodes.find(
				(n) =>
					n.parent === null && n.title === folderName && n.type === "folder",
			);

			if (existing) {
				info("[Action] 文件夹已存在", { folderId: existing.id }, "ensure-folder.flow");
				return TE.right(existing);
			}

			// 创建新文件夹
			info("[Action] 创建新文件夹", { folderName }, "ensure-folder.flow");
			return pipe(
				nodeRepo.createNode({
					workspace: workspaceId,
					parent: null,
					type: "folder",
					title: folderName,
					collapsed,
				}),
				TE.tap((folder) => {
					success("[Action] 文件夹创建成功", { folderId: folder.id }, "ensure-folder");
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
