/**
 * @file use-node.ts
 * @description Node React Hooks - 节点数据响应式绑定
 *
 * 提供 React hooks 用于访问节点数据，支持实时更新。
 * 使用 dexie-react-hooks 实现响应式数据订阅。
 *
 * @requirements 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { database } from "@/db/database";
import type { NodeInterface, NodeType } from "@/types/node";

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
): NodeInterface[] | undefined {
	return useLiveQuery(
		async () => {
			if (!workspaceId) return [];
			return database.nodes.where("workspace").equals(workspaceId).toArray();
		},
		[workspaceId],
		undefined,
	);
}

/**
 * 获取单个节点（实时更新）
 *
 * @param nodeId - 节点 ID（可为 null/undefined）
 * @returns 节点对象，不存在或加载中返回 undefined
 */
export function useNode(
	nodeId: string | null | undefined,
): NodeInterface | undefined {
	return useLiveQuery(
		async () => {
			if (!nodeId) return undefined;
			return database.nodes.get(nodeId);
		},
		[nodeId],
		undefined,
	);
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
): NodeInterface[] | undefined {
	return useLiveQuery(
		async () => {
			if (!workspaceId) return [];

			const allNodes = await database.nodes
				.where("workspace")
				.equals(workspaceId)
				.toArray();

			return allNodes
				.filter((n) => n.parent === parentId)
				.sort((a, b) => a.order - b.order);
		},
		[parentId, workspaceId],
		undefined,
	);
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
): NodeInterface[] | undefined {
	return useChildNodes(null, workspaceId);
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
): NodeInterface[] | undefined {
	return useLiveQuery(
		async () => {
			if (!workspaceId) return [];
			return database.nodes
				.where("workspace")
				.equals(workspaceId)
				.and((n) => n.type === type)
				.toArray();
		},
		[workspaceId, type],
		undefined,
	);
}

/**
 * 获取工作区节点数量（实时更新）
 *
 * @param workspaceId - 工作区 ID
 * @returns 节点数量，加载中返回 undefined
 */
export function useNodeCount(
	workspaceId: string | null | undefined,
): number | undefined {
	return useLiveQuery(
		async () => {
			if (!workspaceId) return 0;
			return database.nodes.where("workspace").equals(workspaceId).count();
		},
		[workspaceId],
		undefined,
	);
}

/**
 * 检查节点是否存在（实时更新）
 *
 * @param nodeId - 节点 ID
 * @returns 存在返回 true，不存在返回 false，加载中返回 undefined
 */
export function useNodeExists(
	nodeId: string | null | undefined,
): boolean | undefined {
	return useLiveQuery(
		async () => {
			if (!nodeId) return false;
			const count = await database.nodes.where("id").equals(nodeId).count();
			return count > 0;
		},
		[nodeId],
		undefined,
	);
}

/**
 * 批量获取节点（实时更新）
 *
 * @param nodeIds - 节点 ID 数组
 * @returns 节点数组
 */
export function useNodesByIds(nodeIds: string[]): NodeInterface[] | undefined {
	return useLiveQuery(
		async () => {
			if (!nodeIds || nodeIds.length === 0) return [];
			return database.nodes.where("id").anyOf(nodeIds).toArray();
		},
		[nodeIds],
		undefined,
	);
}
