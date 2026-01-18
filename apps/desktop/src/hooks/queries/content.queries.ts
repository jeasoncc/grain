/**
 * Content Queries - 内容查询 Hooks
 *
 * 使用 TanStack Query 包装 Repository 层的 TaskEither。
 * 这里是唯一允许「解包」TaskEither 的地方。
 *
 * 设计原则：
 * - 读取操作使用 useQuery
 * - 写入操作使用纯 TaskEither 管道（在 actions 中）
 * - 使用 fp-ts Option 类型表示可能不存在的值
 */

import { useQuery } from "@tanstack/react-query"
import * as O from "fp-ts/Option"
import * as contentApi from "@/io/api/content.api"
import type { ContentInterface } from "@/types/content"
import { queryKeys } from "./query-keys"

// ============================================
// 默认配置
// ============================================

/** 默认 staleTime：1 分钟（内容变化较少） */
const DEFAULT_STALE_TIME = 60 * 1000

// ============================================
// Query Hooks
// ============================================

/**
 * 获取节点内容
 *
 * @param nodeId - 节点 ID，为空时禁用查询
 * @returns Option<ContentInterface> - Some(content) 或 None
 *
 * @example
 * ```tsx
 * const contentOption = useContent(nodeId);
 * 
 * pipe(
 *   contentOption,
 *   O.match(
 *     () => <EmptyState />,
 *     (content) => <Editor content={content} />
 *   )
 * )
 * ```
 */
export const useContent = (nodeId: string | null | undefined) => {
	return useQuery({
		enabled: !!nodeId,
		queryFn: async (): Promise<O.Option<ContentInterface>> => {
			if (!nodeId) {
				return O.none
			}

			const result = await contentApi.getContentByNodeId(nodeId)()

			if (result._tag === "Left") {
				throw result.left
			}
			
			// 将 null | ContentInterface 转换为 Option<ContentInterface>
			return result.right === null ? O.none : O.some(result.right)
		},
		queryKey: queryKeys.contents.byNode(nodeId ?? ""),
		staleTime: DEFAULT_STALE_TIME,
	})
}

/**
 * 获取内容版本号
 *
 * @param nodeId - 节点 ID，为空时禁用查询
 * @returns Option<number> - Some(version) 或 None
 */
export const useContentVersion = (nodeId: string | null | undefined) => {
	return useQuery({
		enabled: !!nodeId,
		queryFn: async (): Promise<O.Option<number>> => {
			if (!nodeId) {
				return O.none
			}

			const result = await contentApi.getContentVersion(nodeId)()

			if (result._tag === "Left") {
				throw result.left
			}
			
			return result.right === null ? O.none : O.some(result.right)
		},
		queryKey: queryKeys.contents.version(nodeId ?? ""),
		staleTime: DEFAULT_STALE_TIME,
	})
}
