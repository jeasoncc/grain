/**
 * @file fn/search/index.ts
 * @description Search 纯函数模块统一导出
 *
 * 导出所有搜索相关的纯函数。
 * 这些函数无副作用，可组合，可测试。
 *
 * 注意：SearchEngine 类已移动到 flows/search/search-engine.flow.ts
 * 请直接从 @/flows/search 导入 SearchEngine
 *
 * @requirements 1.1, 1.2, 3.1, 3.2, 3.3, 4.1, 6.2
 */

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
	type SearchResult,
	type SearchResultType,
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
