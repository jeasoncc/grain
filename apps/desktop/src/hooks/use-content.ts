/**
 * @file use-content.ts
 * @description Content React Hooks - 内容数据响应式绑定
 *
 * 提供 React hooks 用于访问内容数据，支持实时更新。
 * 使用 dexie-react-hooks 实现响应式数据订阅。
 *
 * @requirements 3.3, 5.2
 */

import { useLiveQuery } from "dexie-react-hooks";
import { database } from "@/db/database";
import type { ContentInterface } from "@/types/content";

/**
 * 根据节点 ID 获取内容（实时更新）
 *
 * 支持懒加载模式 - 内容仅在需要时加载。
 * 加载中或内容不存在时返回 undefined。
 *
 * @param nodeId - 父节点 ID（可为 null/undefined，用于懒加载）
 * @returns 内容记录，不存在或加载中返回 undefined
 *
 * @example
 * ```tsx
 * function Editor({ nodeId }: { nodeId: string }) {
 *   const content = useContentByNodeId(nodeId);
 *
 *   if (content === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return <EditorComponent initialContent={content.content} />;
 * }
 * ```
 */
export function useContentByNodeId(
	nodeId: string | null | undefined,
): ContentInterface | undefined {
	return useLiveQuery(
		async () => {
			if (!nodeId) return undefined;
			return database.contents.where("nodeId").equals(nodeId).first();
		},
		[nodeId],
		undefined,
	);
}

/**
 * 根据内容 ID 获取内容（实时更新）
 *
 * @param id - 内容记录 ID（可为 null/undefined）
 * @returns 内容记录，不存在或加载中返回 undefined
 */
export function useContentById(
	id: string | null | undefined,
): ContentInterface | undefined {
	return useLiveQuery(
		async () => {
			if (!id) return undefined;
			return database.contents.get(id);
		},
		[id],
		undefined,
	);
}

/**
 * 批量获取多个节点的内容（实时更新）
 *
 * 适用于批量操作或显示多个文档。
 *
 * @param nodeIds - 节点 ID 数组
 * @returns 内容记录数组
 */
export function useContentsByNodeIds(
	nodeIds: string[],
): ContentInterface[] | undefined {
	return useLiveQuery(
		async () => {
			if (!nodeIds || nodeIds.length === 0) return [];
			return database.contents.where("nodeId").anyOf(nodeIds).toArray();
		},
		[nodeIds],
		undefined,
	);
}

/**
 * 检查节点是否存在内容（实时更新）
 *
 * 适用于条件渲染或懒加载决策。
 *
 * @param nodeId - 父节点 ID
 * @returns 存在返回 true，不存在返回 false，加载中返回 undefined
 */
export function useContentExists(
	nodeId: string | null | undefined,
): boolean | undefined {
	return useLiveQuery(
		async () => {
			if (!nodeId) return false;
			const count = await database.contents
				.where("nodeId")
				.equals(nodeId)
				.count();
			return count > 0;
		},
		[nodeId],
		undefined,
	);
}
