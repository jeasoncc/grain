/**
 * Tag TanStack Query Hooks
 *
 * 使用 TanStack Query 包装 Repository 层的 TaskEither。
 *
 * 设计原则：
 * - 读取操作使用 useQuery
 * - 写入操作使用纯 TaskEither 管道（在 actions 中）
 */

import { useQuery } from "@tanstack/react-query";
import * as E from "fp-ts/Either";
import * as tagRepo from "@/repo/tag.repo.fn";
import type { TagInterface } from "@/types/tag";
import type { TagGraphData } from "@/types/codec";
import { queryKeys } from "./query-keys";

/**
 * 获取工作区所有标签
 */
export const useTagsByWorkspace = (workspaceId: string | null | undefined) => {
	return useQuery({
		enabled: !!workspaceId,
		queryKey: queryKeys.tags.byWorkspace(workspaceId ?? ""),
		queryFn: async (): Promise<TagInterface[]> => {
			if (!workspaceId) return [];
			const result = await tagRepo.getTagsByWorkspace(workspaceId)();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			return result.right;
		},
	});
};

/**
 * 获取单个标签
 */
export const useTag = (tagId: string | null | undefined) => {
	return useQuery({
		enabled: !!tagId,
		queryKey: queryKeys.tags.detail(tagId ?? ""),
		queryFn: async (): Promise<TagInterface | null> => {
			if (!tagId) return null;
			const result = await tagRepo.getTag(tagId)();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			return result.right;
		},
	});
};

/**
 * 按名称获取标签
 */
export const useTagByName = (
	workspaceId: string | null | undefined,
	name: string | null | undefined,
) => {
	return useQuery({
		enabled: !!workspaceId && !!name,
		queryKey: queryKeys.tags.byName(workspaceId ?? "", name ?? ""),
		queryFn: async (): Promise<TagInterface | null> => {
			if (!workspaceId || !name) return null;
			const result = await tagRepo.getTagByName(workspaceId, name)();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			return result.right;
		},
	});
};

/**
 * 获取热门标签
 */
export const useTopTags = (
	workspaceId: string | null | undefined,
	limit = 10,
) => {
	return useQuery({
		enabled: !!workspaceId,
		queryKey: queryKeys.tags.top(workspaceId ?? "", limit),
		queryFn: async (): Promise<TagInterface[]> => {
			if (!workspaceId) return [];
			const result = await tagRepo.getTopTags(workspaceId, limit)();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			return result.right;
		},
	});
};

/**
 * 搜索标签
 */
export const useTagSearch = (
	workspaceId: string | null | undefined,
	query: string | null | undefined,
) => {
	return useQuery({
		enabled: !!workspaceId && !!query,
		queryKey: queryKeys.tags.search(workspaceId ?? "", query ?? ""),
		queryFn: async (): Promise<TagInterface[]> => {
			if (!workspaceId || !query) return [];
			const result = await tagRepo.searchTags(workspaceId, query)();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			return result.right;
		},
	});
};

/**
 * 获取包含指定标签的节点 ID 列表
 */
export const useNodesByTag = (
	workspaceId: string | null | undefined,
	tagName: string | null | undefined,
) => {
	return useQuery({
		enabled: !!workspaceId && !!tagName,
		queryKey: queryKeys.tags.nodesByTag(workspaceId ?? "", tagName ?? ""),
		queryFn: async (): Promise<string[]> => {
			if (!workspaceId || !tagName) return [];
			const result = await tagRepo.getNodesByTag(workspaceId, tagName)();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			return result.right;
		},
	});
};

/**
 * 获取标签图形数据
 */
export const useTagGraph = (workspaceId: string | null | undefined) => {
	return useQuery({
		enabled: !!workspaceId,
		queryKey: queryKeys.tags.graph(workspaceId ?? ""),
		queryFn: async (): Promise<TagGraphData> => {
			if (!workspaceId) return { nodes: [], edges: [] };
			const result = await tagRepo.getTagGraphData(workspaceId)();
			if (E.isLeft(result)) {
				throw new Error(result.left.message);
			}
			return result.right;
		},
	});
};
