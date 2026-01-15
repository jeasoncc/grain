/**
 * @file fn/search/search.filter.fn.test.ts
 * @description 搜索过滤纯函数测试
 *
 * 包含单元测试和属性测试（Property-Based Testing）
 * 使用 fast-check 进行属性测试
 *
 * @requirements 1.2, 4.1, 6.2
 */

import * as fc from "fast-check"
import { describe, expect, it } from "vitest"
import {
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
	type SearchResult,
	type SearchResultType,
	sortByScore,
	splitQueryTerms,
} from "./search.filter.fn"

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 SearchResult 对象
 */
function createSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
	return {
		id: overrides.id ?? "test-id",
		type: overrides.type ?? "node",
		title: overrides.title ?? "Test Title",
		content: overrides.content ?? "Test Content",
		excerpt: overrides.excerpt ?? "Test Excerpt",
		workspaceId: overrides.workspaceId,
		workspaceTitle: overrides.workspaceTitle,
		score: overrides.score ?? 50,
		highlights: overrides.highlights ?? [],
	}
}

/**
 * 创建测试用的 SearchableItem 对象
 */
function createSearchableItem(overrides: Partial<SearchableItem> = {}): SearchableItem {
	return {
		id: overrides.id ?? "test-id",
		title: overrides.title ?? "Test Title",
		content: overrides.content ?? "Test Content",
		tags: overrides.tags,
		workspaceId: overrides.workspaceId,
	}
}

// ============================================================================
// Unit Tests - matchesQuery
// ============================================================================

describe("matchesQuery", () => {
	it("should match query in title", () => {
		const item = createSearchableItem({ title: "Hello World" })
		expect(matchesQuery(item, "hello")).toBe(true)
	})

	it("should match query in content", () => {
		const item = createSearchableItem({ content: "Hello World" })
		expect(matchesQuery(item, "world")).toBe(true)
	})

	it("should match query in tags", () => {
		const item = createSearchableItem({ tags: ["important", "work"] })
		expect(matchesQuery(item, "important")).toBe(true)
	})

	it("should be case insensitive", () => {
		const item = createSearchableItem({ title: "HELLO" })
		expect(matchesQuery(item, "hello")).toBe(true)
	})

	it("should return false for no match", () => {
		const item = createSearchableItem({
			title: "Title",
			content: "Content",
			tags: ["tag"],
		})
		expect(matchesQuery(item, "notfound")).toBe(false)
	})
})

// ============================================================================
// Unit Tests - matchesRegex
// ============================================================================

describe("matchesRegex", () => {
	it("should match regex pattern in title", () => {
		const item = createSearchableItem({ title: "Hello123" })
		expect(matchesRegex(item, "\\d+")).toBe(true)
	})

	it("should match regex pattern in content", () => {
		const item = createSearchableItem({ content: "test@example.com" })
		expect(matchesRegex(item, "@")).toBe(true)
	})

	it("should return false for invalid regex", () => {
		const item = createSearchableItem({ title: "Test" })
		expect(matchesRegex(item, "[invalid")).toBe(false)
	})

	it("should be case insensitive", () => {
		const item = createSearchableItem({ title: "HELLO" })
		expect(matchesRegex(item, "hello")).toBe(true)
	})
})

// ============================================================================
// Unit Tests - filterByWorkspace
// ============================================================================

describe("filterByWorkspace", () => {
	it("should return all results when workspaceId is undefined", () => {
		const results = [
			createSearchResult({ workspaceId: "ws1" }),
			createSearchResult({ workspaceId: "ws2" }),
		]
		expect(filterByWorkspace(results, undefined)).toHaveLength(2)
	})

	it("should filter by workspaceId", () => {
		const results = [
			createSearchResult({ id: "1", workspaceId: "ws1" }),
			createSearchResult({ id: "2", workspaceId: "ws2" }),
			createSearchResult({ id: "3", workspaceId: "ws1" }),
		]
		const filtered = filterByWorkspace(results, "ws1")
		expect(filtered).toHaveLength(2)
		expect(filtered.every((r) => r.workspaceId === "ws1")).toBe(true)
	})
})

// ============================================================================
// Unit Tests - filterByType
// ============================================================================

describe("filterByType", () => {
	it("should return all results when types is undefined", () => {
		const results = [createSearchResult({ type: "node" }), createSearchResult({ type: "project" })]
		expect(filterByType(results, undefined)).toHaveLength(2)
	})

	it("should return all results when types is empty", () => {
		const results = [createSearchResult({ type: "node" }), createSearchResult({ type: "project" })]
		expect(filterByType(results, [])).toHaveLength(2)
	})

	it("should filter by type", () => {
		const results = [
			createSearchResult({ id: "1", type: "node" }),
			createSearchResult({ id: "2", type: "project" }),
			createSearchResult({ id: "3", type: "node" }),
		]
		const filtered = filterByType(results, ["node"])
		expect(filtered).toHaveLength(2)
		expect(filtered.every((r) => r.type === "node")).toBe(true)
	})

	it("should filter by multiple types", () => {
		const results = [
			createSearchResult({ id: "1", type: "node" }),
			createSearchResult({ id: "2", type: "project" }),
		]
		const filtered = filterByType(results, ["node", "project"])
		expect(filtered).toHaveLength(2)
	})
})

// ============================================================================
// Unit Tests - filterByMinScore
// ============================================================================

describe("filterByMinScore", () => {
	it("should return all results when minScore is undefined", () => {
		const results = [createSearchResult({ score: 10 }), createSearchResult({ score: 50 })]
		expect(filterByMinScore(results, undefined)).toHaveLength(2)
	})

	it("should return all results when minScore is 0", () => {
		const results = [createSearchResult({ score: 10 }), createSearchResult({ score: 50 })]
		expect(filterByMinScore(results, 0)).toHaveLength(2)
	})

	it("should filter by minimum score", () => {
		const results = [
			createSearchResult({ id: "1", score: 10 }),
			createSearchResult({ id: "2", score: 50 }),
			createSearchResult({ id: "3", score: 30 }),
		]
		const filtered = filterByMinScore(results, 25)
		expect(filtered).toHaveLength(2)
		expect(filtered.every((r) => r.score >= 25)).toBe(true)
	})
})

// ============================================================================
// Unit Tests - sortByScore
// ============================================================================

describe("sortByScore", () => {
	it("should sort by score descending", () => {
		const results = [
			createSearchResult({ id: "1", score: 10 }),
			createSearchResult({ id: "2", score: 50 }),
			createSearchResult({ id: "3", score: 30 }),
		]
		const sorted = sortByScore(results)
		expect(sorted[0].score).toBe(50)
		expect(sorted[1].score).toBe(30)
		expect(sorted[2].score).toBe(10)
	})

	it("should handle empty array", () => {
		expect(sortByScore([])).toEqual([])
	})
})

// ============================================================================
// Unit Tests - limitResults
// ============================================================================

describe("limitResults", () => {
	it("should return all results when limit is undefined", () => {
		const results = [createSearchResult({ id: "1" }), createSearchResult({ id: "2" })]
		expect(limitResults(results, undefined)).toHaveLength(2)
	})

	it("should return all results when limit is 0", () => {
		const results = [createSearchResult({ id: "1" }), createSearchResult({ id: "2" })]
		expect(limitResults(results, 0)).toHaveLength(2)
	})

	it("should limit results", () => {
		const results = [
			createSearchResult({ id: "1" }),
			createSearchResult({ id: "2" }),
			createSearchResult({ id: "3" }),
		]
		const limited = limitResults(results, 2)
		expect(limited).toHaveLength(2)
	})
})

// ============================================================================
// Unit Tests - applySearchFilters
// ============================================================================

describe("applySearchFilters", () => {
	it("should apply all filters", () => {
		const results = [
			createSearchResult({
				id: "1",
				type: "node",
				workspaceId: "ws1",
				score: 100,
			}),
			createSearchResult({
				id: "2",
				type: "project",
				workspaceId: "ws1",
				score: 50,
			}),
			createSearchResult({
				id: "3",
				type: "node",
				workspaceId: "ws2",
				score: 80,
			}),
			createSearchResult({
				id: "4",
				type: "node",
				workspaceId: "ws1",
				score: 20,
			}),
		]
		const filtered = applySearchFilters(results, {
			types: ["node"],
			workspaceId: "ws1",
			minScore: 30,
			limit: 1,
		})
		expect(filtered).toHaveLength(1)
		expect(filtered[0].id).toBe("1")
	})

	it("should sort by score before limiting", () => {
		const results = [
			createSearchResult({ id: "1", score: 10 }),
			createSearchResult({ id: "2", score: 50 }),
			createSearchResult({ id: "3", score: 30 }),
		]
		const filtered = applySearchFilters(results, { limit: 2 })
		expect(filtered[0].score).toBe(50)
		expect(filtered[1].score).toBe(30)
	})
})

// ============================================================================
// Unit Tests - Query Normalization
// ============================================================================

describe("normalizeQuery", () => {
	it("should trim whitespace", () => {
		expect(normalizeQuery("  hello  ")).toBe("hello")
	})

	it("should convert to lowercase", () => {
		expect(normalizeQuery("HELLO")).toBe("hello")
	})
})

describe("isEmptyQuery", () => {
	it("should return true for empty string", () => {
		expect(isEmptyQuery("")).toBe(true)
	})

	it("should return true for whitespace only", () => {
		expect(isEmptyQuery("   ")).toBe(true)
	})

	it("should return false for non-empty query", () => {
		expect(isEmptyQuery("hello")).toBe(false)
	})
})

describe("splitQueryTerms", () => {
	it("should split by whitespace", () => {
		expect(splitQueryTerms("hello world")).toEqual(["hello", "world"])
	})

	it("should handle multiple spaces", () => {
		expect(splitQueryTerms("hello   world")).toEqual(["hello", "world"])
	})

	it("should trim and filter empty terms", () => {
		expect(splitQueryTerms("  hello  world  ")).toEqual(["hello", "world"])
	})
})

// ============================================================================
// Property-Based Tests
// ============================================================================

/**
 * 生成有效的 SearchResult 对象
 */
const searchResultArbitrary = (): fc.Arbitrary<SearchResult> =>
	fc.record({
		id: fc.uuid(),
		type: fc.constantFrom<SearchResultType>("node", "project"),
		title: fc.string({ minLength: 1, maxLength: 200 }),
		content: fc.string({ minLength: 0, maxLength: 500 }),
		excerpt: fc.string({ minLength: 0, maxLength: 200 }),
		workspaceId: fc.option(fc.uuid(), { nil: undefined }),
		workspaceTitle: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
			nil: undefined,
		}),
		score: fc.integer({ min: 0, max: 1000 }),
		highlights: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
			maxLength: 5,
		}),
	})

describe("Property-Based Tests", () => {
	/**
	 * **Feature: fp-architecture-refactor, Property 5: sortByScore 按分数降序排序**
	 * **Validates: Requirements 4.1**
	 */
	describe("sortByScore - property based", () => {
		it("should sort results in descending order by score", () => {
			fc.assert(
				fc.property(
					fc.array(searchResultArbitrary(), { minLength: 0, maxLength: 20 }),
					(results) => {
						const sorted = sortByScore(results)
						for (let i = 1; i < sorted.length; i++) {
							if (sorted[i - 1].score < sorted[i].score) {
								return false
							}
						}
						return true
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should preserve all results", () => {
			fc.assert(
				fc.property(
					fc.array(searchResultArbitrary(), { minLength: 0, maxLength: 20 }),
					(results) => {
						const sorted = sortByScore(results)
						return sorted.length === results.length
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	/**
	 * **Feature: fp-architecture-refactor, Property 6: limitResults 不超过指定数量**
	 * **Validates: Requirements 6.2**
	 */
	describe("limitResults - property based", () => {
		it("should never return more than limit", () => {
			fc.assert(
				fc.property(
					fc.array(searchResultArbitrary(), { minLength: 0, maxLength: 50 }),
					fc.integer({ min: 1, max: 100 }),
					(results, limit) => {
						const limited = limitResults(results, limit)
						return limited.length <= limit
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should return all results when limit exceeds array length", () => {
			fc.assert(
				fc.property(
					fc.array(searchResultArbitrary(), { minLength: 0, maxLength: 20 }),
					(results) => {
						const limited = limitResults(results, results.length + 10)
						return limited.length === results.length
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	/**
	 * **Feature: fp-architecture-refactor, Property 7: filterByType 只返回指定类型**
	 * **Validates: Requirements 4.1**
	 */
	describe("filterByType - property based", () => {
		it("should only return results of specified types", () => {
			fc.assert(
				fc.property(
					fc.array(searchResultArbitrary(), { minLength: 0, maxLength: 20 }),
					fc.subarray(["node", "project"] as SearchResultType[], {
						minLength: 1,
					}),
					(results, types) => {
						const filtered = filterByType(results, types)
						return filtered.every((r) => types.includes(r.type))
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	/**
	 * **Feature: fp-architecture-refactor, Property 8: filterByMinScore 只返回分数达标的结果**
	 * **Validates: Requirements 4.1**
	 */
	describe("filterByMinScore - property based", () => {
		it("should only return results with score >= minScore", () => {
			fc.assert(
				fc.property(
					fc.array(searchResultArbitrary(), { minLength: 0, maxLength: 20 }),
					fc.integer({ min: 1, max: 500 }),
					(results, minScore) => {
						const filtered = filterByMinScore(results, minScore)
						return filtered.every((r) => r.score >= minScore)
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	/**
	 * **Feature: fp-architecture-refactor, Property 9: normalizeQuery 总是返回小写字符串**
	 * **Validates: Requirements 1.2**
	 */
	describe("normalizeQuery - property based", () => {
		it("should always return lowercase string", () => {
			fc.assert(
				fc.property(fc.string({ minLength: 0, maxLength: 100 }), (query) => {
					const normalized = normalizeQuery(query)
					return normalized === normalized.toLowerCase()
				}),
				{ numRuns: 100 },
			)
		})

		it("should always return trimmed string", () => {
			fc.assert(
				fc.property(fc.string({ minLength: 0, maxLength: 100 }), (query) => {
					const normalized = normalizeQuery(query)
					return normalized === normalized.trim()
				}),
				{ numRuns: 100 },
			)
		})
	})

	/**
	 * **Feature: fp-architecture-refactor, Property 10: splitQueryTerms 不返回空字符串**
	 * **Validates: Requirements 1.2**
	 */
	describe("splitQueryTerms - property based", () => {
		it("should never return empty strings", () => {
			fc.assert(
				fc.property(fc.string({ minLength: 0, maxLength: 200 }), (query) => {
					const terms = splitQueryTerms(query)
					return terms.every((term) => term.length > 0)
				}),
				{ numRuns: 100 },
			)
		})
	})
})
