/**
 * @file use-workspace.ts
 * @description Workspace React Hooks - 工作区数据响应式绑定
 *
 * 提供 React hooks 用于访问工作区数据，支持实时更新。
 * 使用 dexie-react-hooks 实现响应式数据订阅。
 *
 * @requirements 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { database } from "@/db/database";
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
	return useLiveQuery(
		async () => {
			const workspaces = await database.workspaces.toArray();
			return workspaces.sort(
				(a, b) =>
					new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime(),
			);
		},
		[],
		undefined,
	);
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
	return useLiveQuery(
		async () => {
			if (!workspaceId) return undefined;
			return database.workspaces.get(workspaceId);
		},
		[workspaceId],
		undefined,
	);
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
	return useLiveQuery(
		async () => {
			if (!ownerId) return [];
			return database.workspaces.where("owner").equals(ownerId).toArray();
		},
		[ownerId],
		undefined,
	);
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
	return useLiveQuery(
		async () => {
			const workspaces = await database.workspaces.toArray();
			return workspaces
				.sort(
					(a, b) =>
						new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime(),
				)
				.slice(0, limit);
		},
		[limit],
		undefined,
	);
}

/**
 * 获取工作区数量（实时更新）
 *
 * @returns 工作区数量，加载中返回 undefined
 */
export function useWorkspaceCount(): number | undefined {
	return useLiveQuery(
		async () => {
			return database.workspaces.count();
		},
		[],
		undefined,
	);
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
	return useLiveQuery(
		async () => {
			if (!workspaceId) return false;
			const count = await database.workspaces
				.where("id")
				.equals(workspaceId)
				.count();
			return count > 0;
		},
		[workspaceId],
		undefined,
	);
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
	return useLiveQuery(
		async () => {
			if (!query || query.trim() === "") {
				const workspaces = await database.workspaces.toArray();
				return workspaces.sort(
					(a, b) =>
						new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime(),
				);
			}

			const lowerQuery = query.toLowerCase();
			const workspaces = await database.workspaces.toArray();
			return workspaces
				.filter((w) => w.title.toLowerCase().includes(lowerQuery))
				.sort(
					(a, b) =>
						new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime(),
				);
		},
		[query],
		undefined,
	);
}
