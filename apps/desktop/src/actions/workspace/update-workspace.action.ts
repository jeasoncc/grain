/**
 * @file update-workspace.action.ts
 * @description 更新工作区 Action
 *
 * 功能说明：
 * - 更新工作区元数据
 * - 支持部分更新（只更新提供的字段）
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";
import * as workspaceRepo from "@/repo/workspace.repo.fn";
import type { WorkspaceUpdateInput } from "@/types/workspace";

/**
 * 更新工作区参数
 */
export interface UpdateWorkspaceParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 更新的字段 */
	readonly updates: WorkspaceUpdateInput;
}

/**
 * 更新工作区元数据
 *
 * 更新工作区的元数据，支持部分更新。
 * 只有提供的字段会被更新，其他字段保持不变。
 * 使用 Repository 层访问数据，通过 Rust 后端持久化。
 *
 * @param params - 更新工作区参数
 * @returns TaskEither<AppError, void>
 */
export const updateWorkspace = (
	params: UpdateWorkspaceParams,
): TE.TaskEither<AppError, void> => {
	logger.start("[Action] 更新工作区:", params.workspaceId);

	return pipe(
		workspaceRepo.updateWorkspace(params.workspaceId, params.updates),
		TE.tap(() => {
			logger.success("[Action] 工作区更新成功:", params.workspaceId);
			return TE.right(undefined);
		}),
		TE.map(() => undefined),
	);
};
