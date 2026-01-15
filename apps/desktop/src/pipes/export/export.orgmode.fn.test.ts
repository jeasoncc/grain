/**
 * @file fn/export/export.orgmode.fn.test.ts
 * @description Org-mode 导出函数的单元测试
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
	applyOrgTextFormat,
	convertDocumentToOrgmode,
	convertHeadingNode,
	convertInlineNodes,
	convertListItemNode,
	convertListNode,
	convertParagraphNode,
	convertTagNode,
	convertTextNode,
	exportMultipleToOrgmode,
	exportToOrgmode,
	generateOrgProperties,
} from "./export.orgmode.fn"

describe("export.orgmode.fn", () => {
	// ==============================
	// Text Formatting Tests
	// ==============================

	describe("applyOrgTextFormat", () => {
		it("should return text unchanged when format is 0", () => {
			expect(applyOrgTextFormat("hello", 0)).toBe("hello")
		})

		it("should apply bold formatting", () => {
			expect(applyOrgTextFormat("hello", 1)).toBe("*hello*")
		})

		it("should apply italic formatting", () => {
			expect(applyOrgTextFormat("hello", 2)).toBe("/hello/")
		})

		it("should apply strikethrough formatting", () => {
			expect(applyOrgTextFormat("hello", 4)).toBe("+hello+")
		})

		it("should apply underline formatting", () => {
			expect(applyOrgTextFormat("hello", 8)).toBe("_hello_")
		})

		it("should apply code formatting", () => {
			expect(applyOrgTextFormat("hello", 16)).toBe("~hello~")
		})

		it("should apply multiple formats", () => {
			// Bold + Italic = 3
			expect(applyOrgTextFormat("hello", 3)).toBe("*/hello/*")
		})

		it("should handle empty text", () => {
			expect(applyOrgTextFormat("", 1)).toBe("")
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
			expect(convertTextNode(node)).toBe("*Bold*")
		})
	})

	describe("convertTagNode", () => {
		it("should convert tag with org format by default", () => {
			const node = createTagNode("diary")
			expect(convertTagNode(node, { tagFormat: "org" })).toBe(":diary:")
		})

		it("should convert tag with hash format", () => {
			const node = createTagNode("diary")
			expect(convertTagNode(node, { tagFormat: "hash" })).toBe("#diary")
		})
	})

	describe("convertInlineNodes", () => {
		it("should convert mixed inline nodes", () => {
			const nodes = [createTextNode("Hello "), createTagNode("world")]
			expect(convertInlineNodes(nodes, { tagFormat: "org" })).toBe("Hello :world:")
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
		it("should convert h1 heading with single asterisk", () => {
			const node = createHeadingNode("Title", "h1")
			expect(convertHeadingNode(node)).toBe("* Title")
		})

		it("should convert h2 heading with double asterisks", () => {
			const node = createHeadingNode("Title", "h2")
			expect(convertHeadingNode(node)).toBe("** Title")
		})

		it("should convert h3 heading with triple asterisks", () => {
			const node = createHeadingNode("Title", "h3")
			expect(convertHeadingNode(node)).toBe("*** Title")
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
				version: 1,
				value: 1,
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
				version: 1,
				value: 1,
			}
			expect(convertListItemNode(node, "number", 0)).toBe("1. Item")
			expect(convertListItemNode(node, "number", 2)).toBe("3. Item")
		})

		it("should convert unchecked checkbox item with Org syntax", () => {
			const node = {
				children: [createTextNode("Task")],
				direction: "ltr",
				format: "",
				indent: 0,
				type: "listitem" as const,
				version: 1,
				value: 1,
				checked: false,
			}
			expect(convertListItemNode(node, "check", 0)).toBe("- [ ] Task")
		})

		it("should convert checked checkbox item with Org syntax", () => {
			const node = {
				children: [createTextNode("Task")],
				direction: "ltr",
				format: "",
				indent: 0,
				type: "listitem" as const,
				version: 1,
				value: 1,
				checked: true,
			}
			expect(convertListItemNode(node, "check", 0)).toBe("- [X] Task")
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
	// Org Properties Tests
	// ==============================

	describe("generateOrgProperties", () => {
		it("should return empty string when no properties", () => {
			expect(generateOrgProperties({})).toBe("")
		})

		it("should generate TITLE property", () => {
			const result = generateOrgProperties({ title: "Test Document" })
			expect(result).toContain("#+TITLE: Test Document")
		})

		it("should generate AUTHOR property", () => {
			const result = generateOrgProperties({ author: "John Doe" })
			expect(result).toContain("#+AUTHOR: John Doe")
		})

		it("should generate DATE property", () => {
			const result = generateOrgProperties({ date: "2024-12-20" })
			expect(result).toContain("#+DATE: 2024-12-20")
		})

		it("should generate custom properties", () => {
			const result = generateOrgProperties({
				properties: { language: "en", category: "notes" },
			})
			expect(result).toContain("#+LANGUAGE: en")
			expect(result).toContain("#+CATEGORY: notes")
		})

		it("should generate multiple properties", () => {
			const result = generateOrgProperties({
				title: "Test",
				author: "John",
				date: "2024-12-20",
			})
			expect(result).toContain("#+TITLE: Test")
			expect(result).toContain("#+AUTHOR: John")
			expect(result).toContain("#+DATE: 2024-12-20")
		})
	})

	// ==============================
	// Document Conversion Tests
	// ==============================

	describe("convertDocumentToOrgmode", () => {
		it("should convert simple document", () => {
			const doc = createDocument([createParagraphNode([createTextNode("Hello World")])])
			const result = convertDocumentToOrgmode(doc)
			expect(result).toBe("Hello World")
		})

		it("should convert document with heading", () => {
			const doc = createDocument([
				createHeadingNode("Title", "h1"),
				createParagraphNode([createTextNode("Content")]),
			])
			const result = convertDocumentToOrgmode(doc)
			expect(result).toContain("* Title")
			expect(result).toContain("Content")
		})

		it("should include title property when option is set", () => {
			const doc = createDocument([createParagraphNode([createTextNode("Content")])])
			const result = convertDocumentToOrgmode(doc, {
				includeTitle: true,
				title: "Document Title",
			})
			expect(result).toContain("#+TITLE: Document Title")
		})

		it("should include properties when option is set", () => {
			const doc = createDocument([createParagraphNode([createTextNode("Content")])])
			const result = convertDocumentToOrgmode(doc, {
				includeProperties: true,
				title: "Test",
				author: "John",
			})
			expect(result).toContain("#+TITLE: Test")
			expect(result).toContain("#+AUTHOR: John")
		})

		it("should convert tags line with org format", () => {
			const doc = createDocument([createTagsLine(["diary", "notes"])])
			const result = convertDocumentToOrgmode(doc, { tagFormat: "org" })
			expect(result).toContain(":diary:")
			expect(result).toContain(":notes:")
		})
	})

	// ==============================
	// Export Function Tests
	// ==============================

	describe("exportToOrgmode", () => {
		it("should export valid content to Org-mode", () => {
			const content = JSON.stringify(
				createDocument([
					createHeadingNode("Title", "h1"),
					createParagraphNode([createTextNode("Hello World")]),
				]),
			)
			const result = exportToOrgmode(content)

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toContain("* Title")
				expect(result.right).toContain("Hello World")
			}
		})

		it("should return error for invalid content", () => {
			const result = exportToOrgmode("invalid json")
			expect(E.isLeft(result)).toBe(true)
		})

		it("should return error for empty content", () => {
			const result = exportToOrgmode("")
			expect(E.isLeft(result)).toBe(true)
		})
	})

	describe("exportMultipleToOrgmode", () => {
		it("should export multiple documents", () => {
			const contents = [
				{
					id: "1",
					content: JSON.stringify(createDocument([createParagraphNode([createTextNode("Doc 1")])])),
					title: "First",
				},
				{
					id: "2",
					content: JSON.stringify(createDocument([createParagraphNode([createTextNode("Doc 2")])])),
					title: "Second",
				},
			]
			const result = exportMultipleToOrgmode(contents)

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toContain("#+TITLE: First")
				expect(result.right).toContain("Doc 1")
				expect(result.right).toContain("#+TITLE: Second")
				expect(result.right).toContain("Doc 2")
			}
		})

		it("should use custom separator", () => {
			const contents = [
				{
					id: "1",
					content: JSON.stringify(createDocument([createParagraphNode([createTextNode("Doc 1")])])),
				},
				{
					id: "2",
					content: JSON.stringify(createDocument([createParagraphNode([createTextNode("Doc 2")])])),
				},
			]
			const result = exportMultipleToOrgmode(contents, {}, "\n\n* * *\n\n")

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toContain("* * *")
			}
		})

		it("should return error if any content is invalid", () => {
			const contents = [
				{
					id: "1",
					content: JSON.stringify(createDocument([createParagraphNode([createTextNode("Doc 1")])])),
				},
				{ id: "2", content: "invalid" },
			]
			const result = exportMultipleToOrgmode(contents)

			expect(E.isLeft(result)).toBe(true)
		})
	})
})
