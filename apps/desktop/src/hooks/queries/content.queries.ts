/**
 * Content Queries - 内容查询 Hooks
 *
 * 使用 TanStack Query 包装 Repository 层的 TaskEither。
 * 这里是唯一允许「解包」TaskEither 的地方。
 *
 * 设计原则：
 * - 读取操作使用 useQuery
 * - 写入操作使用纯 TaskEither 管道（在 actions 中）
 */

import { useQuery } from "@tanstack/react-query";
import * as contentRepo from "@/io/api/content.api";
import type { ContentInterface } from "@/types/content";
import { queryKeys } from "./query-keys";

// ============================================
// 默认配置
// ============================================

/** 默认 staleTime：1 分钟（内容变化较少） */
const DEFAULT_STALE_TIME = 60 * 1000;

// ============================================
// Query Hooks
// ============================================

/**
 * 获取节点内容
 *
 * @param nodeId - 节点 ID，为空时禁用查询
 *
 * @example
 * ```tsx
 * const { data: content, isLoading } = useContent(nodeId);
 * ```
 */
export const useContent = (nodeId: string | null | undefined) => {
	return useQuery({
		queryKey: queryKeys.contents.byNode(nodeId ?? ""),
		queryFn: async (): Promise<ContentInterface | null> => {
			if (!nodeId) return null;

			const result = await contentRepo.getContentByNodeId(nodeId)();

			if (result._tag === "Left") throw result.left;
			return result.right;
		},
		enabled: !!nodeId,
		staleTime: DEFAULT_STALE_TIME,
	});
};

/**
 * 获取内容版本号
 *
 * @param nodeId - 节点 ID，为空时禁用查询
 */
export const useContentVersion = (nodeId: string | null | undefined) => {
	return useQuery({
		queryKey: queryKeys.contents.version(nodeId ?? ""),
		queryFn: async (): Promise<number | null> => {
			if (!nodeId) return null;

			const result = await contentRepo.getContentVersion(nodeId)();

			if (result._tag === "Left") throw result.left;
			return result.right;
		},
		enabled: !!nodeId,
		staleTime: DEFAULT_STALE_TIME,
	});
};
