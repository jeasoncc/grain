/**
 * SearchPanel 类型定义
 */

import type { SearchResult, SearchResultType } from "@/pipes/search";
import type { SearchPanelState } from "@/types/sidebar";

/**
 * SearchPanel View 组件 Props
 */
export interface SearchPanelViewProps {
	/** 搜索状态 */
	readonly searchState: SearchPanelState;
	/** 搜索结果 */
	readonly results: readonly SearchResult[];
	/** 是否正在加载 */
	readonly loading: boolean;
	/** 设置搜索查询回调 */
	readonly onSetSearchQuery: (query: string) => void;
	/** 切换类型过滤回调 */
	readonly onToggleType: (type: SearchResultType) => void;
	/** 设置显示过滤器回调 */
	readonly onSetSearchShowFilters: (show: boolean) => void;
	/** 选择结果回调 */
	readonly onSelectResult: (result: SearchResult) => void;
}

/**
 * SearchPanel Container 组件 Props
 */
export type SearchPanelContainerProps = {};

/**
 * ResultGroup 组件 Props
 */
export interface ResultGroupProps {
	readonly type: SearchResultType;
	readonly results: readonly SearchResult[];
	readonly query: string;
	readonly onSelect: (result: SearchResult) => void;
	readonly highlightText: (text: string, query: string) => React.ReactNode;
}
