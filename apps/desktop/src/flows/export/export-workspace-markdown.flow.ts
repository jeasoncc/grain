/**
 * @file export-workspace-markdown.flow.ts
 * @description 导出工作区为 Markdown 格式 Flow
 *
 * 功能说明：
 * - 导出指定工作区为 Markdown 格式
 * - 使用 Repository 获取数据
 * - 使用纯函数转换为 Markdown
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import {
	getContentsByNodeIds,
	getNodesByWorkspace,
	getWorkspaceById,
} from "@/io/api";
import { info } from "@/io/log/logger.api";
import { exportWorkspaceToMarkdown } from "@/pipes/export/export.bundle.fn";
import type { AppError } from "@/utils/error.util";

/**
 * 导出工作区为 Markdown 格式
 *
 * @param workspaceId - 工作区 ID
 * @returns TaskEither<AppError, string>
 */
export function exportAsMarkdown(
	workspaceId: string,
): TE.TaskEither<AppError, string> {
	info("[Export] 开始导出 Markdown...", {}, "export-workspace-markdown");

	return pipe(
		TE.Do,
		// 获取工作区
		TE.bind("workspace", () =>
			pipe(
				getWorkspaceById(workspaceId),
				TE.chain((ws) =>
					ws
						? TE.right(ws)
						: TE.left<AppError>({
								type: "NOT_FOUND",
								message: "工作区不存在",
							}),
				),
			),
		),
		// 获取节点
		TE.bind("nodes", () => getNodesByWorkspace(workspaceId)),
		// 获取内容
		TE.bind("contentMap", ({ nodes }) => {
			const nodeIds = nodes.map((n) => n.id);
			if (nodeIds.length === 0) {
				return TE.right(new Map<string, string>());
			}
			return pipe(
				getContentsByNodeIds(nodeIds),
				TE.map(
					(contents) => new Map(contents.map((c) => [c.nodeId, c.content])),
				),
			);
		}),
		// 转换为 Markdown
		TE.map(({ workspace, nodes, contentMap }) => {
			const markdown = exportWorkspaceToMarkdown(workspace, nodes, contentMap);
			success("[Export] Markdown 导出成功");
			return markdown;
		}),
	);
}

/**
 * 导出工作区为 Markdown 格式（Promise 版本，向后兼容）
 *
 * @param workspaceId - 工作区 ID
 * @returns Promise<string>
 */
export async function exportAsMarkdownAsync(
	workspaceId: string,
): Promise<string> {
	const result = await exportAsMarkdown(workspaceId)();
	if (E.isLeft(result)) {
		throw new Error(result.left.message);
	}
	return result.right;
}
