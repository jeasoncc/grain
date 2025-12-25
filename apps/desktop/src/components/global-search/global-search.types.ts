/**
 * Global Search 类型定义
 */

/**
 * 搜索结果类型
 */
export type SearchResultType = "project" | "node";

/**
 * 搜索结果
 */
export interface SearchResult {
	readonly id: string;
	readonly type: SearchResultType;
	readonly title: string;
	readonly content: string;
	readonly excerpt: string;
	readonly workspaceId?: string;
	readonly workspaceTitle?: string;
	readonly score: number;
	readonly highlights: string[];
}

/**
 * 搜索选项
 */
export interface SearchOptions {
	readonly limit?: number;
}

/**
 * Global Search View Props
 */
export interface GlobalSearchViewProps {
	/** 是否打开 */
	readonly open: boolean;
	/** 打开状态变化回调 */
	readonly onOpenChange: (open: boolean) => void;
	/** 搜索函数 */
	readonly onSearch: (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
}

/**
 * Global Search Container Props
 */
export interface GlobalSearchContainerProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}
