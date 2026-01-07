/**
 * Workspace Repository - 工作区数据访问层
 *
 * 纯函数 + TaskEither 封装，返回前端类型 (WorkspaceInterface)。
 * 通过 Codec 层进行类型转换，确保前后端类型解耦。
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { api } from "./client.api";
import type { AppError } from "@/types/error";
import {
	decodeWorkspace,
	decodeWorkspaces,
	encodeCreateWorkspace,
	encodeUpdateWorkspace,
} from "@/types/codec";
import type {
	WorkspaceCreateInput,
	WorkspaceInterface,
	WorkspaceUpdateInput,
} from "@/types/workspace";

// ============================================
// 查询操作
// ============================================

/**
 * 获取所有工作区
 */
export const getWorkspaces = (): TE.TaskEither<
	AppError,
	WorkspaceInterface[]
> => pipe(api.getWorkspaces(), TE.map(decodeWorkspaces));

/**
 * 获取单个工作区
 */
export const getWorkspace = (
	workspaceId: string,
): TE.TaskEither<AppError, WorkspaceInterface | null> =>
	pipe(
		api.getWorkspace(workspaceId),
		TE.map((response) => (response ? decodeWorkspace(response) : null)),
	);

// ============================================
// 写入操作
// ============================================

/**
 * 创建工作区
 */
export const createWorkspace = (
	input: WorkspaceCreateInput,
): TE.TaskEither<AppError, WorkspaceInterface> =>
	pipe(
		TE.of(encodeCreateWorkspace(input)),
		TE.chain(api.createWorkspace),
		TE.map(decodeWorkspace),
	);

/**
 * 更新工作区
 */
export const updateWorkspace = (
	workspaceId: string,
	input: WorkspaceUpdateInput,
): TE.TaskEither<AppError, WorkspaceInterface> =>
	pipe(
		TE.of(encodeUpdateWorkspace(input)),
		TE.chain((request) => api.updateWorkspace(workspaceId, request)),
		TE.map(decodeWorkspace),
	);

/**
 * 删除工作区
 */
export const deleteWorkspace = (
	workspaceId: string,
): TE.TaskEither<AppError, void> => api.deleteWorkspace(workspaceId);

/**
 * 获取所有工作区（别名，与 getWorkspaces 相同）
 */
export const getAllWorkspaces = getWorkspaces;

/**
 * 根据 ID 获取工作区（别名，与 getWorkspace 相同）
 */
export const getWorkspaceById = getWorkspace;
