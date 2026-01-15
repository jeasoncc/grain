/**
 * Global Search 类型定义
 */

/**
 * 搜索结果类型
 */
export type SearchResultType = "project" | "node"

/**
 * 搜索结果
 */
export interface SearchResult {
	readonly id: string
	readonly type: SearchResultType
	readonly title: string
	readonly content: string
	readonly excerpt: string
	readonly workspaceId?: string
	readonly workspaceTitle?: string
	readonly score: number
	readonly highlights: readonly string[]
}

/**
 * 搜索选项
 */
export interface SearchOptions {
	readonly limit?: number
}

/**
 * Global Search View Props
 */
export interface GlobalSearchViewProps {
	/** 是否打开 */
	readonly open: boolean
	/** 搜索关键词 */
	readonly query: string
	/** 搜索结果 */
	readonly results: readonly SearchResult[]
	/** 是否加载中 */
	readonly loading: boolean
	/** 当前选中索引 */
	readonly selectedIndex: number
	/** 打开状态变化回调 */
	readonly onOpenChange: (open: boolean) => void
	/** 搜索关键词变化回调 */
	readonly onQueryChange: (query: string) => void
	/** 选择结果回调 */
	readonly onSelectResult: (result: SearchResult) => void
	/** 键盘事件回调 */
	readonly onKeyDown: (e: React.KeyboardEvent) => void
}

/**
 * Global Search Container Props
 */
export interface GlobalSearchContainerProps {
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
}
