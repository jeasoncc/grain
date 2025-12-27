/**
 * @file workspace.db.fn.ts
 * @description Workspace 数据库操作函数
 *
 * 功能说明：
 * - 提供工作区的 CRUD 操作
 * - 提供级联删除（删除工作区及其所有关联数据）
 * - 使用 TaskEither 返回类型进行错误处理
 * - 所有操作都有日志记录
 *
 * @requirements 3.1, 3.2, 3.3
 */

import dayjs from "dayjs";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { type AppError, dbError, notFoundError } from "@/lib/error.types";
import logger from "@/log";
import { WorkspaceBuilder } from "@/types/workspace/workspace.builder";
import type {
	WorkspaceInterface,
	WorkspaceUpdateInput,
} from "@/types/workspace/workspace.interface";
import { database } from "./database";

// ============================================================================
// 基础 CRUD 操作
// ============================================================================

/**
 * 添加新工作区
 *
 * @param title - 工作区标题
 * @param options - 可选的工作区属性
 * @returns TaskEither<AppError, WorkspaceInterface>
 */
export const addWorkspace = (
	title: string,
	options: {
		author?: string;
		description?: string;
		publisher?: string;
		language?: string;
		members?: string[];
		owner?: string;
	} = {},
): TE.TaskEither<AppError, WorkspaceInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 添加工作区:", { title });

			const builder = new WorkspaceBuilder().title(title);

			if (options.author) {
				builder.author(options.author);
			}
			if (options.description) {
				builder.description(options.description);
			}
			if (options.publisher) {
				builder.publisher(options.publisher);
			}
			if (options.language) {
				builder.language(options.language);
			}
			if (options.members) {
				builder.members(options.members);
			}
			if (options.owner) {
				builder.owner(options.owner);
			}

			const workspace = builder.build();
			await database.workspaces.add(workspace);

			logger.success("[DB] 工作区添加成功:", workspace.id);
			return workspace;
		},
		(error): AppError => {
			logger.error("[DB] 添加工作区失败:", error);
			return dbError(`添加工作区失败: ${error}`);
		},
	);

/**
 * 更新工作区
 *
 * @param id - 工作区 ID
 * @param updates - 更新的字段
 * @returns TaskEither<AppError, number> - 更新的记录数（0 或 1）
 */
export const updateWorkspace = (
	id: string,
	updates: WorkspaceUpdateInput,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 更新工作区:", { id, updates });

			const count = await database.workspaces.update(id, {
				...updates,
				lastOpen: dayjs().toISOString(),
			});

			if (count > 0) {
				logger.success("[DB] 工作区更新成功:", id);
			} else {
				logger.warn("[DB] 工作区未找到:", id);
			}

			return count;
		},
		(error): AppError => {
			logger.error("[DB] 更新工作区失败:", error);
			return dbError(`更新工作区失败: ${error}`);
		},
	);

/**
 * 删除工作区（不删除关联数据）
 *
 * @param id - 工作区 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteWorkspace = (id: string): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 删除工作区:", id);
			await database.workspaces.delete(id);
			logger.success("[DB] 工作区删除成功:", id);
		},
		(error): AppError => {
			logger.error("[DB] 删除工作区失败:", error);
			return dbError(`删除工作区失败: ${error}`);
		},
	);

/**
 * 删除工作区及其所有关联数据
 * 删除节点、内容、绘图和附件
 *
 * @param id - 工作区 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteWorkspaceWithContents = (
	id: string,
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 删除工作区及关联数据:", id);

			await database.transaction(
				"rw",
				[
					database.workspaces,
					database.nodes,
					database.contents,
					database.attachments,
				],
				async () => {
					// 获取工作区的所有节点 ID
					const nodes = await database.nodes
						.where("workspace")
						.equals(id)
						.toArray();
					const nodeIds = nodes.map((n) => n.id);

					// 删除节点关联的内容
					if (nodeIds.length > 0) {
						await database.contents.where("nodeId").anyOf(nodeIds).delete();
					}

					// 删除节点（包括 wiki 文件和 drawing 文件，现在都是普通节点）
					await database.nodes.where("workspace").equals(id).delete();

					// 删除附件
					await database.attachments.where("project").equals(id).delete();

					// 删除工作区本身
					await database.workspaces.delete(id);
				},
			);

			logger.success("[DB] 工作区及关联数据删除成功:", id);
		},
		(error): AppError => {
			logger.error("[DB] 删除工作区及关联数据失败:", error);
			return dbError(`删除工作区及关联数据失败: ${error}`);
		},
	);

// ============================================================================
// 查询操作
// ============================================================================

/**
 * 根据 ID 获取工作区
 *
 * @param id - 工作区 ID
 * @returns TaskEither<AppError, WorkspaceInterface | undefined>
 */
export const getWorkspaceById = (
	id: string,
): TE.TaskEither<AppError, WorkspaceInterface | undefined> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取工作区:", id);
			return database.workspaces.get(id);
		},
		(error): AppError => {
			logger.error("[DB] 获取工作区失败:", error);
			return dbError(`获取工作区失败: ${error}`);
		},
	);

/**
 * 根据 ID 获取工作区（必须存在）
 *
 * @param id - 工作区 ID
 * @returns TaskEither<AppError, WorkspaceInterface>
 */
export const getWorkspaceByIdOrFail = (
	id: string,
): TE.TaskEither<AppError, WorkspaceInterface> =>
	pipe(
		getWorkspaceById(id),
		TE.chain((workspace) =>
			workspace
				? TE.right(workspace)
				: TE.left(notFoundError(`工作区不存在: ${id}`, id)),
		),
	);

/**
 * 获取所有工作区
 * 按 lastOpen 降序排列（最近打开的在前）
 *
 * @returns TaskEither<AppError, WorkspaceInterface[]>
 */
export const getAllWorkspaces = (): TE.TaskEither<
	AppError,
	WorkspaceInterface[]
> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取所有工作区");
			const workspaces = await database.workspaces.toArray();
			return workspaces.sort(
				(a, b) =>
					new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime(),
			);
		},
		(error): AppError => {
			logger.error("[DB] 获取所有工作区失败:", error);
			return dbError(`获取所有工作区失败: ${error}`);
		},
	);

/**
 * 根据所有者获取工作区
 *
 * @param ownerId - 所有者用户 ID
 * @returns TaskEither<AppError, WorkspaceInterface[]>
 */
export const getWorkspacesByOwner = (
	ownerId: string,
): TE.TaskEither<AppError, WorkspaceInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取用户工作区:", ownerId);
			return database.workspaces.where("owner").equals(ownerId).toArray();
		},
		(error): AppError => {
			logger.error("[DB] 获取用户工作区失败:", error);
			return dbError(`获取用户工作区失败: ${error}`);
		},
	);

/**
 * 按标题搜索工作区
 *
 * @param query - 搜索关键词
 * @returns TaskEither<AppError, WorkspaceInterface[]>
 */
export const searchWorkspacesByTitle = (
	query: string,
): TE.TaskEither<AppError, WorkspaceInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 搜索工作区:", query);
			const lowerQuery = query.toLowerCase();
			const workspaces = await database.workspaces.toArray();
			return workspaces.filter((w) =>
				w.title.toLowerCase().includes(lowerQuery),
			);
		},
		(error): AppError => {
			logger.error("[DB] 搜索工作区失败:", error);
			return dbError(`搜索工作区失败: ${error}`);
		},
	);

/**
 * 获取最近打开的工作区
 *
 * @param limit - 返回的最大数量，默认 5
 * @returns TaskEither<AppError, WorkspaceInterface[]>
 */
export const getRecentWorkspaces = (
	limit: number = 5,
): TE.TaskEither<AppError, WorkspaceInterface[]> =>
	pipe(
		getAllWorkspaces(),
		TE.map((workspaces) => workspaces.slice(0, limit)),
	);

// ============================================================================
// 辅助操作
// ============================================================================

/**
 * 更新工作区的 lastOpen 时间戳
 *
 * @param id - 工作区 ID
 * @returns TaskEither<AppError, void>
 */
export const touchWorkspace = (id: string): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 更新工作区访问时间:", id);
			await database.workspaces.update(id, {
				lastOpen: dayjs().toISOString(),
			});
		},
		(error): AppError => {
			logger.error("[DB] 更新工作区访问时间失败:", error);
			return dbError(`更新工作区访问时间失败: ${error}`);
		},
	);

/**
 * 检查工作区是否存在
 *
 * @param id - 工作区 ID
 * @returns TaskEither<AppError, boolean>
 */
export const workspaceExists = (id: string): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			const count = await database.workspaces.where("id").equals(id).count();
			return count > 0;
		},
		(error): AppError => {
			logger.error("[DB] 检查工作区存在失败:", error);
			return dbError(`检查工作区存在失败: ${error}`);
		},
	);

/**
 * 统计工作区数量
 *
 * @returns TaskEither<AppError, number>
 */
export const countWorkspaces = (): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			return database.workspaces.count();
		},
		(error): AppError => {
			logger.error("[DB] 统计工作区数量失败:", error);
			return dbError(`统计工作区数量失败: ${error}`);
		},
	);

/**
 * 更新工作区标题
 *
 * @param id - 工作区 ID
 * @param title - 新标题
 * @returns TaskEither<AppError, void>
 */
export const updateWorkspaceTitle = (
	id: string,
	title: string,
): TE.TaskEither<AppError, void> =>
	pipe(
		updateWorkspace(id, { title }),
		TE.map(() => {
			logger.success("[DB] 工作区标题更新成功:", { id, title });
			return undefined;
		}),
	);

/**
 * 更新工作区描述
 *
 * @param id - 工作区 ID
 * @param description - 新描述
 * @returns TaskEither<AppError, void>
 */
export const updateWorkspaceDescription = (
	id: string,
	description: string,
): TE.TaskEither<AppError, void> =>
	pipe(
		updateWorkspace(id, { description }),
		TE.map(() => {
			logger.success("[DB] 工作区描述更新成功:", { id, description });
			return undefined;
		}),
	);

/**
 * 添加成员到工作区
 *
 * @param id - 工作区 ID
 * @param memberId - 要添加的用户 ID
 * @returns TaskEither<AppError, void>
 */
export const addWorkspaceMember = (
	id: string,
	memberId: string,
): TE.TaskEither<AppError, void> =>
	pipe(
		getWorkspaceById(id),
		TE.chain((workspace) => {
			if (!workspace) {
				return TE.left(notFoundError(`工作区不存在: ${id}`, id));
			}

			const members = workspace.members || [];
			if (members.includes(memberId)) {
				// 成员已存在，无需操作
				return TE.right(undefined);
			}

			return pipe(
				updateWorkspace(id, { members: [...members, memberId] }),
				TE.map(() => {
					logger.success("[DB] 工作区成员添加成功:", { id, memberId });
					return undefined;
				}),
			);
		}),
	);

/**
 * 从工作区移除成员
 *
 * @param id - 工作区 ID
 * @param memberId - 要移除的用户 ID
 * @returns TaskEither<AppError, void>
 */
export const removeWorkspaceMember = (
	id: string,
	memberId: string,
): TE.TaskEither<AppError, void> =>
	pipe(
		getWorkspaceById(id),
		TE.chain((workspace) => {
			if (!workspace) {
				return TE.left(notFoundError(`工作区不存在: ${id}`, id));
			}

			if (!workspace.members) {
				// 没有成员列表，无需操作
				return TE.right(undefined);
			}

			const members = workspace.members.filter((m) => m !== memberId);
			return pipe(
				updateWorkspace(id, { members }),
				TE.map(() => {
					logger.success("[DB] 工作区成员移除成功:", { id, memberId });
					return undefined;
				}),
			);
		}),
	);

/**
 * 保存工作区（直接保存完整工作区对象）
 *
 * @param workspace - 工作区对象
 * @returns TaskEither<AppError, WorkspaceInterface>
 */
export const saveWorkspace = (
	workspace: WorkspaceInterface,
): TE.TaskEither<AppError, WorkspaceInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 保存工作区:", workspace.id);
			await database.workspaces.put(workspace);
			logger.success("[DB] 工作区保存成功:", workspace.id);
			return workspace;
		},
		(error): AppError => {
			logger.error("[DB] 保存工作区失败:", error);
			return dbError(`保存工作区失败: ${error}`);
		},
	);
