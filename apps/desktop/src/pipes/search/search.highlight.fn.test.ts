/**
 * @file fn/search/search.highlight.fn.test.ts
 * @description 搜索高亮纯函数测试
 *
 * 包含单元测试和属性测试（Property-Based Testing）
 * 使用 fast-check 进行属性测试
 *
 * @requirements 1.1, 3.1, 3.2, 3.3
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	calculateSimpleScore,
	extractHighlights,
	extractTextFromContent,
	extractTextFromLexical,
	generateExcerpt,
} from "./search.highlight.fn";

// ============================================================================
// Unit Tests - extractTextFromLexical
// ============================================================================

describe("extractTextFromLexical", () => {
	it("should return empty string for null input", () => {
		expect(extractTextFromLexical(null)).toBe("");
	});

	it("should return empty string for undefined input", () => {
		expect(extractTextFromLexical(undefined)).toBe("");
	});

	it("should return empty string for non-object input", () => {
		expect(extractTextFromLexical("string")).toBe("");
		expect(extractTextFromLexical(123)).toBe("");
	});

	it("should extract text from text node", () => {
		const node = { type: "text", text: "Hello World" };
		expect(extractTextFromLexical(node)).toBe("Hello World");
	});

	it("should handle text node without text property", () => {
		const node = { type: "text" };
		expect(extractTextFromLexical(node)).toBe("");
	});

	it("should recursively extract text from children", () => {
		const node = {
			type: "paragraph",
			children: [
				{ type: "text", text: "Hello" },
				{ type: "text", text: "World" },
			],
		};
		expect(extractTextFromLexical(node)).toBe("Hello World");
	});

	it("should handle nested children", () => {
		const node = {
			type: "root",
			children: [
				{
					type: "paragraph",
					children: [{ type: "text", text: "Nested" }],
				},
			],
		};
		expect(extractTextFromLexical(node)).toBe("Nested");
	});
});

// ============================================================================
// Unit Tests - extractTextFromContent
// ============================================================================

describe("extractTextFromContent", () => {
	it("should return empty string for empty content", () => {
		expect(extractTextFromContent("")).toBe("");
	});

	it("should return original content for invalid JSON", () => {
		expect(extractTextFromContent("not json")).toBe("not json");
	});

	it("should return original content for JSON without root", () => {
		// When JSON is valid but doesn't have a root property, return original content as fallback
		expect(extractTextFromContent('{"data": "test"}')).toBe('{"data": "test"}');
	});

	it("should extract text from valid Lexical JSON", () => {
		const content = JSON.stringify({
			root: {
				type: "root",
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", text: "Hello World" }],
					},
				],
			},
		});
		expect(extractTextFromContent(content)).toBe("Hello World");
	});
});

// ============================================================================
// Unit Tests - generateExcerpt
// ============================================================================

describe("generateExcerpt", () => {
	it("should return truncated content when query not found", () => {
		const content = "This is a long piece of content that should be truncated";
		const excerpt = generateExcerpt(content, "notfound", { contextLength: 20 });
		expect(excerpt).toBe("This is a long piece...");
	});

	it("should return full content if shorter than context length", () => {
		const content = "Short";
		const excerpt = generateExcerpt(content, "notfound", {
			contextLength: 100,
		});
		expect(excerpt).toBe("Short");
	});

	it("should generate excerpt around query match", () => {
		const content = "The quick brown fox jumps over the lazy dog";
		const excerpt = generateExcerpt(content, "fox", { contextLength: 20 });
		expect(excerpt).toContain("fox");
	});

	it("should add ellipsis at start when match is not at beginning", () => {
		const content = "Some text before the match and some after";
		const excerpt = generateExcerpt(content, "match", { contextLength: 10 });
		expect(excerpt.startsWith("...")).toBe(true);
	});

	it("should add ellipsis at end when match is not at end", () => {
		const content = "Some text before the match and some after";
		const excerpt = generateExcerpt(content, "match", { contextLength: 10 });
		expect(excerpt.endsWith("...")).toBe(true);
	});

	it("should be case insensitive", () => {
		const content = "The Quick Brown Fox";
		const excerpt = generateExcerpt(content, "quick", { contextLength: 50 });
		expect(excerpt).toContain("Quick");
	});
});

// ============================================================================
// Unit Tests - extractHighlights
// ============================================================================

describe("extractHighlights", () => {
	it("should return empty array for empty query", () => {
		expect(extractHighlights("content", "")).toEqual([]);
	});

	it("should return empty array for empty content", () => {
		expect(extractHighlights("", "query")).toEqual([]);
	});

	it("should extract highlights around matches", () => {
		const content = "The fox is quick. The fox is brown.";
		const highlights = extractHighlights(content, "fox", { maxHighlights: 2 });
		expect(highlights).toHaveLength(2);
		expect(highlights.every((h) => h.toLowerCase().includes("fox"))).toBe(true);
	});

	it("should respect maxHighlights limit", () => {
		const content = "fox fox fox fox fox";
		const highlights = extractHighlights(content, "fox", { maxHighlights: 2 });
		expect(highlights).toHaveLength(2);
	});

	it("should be case insensitive", () => {
		const content = "The FOX is here";
		const highlights = extractHighlights(content, "fox");
		expect(highlights).toHaveLength(1);
	});
});

// ============================================================================
// Unit Tests - calculateSimpleScore
// ============================================================================

describe("calculateSimpleScore", () => {
	it("should give highest score for exact title match", () => {
		const score = calculateSimpleScore("test", "content", "test");
		expect(score).toBe(100);
	});

	it("should give medium score for title containing query", () => {
		const score = calculateSimpleScore("test title", "content", "test");
		expect(score).toBeGreaterThanOrEqual(50);
	});

	it("should add score for content matches", () => {
		const score = calculateSimpleScore("title", "test test test", "test");
		expect(score).toBe(30); // 3 matches * 10
	});

	it("should combine title and content scores", () => {
		const score = calculateSimpleScore("test title", "test content", "test");
		expect(score).toBeGreaterThan(50); // 50 for title + 10 for content
	});

	it("should be case insensitive", () => {
		const score1 = calculateSimpleScore("TEST", "content", "test");
		const score2 = calculateSimpleScore("test", "content", "TEST");
		expect(score1).toBe(score2);
	});

	it("should return 0 for no matches", () => {
		const score = calculateSimpleScore("title", "content", "notfound");
		expect(score).toBe(0);
	});
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe("Property-Based Tests", () => {
	/**
	 * **Feature: fp-architecture-refactor, Property 1: extractTextFromContent 对空输入返回空字符串**
	 * **Validates: Requirements 3.1**
	 */
	describe("extractTextFromContent - property based", () => {
		it("should always return a string", () => {
			fc.assert(
				fc.property(fc.string(), (content) => {
					const result = extractTextFromContent(content);
					return typeof result === "string";
				}),
				{ numRuns: 100 },
			);
		});

		it("should return empty string for empty input", () => {
			expect(extractTextFromContent("")).toBe("");
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 2: generateExcerpt 总是返回字符串**
	 * **Validates: Requirements 3.2**
	 */
	describe("generateExcerpt - property based", () => {
		it("should always return a string", () => {
			fc.assert(
				fc.property(
					fc.string({ minLength: 0, maxLength: 1000 }),
					fc.string({ minLength: 1, maxLength: 50 }),
					fc.integer({ min: 10, max: 200 }),
					(content, query, contextLength) => {
						const result = generateExcerpt(content, query, { contextLength });
						return typeof result === "string";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should never exceed content length plus ellipsis", () => {
			fc.assert(
				fc.property(
					fc.string({ minLength: 1, maxLength: 500 }),
					fc.string({ minLength: 1, maxLength: 20 }),
					(content, query) => {
						const result = generateExcerpt(content, query, {
							contextLength: 100,
						});
						// 结果长度不应超过内容长度 + 6（两个省略号）
						return result.length <= content.length + 6;
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 3: extractHighlights 返回的数量不超过 maxHighlights**
	 * **Validates: Requirements 3.3**
	 */
	describe("extractHighlights - property based", () => {
		it("should never return more than maxHighlights", () => {
			fc.assert(
				fc.property(
					fc.string({ minLength: 0, maxLength: 500 }),
					fc.string({ minLength: 1, maxLength: 20 }),
					fc.integer({ min: 1, max: 10 }),
					(content, query, maxHighlights) => {
						const result = extractHighlights(content, query, { maxHighlights });
						return result.length <= maxHighlights;
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return empty array for empty query", () => {
			fc.assert(
				fc.property(fc.string({ minLength: 0, maxLength: 500 }), (content) => {
					const result = extractHighlights(content, "");
					return result.length === 0;
				}),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 4: calculateSimpleScore 总是返回非负数**
	 * **Validates: Requirements 3.1**
	 */
	describe("calculateSimpleScore - property based", () => {
		it("should always return non-negative score", () => {
			fc.assert(
				fc.property(
					fc.string({ minLength: 0, maxLength: 200 }),
					fc.string({ minLength: 0, maxLength: 500 }),
					fc.string({ minLength: 1, maxLength: 50 }),
					(title, content, query) => {
						const score = calculateSimpleScore(title, content, query);
						return score >= 0;
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should give exact title match the highest base score", () => {
			fc.assert(
				fc.property(
					fc.string({ minLength: 1, maxLength: 50 }),
					fc.string({ minLength: 0, maxLength: 200 }),
					(query, content) => {
						const exactScore = calculateSimpleScore(query, content, query);
						// 精确匹配应该至少得到 100 分
						return exactScore >= 100;
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
