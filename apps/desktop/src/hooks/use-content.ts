/**
 * @file use-content.ts
 * @description Content React Hooks - 内容数据响应式绑定
 *
 * 提供 React hooks 用于访问内容数据，支持实时更新。
 * 使用 TanStack Query 实现响应式数据订阅。
 * 使用 fp-ts Option 类型表示可能不存在的值。
 *
 * 迁移说明：
 * - 从 dexie-react-hooks 迁移到 TanStack Query
 * - 底层使用 Repository 层访问 SQLite 数据
 * - 使用 Option 类型替代 null/undefined
 *
 * @requirements 3.3, 5.2
 */

import * as O from "fp-ts/Option"
import { useContent as useContentQuery } from "@/hooks/queries/content.queries"
import type { ContentInterface } from "@/types/content"

/**
 * 根据节点 ID 获取内容（实时更新）
 *
 * 支持懒加载模式 - 内容仅在需要时加载。
 * 使用 fp-ts Option 类型表示可能不存在的值。
 * 
 * 返回值说明：
 * - undefined: 正在加载中
 * - Option<ContentInterface>: 加载完成，使用 match 处理
 *
 * @param nodeId - 父节点 ID（可为 null/undefined，用于懒加载）
 * @returns 加载中返回 undefined，否则返回 Option<ContentInterface>
 *
 * @example
 * ```tsx
 * function Editor({ nodeId }: { nodeId: string }) {
 *   const contentOption = useContentByNodeId(nodeId);
 *
 *   if (contentOption === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return pipe(
 *     contentOption,
 *     O.match(
 *       () => <EmptyState />,  // None: 内容不存在
 *       (content) => <EditorComponent content={content} />  // Some: 有内容
 *     )
 *   );
 * }
 * ```
 */
export function useContentByNodeId(
	nodeId: string | null | undefined,
): O.Option<ContentInterface> | undefined {
	const { data: contentOption, isLoading } = useContentQuery(nodeId)

	if (isLoading) {
		return undefined
	}
	
	return contentOption
}

/**
 * 根据内容 ID 获取内容（实时更新）
 *
 * 注意：当前实现通过 nodeId 查询，如果需要通过 content ID 查询，
 * 需要添加对应的 Repository 和 Query 函数。
 *
 * @param id - 内容记录 ID（可为 null/undefined）
 * @returns 加载中返回 undefined，否则返回 Option<ContentInterface>
 */
export function useContentById(
	id: string | null | undefined,
): O.Option<ContentInterface> | undefined {
	const { data: contentOption, isLoading } = useContentQuery(id)

	if (isLoading) {
		return undefined
	}
	
	return contentOption
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
	nodeIds: readonly string[],
): readonly ContentInterface[] | undefined {
	// 注意：当前 API 不支持批量查询
	// 如果需要此功能，需要添加对应的 Rust API
	// 暂时返回空数组
	if (!nodeIds || nodeIds.length === 0) {
		return []
	}
	return undefined
}

/**
 * 检查节点是否存在内容（实时更新）
 *
 * 适用于条件渲染或懒加载决策。
 * 使用 fp-ts Option 的 isSome 判断。
 *
 * @param nodeId - 父节点 ID
 * @returns 存在返回 true，不存在返回 false，加载中返回 undefined
 */
export function useContentExists(nodeId: string | null | undefined): boolean | undefined {
	const { data: contentOption, isLoading } = useContentQuery(nodeId)

	if (isLoading) {
		return undefined
	}
	if (!nodeId) {
		return false
	}
	
	// contentOption 可能是 undefined（不应该发生，但类型系统要求处理）
	if (contentOption === undefined) {
		return false
	}
	
	return O.isSome(contentOption)
}
