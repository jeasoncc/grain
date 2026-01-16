/**
 * @file use-node.ts
 * @description Node React Hooks - 节点数据响应式绑定
 *
 * 提供 React hooks 用于访问节点数据，支持实时更新。
 * 使用 TanStack Query 实现响应式数据订阅。
 *
 * 迁移说明：
 * - 从 dexie-react-hooks 迁移到 TanStack Query
 * - 底层使用 Repository 层访问 SQLite 数据
 *
 * @requirements 3.3
 */

import { orderBy } from "es-toolkit"
import { useMemo } from "react"
import {
	useNode as useNodeQuery,
	useNodesByParent,
	useNodesByType as useNodesByTypeQuery,
	useNodesByWorkspace as useNodesByWorkspaceQuery,
	useRootNodes as useRootNodesQuery,
} from "@/hooks/queries/node.queries"
import type { NodeInterface, NodeType } from "@/types/node"

/**
 * 获取工作区所有节点（实时更新）
 *
 * @param workspaceId - 工作区 ID（可为 null/undefined）
 * @returns 节点数组，加载中返回 undefined
 *
 * @example
 * ```tsx
 * function FileTree({ workspaceId }: { workspaceId: string }) {
 *   const nodes = useNodesByWorkspace(workspaceId);
 *
 *   if (nodes === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return <TreeView nodes={nodes} />;
 * }
 * ```
 */
export function useNodesByWorkspace(
	workspaceId: string | null | undefined,
): readonly NodeInterface[] | undefined {
	const { data: nodes, isLoading } = useNodesByWorkspaceQuery(workspaceId)

	if (isLoading) {
		return undefined
	}
	return nodes ?? []
}

/**
 * 获取单个节点（实时更新）
 *
 * @param nodeId - 节点 ID（可为 null/undefined）
 * @returns 节点对象，不存在或加载中返回 undefined
 */
export function useNode(nodeId: string | null | undefined): NodeInterface | undefined {
	const { data: node, isLoading } = useNodeQuery(nodeId)

	if (isLoading) {
		return undefined
	}
	return node ?? undefined
}

/**
 * 获取子节点（实时更新）
 *
 * 返回按 order 排序的子节点列表。
 *
 * @param parentId - 父节点 ID（null 表示根节点）
 * @param workspaceId - 工作区 ID
 * @returns 按 order 排序的子节点数组
 */
export function useChildNodes(
	parentId: string | null,
	workspaceId: string | null | undefined,
): readonly NodeInterface[] | undefined {
	const { data: nodes, isLoading } = useNodesByParent(workspaceId, parentId)

	return useMemo(() => {
		if (isLoading) {
			return undefined
		}
		if (!nodes) {
			return []
		}
		return orderBy(nodes, [(node) => node.order], ["asc"])
	}, [nodes, isLoading])
}

/**
 * 获取工作区根节点（实时更新）
 *
 * useChildNodes 的便捷封装，parent 为 null。
 *
 * @param workspaceId - 工作区 ID
 * @returns 按 order 排序的根节点数组
 */
export function useRootNodes(
	workspaceId: string | null | undefined,
): readonly NodeInterface[] | undefined {
	const { data: nodes, isLoading } = useRootNodesQuery(workspaceId)

	return useMemo(() => {
		if (isLoading) {
			return undefined
		}
		if (!nodes) {
			return []
		}
		return orderBy(nodes, [(node) => node.order], ["asc"])
	}, [nodes, isLoading])
}

/**
 * 按类型获取节点（实时更新）
 *
 * @param workspaceId - 工作区 ID
 * @param type - 节点类型
 * @returns 指定类型的节点数组
 */
export function useNodesByType(
	workspaceId: string | null | undefined,
	type: NodeType,
): readonly NodeInterface[] | undefined {
	const { data: nodes, isLoading } = useNodesByTypeQuery(workspaceId, type)

	if (isLoading) {
		return undefined
	}
	return nodes ?? []
}

/**
 * 获取工作区节点数量（实时更新）
 *
 * @param workspaceId - 工作区 ID
 * @returns 节点数量，加载中返回 undefined
 */
export function useNodeCount(workspaceId: string | null | undefined): number | undefined {
	const { data: nodes, isLoading } = useNodesByWorkspaceQuery(workspaceId)

	if (isLoading) {
		return undefined
	}
	return nodes?.length ?? 0
}

/**
 * 检查节点是否存在（实时更新）
 *
 * @param nodeId - 节点 ID
 * @returns 存在返回 true，不存在返回 false，加载中返回 undefined
 */
export function useNodeExists(nodeId: string | null | undefined): boolean | undefined {
	const { data: node, isLoading } = useNodeQuery(nodeId)

	if (isLoading) {
		return undefined
	}
	if (!nodeId) {
		return false
	}
	return node !== null && node !== undefined
}

/**
 * 批量获取节点（实时更新）
 *
 * @param nodeIds - 节点 ID 数组
 * @returns 节点数组
 */
export function useNodesByIds(nodeIds: readonly string[]): readonly NodeInterface[] | undefined {
	// 注意：这里暂时使用工作区查询 + 过滤的方式
	// 如果需要更高效的实现，可以添加专门的批量查询 API
	const { data: nodes, isLoading } = useNodesByWorkspaceQuery(undefined)

	return useMemo(() => {
		if (isLoading) {
			return undefined
		}
		if (!nodes || !nodeIds || nodeIds.length === 0) {
			return []
		}
		const idSet = new Set(nodeIds)
		return nodes.filter((n) => idSet.has(n.id))
	}, [nodes, nodeIds, isLoading])
}
