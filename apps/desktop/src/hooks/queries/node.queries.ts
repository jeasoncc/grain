/**
 * Node Queries - 节点查询 Hooks
 *
 * 使用 TanStack Query 包装 Repository 层的 TaskEither。
 * 这里是唯一允许「解包」TaskEither 的地方。
 *
 * 设计原则：
 * - 读取操作使用 useQuery
 * - 写入操作使用纯 TaskEither 管道（在 actions 中）
 */

import { useQuery } from "@tanstack/react-query";
import * as nodeFlow from "@/flows/node";
import type { NodeInterface } from "@/types/node";
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
 * 获取工作区所有节点
 *
 * @param workspaceId - 工作区 ID，为空时禁用查询
 *
 * @example
 * ```tsx
 * const { data: nodes, isLoading } = useNodesByWorkspace(workspaceId);
 * ```
 */
export const useNodesByWorkspace = (workspaceId: string | null | undefined) => {
	return useQuery({
		queryKey: queryKeys.nodes.byWorkspace(workspaceId ?? ""),
		queryFn: async (): Promise<ReadonlyArray<NodeInterface>> => {
			if (!workspaceId) return [];

			const result = await nodeFlow.getNodesByWorkspace(workspaceId)();

			if (result._tag === "Left") throw result.left;
			return result.right;
		},
		enabled: !!workspaceId,
		staleTime: DEFAULT_STALE_TIME,
	});
};

/**
 * 获取根节点
 *
 * @param workspaceId - 工作区 ID，为空时禁用查询
 */
export const useRootNodes = (workspaceId: string | null | undefined) => {
	return useQuery({
		queryKey: queryKeys.nodes.rootNodes(workspaceId ?? ""),
		queryFn: async (): Promise<ReadonlyArray<NodeInterface>> => {
			if (!workspaceId) return [];

			const result = await nodeFlow.getRootNodes(workspaceId)();

			if (result._tag === "Left") throw result.left;
			return result.right;
		},
		enabled: !!workspaceId,
		staleTime: DEFAULT_STALE_TIME,
	});
};

/**
 * 获取子节点（通过父节点 ID）
 *
 * @param parentId - 父节点 ID，为空时禁用查询
 */
export const useChildNodes = (parentId: string | null | undefined) => {
	return useQuery({
		queryKey: queryKeys.nodes.children(parentId ?? ""),
		queryFn: async (): Promise<ReadonlyArray<NodeInterface>> => {
			if (!parentId) return [];

			const result = await nodeFlow.getChildNodes(parentId)();

			if (result._tag === "Left") throw result.left;
			return result.right;
		},
		enabled: !!parentId,
		staleTime: DEFAULT_STALE_TIME,
	});
};

/**
 * 按父节点获取子节点（支持 null 表示根节点）
 *
 * @param workspaceId - 工作区 ID
 * @param parentId - 父节点 ID，null 表示根节点
 */
export const useNodesByParent = (
	workspaceId: string | null | undefined,
	parentId: string | null,
) => {
	return useQuery({
		queryKey: queryKeys.nodes.byParent(workspaceId ?? "", parentId),
		queryFn: async (): Promise<ReadonlyArray<NodeInterface>> => {
			if (!workspaceId) return [];

			const result = await nodeFlow.getNodesByParent(workspaceId, parentId)();

			if (result._tag === "Left") throw result.left;
			return result.right;
		},
		enabled: !!workspaceId,
		staleTime: DEFAULT_STALE_TIME,
	});
};

/**
 * 获取单个节点
 *
 * @param nodeId - 节点 ID，为空时禁用查询
 */
export const useNode = (nodeId: string | null | undefined) => {
	return useQuery({
		queryKey: queryKeys.nodes.detail(nodeId ?? ""),
		queryFn: async (): Promise<NodeInterface | null> => {
			if (!nodeId) return null;

			const result = await nodeFlow.getNode(nodeId)();

			if (result._tag === "Left") throw result.left;
			return result.right;
		},
		enabled: !!nodeId,
		staleTime: DEFAULT_STALE_TIME,
	});
};

/**
 * 按类型获取节点
 *
 * @param workspaceId - 工作区 ID
 * @param nodeType - 节点类型
 */
export const useNodesByType = (
	workspaceId: string | null | undefined,
	nodeType: string,
) => {
	return useQuery({
		queryKey: queryKeys.nodes.byType(workspaceId ?? "", nodeType),
		queryFn: async (): Promise<ReadonlyArray<NodeInterface>> => {
			if (!workspaceId) return [];

			const result = await nodeFlow.getNodesByType(workspaceId, nodeType)();

			if (result._tag === "Left") throw result.left;
			return result.right;
		},
		enabled: !!workspaceId,
		staleTime: DEFAULT_STALE_TIME,
	});
};

/**
 * 获取节点的所有后代
 *
 * @param nodeId - 节点 ID，为空时禁用查询
 */
export const useDescendants = (nodeId: string | null | undefined) => {
	return useQuery({
		queryKey: queryKeys.nodes.descendants(nodeId ?? ""),
		queryFn: async (): Promise<ReadonlyArray<NodeInterface>> => {
			if (!nodeId) return [];

			const result = await nodeFlow.getDescendants(nodeId)();

			if (result._tag === "Left") throw result.left;
			return result.right;
		},
		enabled: !!nodeId,
		staleTime: DEFAULT_STALE_TIME,
	});
};
