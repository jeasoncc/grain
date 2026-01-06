/**
 * @file fn/search/search.filter.fn.ts
 * @description 搜索过滤相关纯函数
 *
 * 包含搜索结果过滤、排序、匹配等纯函数。
 * 所有函数无副作用，相同输入产生相同输出。
 *
 * @requirements 1.2, 4.1, 6.2
 */

import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";
import * as N from "fp-ts/number";
import * as O from "fp-ts/Option";
import { contramap, reverse } from "fp-ts/Ord";

// ============================================================================
// Types
// ============================================================================

/**
 * 搜索结果类型
 */
export type SearchResultType = "project" | "node";

/**
 * 搜索结果接口
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
 * 可搜索项接口
 */
export interface SearchableItem {
	readonly id: string;
	readonly title: string;
	readonly content: string;
	readonly tags?: string[];
	readonly workspaceId?: string;
}

/**
 * 搜索过滤选项
 */
export interface SearchFilterOptions {
	readonly types?: SearchResultType[];
	readonly workspaceId?: string;
	readonly limit?: number;
	readonly minScore?: number;
}

// ============================================================================
// Ord Instances for Sorting
// ============================================================================

/**
 * 按分数降序排序的 Ord 实例
 */
const byScoreDesc = pipe(
	N.Ord,
	contramap((r: SearchResult) => r.score),
	reverse,
);

// ============================================================================
// Matching Functions
// ============================================================================

/**
 * 检查项目是否匹配搜索查询（不区分大小写）
 *
 * @param item - 可搜索项
 * @param query - 搜索查询
 * @returns 如果项目匹配查询则返回 true
 */
export const matchesQuery = (item: SearchableItem, query: string): boolean => {
	const lowerQuery = query.toLowerCase();

	// 检查标题
	if (item.title.toLowerCase().includes(lowerQuery)) {
		return true;
	}

	// 检查内容
	if (item.content.toLowerCase().includes(lowerQuery)) {
		return true;
	}

	// 检查标签
	if (item.tags) {
		const tagsStr = item.tags.join(" ").toLowerCase();
		if (tagsStr.includes(lowerQuery)) {
			return true;
		}
	}

	return false;
};

/**
 * 检查项目是否匹配正则表达式查询
 *
 * @param item - 可搜索项
 * @param pattern - 正则表达式模式
 * @returns 如果项目匹配模式则返回 true
 */
export const matchesRegex = (
	item: SearchableItem,
	pattern: string,
): boolean => {
	return pipe(
		O.tryCatch(() => new RegExp(pattern, "i")),
		O.map((regex) => {
			if (regex.test(item.title)) return true;
			if (regex.test(item.content)) return true;
			if (item.tags && regex.test(item.tags.join(" "))) return true;
			return false;
		}),
		O.getOrElse(() => false),
	);
};

// ============================================================================
// Filtering Functions
// ============================================================================

/**
 * 按工作区 ID 过滤搜索结果
 *
 * @param results - 搜索结果数组
 * @param workspaceId - 要过滤的工作区 ID
 * @returns 过滤后的搜索结果
 */
export const filterByWorkspace = (
	results: SearchResult[],
	workspaceId: string | undefined,
): SearchResult[] => {
	if (!workspaceId) return results;

	return pipe(
		results,
		A.filter((r) => r.workspaceId === workspaceId),
	);
};

/**
 * 按结果类型过滤搜索结果
 *
 * @param results - 搜索结果数组
 * @param types - 要包含的类型数组
 * @returns 过滤后的搜索结果
 */
export const filterByType = (
	results: SearchResult[],
	types: SearchResultType[] | undefined,
): SearchResult[] => {
	if (!types || types.length === 0) return results;

	return pipe(
		results,
		A.filter((r) => types.includes(r.type)),
	);
};

/**
 * 按最小分数过滤搜索结果
 *
 * @param results - 搜索结果数组
 * @param minScore - 最小分数阈值
 * @returns 过滤后的搜索结果
 */
export const filterByMinScore = (
	results: SearchResult[],
	minScore: number | undefined,
): SearchResult[] => {
	if (minScore === undefined || minScore <= 0) return results;

	return pipe(
		results,
		A.filter((r) => r.score >= minScore),
	);
};

// ============================================================================
// Sorting Functions
// ============================================================================

/**
 * 按分数降序排序搜索结果
 *
 * @param results - 搜索结果数组
 * @returns 排序后的搜索结果
 */
export const sortByScore = (results: SearchResult[]): SearchResult[] => {
	return pipe(results, A.sort(byScoreDesc));
};

// ============================================================================
// Limiting Functions
// ============================================================================

/**
 * 限制搜索结果数量
 *
 * @param results - 搜索结果数组
 * @param limit - 最大结果数
 * @returns 限制后的搜索结果
 */
export const limitResults = (
	results: SearchResult[],
	limit: number | undefined,
): SearchResult[] => {
	if (!limit || limit <= 0) return results;

	return pipe(results, A.takeLeft(limit));
};

// ============================================================================
// Combined Filter Functions
// ============================================================================

/**
 * 应用所有过滤选项到搜索结果
 *
 * @param results - 搜索结果数组
 * @param options - 过滤选项
 * @returns 过滤、排序、限制后的搜索结果
 */
export const applySearchFilters = (
	results: SearchResult[],
	options: SearchFilterOptions = {},
): SearchResult[] => {
	const { types, workspaceId, limit, minScore } = options;

	return pipe(
		results,
		(r) => filterByType(r, types),
		(r) => filterByWorkspace(r, workspaceId),
		(r) => filterByMinScore(r, minScore),
		sortByScore,
		(r) => limitResults(r, limit),
	);
};

// ============================================================================
// Query Normalization Functions
// ============================================================================

/**
 * 规范化搜索查询
 *
 * @param query - 原始查询字符串
 * @returns 规范化后的查询字符串
 */
export const normalizeQuery = (query: string): string => {
	return query.trim().toLowerCase();
};

/**
 * 检查查询是否为空或无效
 *
 * @param query - 查询字符串
 * @returns 如果查询为空或无效则返回 true
 */
export const isEmptyQuery = (query: string): boolean => {
	return !query || query.trim().length === 0;
};

/**
 * 将查询拆分为多个搜索词
 *
 * @param query - 查询字符串
 * @returns 搜索词数组
 */
export const splitQueryTerms = (query: string): string[] => {
	return pipe(
		query.trim().split(/\s+/),
		A.filter((term) => term.length > 0),
	);
};
