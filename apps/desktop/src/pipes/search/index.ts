/**
 * @file fn/search/index.ts
 * @description Search 纯函数模块统一导出
 *
 * 导出所有搜索相关的纯函数。
 * 这些函数无副作用，可组合，可测试。
 *
 * @requirements 1.1, 1.2, 3.1, 3.2, 3.3, 4.1, 6.2
 */

// 搜索引擎（实际实现在 flows/search/，此处保留导出用于向后兼容）
export {
	SearchEngine,
	type SearchOptions,
	type SearchResult,
	type SearchResultType,
	searchEngine,
} from "@/flows/search/search-engine.flow";
// 过滤相关函数
export {
	applySearchFilters,
	filterByMinScore,
	filterByType,
	filterByWorkspace,
	isEmptyQuery,
	limitResults,
	matchesQuery,
	matchesRegex,
	normalizeQuery,
	type SearchableItem,
	type SearchFilterOptions,
	type SearchResult as FilterSearchResult,
	type SearchResultType as FilterSearchResultType,
	sortByScore,
	splitQueryTerms,
} from "./search.filter.fn";
// 高亮相关函数
export {
	calculateSimpleScore,
	type ExcerptOptions,
	extractHighlights,
	extractTextFromContent,
	extractTextFromLexical,
	generateExcerpt,
	type HighlightOptions,
} from "./search.highlight.fn";
