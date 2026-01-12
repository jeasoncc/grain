/**
 * @file create-workspace.flow.ts
 * @description 创建工作区 Flow
 *
 * 功能说明：
 * - 创建新工作区
 * - 支持可选的元数据（作者、描述等）
 * - 使用 TaskEither 进行错误处理
 *
 * @requirements 7.1, 7.4
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as workspaceRepo from "@/io/api/workspace.api";
import { info, success } from "@/io/log/logger.api";
import type { WorkspaceInterface } from "@/types/workspace";
import type { AppError } from "@/types/error";

/**
 * 创建工作区参数
 */
export interface CreateWorkspaceParams {
	/** 工作区标题 */
	readonly title: string;
	/** 作者名称（可选） */
	readonly author?: string;
	/** 项目描述（可选） */
	readonly description?: string;
	/** 出版商信息（可选） */
	readonly publisher?: string;
	/** 项目语言（可选） */
	readonly language?: string;
	/** 团队成员 ID 数组（可选） */
	readonly members?: string[];
	/** 所有者用户 ID（可选） */
	readonly owner?: string;
}

/**
 * 创建新工作区
 *
 * 创建一个新的工作区，支持设置可选的元数据。
 * 使用 Repository 层访问数据，通过 Rust 后端持久化。
 *
 * @param params - 创建工作区参数
 * @returns TaskEither<AppError, WorkspaceInterface>
 */
export const createWorkspace = (
	params: CreateWorkspaceParams,
): TE.TaskEither<AppError, WorkspaceInterface> => {
	info("[Action] 创建工作区...", {}, "create-workspace");

	return pipe(
		workspaceRepo.createWorkspace({
			title: params.title,
			author: params.author,
			description: params.description,
			publisher: params.publisher,
			language: params.language,
			members: params.members,
			owner: params.owner,
		}),
		TE.tap((workspace) => {
			success("[Action] 工作区创建成功", { workspaceId: workspace.id }, "create-workspace");
			return TE.right(workspace);
		}),
	);
};
