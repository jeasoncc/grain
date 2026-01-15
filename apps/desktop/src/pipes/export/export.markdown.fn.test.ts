/**
 * @file fn/export/export.markdown.fn.test.ts
 * @description Markdown 导出函数的单元测试
 */

import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import {
	createDocument,
	createHeadingNode,
	createListNode,
	createParagraphNode,
	createTagNode,
	createTagsLine,
	createTextNode,
	type LexicalTextNode,
} from "../content/content.generate.fn"
import {
	applyTextFormat,
	convertDocumentToMarkdown,
	convertHeadingNode,
	convertInlineNodes,
	convertListItemNode,
	convertListNode,
	convertParagraphNode,
	convertTagNode,
	convertTextNode,
	exportMultipleToMarkdown,
	exportToMarkdown,
	generateFrontMatter,
} from "./export.markdown.fn"

describe("export.markdown.fn", () => {
	// ==============================
	// Text Formatting Tests
	// ==============================

	describe("applyTextFormat", () => {
		it("should return text unchanged when format is 0", () => {
			expect(applyTextFormat("hello", 0)).toBe("hello")
		})

		it("should apply bold formatting", () => {
			expect(applyTextFormat("hello", 1)).toBe("**hello**")
		})

		it("should apply italic formatting", () => {
			expect(applyTextFormat("hello", 2)).toBe("*hello*")
		})

		it("should apply strikethrough formatting", () => {
			expect(applyTextFormat("hello", 4)).toBe("~~hello~~")
		})

		it("should apply code formatting", () => {
			expect(applyTextFormat("hello", 16)).toBe("`hello`")
		})

		it("should apply multiple formats", () => {
			// Bold + Italic = 3
			expect(applyTextFormat("hello", 3)).toBe("***hello***")
		})

		it("should handle empty text", () => {
			expect(applyTextFormat("", 1)).toBe("")
		})
	})

	// ==============================
	// Node Conversion Tests
	// ==============================

	describe("convertTextNode", () => {
		it("should convert plain text node", () => {
			const node = createTextNode("Hello World")
			expect(convertTextNode(node)).toBe("Hello World")
		})

		it("should apply formatting to text node", () => {
			const node: LexicalTextNode = {
				...createTextNode("Bold"),
				format: 1,
			}
			expect(convertTextNode(node)).toBe("**Bold**")
		})
	})

	describe("convertTagNode", () => {
		it("should convert tag with hash format by default", () => {
			const node = createTagNode("diary")
			expect(convertTagNode(node, { tagFormat: "hash" })).toBe("#diary")
		})

		it("should convert tag with bracket format", () => {
			const node = createTagNode("diary")
			expect(convertTagNode(node, { tagFormat: "bracket" })).toBe("#[diary]")
		})
	})

	describe("convertInlineNodes", () => {
		it("should convert mixed inline nodes", () => {
			const nodes = [createTextNode("Hello "), createTagNode("world")]
			expect(convertInlineNodes(nodes, { tagFormat: "hash" })).toBe("Hello #world")
		})
	})

	describe("convertParagraphNode", () => {
		it("should convert paragraph with text", () => {
			const node = createParagraphNode([createTextNode("Hello World")])
			expect(convertParagraphNode(node)).toBe("Hello World")
		})

		it("should convert empty paragraph", () => {
			const node = createParagraphNode([])
			expect(convertParagraphNode(node)).toBe("")
		})
	})

	describe("convertHeadingNode", () => {
		it("should convert h1 heading", () => {
			const node = createHeadingNode("Title", "h1")
			expect(convertHeadingNode(node)).toBe("# Title")
		})

		it("should convert h2 heading", () => {
			const node = createHeadingNode("Title", "h2")
			expect(convertHeadingNode(node)).toBe("## Title")
		})

		it("should convert h3 heading", () => {
			const node = createHeadingNode("Title", "h3")
			expect(convertHeadingNode(node)).toBe("### Title")
		})
	})

	describe("convertListItemNode", () => {
		it("should convert bullet list item", () => {
			const node = {
				children: [createTextNode("Item")],
				direction: "ltr",
				format: "",
				indent: 0,
				type: "listitem" as const,
				value: 1,
				version: 1,
			}
			expect(convertListItemNode(node, "bullet", 0)).toBe("- Item")
		})

		it("should convert numbered list item", () => {
			const node = {
				children: [createTextNode("Item")],
				direction: "ltr",
				format: "",
				indent: 0,
				type: "listitem" as const,
				value: 1,
				version: 1,
			}
			expect(convertListItemNode(node, "number", 0)).toBe("1. Item")
			expect(convertListItemNode(node, "number", 2)).toBe("3. Item")
		})

		it("should convert unchecked checkbox item", () => {
			const node = {
				checked: false,
				children: [createTextNode("Task")],
				direction: "ltr",
				format: "",
				indent: 0,
				type: "listitem" as const,
				value: 1,
				version: 1,
			}
			expect(convertListItemNode(node, "check", 0)).toBe("- [ ] Task")
		})

		it("should convert checked checkbox item", () => {
			const node = {
				checked: true,
				children: [createTextNode("Task")],
				direction: "ltr",
				format: "",
				indent: 0,
				type: "listitem" as const,
				value: 1,
				version: 1,
			}
			expect(convertListItemNode(node, "check", 0)).toBe("- [x] Task")
		})
	})

	describe("convertListNode", () => {
		it("should convert bullet list", () => {
			const node = createListNode(["Item 1", "Item 2"], "bullet")
			const result = convertListNode(node)
			expect(result).toBe("- Item 1\n- Item 2")
		})

		it("should convert numbered list", () => {
			const node = createListNode(["First", "Second"], "number")
			const result = convertListNode(node)
			expect(result).toBe("1. First\n2. Second")
		})

		it("should convert check list", () => {
			const node = createListNode(["Task 1", "Task 2"], "check")
			const result = convertListNode(node)
			expect(result).toBe("- [ ] Task 1\n- [ ] Task 2")
		})
	})

	// ==============================
	// Front Matter Tests
	// ==============================

	describe("generateFrontMatter", () => {
		it("should return empty string for empty data", () => {
			expect(generateFrontMatter({})).toBe("")
		})

		it("should generate simple key-value pairs", () => {
			const result = generateFrontMatter({
				author: "John",
				title: "Test",
			})
			expect(result).toContain("---")
			expect(result).toContain("title: Test")
			expect(result).toContain("author: John")
		})

		it("should handle arrays", () => {
			const result = generateFrontMatter({
				tags: ["tag1", "tag2"],
			})
			expect(result).toContain("tags:")
			expect(result).toContain("  - tag1")
			expect(result).toContain("  - tag2")
		})

		it("should skip null and undefined values", () => {
			const result = generateFrontMatter({
				author: undefined,
				date: null,
				title: "Test",
			})
			expect(result).toContain("title: Test")
			expect(result).not.toContain("author")
			expect(result).not.toContain("date")
		})
	})

	// ==============================
	// Document Conversion Tests
	// ==============================

	describe("convertDocumentToMarkdown", () => {
		it("should convert simple document", () => {
			const doc = createDocument([createParagraphNode([createTextNode("Hello World")])])
			const result = convertDocumentToMarkdown(doc)
			expect(result).toBe("Hello World")
		})

		it("should convert document with heading", () => {
			const doc = createDocument([
				createHeadingNode("Title", "h1"),
				createParagraphNode([createTextNode("Content")]),
			])
			const result = convertDocumentToMarkdown(doc)
			expect(result).toContain("# Title")
			expect(result).toContain("Content")
		})

		it("should include title when option is set", () => {
			const doc = createDocument([createParagraphNode([createTextNode("Content")])])
			const result = convertDocumentToMarkdown(doc, {
				includeTitle: true,
				title: "Document Title",
			})
			expect(result).toContain("# Document Title")
		})

		it("should include front matter when option is set", () => {
			const doc = createDocument([createParagraphNode([createTextNode("Content")])])
			const result = convertDocumentToMarkdown(doc, {
				frontMatter: { tags: ["a", "b"], title: "Test" },
				includeFrontMatter: true,
			})
			expect(result).toContain("---")
			expect(result).toContain("title: Test")
		})

		it("should convert tags line", () => {
			const doc = createDocument([createTagsLine(["diary", "notes"])])
			const result = convertDocumentToMarkdown(doc, { tagFormat: "hash" })
			expect(result).toContain("#diary")
			expect(result).toContain("#notes")
		})
	})

	// ==============================
	// Export Function Tests
	// ==============================

	describe("exportToMarkdown", () => {
		it("should export valid content to Markdown", () => {
			const content = JSON.stringify(
				createDocument([
					createHeadingNode("Title", "h1"),
					createParagraphNode([createTextNode("Hello World")]),
				]),
			)
			const result = exportToMarkdown(content)

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toContain("# Title")
				expect(result.right).toContain("Hello World")
			}
		})

		it("should return error for invalid content", () => {
			const result = exportToMarkdown("invalid json")
			expect(E.isLeft(result)).toBe(true)
		})

		it("should return error for empty content", () => {
			const result = exportToMarkdown("")
			expect(E.isLeft(result)).toBe(true)
		})
	})

	describe("exportMultipleToMarkdown", () => {
		it("should export multiple documents", () => {
			const contents = [
				{
					content: JSON.stringify(createDocument([createParagraphNode([createTextNode("Doc 1")])])),
					id: "1",
					title: "First",
				},
				{
					content: JSON.stringify(createDocument([createParagraphNode([createTextNode("Doc 2")])])),
					id: "2",
					title: "Second",
				},
			]
			const result = exportMultipleToMarkdown(contents)

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toContain("# First")
				expect(result.right).toContain("Doc 1")
				expect(result.right).toContain("# Second")
				expect(result.right).toContain("Doc 2")
				expect(result.right).toContain("---") // separator
			}
		})

		it("should use custom separator", () => {
			const contents = [
				{
					content: JSON.stringify(createDocument([createParagraphNode([createTextNode("Doc 1")])])),
					id: "1",
				},
				{
					content: JSON.stringify(createDocument([createParagraphNode([createTextNode("Doc 2")])])),
					id: "2",
				},
			]
			const result = exportMultipleToMarkdown(contents, {}, "\n\n===\n\n")

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toContain("===")
			}
		})

		it("should return error if any content is invalid", () => {
			const contents = [
				{
					content: JSON.stringify(createDocument([createParagraphNode([createTextNode("Doc 1")])])),
					id: "1",
				},
				{ content: "invalid", id: "2" },
			]
			const result = exportMultipleToMarkdown(contents)

			expect(E.isLeft(result)).toBe(true)
		})
	})
})
