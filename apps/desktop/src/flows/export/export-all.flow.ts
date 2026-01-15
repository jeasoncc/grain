/**
 * @file export-all.flow.ts
 * @description 导出所有数据 Flow
 *
 * 功能说明：
 * - 导出所有数据或指定工作区的数据为 JSON
 * - 使用 Repository 获取数据
 * - 使用纯函数创建导出包
 */

import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import {
	getAllNodes,
	getAllWorkspaces,
	getAttachments,
	getAttachmentsByProject,
	getContentsByNodeIds,
	getNodesByWorkspace,
	getWorkspaceById,
} from "@/io/api"
import { info, success } from "@/io/log/logger.api"
import { createExportBundle, serializeBundle } from "@/pipes/export/export.bundle.fn"
import type { AttachmentData, ContentData } from "@/pipes/import/import.json.fn"
import type { AttachmentInterface } from "@/types/attachment"
import type { AppError } from "@/types/error"

/**
 * 将附件数据转换为导出格式
 */
function toAttachmentData(attachments: readonly AttachmentInterface[]): readonly AttachmentData[] {
	return attachments.map((a) => ({
		id: a.id,
		project: a.project,
	}))
}

/**
 * 导出所有数据或指定工作区的数据
 *
 * @param workspaceId - 可选的工作区 ID，不传则导出全部
 * @returns TaskEither<AppError, string>
 */
export function exportAll(workspaceId?: string): TE.TaskEither<AppError, string> {
	info("[Export] 开始导出数据...", {}, "export-all")

	return pipe(
		TE.Do,
		// 获取工作区
		TE.bind("workspaces", () => {
			if (workspaceId) {
				return pipe(
					getWorkspaceById(workspaceId),
					TE.map((ws) => (ws ? [ws] : [])),
				)
			}
			return getAllWorkspaces()
		}),
		// 获取节点
		TE.bind("nodes", () => {
			if (workspaceId) {
				return getNodesByWorkspace(workspaceId)
			}
			return getAllNodes()
		}),
		// 获取内容
		TE.bind("contents", ({ nodes }) => {
			const nodeIds: readonly string[] = nodes.map((n) => n.id)
			if (nodeIds.length === 0) {
				return TE.right([] as readonly ContentData[])
			}
			return pipe(
				getContentsByNodeIds(nodeIds),
				TE.map((contents) =>
					contents.map((c) => ({
						content: c.content,
						contentType: c.contentType,
						id: c.id,
						lastEdit: c.lastEdit,
						nodeId: c.nodeId,
					})),
				),
			)
		}),
		// 获取附件
		TE.bind("attachments", ({ workspaces: _workspaces }) => {
			if (workspaceId) {
				return pipe(getAttachmentsByProject(workspaceId), TE.map(toAttachmentData))
			}
			return pipe(getAttachments(), TE.map(toAttachmentData))
		}),
		// 创建导出包
		TE.map(({ workspaces, nodes, contents, attachments }) => {
			const bundle = createExportBundle({
				attachments,
				contents,
				nodes,
				workspaces,
			})
			const json = serializeBundle(bundle)
			success("[Export] 数据导出成功")
			return json
		}),
	)
}

/**
 * 导出所有数据为 JSON 字符串（Promise 版本，向后兼容）
 *
 * @param workspaceId - 可选的工作区 ID
 * @returns Promise<string>
 */
export async function exportAllAsync(workspaceId?: string): Promise<string> {
	const result = await exportAll(workspaceId)()
	if (E.isLeft(result)) {
		throw new Error(result.left.message)
	}
	return result.right
}
