/**
 * @file use-content.ts
 * @description Content React Hooks - 内容数据响应式绑定
 *
 * 提供 React hooks 用于访问内容数据，支持实时更新。
 * 使用 TanStack Query 实现响应式数据订阅。
 *
 * 迁移说明：
 * - 从 dexie-react-hooks 迁移到 TanStack Query
 * - 底层使用 Repository 层访问 SQLite 数据
 *
 * @requirements 3.3, 5.2
 */

import { useContent as useContentQuery } from "@/queries/content.queries";
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
	const { data: content, isLoading } = useContentQuery(nodeId);

	if (isLoading) return undefined;
	return content ?? undefined;
}

/**
 * 根据内容 ID 获取内容（实时更新）
 *
 * 注意：当前实现通过 nodeId 查询，如果需要通过 content ID 查询，
 * 需要添加对应的 Repository 和 Query 函数。
 *
 * @param id - 内容记录 ID（可为 null/undefined）
 * @returns 内容记录，不存在或加载中返回 undefined
 */
export function useContentById(
	id: string | null | undefined,
): ContentInterface | undefined {
	// 注意：当前 API 不支持通过 content ID 查询
	// 如果需要此功能，需要添加对应的 Rust API
	const { data: content, isLoading } = useContentQuery(id);

	if (isLoading) return undefined;
	return content ?? undefined;
}

/**
 * 批量获取多个节点的内容（实时更新）
 *
 * 适用于批量操作或显示多个文档。
 *
 * 注意：当前实现需要多次查询，如果需要更高效的批量查询，
 * 需要添加对应的 Repository 和 Query 函数。
 *
 * @param nodeIds - 节点 ID 数组
 * @returns 内容记录数组
 */
export function useContentsByNodeIds(
	nodeIds: string[],
): ContentInterface[] | undefined {
	// 注意：当前 API 不支持批量查询
	// 如果需要此功能，需要添加对应的 Rust API
	// 暂时返回空数组
	if (!nodeIds || nodeIds.length === 0) return [];
	return undefined;
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
	const { data: content, isLoading } = useContentQuery(nodeId);

	if (isLoading) return undefined;
	if (!nodeId) return false;
	return content !== null && content !== undefined;
}
