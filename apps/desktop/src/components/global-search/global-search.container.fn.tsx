/**
 * Global Search 连接组件
 *
 * 连接层：提供搜索逻辑，将纯展示组件连接到搜索引擎
 */

import { memo, useCallback } from "react";
import { searchEngine } from "@/fn/search";
import { GlobalSearchView } from "./global-search.view.fn";
import type { GlobalSearchContainerProps, SearchOptions, SearchResult } from "./global-search.types";

/**
 * Global Search 连接组件
 *
 * 负责搜索逻辑，将搜索结果传递给纯展示组件
 */
export const GlobalSearchContainer = memo(({
	open,
	onOpenChange,
}: GlobalSearchContainerProps) => {
	// 搜索函数
	const handleSearch = useCallback(
		async (query: string, options?: SearchOptions): Promise<SearchResult[]> => {
			// 使用简单搜索（更快，适合实时搜索）
			return searchEngine.simpleSearch(query, {
				limit: options?.limit || 30,
			});
		},
		[],
	);

	return (
		<GlobalSearchView
			open={open}
			onOpenChange={onOpenChange}
			onSearch={handleSearch}
		/>
	);
});

GlobalSearchContainer.displayName = "GlobalSearchContainer";
