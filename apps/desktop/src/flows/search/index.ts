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
	SearchEngine,
	type SearchOptions,
	type SearchResult,
	type SearchResultType,
	searchEngine,
} from "./search-engine.flow";
