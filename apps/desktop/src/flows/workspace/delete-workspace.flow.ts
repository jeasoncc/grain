/**
 * @file delete-workspace.flow.ts
 * @description 删除工作区 Flow
 *
 * 功能说明：
 * - 删除工作区及其所有关联数据
 * - 包括节点、内容、绘图和附件
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as workspaceRepo from "@/io/api/workspace.api"
import { info, success } from "@/io/log/logger.api"
import type { AppError } from "@/types/error"

/**
 * 删除工作区及其所有关联数据
 *
 * 递归删除工作区及其所有关联数据：
 * - 节点（文件树）
 * - 内容（编辑器内容）
 * - 绘图（Excalidraw 画布）
 * - 附件（文件）
 *
 * 使用 Repository 层访问数据，通过 Rust 后端持久化。
 *
 * @param workspaceId - 要删除的工作区 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteWorkspace = (workspaceId: string): TE.TaskEither<AppError, void> => {
	info("[Action] 删除工作区", { workspaceId }, "delete-workspace")

	return pipe(
		workspaceRepo.deleteWorkspace(workspaceId),
		TE.tap(() => {
			success("[Action] 工作区删除成功", { workspaceId }, "delete-workspace")
			return TE.right(undefined)
		}),
	)
}
