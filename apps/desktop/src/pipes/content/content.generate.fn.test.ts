/**
 * @file fn/content/content.generate.fn.test.ts
 * @description Lexical JSON 内容生成函数的单元测试
 */

import { describe, expect, it } from "vitest"
import {
	createDocument,
	createHeadingNode,
	createListItemNode,
	createListNode,
	createParagraphNode,
	createTagNode,
	createTagsLine,
	createTextNode,
	extractTagsFromDocument,
	extractTextFromDocument,
	formatFullDateTime,
	formatShortDate,
	generateContentByType,
	generateDiaryContent,
	generateLedgerContent,
	generateTodoContent,
	generateWikiContent,
	type LexicalDocument,
	parseContent,
} from "./content.generate.fn"

describe("content.generate.fn", () => {
	// ==============================
	// Node Creation Tests
	// ==============================

	describe("createTextNode", () => {
		it("should create a text node with correct structure", () => {
			const node = createTextNode("Hello World")

			expect(node.type).toBe("text")
			expect(node.version).toBe(1)
			expect(node.text).toBe("Hello World")
			expect(node.format).toBe(0)
			expect(node.mode).toBe("normal")
		})

		it("should handle empty text", () => {
			const node = createTextNode("")
			expect(node.text).toBe("")
		})
	})

	describe("createTagNode", () => {
		it("should create a tag node with correct structure", () => {
			const node = createTagNode("diary")

			expect(node.type).toBe("tag")
			expect(node.tagName).toBe("diary")
			expect(node.text).toBe("#[diary]")
			expect(node.mode).toBe("segmented")
		})
	})

	describe("createParagraphNode", () => {
		it("should create an empty paragraph node", () => {
			const node = createParagraphNode()

			expect(node.type).toBe("paragraph")
			expect(node.children).toEqual([])
			expect(node.direction).toBe("ltr")
		})

		it("should create a paragraph with children", () => {
			const textNode = createTextNode("Hello")
			const node = createParagraphNode([textNode])

			expect(node.children).toHaveLength(1)
			expect(node.children[0]).toEqual(textNode)
		})
	})

	describe("createHeadingNode", () => {
		it("should create a heading node with default h2 tag", () => {
			const node = createHeadingNode("Title")

			expect(node.type).toBe("heading")
			expect(node.tag).toBe("h2")
			expect(node.children).toHaveLength(1)
			expect(node.children[0].text).toBe("Title")
		})

		it("should create heading with specified tag level", () => {
			const h1 = createHeadingNode("H1 Title", "h1")
			const h3 = createHeadingNode("H3 Title", "h3")

			expect(h1.tag).toBe("h1")
			expect(h3.tag).toBe("h3")
		})
	})

	describe("createListItemNode", () => {
		it("should create a list item node", () => {
			const node = createListItemNode("Item 1", 1)

			expect(node.type).toBe("listitem")
			expect(node.value).toBe(1)
			expect(node.children).toHaveLength(1)
		})

		it("should create a checked list item", () => {
			const node = createListItemNode("Task", 1, true)

			expect(node.checked).toBe(true)
		})

		it("should create an unchecked list item", () => {
			const node = createListItemNode("Task", 1, false)

			expect(node.checked).toBe(false)
		})
	})

	describe("createListNode", () => {
		it("should create a bullet list", () => {
			const node = createListNode(["Item 1", "Item 2"], "bullet")

			expect(node.type).toBe("list")
			expect(node.listType).toBe("bullet")
			expect(node.tag).toBe("ul")
			expect(node.children).toHaveLength(2)
		})

		it("should create a numbered list", () => {
			const node = createListNode(["First", "Second"], "number")

			expect(node.listType).toBe("number")
			expect(node.tag).toBe("ol")
		})

		it("should create a check list with unchecked items", () => {
			const node = createListNode(["Task 1", "Task 2"], "check")

			expect(node.listType).toBe("check")
			expect(node.children[0].checked).toBe(false)
			expect(node.children[1].checked).toBe(false)
		})
	})

	describe("createTagsLine", () => {
		it("should create a paragraph with tags separated by spaces", () => {
			const node = createTagsLine(["diary", "notes"])

			expect(node.type).toBe("paragraph")
			expect(node.children).toHaveLength(3) // tag, space, tag
			expect(node.children[0].type).toBe("tag")
			expect(node.children[1].type).toBe("text")
			expect(node.children[2].type).toBe("tag")
		})

		it("should handle single tag", () => {
			const node = createTagsLine(["single"])

			expect(node.children).toHaveLength(1)
			expect(node.children[0].type).toBe("tag")
		})

		it("should handle empty tags array", () => {
			const node = createTagsLine([])

			expect(node.children).toHaveLength(0)
		})
	})

	// ==============================
	// Date Formatting Tests
	// ==============================

	describe("formatFullDateTime", () => {
		it("should format date with full weekday and time", () => {
			const date = new Date("2024-12-20T14:30:45.000Z")
			const formatted = formatFullDateTime(date)

			expect(formatted).toContain("2024")
			expect(formatted).toContain("December")
			expect(formatted).toContain("at")
		})
	})

	describe("formatShortDate", () => {
		it("should format date in short format", () => {
			const date = new Date("2024-12-20T14:30:00.000Z")
			const formatted = formatShortDate(date)

			expect(formatted).toContain("2024")
			expect(formatted).toContain("Dec")
			expect(formatted).toContain("20")
		})
	})

	// ==============================
	// Content Generation Tests
	// ==============================

	describe("generateDiaryContent", () => {
		it("should generate valid Lexical JSON", () => {
			const content = generateDiaryContent()
			const parsed = JSON.parse(content)

			expect(parsed.root).toBeDefined()
			expect(parsed.root.type).toBe("root")
			expect(parsed.root.children).toBeInstanceOf(Array)
		})

		it("should include default tags", () => {
			const content = generateDiaryContent()
			const parsed = JSON.parse(content) as LexicalDocument
			const tags = extractTagsFromDocument(parsed)

			expect(tags).toContain("diary")
			expect(tags).toContain("notes")
		})

		it("should include date heading", () => {
			const date = new Date("2024-12-20T14:30:00.000Z")
			const content = generateDiaryContent(date)
			const parsed = JSON.parse(content) as LexicalDocument

			const headings = parsed.root.children.filter((c) => c.type === "heading")
			expect(headings.length).toBeGreaterThan(0)
		})

		it("should respect custom options", () => {
			const content = generateDiaryContent(new Date(), {
				tags: ["custom"],
				headingLevel: "h1",
				includeEmptyLines: false,
			})
			const parsed = JSON.parse(content) as LexicalDocument
			const tags = extractTagsFromDocument(parsed)

			expect(tags).toEqual(["custom"])
		})
	})

	describe("generateTodoContent", () => {
		it("should generate valid Lexical JSON with check list", () => {
			const content = generateTodoContent()
			const parsed = JSON.parse(content) as LexicalDocument

			expect(parsed.root).toBeDefined()

			const lists = parsed.root.children.filter((c) => c.type === "list")
			expect(lists.length).toBeGreaterThan(0)
		})

		it("should include todo tags", () => {
			const content = generateTodoContent()
			const parsed = JSON.parse(content) as LexicalDocument
			const tags = extractTagsFromDocument(parsed)

			expect(tags).toContain("todo")
			expect(tags).toContain("tasks")
		})

		it("should use custom title", () => {
			const content = generateTodoContent(new Date(), {
				customTitle: "My Tasks",
			})
			const text = extractTextFromDocument(JSON.parse(content) as LexicalDocument)

			expect(text).toContain("My Tasks")
		})
	})

	describe("generateLedgerContent", () => {
		it("should generate valid Lexical JSON with income and expenses sections", () => {
			const content = generateLedgerContent()
			const parsed = JSON.parse(content) as LexicalDocument

			expect(parsed.root).toBeDefined()

			const headings = parsed.root.children.filter((c) => c.type === "heading")
			const headingTexts = headings.map((h) => (h.type === "heading" ? h.children[0].text : ""))

			expect(headingTexts).toContain("Income")
			expect(headingTexts).toContain("Expenses")
		})

		it("should include ledger tags", () => {
			const content = generateLedgerContent()
			const parsed = JSON.parse(content) as LexicalDocument
			const tags = extractTagsFromDocument(parsed)

			expect(tags).toContain("ledger")
			expect(tags).toContain("finance")
		})
	})

	describe("generateWikiContent", () => {
		it("should generate valid Lexical JSON", () => {
			const content = generateWikiContent()
			const parsed = JSON.parse(content) as LexicalDocument

			expect(parsed.root).toBeDefined()
		})

		it("should include wiki tags", () => {
			const content = generateWikiContent()
			const parsed = JSON.parse(content) as LexicalDocument
			const tags = extractTagsFromDocument(parsed)

			expect(tags).toContain("wiki")
			expect(tags).toContain("knowledge")
		})

		it("should use custom title", () => {
			const content = generateWikiContent(new Date(), {
				customTitle: "My Article",
			})
			const text = extractTextFromDocument(JSON.parse(content) as LexicalDocument)

			expect(text).toContain("My Article")
		})
	})

	describe("generateContentByType", () => {
		it("should generate diary content for diary type", () => {
			const content = generateContentByType("diary")
			const parsed = JSON.parse(content) as LexicalDocument
			const tags = extractTagsFromDocument(parsed)

			expect(tags).toContain("diary")
		})

		it("should generate todo content for todo type", () => {
			const content = generateContentByType("todo")
			const parsed = JSON.parse(content) as LexicalDocument
			const tags = extractTagsFromDocument(parsed)

			expect(tags).toContain("todo")
		})

		it("should generate ledger content for ledger type", () => {
			const content = generateContentByType("ledger")
			const parsed = JSON.parse(content) as LexicalDocument
			const tags = extractTagsFromDocument(parsed)

			expect(tags).toContain("ledger")
		})

		it("should generate wiki content for wiki type", () => {
			const content = generateContentByType("wiki")
			const parsed = JSON.parse(content) as LexicalDocument
			const tags = extractTagsFromDocument(parsed)

			expect(tags).toContain("wiki")
		})

		it("should merge options with template defaults", () => {
			const content = generateContentByType("diary", new Date(), {
				tags: ["custom-tag"],
			})
			const parsed = JSON.parse(content) as LexicalDocument
			const tags = extractTagsFromDocument(parsed)

			expect(tags).toEqual(["custom-tag"])
		})
	})

	// ==============================
	// Content Parsing Tests
	// ==============================

	describe("parseContent", () => {
		it("should parse valid Lexical JSON", () => {
			const content = generateDiaryContent()
			const parsed = parseContent(content)

			expect(parsed).not.toBeNull()
			expect(parsed?.root).toBeDefined()
		})

		it("should return null for invalid JSON", () => {
			const parsed = parseContent("invalid json")

			expect(parsed).toBeNull()
		})

		it("should return null for empty string", () => {
			const parsed = parseContent("")

			expect(parsed).toBeNull()
		})
	})

	describe("extractTagsFromDocument", () => {
		it("should extract all tags from document", () => {
			const content = generateDiaryContent(new Date(), {
				tags: ["tag1", "tag2", "tag3"],
			})
			const parsed = parseContent(content)
			if (!parsed) {
				throw new Error("Failed to parse content")
			}
			const tags = extractTagsFromDocument(parsed)

			expect(tags).toEqual(["tag1", "tag2", "tag3"])
		})

		it("should return empty array for document without tags", () => {
			const doc = createDocument([createParagraphNode([createTextNode("No tags here")])])
			const tags = extractTagsFromDocument(doc)

			expect(tags).toEqual([])
		})
	})

	describe("extractTextFromDocument", () => {
		it("should extract text from paragraphs", () => {
			const doc = createDocument([createParagraphNode([createTextNode("Hello World")])])
			const text = extractTextFromDocument(doc)

			expect(text).toBe("Hello World")
		})

		it("should extract text from headings", () => {
			const doc = createDocument([createHeadingNode("My Title")])
			const text = extractTextFromDocument(doc)

			expect(text).toBe("My Title")
		})

		it("should include tag text", () => {
			const doc = createDocument([createTagsLine(["diary"])])
			const text = extractTextFromDocument(doc)

			expect(text).toContain("#[diary]")
		})
	})

	// ==============================
	// Document Creation Tests
	// ==============================

	describe("createDocument", () => {
		it("should create a valid Lexical document structure", () => {
			const doc = createDocument([])

			expect(doc.root.type).toBe("root")
			expect(doc.root.version).toBe(1)
			expect(doc.root.direction).toBe("ltr")
			expect(doc.root.children).toEqual([])
		})

		it("should include provided children", () => {
			const paragraph = createParagraphNode()
			const heading = createHeadingNode("Title")
			const doc = createDocument([paragraph, heading])

			expect(doc.root.children).toHaveLength(2)
			expect(doc.root.children[0].type).toBe("paragraph")
			expect(doc.root.children[1].type).toBe("heading")
		})
	})
})
