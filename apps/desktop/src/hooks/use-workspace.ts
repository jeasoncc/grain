/**
 * @file use-workspace.ts
 * @description Workspace React Hooks - 工作区数据响应式绑定
 *
 * 提供 React hooks 用于访问工作区数据，支持实时更新。
 * 使用 TanStack Query 实现响应式数据订阅。
 *
 * 迁移说明：
 * - 从 dexie-react-hooks 迁移到 TanStack Query
 * - 底层使用 Repository 层访问 SQLite 数据
 *
 * @requirements 3.3
 */

import { useMemo } from "react";
import {
	useWorkspace as useWorkspaceQuery,
	useWorkspaces as useWorkspacesQuery,
} from "@/hooks/queries/workspace.queries";
import type { WorkspaceInterface } from "@/types/workspace";

/**
 * 获取所有工作区（实时更新）
 *
 * 返回按 lastOpen 排序的工作区列表（最近打开的在前）。
 *
 * @returns 工作区数组，加载中返回 undefined
 *
 * @example
 * ```tsx
 * function WorkspaceList() {
 *   const workspaces = useAllWorkspaces();
 *
 *   if (workspaces === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return (
 *     <ul>
 *       {workspaces.map(ws => (
 *         <li key={ws.id}>{ws.title}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useAllWorkspaces(): WorkspaceInterface[] | undefined {
	const { data: workspaces, isLoading } = useWorkspacesQuery();

	return useMemo(() => {
		if (isLoading || !workspaces) return undefined;
		return [...workspaces].sort(
			(a, b) => new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime(),
		);
	}, [workspaces, isLoading]);
}

/**
 * 获取单个工作区（实时更新）
 *
 * @param workspaceId - 工作区 ID（可为 null/undefined）
 * @returns 工作区对象，不存在或加载中返回 undefined
 *
 * @example
 * ```tsx
 * function WorkspaceHeader({ workspaceId }: { workspaceId: string }) {
 *   const workspace = useWorkspace(workspaceId);
 *
 *   if (!workspace) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <h1>{workspace.title}</h1>;
 * }
 * ```
 */
export function useWorkspace(
	workspaceId: string | null | undefined,
): WorkspaceInterface | undefined {
	const { data: workspace, isLoading } = useWorkspaceQuery(workspaceId);

	if (isLoading) return undefined;
	return workspace ?? undefined;
}

/**
 * 按所有者获取工作区（实时更新）
 *
 * @param ownerId - 所有者用户 ID（可为 null/undefined）
 * @returns 该用户拥有的工作区数组
 */
export function useWorkspacesByOwner(
	ownerId: string | null | undefined,
): WorkspaceInterface[] | undefined {
	const { data: workspaces, isLoading } = useWorkspacesQuery();

	return useMemo(() => {
		if (isLoading || !workspaces) return undefined;
		if (!ownerId) return [];
		return workspaces.filter((w) => w.owner === ownerId);
	}, [workspaces, ownerId, isLoading]);
}

/**
 * 获取最近打开的工作区（实时更新）
 *
 * @param limit - 返回的最大工作区数量（默认：5）
 * @returns 最近打开的工作区数组
 */
export function useRecentWorkspaces(
	limit: number = 5,
): WorkspaceInterface[] | undefined {
	const { data: workspaces, isLoading } = useWorkspacesQuery();

	return useMemo(() => {
		if (isLoading || !workspaces) return undefined;
		return [...workspaces]
			.sort(
				(a, b) =>
					new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime(),
			)
			.slice(0, limit);
	}, [workspaces, limit, isLoading]);
}

/**
 * 获取工作区数量（实时更新）
 *
 * @returns 工作区数量，加载中返回 undefined
 */
export function useWorkspaceCount(): number | undefined {
	const { data: workspaces, isLoading } = useWorkspacesQuery();

	if (isLoading || !workspaces) return undefined;
	return workspaces.length;
}

/**
 * 检查工作区是否存在（实时更新）
 *
 * @param workspaceId - 工作区 ID
 * @returns 存在返回 true，不存在返回 false，加载中返回 undefined
 */
export function useWorkspaceExists(
	workspaceId: string | null | undefined,
): boolean | undefined {
	const { data: workspace, isLoading } = useWorkspaceQuery(workspaceId);

	if (isLoading) return undefined;
	if (!workspaceId) return false;
	return workspace !== null && workspace !== undefined;
}

/**
 * 搜索工作区（实时更新）
 *
 * 按标题搜索工作区，返回按 lastOpen 排序的结果。
 *
 * @param query - 搜索关键词
 * @returns 匹配的工作区数组
 */
export function useWorkspaceSearch(
	query: string | null | undefined,
): WorkspaceInterface[] | undefined {
	const { data: workspaces, isLoading } = useWorkspacesQuery();

	return useMemo(() => {
		if (isLoading || !workspaces) return undefined;

		const sorted = [...workspaces].sort(
			(a, b) => new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime(),
		);

		if (!query || query.trim() === "") {
			return sorted;
		}

		const lowerQuery = query.toLowerCase();
		return sorted.filter((w) => w.title.toLowerCase().includes(lowerQuery));
	}, [workspaces, query, isLoading]);
}
