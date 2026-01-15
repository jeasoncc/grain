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

import { useQueryClient } from "@tanstack/react-query"
import { debounce } from "es-toolkit"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { queryKeys } from "@/hooks/queries/query-keys"
import { setNodeCollapsed as setNodeCollapsedApi } from "@/io/api/node.api"
import { debug, error } from "@/io/log/logger.api"
import type { NodeInterface } from "@/types/node"

interface UseOptimisticCollapseOptions {
	readonly workspaceId: string | null | undefined
	/** 防抖延迟（毫秒），默认 300ms - Requirements: 6.4 */
	readonly debounceMs?: number
}

interface PendingUpdate {
	readonly nodeId: string
	readonly collapsed: boolean
	readonly previousData: readonly NodeInterface[] | undefined
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
	const { workspaceId, debounceMs = 300 } = options
	const queryClient = useQueryClient()

	// 使用 useState 而不是 useRef 来避免直接变异
	const [pendingUpdates, setPendingUpdates] = useState<ReadonlyMap<string, PendingUpdate>>(
		new Map(),
	)

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
			if (!workspaceId) return

			const queryKey = queryKeys.nodes.byWorkspace(workspaceId)
			const syncStartTime = performance.now()

			debug("[OptimisticCollapse] Syncing to backend (debounced)", {
				collapsed,
				nodeId,
				timestamp: new Date().toISOString(),
			})

			// 使用 TaskEither 的函数式风格执行
			setNodeCollapsedApi(nodeId, collapsed)().then((result) => {
				const syncEndTime = performance.now()
				const syncDuration = syncEndTime - syncStartTime

				if (result._tag === "Left") {
					error("[OptimisticCollapse] Backend sync failed, rolling back", {
						collapsed,
						error: result.left,
						nodeId,
						syncDuration: `${syncDuration.toFixed(2)}ms`,
						timestamp: new Date().toISOString(),
					})

					// 回滚到之前的数据 - Requirements: 1.3
					if (previousData) {
						queryClient.setQueryData(queryKey, previousData)
					}

					// 显示错误提示
					toast.error("Failed to update folder state")

					// 清除待处理的更新
					setPendingUpdates((prev) => new Map([...prev].filter(([id]) => id !== nodeId)))
					return
				}

				debug("[OptimisticCollapse] Backend sync completed", {
					collapsed,
					nodeId,
					syncDuration: `${syncDuration.toFixed(2)}ms`,
					timestamp: new Date().toISOString(),
				})

				// 更新缓存为后端返回的最新数据
				queryClient.setQueryData<ReadonlyArray<NodeInterface>>(queryKey, (oldData) => {
					if (!oldData) return oldData

					return oldData.map((node) => (node.id === nodeId ? result.right : node))
				})

				// 清除待处理的更新
				setPendingUpdates((prev) => new Map([...prev].filter(([id]) => id !== nodeId)))
			})
		},
		[workspaceId, queryClient],
	)

	// 创建防抖的同步函数 - Requirements: 6.1, 6.4
	const debouncedSync = useMemo(
		() => debounce(syncToBackend, debounceMs),
		[syncToBackend, debounceMs]
	)

	// 组件卸载时立即执行所有待处理的更新 - Requirements: 6.5
	useEffect(() => {
		return () => {
			debug("[OptimisticCollapse] Component unmounting, flushing pending updates")

			// 取消防抖并立即执行所有待处理的更新
			debouncedSync.cancel()

			// 立即同步所有待处理的更新
			for (const [nodeId, update] of pendingUpdates.entries()) {
				syncToBackend(nodeId, update.collapsed, update.previousData)
			}
		}
	}, [syncToBackend, pendingUpdates])

	/**
	 * 乐观更新节点折叠状态
	 *
	 * Requirements: 1.1, 1.2, 1.3, 1.4, 6.1
	 */
	const toggleCollapsed = useCallback(
		(nodeId: string, collapsed: boolean): void => {
			if (!workspaceId) {
				error("[OptimisticCollapse] No workspace ID provided")
				return
			}

			const queryKey = queryKeys.nodes.byWorkspace(workspaceId)

			// 1. 获取当前缓存数据（用于回滚）
			const previousData = queryClient.getQueryData<readonly NodeInterface[]>(queryKey)

			// Performance monitoring
			const startTime = performance.now()
			debug("[OptimisticCollapse] Starting optimistic update", {
				collapsed,
				nodeId,
				timestamp: new Date().toISOString(),
			})

			// 2. 立即更新 UI（乐观更新）- Requirements: 1.1, 1.4
			queryClient.setQueryData<ReadonlyArray<NodeInterface>>(queryKey, (oldData) => {
				if (!oldData) return oldData

				return oldData.map((node) => (node.id === nodeId ? { ...node, collapsed } : node))
			})

			const uiUpdateTime = performance.now()
			debug("[OptimisticCollapse] UI updated optimistically", {
				collapsed,
				nodeId,
				uiUpdateDuration: `${(uiUpdateTime - startTime).toFixed(2)}ms`,
			})

			// 3. 存储待处理的更新
			setPendingUpdates(
				(prev) =>
					new Map([
						...prev,
						[
							nodeId,
							{
								collapsed,
								nodeId,
								previousData,
							},
						],
					]),
			)

			// 4. 防抖调用后端 API - Requirements: 1.2, 6.1, 6.4
			debouncedSync(nodeId, collapsed, previousData)
		},
		[workspaceId, queryClient],
	)

	return { toggleCollapsed }
}
