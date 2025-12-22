/**
 * @file fn/import/import.markdown.fn.test.ts
 * @description Markdown 导入函数的单元测试
 */

import * as E from "fp-ts/Either";
import { describe, expect, it } from "vitest";
import {
	importFromMarkdown,
	importMarkdownToJson,
	importMultipleFromMarkdown,
	parseFrontMatter,
	parseHeadingLine,
	parseInlineContent,
	parseListItemLine,
	parseMarkdownToDocument,
	parseParagraph,
} from "./import.markdown.fn";

describe("import.markdown.fn", () => {
	// ==============================
	// Front Matter Parsing Tests
	// ==============================

	describe("parseFrontMatter", () => {
		it("should return undefined for content without front matter", () => {
			const [fm, remaining] = parseFrontMatter("Hello World");
			expect(fm).toBeUndefined();
			expect(remaining).toBe("Hello World");
		});

		it("should parse simple key-value pairs", () => {
			const content = `---
title: Test Document
author: John Doe
---
Content here`;
			const [fm, remaining] = parseFrontMatter(content);

			expect(fm).toEqual({
				title: "Test Document",
				author: "John Doe",
			});
			expect(remaining).toBe("Content here");
		});

		it("should parse arrays in front matter", () => {
			const content = `---
title: Test
tags:
  - tag1
  - tag2
  - tag3
---
Content`;
			const [fm, remaining] = parseFrontMatter(content);

			expect(fm?.title).toBe("Test");
			expect(fm?.tags).toEqual(["tag1", "tag2", "tag3"]);
		});

		it("should return undefined for unclosed front matter", () => {
			const content = `---
title: Test
Content without closing`;
			const [fm, remaining] = parseFrontMatter(content);

			expect(fm).toBeUndefined();
			expect(remaining).toBe(content);
		});

		it("should handle empty front matter", () => {
			const content = `---
---
Content`;
			const [fm, remaining] = parseFrontMatter(content);

			expect(fm).toEqual({});
			expect(remaining).toBe("Content");
		});
	});

	// ==============================
	// Inline Content Parsing Tests
	// ==============================

	describe("parseInlineContent", () => {
		it("should parse plain text", () => {
			const nodes = parseInlineContent("Hello World");

			expect(nodes).toHaveLength(1);
			expect(nodes[0].type).toBe("text");
			expect((nodes[0] as { text: string }).text).toBe("Hello World");
		});

		it("should parse bold text", () => {
			const nodes = parseInlineContent("Hello **bold** world");

			expect(nodes).toHaveLength(3);
			expect((nodes[0] as { text: string }).text).toBe("Hello ");
			expect((nodes[1] as { text: string }).text).toBe("bold");
			expect((nodes[1] as { format: number }).format).toBe(1); // BOLD
			expect((nodes[2] as { text: string }).text).toBe(" world");
		});

		it("should parse italic text", () => {
			const nodes = parseInlineContent("Hello *italic* world");

			expect(nodes).toHaveLength(3);
			expect((nodes[1] as { text: string }).text).toBe("italic");
			expect((nodes[1] as { format: number }).format).toBe(2); // ITALIC
		});

		it("should parse inline code", () => {
			const nodes = parseInlineContent("Use `code` here");

			expect(nodes).toHaveLength(3);
			expect((nodes[1] as { text: string }).text).toBe("code");
			expect((nodes[1] as { format: number }).format).toBe(16); // CODE
		});

		it("should parse strikethrough text", () => {
			const nodes = parseInlineContent("Hello ~~deleted~~ world");

			expect(nodes).toHaveLength(3);
			expect((nodes[1] as { text: string }).text).toBe("deleted");
			expect((nodes[1] as { format: number }).format).toBe(4); // STRIKETHROUGH
		});

		it("should parse hash tags", () => {
			const nodes = parseInlineContent("Hello #tag world", {
				tagFormat: "hash",
			});

			expect(nodes).toHaveLength(3);
			expect(nodes[1].type).toBe("tag");
			expect((nodes[1] as { tagName: string }).tagName).toBe("tag");
		});

		it("should parse bracket tags", () => {
			const nodes = parseInlineContent("Hello #[my tag] world", {
				tagFormat: "bracket",
			});

			expect(nodes).toHaveLength(3);
			expect(nodes[1].type).toBe("tag");
			expect((nodes[1] as { tagName: string }).tagName).toBe("my tag");
		});

		it("should parse Chinese tags", () => {
			const nodes = parseInlineContent("你好 #标签 世界", {
				tagFormat: "hash",
			});

			expect(nodes).toHaveLength(3);
			expect(nodes[1].type).toBe("tag");
			expect((nodes[1] as { tagName: string }).tagName).toBe("标签");
		});

		it("should handle empty text", () => {
			const nodes = parseInlineContent("");
			expect(nodes).toHaveLength(0);
		});
	});

	// ==============================
	// Heading Parsing Tests
	// ==============================

	describe("parseHeadingLine", () => {
		it("should parse h1 heading", () => {
			const node = parseHeadingLine("# Title");

			expect(node).not.toBeNull();
			expect(node?.tag).toBe("h1");
			expect(node?.children[0].text).toBe("Title");
		});

		it("should parse h2 heading", () => {
			const node = parseHeadingLine("## Subtitle");

			expect(node).not.toBeNull();
			expect(node?.tag).toBe("h2");
		});

		it("should parse h3 heading", () => {
			const node = parseHeadingLine("### Section");

			expect(node).not.toBeNull();
			expect(node?.tag).toBe("h3");
		});

		it("should cap heading level at h3", () => {
			const node = parseHeadingLine("#### Deep heading");

			expect(node).not.toBeNull();
			expect(node?.tag).toBe("h3");
		});

		it("should return null for non-heading lines", () => {
			expect(parseHeadingLine("Not a heading")).toBeNull();
			expect(parseHeadingLine("#NoSpace")).toBeNull();
		});
	});

	// ==============================
	// List Item Parsing Tests
	// ==============================

	describe("parseListItemLine", () => {
		it("should parse bullet list with dash", () => {
			const result = parseListItemLine("- Item");

			expect(result).toEqual(["bullet", "Item", undefined]);
		});

		it("should parse bullet list with asterisk", () => {
			const result = parseListItemLine("* Item");

			expect(result).toEqual(["bullet", "Item", undefined]);
		});

		it("should parse numbered list", () => {
			const result = parseListItemLine("1. First item");

			expect(result).toEqual(["number", "First item", undefined]);
		});

		it("should parse unchecked checkbox", () => {
			const result = parseListItemLine("- [ ] Todo");

			expect(result).toEqual(["check", "Todo", false]);
		});

		it("should parse checked checkbox", () => {
			const result = parseListItemLine("- [x] Done");

			expect(result).toEqual(["check", "Done", true]);
		});

		it("should parse checked checkbox with uppercase X", () => {
			const result = parseListItemLine("- [X] Done");

			expect(result).toEqual(["check", "Done", true]);
		});

		it("should return null for non-list lines", () => {
			expect(parseListItemLine("Not a list")).toBeNull();
			expect(parseListItemLine("")).toBeNull();
		});
	});

	// ==============================
	// Paragraph Parsing Tests
	// ==============================

	describe("parseParagraph", () => {
		it("should create paragraph node with text", () => {
			const node = parseParagraph("Hello World");

			expect(node.type).toBe("paragraph");
			expect(node.children).toHaveLength(1);
			expect(node.children[0].text).toBe("Hello World");
		});

		it("should create paragraph with formatted text", () => {
			const node = parseParagraph("Hello **bold** world");

			expect(node.children).toHaveLength(3);
		});
	});

	// ==============================
	// Document Parsing Tests
	// ==============================

	describe("parseMarkdownToDocument", () => {
		it("should parse simple paragraph", () => {
			const doc = parseMarkdownToDocument("Hello World");

			expect(doc.root.children).toHaveLength(1);
			expect(doc.root.children[0].type).toBe("paragraph");
		});

		it("should parse heading and paragraph", () => {
			const doc = parseMarkdownToDocument("# Title\n\nContent here");

			expect(doc.root.children).toHaveLength(3);
			expect(doc.root.children[0].type).toBe("heading");
			expect(doc.root.children[1].type).toBe("paragraph"); // empty line
			expect(doc.root.children[2].type).toBe("paragraph");
		});

		it("should parse bullet list", () => {
			const doc = parseMarkdownToDocument("- Item 1\n- Item 2\n- Item 3");

			expect(doc.root.children).toHaveLength(1);
			expect(doc.root.children[0].type).toBe("list");
			const list = doc.root.children[0] as {
				listType: string;
				children: unknown[];
			};
			expect(list.listType).toBe("bullet");
			expect(list.children).toHaveLength(3);
		});

		it("should parse numbered list", () => {
			const doc = parseMarkdownToDocument("1. First\n2. Second\n3. Third");

			expect(doc.root.children).toHaveLength(1);
			const list = doc.root.children[0] as { listType: string };
			expect(list.listType).toBe("number");
		});

		it("should parse checkbox list", () => {
			const doc = parseMarkdownToDocument("- [ ] Todo\n- [x] Done");

			expect(doc.root.children).toHaveLength(1);
			const list = doc.root.children[0] as {
				listType: string;
				children: Array<{ checked?: boolean }>;
			};
			expect(list.listType).toBe("check");
			expect(list.children[0].checked).toBe(false);
			expect(list.children[1].checked).toBe(true);
		});

		it("should handle empty lines as empty paragraphs", () => {
			const doc = parseMarkdownToDocument("Line 1\n\nLine 2");

			expect(doc.root.children).toHaveLength(3);
			expect(doc.root.children[1].type).toBe("paragraph");
		});

		it("should parse complex document", () => {
			const markdown = `# Main Title

This is a paragraph with **bold** and *italic* text.

## Section 1

- Item 1
- Item 2

## Section 2

1. First
2. Second`;

			const doc = parseMarkdownToDocument(markdown);

			expect(doc.root.children.length).toBeGreaterThan(5);
		});
	});

	// ==============================
	// Import Function Tests
	// ==============================

	describe("importFromMarkdown", () => {
		it("should import valid markdown", () => {
			const result = importFromMarkdown("# Title\n\nContent");

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.document.root.children.length).toBeGreaterThan(0);
			}
		});

		it("should return error for empty content", () => {
			const result = importFromMarkdown("");

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("INVALID_CONTENT");
			}
		});

		it("should return error for whitespace-only content", () => {
			const result = importFromMarkdown("   \n\n   ");

			expect(E.isLeft(result)).toBe(true);
		});

		it("should parse front matter and extract title", () => {
			const markdown = `---
title: My Document
author: John
---

# Heading

Content`;

			const result = importFromMarkdown(markdown, { parseFrontMatter: true });

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.frontMatter?.title).toBe("My Document");
				expect(result.right.frontMatter?.author).toBe("John");
				expect(result.right.title).toBe("My Document");
			}
		});

		it("should extract title from first h1 when option is set", () => {
			const markdown = "# Document Title\n\nContent";

			const result = importFromMarkdown(markdown, { extractTitle: true });

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.title).toBe("Document Title");
			}
		});

		it("should prefer front matter title over h1", () => {
			const markdown = `---
title: Front Matter Title
---

# H1 Title

Content`;

			const result = importFromMarkdown(markdown, {
				parseFrontMatter: true,
				extractTitle: true,
			});

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.title).toBe("Front Matter Title");
			}
		});

		it("should skip front matter parsing when disabled", () => {
			const markdown = `---
title: Test
---

Content`;

			const result = importFromMarkdown(markdown, { parseFrontMatter: false });

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.frontMatter).toBeUndefined();
			}
		});
	});

	// ==============================
	// Import to JSON Tests
	// ==============================

	describe("importMarkdownToJson", () => {
		it("should return valid JSON string", () => {
			const result = importMarkdownToJson("# Title\n\nContent");

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				const parsed = JSON.parse(result.right);
				expect(parsed.root).toBeDefined();
				expect(parsed.root.type).toBe("root");
			}
		});

		it("should return error for invalid content", () => {
			const result = importMarkdownToJson("");

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==============================
	// Batch Import Tests
	// ==============================

	describe("importMultipleFromMarkdown", () => {
		it("should import multiple documents", () => {
			const contents = [
				{ id: "1", content: "# Doc 1\n\nContent 1" },
				{ id: "2", content: "# Doc 2\n\nContent 2" },
			];

			const result = importMultipleFromMarkdown(contents);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				expect(result.right[0].id).toBe("1");
				expect(result.right[1].id).toBe("2");
			}
		});

		it("should return error if any document fails", () => {
			const contents = [
				{ id: "1", content: "# Valid" },
				{ id: "2", content: "" },
			];

			const result = importMultipleFromMarkdown(contents);

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("2");
			}
		});

		it("should handle empty array", () => {
			const result = importMultipleFromMarkdown([]);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(0);
			}
		});
	});
});
