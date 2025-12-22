/**
 * Global Search Dialog 连接组件
 *
 * 连接层：提供搜索逻辑，将纯展示组件连接到搜索引擎
 */

import { useCallback } from "react";
import { searchEngine } from "@/domain/search";
import {
	GlobalSearchDialog,
	type SearchOptions,
	type SearchResult,
} from "./global-search-dialog";

interface GlobalSearchDialogConnectedProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	workspaceId?: string;
}

/**
 * Global Search Dialog 连接组件
 *
 * 负责搜索逻辑，将搜索结果传递给纯展示组件
 */
export function GlobalSearchDialogConnected({
	open,
	onOpenChange,
	workspaceId,
}: GlobalSearchDialogConnectedProps) {
	// 搜索函数
	const handleSearch = useCallback(
		async (query: string, options?: SearchOptions): Promise<SearchResult[]> => {
			return searchEngine.simpleSearch(query, {
				workspaceId: options?.workspaceId,
				limit: options?.limit || 50,
			});
		},
		[],
	);

	return (
		<GlobalSearchDialog
			open={open}
			onOpenChange={onOpenChange}
			workspaceId={workspaceId}
			onSearch={handleSearch}
		/>
	);
}
