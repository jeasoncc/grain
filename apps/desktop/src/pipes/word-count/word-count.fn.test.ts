/**
 * @file word-count.fn.test.ts
 * @description 字数统计纯函数的单元测试
 *
 * 测试覆盖：
 * - 中文字符统计
 * - 英文单词统计
 * - 混合文本统计
 * - Lexical 编辑器状态解析
 * - 格式化输出
 */

import { describe, expect, it } from "vitest"
import {
	countCharacters,
	countChineseChars,
	countEnglishWords,
	countWords,
	countWordsFromLexicalState,
	extractTextFromLexicalState,
	formatWordCount,
	formatWordCountDetail,
	type WordCountResult,
} from "./word-count.fn"

// ============================================================================
// countChineseChars
// ============================================================================

describe("countChineseChars", () => {
	it("should count Chinese characters correctly", () => {
		expect(countChineseChars("你好世界")).toBe(4)
	})

	it("should return 0 for empty string", () => {
		expect(countChineseChars("")).toBe(0)
	})

	it("should return 0 for English only text", () => {
		expect(countChineseChars("Hello World")).toBe(0)
	})

	it("should count only Chinese characters in mixed text", () => {
		expect(countChineseChars("Hello 你好 World 世界")).toBe(4)
	})

	it("should handle CJK punctuation", () => {
		// 中文标点不计入汉字
		expect(countChineseChars("你好，世界！")).toBe(4)
	})

	it("should handle numbers and special characters", () => {
		expect(countChineseChars("测试123测试")).toBe(4)
	})
})

// ============================================================================
// countEnglishWords
// ============================================================================

describe("countEnglishWords", () => {
	it("should count English words correctly", () => {
		expect(countEnglishWords("Hello World")).toBe(2)
	})

	it("should return 0 for empty string", () => {
		expect(countEnglishWords("")).toBe(0)
	})

	it("should return 0 for Chinese only text", () => {
		expect(countEnglishWords("你好世界")).toBe(0)
	})

	it("should count words in mixed text", () => {
		expect(countEnglishWords("Hello 你好 World 世界")).toBe(2)
	})

	it("should handle contractions", () => {
		expect(countEnglishWords("don't can't won't")).toBe(3)
	})

	it("should handle hyphenated words", () => {
		expect(countEnglishWords("well-known self-aware")).toBe(2)
	})

	it("should count numbers as words", () => {
		expect(countEnglishWords("test 123 test")).toBe(3)
	})

	it("should handle multiple spaces", () => {
		expect(countEnglishWords("Hello    World")).toBe(2)
	})
})

// ============================================================================
// countCharacters
// ============================================================================

describe("countCharacters", () => {
	it("should count all characters excluding whitespace", () => {
		expect(countCharacters("Hello World")).toBe(10)
	})

	it("should return 0 for empty string", () => {
		expect(countCharacters("")).toBe(0)
	})

	it("should exclude newlines", () => {
		expect(countCharacters("Hello\nWorld")).toBe(10)
	})

	it("should exclude tabs", () => {
		expect(countCharacters("Hello\tWorld")).toBe(10)
	})

	it("should count Chinese characters", () => {
		expect(countCharacters("你好世界")).toBe(4)
	})

	it("should count mixed text correctly", () => {
		expect(countCharacters("Hello 你好")).toBe(7)
	})
})

// ============================================================================
// countWords
// ============================================================================

describe("countWords", () => {
	describe("chinese mode", () => {
		it("should return correct result for Chinese text", () => {
			const result = countWords("你好世界", "chinese")

			expect(result.chineseChars).toBe(4)
			expect(result.englishWords).toBe(0)
			expect(result.total).toBe(4)
			expect(result.characters).toBe(4)
		})

		it("should combine Chinese chars and English words in total", () => {
			const result = countWords("Hello 你好 World", "chinese")

			expect(result.chineseChars).toBe(2)
			expect(result.englishWords).toBe(2)
			expect(result.total).toBe(4)
		})
	})

	describe("english mode", () => {
		it("should only count English words in total", () => {
			const result = countWords("Hello 你好 World", "english")

			expect(result.chineseChars).toBe(2)
			expect(result.englishWords).toBe(2)
			expect(result.total).toBe(2)
		})
	})

	describe("mixed mode", () => {
		it("should combine Chinese chars and English words", () => {
			const result = countWords("Hello 你好 World 世界", "mixed")

			expect(result.chineseChars).toBe(4)
			expect(result.englishWords).toBe(2)
			expect(result.total).toBe(6)
		})
	})

	it("should default to chinese mode", () => {
		const result = countWords("你好 Hello")

		expect(result.total).toBe(3) // 2 Chinese + 1 English
	})

	it("should handle empty string", () => {
		const result = countWords("")

		expect(result.chineseChars).toBe(0)
		expect(result.englishWords).toBe(0)
		expect(result.total).toBe(0)
		expect(result.characters).toBe(0)
	})
})

// ============================================================================
// extractTextFromLexicalState
// ============================================================================

describe("extractTextFromLexicalState", () => {
	it("should extract text from valid Lexical state", () => {
		const state = {
			root: {
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", text: "Hello World" }],
					},
				],
			},
		}

		expect(extractTextFromLexicalState(state)).toBe("Hello World")
	})

	it("should handle nested nodes", () => {
		const state = {
			root: {
				children: [
					{
						type: "paragraph",
						children: [
							{ type: "text", text: "Hello" },
							{ type: "text", text: "World" },
						],
					},
				],
			},
		}

		expect(extractTextFromLexicalState(state)).toContain("Hello")
		expect(extractTextFromLexicalState(state)).toContain("World")
	})

	it("should return empty string for null input", () => {
		expect(extractTextFromLexicalState(null)).toBe("")
	})

	it("should return empty string for undefined input", () => {
		expect(extractTextFromLexicalState(undefined)).toBe("")
	})

	it("should return empty string for non-object input", () => {
		expect(extractTextFromLexicalState("string")).toBe("")
		expect(extractTextFromLexicalState(123)).toBe("")
	})

	it("should return empty string for object without root", () => {
		expect(extractTextFromLexicalState({})).toBe("")
	})

	it("should return empty string for root without children", () => {
		expect(extractTextFromLexicalState({ root: {} })).toBe("")
	})

	it("should handle multiple paragraphs", () => {
		const state = {
			root: {
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", text: "First" }],
					},
					{
						type: "paragraph",
						children: [{ type: "text", text: "Second" }],
					},
				],
			},
		}

		const result = extractTextFromLexicalState(state)
		expect(result).toContain("First")
		expect(result).toContain("Second")
	})
})

// ============================================================================
// countWordsFromLexicalState
// ============================================================================

describe("countWordsFromLexicalState", () => {
	it("should count words from Lexical state", () => {
		const state = {
			root: {
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", text: "你好 Hello World" }],
					},
				],
			},
		}

		const result = countWordsFromLexicalState(state, "chinese")

		expect(result.chineseChars).toBe(2)
		expect(result.englishWords).toBe(2)
		expect(result.total).toBe(4)
	})

	it("should handle empty Lexical state", () => {
		const result = countWordsFromLexicalState(null)

		expect(result.total).toBe(0)
	})

	it("should default to chinese mode", () => {
		const state = {
			root: {
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", text: "测试" }],
					},
				],
			},
		}

		const result = countWordsFromLexicalState(state)
		expect(result.total).toBe(2)
	})
})

// ============================================================================
// formatWordCount
// ============================================================================

describe("formatWordCount", () => {
	it("should format Chinese mode correctly", () => {
		expect(formatWordCount(100, "chinese")).toBe("100 字")
	})

	it("should format English mode correctly", () => {
		expect(formatWordCount(100, "english")).toBe("100 words")
	})

	it("should format mixed mode correctly", () => {
		expect(formatWordCount(100, "mixed")).toBe("100")
	})

	it("should format large numbers with locale", () => {
		const result = formatWordCount(1000, "chinese")
		expect(result).toContain("1")
		expect(result).toContain("字")
	})

	it("should handle zero", () => {
		expect(formatWordCount(0, "chinese")).toBe("0 字")
	})
})

// ============================================================================
// formatWordCountDetail
// ============================================================================

describe("formatWordCountDetail", () => {
	const createResult = (chineseChars: number, englishWords: number): WordCountResult => ({
		chineseChars,
		englishWords,
		total: chineseChars + englishWords,
		characters: chineseChars + englishWords * 5,
	})

	describe("chinese mode", () => {
		it("should show only Chinese count when no English words", () => {
			const result = createResult(100, 0)
			expect(formatWordCountDetail(result, "chinese")).toBe("100 字")
		})

		it("should show both counts when mixed", () => {
			const result = createResult(100, 50)
			expect(formatWordCountDetail(result, "chinese")).toBe("100 字 + 50 词")
		})
	})

	describe("english mode", () => {
		it("should show only English word count", () => {
			const result = createResult(100, 50)
			expect(formatWordCountDetail(result, "english")).toBe("50 words")
		})
	})

	describe("mixed mode", () => {
		it("should show both counts separated by slash", () => {
			const result = createResult(100, 50)
			expect(formatWordCountDetail(result, "mixed")).toBe("100 字 / 50 words")
		})
	})
})

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
	it("should handle very long text", () => {
		const longText = "测试".repeat(10000) + " test".repeat(10000)
		const result = countWords(longText, "chinese")

		expect(result.chineseChars).toBe(20000)
		expect(result.englishWords).toBe(10000)
	})

	it("should handle special Unicode characters", () => {
		const text = "emoji 😀 测试"
		const result = countWords(text, "chinese")

		expect(result.chineseChars).toBe(2)
		expect(result.englishWords).toBe(1)
	})

	it("should handle newlines and tabs", () => {
		const text = "Hello\n你好\tWorld\n世界"
		const result = countWords(text, "chinese")

		expect(result.chineseChars).toBe(4)
		expect(result.englishWords).toBe(2)
	})

	it("should handle only whitespace", () => {
		const result = countWords("   \n\t  ", "chinese")

		expect(result.total).toBe(0)
	})
})
