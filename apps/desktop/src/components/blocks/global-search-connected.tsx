/**
 * Global Search 连接组件
 *
 * 连接层：提供搜索逻辑，将纯展示组件连接到搜索引擎
 */

import { useCallback } from "react";
import { searchEngine } from "@/domain/search";
import {
	GlobalSearch,
	type SearchOptions,
	type SearchResult,
} from "./global-search";

interface GlobalSearchConnectedProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Global Search 连接组件
 *
 * 负责搜索逻辑，将搜索结果传递给纯展示组件
 */
export function GlobalSearchConnected({
	open,
	onOpenChange,
}: GlobalSearchConnectedProps) {
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
		<GlobalSearch
			open={open}
			onOpenChange={onOpenChange}
			onSearch={handleSearch}
		/>
	);
}
