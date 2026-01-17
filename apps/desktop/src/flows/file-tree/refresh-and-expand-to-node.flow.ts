/**
 * @file flows/file-tree/refresh-and-expand-to-node.flow.ts
 * @description 刷新节点列表并展开到指定节点的 flow
 *
 * 职责：
 * - 刷新节点列表（invalidate queries）
 * - 重新获取节点数据
 * - 计算并更新展开状态
 *
 * 依赖：flows/, pipes/, types/
 */

import type { QueryClient } from "@tanstack/react-query"
import * as nodeFlow from "@/flows/node"
import { updateExpandedForNewNodeFlow } from "./update-expanded-for-new-node.flow"

/**
 * 刷新节点列表并展开到新节点
 *
 * 业务流程：
 * 1. 刷新节点列表缓存
 * 2. 等待数据刷新完成
 * 3. 重新获取节点数据
 * 4. 计算展开状态
 * 5. 更新展开状态
 *
 * @param params - 参数
 * @returns Promise<void>
 */
export const refreshAndExpandToNodeFlow = async (params: {
	readonly workspaceId: string
	readonly newNodeId: string
	readonly queryClient: QueryClient
	readonly queryKey: readonly unknown[]
	readonly setExpandedFolders: (folders: Record<string, boolean>) => void
}): Promise<void> => {
	const { workspaceId, newNodeId, queryClient, queryKey, setExpandedFolders } = params

	// 1. 刷新节点列表
	await queryClient.invalidateQueries({ queryKey })

	// 2. 等待数据刷新完成（使用 setTimeout 确保数据已刷新）
	return new Promise((resolve) => {
		setTimeout(() => {
			// 3. 重新获取节点数据
			void queryClient
				.fetchQuery({
					queryKey,
					queryFn: async () => {
						const result = await nodeFlow.getNodesByWorkspace(workspaceId)()
						if (result._tag === "Left") return []
						return result.right
					},
				})
				.then((refreshedNodes) => {
					if (refreshedNodes && refreshedNodes.length > 0) {
						// 4. 计算展开状态
						const expandedFolders = updateExpandedForNewNodeFlow(refreshedNodes, newNodeId)
						// 5. 更新展开状态
						setExpandedFolders(expandedFolders)
					}
					resolve()
				})
		}, 100)
	})
}
