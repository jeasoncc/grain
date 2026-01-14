/**
 * @file use-optimistic-collapse.ts
 * @description 乐观更新节点折叠状态 Hook
 *
 * 实现乐观更新策略：
 * 1. 立即更新 UI 状态（不等待后端）
 * 2. 异步调用后端 API 保存状态（防抖优化）
 * 3. 失败时回滚 UI 状态
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.4, 6.5
 */

import { useQueryClient } from "@tanstack/react-query";
import { debounce } from "es-toolkit";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { queryKeys } from "@/hooks/queries/query-keys";
import { setNodeCollapsed as setNodeCollapsedApi } from "@/io/api/node.api";
import { debug, error } from "@/io/log/logger.api";
import type { NodeInterface } from "@/types/node";

interface UseOptimisticCollapseOptions {
	readonly workspaceId: string | null | undefined;
	/** 防抖延迟（毫秒），默认 300ms - Requirements: 6.4 */
	readonly debounceMs?: number;
}

interface PendingUpdate {
	readonly nodeId: string;
	readonly collapsed: boolean;
	readonly previousData: readonly NodeInterface[] | undefined;
}

/**
 * 乐观更新节点折叠状态 Hook
 *
 * @param options - 配置选项
 * @returns 乐观更新函数
 *
 * @example
 * ```tsx
 * const { toggleCollapsed } = useOptimisticCollapse({ workspaceId });
 * await toggleCollapsed(nodeId, true); // 立即更新 UI，后台同步（防抖）
 * ```
 */
export function useOptimisticCollapse(options: UseOptimisticCollapseOptions) {
	const { workspaceId, debounceMs = 300 } = options;
	const queryClient = useQueryClient();

	// 存储待处理的更新（用于回滚）
	const pendingUpdatesRef = useRef<Map<string, PendingUpdate>>(new Map());

	/**
	 * 执行后端同步（防抖）
	 * Requirements: 1.2, 6.1, 6.4
	 */
	const syncToBackend = useCallback(
		(
			nodeId: string,
			collapsed: boolean,
			previousData: readonly NodeInterface[] | undefined,
		): void => {
			if (!workspaceId) return;

			const queryKey = queryKeys.nodes.byWorkspace(workspaceId);
			const syncStartTime = performance.now();

			debug("[OptimisticCollapse] Syncing to backend (debounced)", {
				nodeId,
				collapsed,
				timestamp: new Date().toISOString(),
			});

			// 使用 TaskEither 的函数式风格执行
			setNodeCollapsedApi(nodeId, collapsed)().then((result) => {
				const syncEndTime = performance.now();
				const syncDuration = syncEndTime - syncStartTime;

				if (result._tag === "Left") {
					error(
						"[OptimisticCollapse] Backend sync failed, rolling back",
						{
							nodeId,
							collapsed,
							error: result.left,
							syncDuration: `${syncDuration.toFixed(2)}ms`,
							timestamp: new Date().toISOString(),
						},
					);

					// 回滚到之前的数据 - Requirements: 1.3
					if (previousData) {
						queryClient.setQueryData(queryKey, previousData);
					}

					// 显示错误提示
					toast.error("Failed to update folder state");

					// 清除待处理的更新
					pendingUpdatesRef.current.delete(nodeId);
					return;
				}

				debug("[OptimisticCollapse] Backend sync completed", {
					nodeId,
					collapsed,
					syncDuration: `${syncDuration.toFixed(2)}ms`,
					timestamp: new Date().toISOString(),
				});

				// 更新缓存为后端返回的最新数据
				queryClient.setQueryData<NodeInterface[]>(queryKey, (oldData) => {
					if (!oldData) return oldData;

					return oldData.map((node) =>
						node.id === nodeId ? result.right : node,
					);
				});

				// 清除待处理的更新
				pendingUpdatesRef.current.delete(nodeId);
			});
		},
		[workspaceId, queryClient],
	);

	// 创建防抖的同步函数 - Requirements: 6.1, 6.4
	const debouncedSyncRef = useRef(debounce(syncToBackend, debounceMs));

	// 更新防抖函数的引用
	useEffect(() => {
		debouncedSyncRef.current = debounce(syncToBackend, debounceMs);
	}, [syncToBackend, debounceMs]);

	// 组件卸载时立即执行所有待处理的更新 - Requirements: 6.5
	useEffect(() => {
		return () => {
			debug(
				"[OptimisticCollapse] Component unmounting, flushing pending updates",
			);

			// 取消防抖并立即执行所有待处理的更新
			debouncedSyncRef.current.cancel();

			// 立即同步所有待处理的更新
			for (const [nodeId, update] of pendingUpdatesRef.current.entries()) {
				syncToBackend(nodeId, update.collapsed, update.previousData);
			}
		};
	}, [syncToBackend]);

	/**
	 * 乐观更新节点折叠状态
	 *
	 * Requirements: 1.1, 1.2, 1.3, 1.4, 6.1
	 */
	const toggleCollapsed = useCallback(
		(nodeId: string, collapsed: boolean): void => {
			if (!workspaceId) {
				error("[OptimisticCollapse] No workspace ID provided");
				return;
			}

			const queryKey = queryKeys.nodes.byWorkspace(workspaceId);

			// 1. 获取当前缓存数据（用于回滚）
			const previousData = queryClient.getQueryData<readonly NodeInterface[]>(queryKey);

			// Performance monitoring
			const startTime = performance.now();
			debug("[OptimisticCollapse] Starting optimistic update", {
				nodeId,
				collapsed,
				timestamp: new Date().toISOString(),
			});

			// 2. 立即更新 UI（乐观更新）- Requirements: 1.1, 1.4
			queryClient.setQueryData<NodeInterface[]>(queryKey, (oldData) => {
				if (!oldData) return oldData;

				return oldData.map((node) =>
					node.id === nodeId ? { ...node, collapsed } : node,
				);
			});

			const uiUpdateTime = performance.now();
			debug("[OptimisticCollapse] UI updated optimistically", {
				nodeId,
				collapsed,
				uiUpdateDuration: `${(uiUpdateTime - startTime).toFixed(2)}ms`,
			});

			// 3. 存储待处理的更新
			pendingUpdatesRef.current.set(nodeId, {
				nodeId,
				collapsed,
				previousData,
			});

			// 4. 防抖调用后端 API - Requirements: 1.2, 6.1, 6.4
			debouncedSyncRef.current(nodeId, collapsed, previousData);
		},
		[workspaceId, queryClient],
	);

	return { toggleCollapsed };
}
