/**
 * @file pipes/search/search.engine.fn.ts
 * @description 兼容层 - 重导出 flows/search/search-engine.flow.ts
 *
 * 此文件保留用于向后兼容。
 * 实际实现已移动到 flows/search/search-engine.flow.ts
 *
 * @deprecated 请直接从 @/flows/search 导入
 */

export {
	SearchEngine,
	type SearchOptions,
	type SearchResult,
	type SearchResultType,
	searchEngine,
} from "@/flows/search/search-engine.flow";
