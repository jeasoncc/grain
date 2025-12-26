/**
 * 搜索面板 - Container 组件
 *
 * 容器组件：连接 hooks/stores，处理业务逻辑
 */

import { useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useState } from "react";
import type { SearchResult, SearchResultType } from "@/fn/search";
import { searchEngine } from "@/fn/search";
import { useSidebarStore } from "@/stores/sidebar.store";
import { SearchPanelView } from "./search-panel.view.fn";

export const SearchPanelContainer = memo(() => {
	const navigate = useNavigate();

	// 连接 sidebar store
	const searchState = useSidebarStore((s) => s.searchState);
	const setSearchQuery = useSidebarStore((s) => s.setSearchQuery);
	const setSearchSelectedTypes = useSidebarStore((s) => s.setSearchSelectedTypes);
	const setSearchShowFilters = useSidebarStore((s) => s.setSearchShowFilters);

	// 本地状态：搜索结果和加载状态
	const [results, setResults] = useState<SearchResult[]>([]);
	const [loading, setLoading] = useState(false);

	// 执行搜索
	const performSearch = useCallback(
		async (searchQuery: string) => {
			if (!searchQuery.trim()) {
				setResults([]);
				return;
			}

			setLoading(true);
			try {
				const searchResults = await searchEngine.simpleSearch(searchQuery, {
					types: searchState.selectedTypes as SearchResultType[],
					limit: 100,
				});
				setResults(searchResults);
			} catch (error) {
				console.error("Search failed:", error);
				setResults([]);
			} finally {
				setLoading(false);
			}
		},
		[searchState.selectedTypes],
	);

	// 防抖搜索
	useEffect(() => {
		const timer = setTimeout(() => {
			performSearch(searchState.query);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchState.query, performSearch]);

	// 选择结果
	const handleSelectResult = useCallback(
		(result: SearchResult) => {
			switch (result.type) {
				case "node":
				case "project":
					// Navigate to Home
					navigate({ to: "/" });
					break;
			}
		},
		[navigate],
	);

	// 切换类型过滤
	const handleToggleType = useCallback(
		(type: SearchResultType) => {
			const newTypes = searchState.selectedTypes.includes(type)
				? searchState.selectedTypes.filter((t) => t !== type)
				: [...searchState.selectedTypes, type];
			setSearchSelectedTypes(newTypes);
		},
		[searchState.selectedTypes, setSearchSelectedTypes],
	);

	return (
		<SearchPanelView
			searchState={searchState}
			results={results}
			loading={loading}
			onSetSearchQuery={setSearchQuery}
			onToggleType={handleToggleType}
			onSetSearchShowFilters={setSearchShowFilters}
			onSelectResult={handleSelectResult}
		/>
	);
});

SearchPanelContainer.displayName = "SearchPanelContainer";
