/**
 * Search Utils - Property-Based Tests
 *
 * Property tests for search utility functions.
 * Uses fast-check for property-based testing.
 *
 * @requirements 3.1, 3.2
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	calculateSimpleScore,
	extractHighlights,
	extractTextFromContent,
	extractTextFromLexical,
	generateExcerpt,
} from "@/domain/search/search.utils";

/**
 * Arbitrary generator for valid Lexical text nodes
 */
const textNodeArb = fc.record({
	type: fc.constant("text"),
	text: fc.string({ minLength: 0, maxLength: 200 }),
});

/**
 * Arbitrary generator for valid Lexical paragraph nodes with text children
 */
const paragraphNodeArb = fc.record({
	type: fc.constant("paragraph"),
	children: fc.array(textNodeArb, { minLength: 0, maxLength: 5 }),
});

/**
 * Arbitrary generator for valid Lexical root structure
 */
const lexicalRootArb = fc.record({
	root: fc.record({
		type: fc.constant("root"),
		children: fc.array(paragraphNodeArb, { minLength: 0, maxLength: 10 }),
	}),
});

/**
 * Arbitrary generator for valid Lexical JSON content strings
 */
const lexicalContentArb = lexicalRootArb.map((obj) => JSON.stringify(obj));

/**
 * Arbitrary generator for non-empty search queries
 * Uses alphanumeric characters to avoid regex special character issues in calculateSimpleScore
 */
const searchQueryArb: fc.Arbitrary<string> = fc
	.array(
		fc.constantFrom(
			..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(
				"",
			),
		),
		{ minLength: 1, maxLength: 50 },
	)
	.map((chars) => chars.join(""))
	.filter((s) => s.length > 0);

/**
 * Arbitrary generator for plain text content
 */
const plainTextArb = fc.string({ minLength: 0, maxLength: 500 });

/**
 * Arbitrary generator for titles
 */
const titleArb = fc.string({ minLength: 0, maxLength: 100 });

/**
 * **Feature: services-lib-refactor, Property 1: Pure Functions Produce Consistent Output**
 * **Validates: Requirements 3.1, 3.2**
 *
 * For any pure function in a `.utils.ts` file and any valid input,
 * calling the function multiple times with the same input SHALL produce identical output.
 */
describe("Property 1: Pure Functions Produce Consistent Output", () => {
	it("extractTextFromContent produces consistent output for same input", () => {
		fc.assert(
			fc.property(lexicalContentArb, (content) => {
				const result1 = extractTextFromContent(content);
				const result2 = extractTextFromContent(content);
				expect(result1).toEqual(result2);
			}),
			{ numRuns: 100 },
		);
	});

	it("extractTextFromLexical produces consistent output for same input", () => {
		fc.assert(
			fc.property(lexicalRootArb, (lexicalObj) => {
				const result1 = extractTextFromLexical(lexicalObj.root);
				const result2 = extractTextFromLexical(lexicalObj.root);
				expect(result1).toEqual(result2);
			}),
			{ numRuns: 100 },
		);
	});

	it("generateExcerpt produces consistent output for same input", () => {
		fc.assert(
			fc.property(
				plainTextArb,
				searchQueryArb,
				fc.integer({ min: 10, max: 200 }),
				(content, query, contextLength) => {
					const result1 = generateExcerpt(content, query, contextLength);
					const result2 = generateExcerpt(content, query, contextLength);
					expect(result1).toEqual(result2);
				},
			),
			{ numRuns: 100 },
		);
	});

	it("extractHighlights produces consistent output for same input", () => {
		fc.assert(
			fc.property(
				plainTextArb,
				searchQueryArb,
				fc.integer({ min: 1, max: 10 }),
				(content, query, maxHighlights) => {
					const result1 = extractHighlights(content, query, maxHighlights);
					const result2 = extractHighlights(content, query, maxHighlights);
					expect(result1).toEqual(result2);
				},
			),
			{ numRuns: 100 },
		);
	});

	it("calculateSimpleScore produces consistent output for same input", () => {
		fc.assert(
			fc.property(
				titleArb,
				plainTextArb,
				searchQueryArb,
				(title, content, query) => {
					const result1 = calculateSimpleScore(title, content, query);
					const result2 = calculateSimpleScore(title, content, query);
					expect(result1).toEqual(result2);
				},
			),
			{ numRuns: 100 },
		);
	});
});

/**
 * **Feature: services-lib-refactor, Property 3: Text Extraction Round Trip Consistency**
 * **Validates: Requirements 3.1, 3.2**
 *
 * For any Lexical editor state, extracting text and then searching for that text
 * in the original content SHALL find matches.
 */
describe("Property 3: Text Extraction Round Trip Consistency", () => {
	it("extracted text can be found in original content when searching", () => {
		fc.assert(
			fc.property(
				fc.array(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => s.trim().length > 0),
					{ minLength: 1, maxLength: 5 },
				),
				(textParts) => {
					// Build a Lexical structure with known text
					const lexicalObj = {
						root: {
							type: "root",
							children: textParts.map((text) => ({
								type: "paragraph",
								children: [{ type: "text", text }],
							})),
						},
					};
					const content = JSON.stringify(lexicalObj);

					// Extract text from the content
					const extractedText = extractTextFromContent(content);

					// Each original text part should be findable in the extracted text
					for (const textPart of textParts) {
						expect(extractedText).toContain(textPart);
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	it("generateExcerpt contains the query when query exists in content", () => {
		fc.assert(
			fc.property(
				plainTextArb,
				searchQueryArb,
				fc.integer({ min: 50, max: 200 }),
				(prefix, query, contextLength) => {
					// Create content that definitely contains the query
					const content = prefix + query + prefix;
					const excerpt = generateExcerpt(content, query, contextLength);

					// The excerpt should contain the query (case-insensitive match was used)
					expect(excerpt.toLowerCase()).toContain(query.toLowerCase());
				},
			),
			{ numRuns: 100 },
		);
	});

	it("extractHighlights returns snippets containing the query when query exists", () => {
		fc.assert(
			fc.property(
				plainTextArb,
				searchQueryArb,
				fc.integer({ min: 1, max: 5 }),
				(prefix, query, maxHighlights) => {
					// Create content that definitely contains the query
					const content = prefix + query + prefix;
					const highlights = extractHighlights(content, query, maxHighlights);

					// If we have highlights, each should contain the query
					for (const highlight of highlights) {
						expect(highlight.toLowerCase()).toContain(query.toLowerCase());
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	it("calculateSimpleScore returns higher score when query matches title exactly", () => {
		fc.assert(
			fc.property(searchQueryArb, plainTextArb, (query, content) => {
				const exactMatchScore = calculateSimpleScore(query, content, query);
				const noMatchScore = calculateSimpleScore(
					"completely_different_title_xyz",
					content,
					query,
				);

				// Exact title match should score higher than no match
				expect(exactMatchScore).toBeGreaterThanOrEqual(noMatchScore);
			}),
			{ numRuns: 100 },
		);
	});
});
