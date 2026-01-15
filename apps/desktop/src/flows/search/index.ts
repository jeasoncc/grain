/**
 * @file flows/search/index.ts
 * @description Search Flow 模块统一导出
 *
 * 导出搜索引擎相关的 Flow（包含 IO 操作）。
 *
 * @requirements 1.2, 4.1, 6.2
 */

// 搜索引擎 Flow
export {
	buildSearchIndex,
	search,
	simpleSearch,
	clearSearchIndex,
	searchEngine,
	type SearchEngineState,
	type SearchOptions,
	type SearchResult,
	type SearchResultType,
} from "./search-engine.flow"
