/**
 * @file use-node-operations.ts
 * @description Node 操作 Hooks
 *
 * 封装节点相关的操作，
 * 使 views 层不直接依赖 io/api
 */

import * as E from "fp-ts/Either";
import { useCallback } from "react";
import { getNodeById, setNodeCollapsed } from "@/flows/node";
import type { NodeInterface } from "@/types/node";

/**
 * 获取节点详情 Hook
 *
 * @returns 获取节点的函数
 */
export function useGetNodeById() {
	const getNode = useCallback(
		async (nodeId: string): Promise<NodeInterface | null> => {
			const result = await getNodeById(nodeId)();
			if (E.isRight(result)) {
				return result.right;
			}
			return null;
		},
		[],
	);

	return { getNode };
}

/**
 * 设置节点折叠状态 Hook
 *
 * @returns 设置折叠状态的函数
 */
export function useSetNodeCollapsed() {
	const setCollapsed = useCallback(
		async (nodeId: string, collapsed: boolean): Promise<boolean> => {
			try {
				const result = await setNodeCollapsed(nodeId, collapsed)();
				return E.isRight(result);
			} catch {
				return false;
			}
		},
		[],
	);

	return { setCollapsed };
}
