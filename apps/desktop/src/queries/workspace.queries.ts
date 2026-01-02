/**
 * Workspace Queries - 工作区查询 Hooks
 *
 * 使用 TanStack Query 包装 Repository 层的 TaskEither。
 * 这里是唯一允许「解包」TaskEither 的地方。
 *
 * 设计原则：
 * - 读取操作使用 useQuery
 * - 写入操作使用纯 TaskEither 管道（在 actions 中）
 */

import { useQuery } from "@tanstack/react-query";
import * as workspaceRepo from "@/repo/workspace.repo.fn";
import type { WorkspaceInterface } from "@/types/workspace";
import { queryKeys } from "./query-keys";

// ============================================
// 默认配置
// ============================================

/** 默认 staleTime：30 秒 */
const DEFAULT_STALE_TIME = 30 * 1000;

// ============================================
// Query Hooks
// ============================================

/**
 * 获取所有工作区
 *
 * @example
 * ```tsx
 * const { data: workspaces, isLoading, error } = useWorkspaces();
 * ```
 */
export const useWorkspaces = () => {
	return useQuery({
		queryKey: queryKeys.workspaces.all,
		queryFn: async (): Promise<WorkspaceInterface[]> => {
			// 执行 TaskEither，解包结果
			const result = await workspaceRepo.getWorkspaces()();

			// 这是唯一的「出口」：Left 抛异常，Right 返回值
			if (result._tag === "Left") throw result.left;
			return result.right;
		},
		staleTime: DEFAULT_STALE_TIME,
	});
};

/**
 * 获取单个工作区
 *
 * @param workspaceId - 工作区 ID，为空时禁用查询
 *
 * @example
 * ```tsx
 * const { data: workspace, isLoading } = useWorkspace(workspaceId);
 * ```
 */
export const useWorkspace = (workspaceId: string | null | undefined) => {
	return useQuery({
		queryKey: queryKeys.workspaces.detail(workspaceId ?? ""),
		queryFn: async (): Promise<WorkspaceInterface | null> => {
			if (!workspaceId) return null;

			const result = await workspaceRepo.getWorkspace(workspaceId)();

			if (result._tag === "Left") throw result.left;
			return result.right;
		},
		enabled: !!workspaceId,
		staleTime: DEFAULT_STALE_TIME,
	});
};
