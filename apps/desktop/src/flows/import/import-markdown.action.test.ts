/**
 * @file actions/import/import-markdown.action.test.ts
 * @description Markdown 导入 Action 的单元测试
 *
 * 测试覆盖：
 * - Markdown 内容导入为节点
 * - 直接内容转换
 * - 错误处理
 */

import dayjs from "dayjs";
import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentInterface } from "@/types/content/content.interface";
import type { NodeInterface } from "@/types/node/node.interface";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 NodeInterface 对象
 */
function createTestNode(overrides: Partial<NodeInterface> = {}): NodeInterface {
	return {
		id: overrides.id ?? "node-1",
		workspace: overrides.workspace ?? "workspace-1",
		parent: overrides.parent ?? null,
		type: overrides.type ?? "file",
		title: overrides.title ?? "Test Node",
		order: overrides.order ?? 0,
		collapsed: overrides.collapsed ?? false,
		createDate: overrides.createDate ?? dayjs().toISOString(),
		lastEdit: overrides.lastEdit ?? dayjs().toISOString(),
		tags: overrides.tags ?? [],
	};
}

/**
 * 创建测试用的 ContentInterface 对象
 */
function createTestContent(
	overrides: Partial<ContentInterface> = {},
): ContentInterface {
	return {
		id: overrides.id ?? "content-1",
		nodeId: overrides.nodeId ?? "node-1",
		content: overrides.content ?? "",
		contentType: overrides.contentType ?? "lexical",
		lastEdit: overrides.lastEdit ?? dayjs().toISOString(),
	};
}

/**
 * 运行 TaskEither 并返回 Either 结果
 */
async function runTE<Err, A>(
	te: TE.TaskEither<Err, A>,
): Promise<E.Either<Err, A>> {
	return te();
}

// ============================================================================
// Mock Setup
// ============================================================================

const mockAddNode = vi.fn();
const mockGetNextOrder = vi.fn();
const mockAddContent = vi.fn();

vi.mock("@/db/node.db.fn", () => ({
	addNode: (...args: unknown[]) => mockAddNode(...args),
	getNextOrder: (...args: unknown[]) => mockGetNextOrder(...args),
}));

vi.mock("@/db/content.db.fn", () => ({
	addContent: (...args: unknown[]) => mockAddContent(...args),
}));

vi.mock("@/log", () => ({
	default: {
		start: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

// Logger removed - not needed in tests
import { importMarkdown, importMarkdownToJson } from "./import-markdown.flow";

// ============================================================================
// Unit Tests
// ============================================================================

describe("importMarkdown", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should import Markdown content and create a new node", async () => {
		const testNode = createTestNode({ title: "Imported Document" });
		const testContent = createTestContent({ nodeId: testNode.id });

		mockGetNextOrder.mockReturnValue(() => Promise.resolve(E.right(0)));
		mockAddNode.mockReturnValue(() => Promise.resolve(E.right(testNode)));
		mockAddContent.mockReturnValue(() => Promise.resolve(E.right(testContent)));

		const markdownContent = `# My Document

This is a paragraph with some text.

- Item 1
- Item 2
`;

		const result = await runTE(
			importMarkdown({
				workspaceId: "workspace-1",
				parentId: null,
				content: markdownContent,
			}),
		);

		expect(E.isRight(result)).toBe(true);
		if (E.isRight(result)) {
			expect(result.right.node).toBeDefined();
			expect(result.right.node.id).toBe(testNode.id);
		}
		expect(mockAddNode).toHaveBeenCalled();
		expect(mockAddContent).toHaveBeenCalled();
	});

	it("should use provided title instead of extracting from content", async () => {
		const testNode = createTestNode({ title: "Custom Title" });
		const testContent = createTestContent({ nodeId: testNode.id });

		mockGetNextOrder.mockReturnValue(() => Promise.resolve(E.right(0)));
		mockAddNode.mockReturnValue(() => Promise.resolve(E.right(testNode)));
		mockAddContent.mockReturnValue(() => Promise.resolve(E.right(testContent)));

		const markdownContent = `# Document Title

Some content here.
`;

		const result = await runTE(
			importMarkdown({
				workspaceId: "workspace-1",
				parentId: null,
				content: markdownContent,
				title: "Custom Title",
			}),
		);

		expect(E.isRight(result)).toBe(true);
		// 验证 addNode 被调用时使用了自定义标题
		expect(mockAddNode).toHaveBeenCalledWith(
			"workspace-1",
			"Custom Title",
			expect.any(Object),
		);
	});

	it("should extract title from front matter", async () => {
		const testNode = createTestNode({ title: "Front Matter Title" });
		const testContent = createTestContent({ nodeId: testNode.id });

		mockGetNextOrder.mockReturnValue(() => Promise.resolve(E.right(0)));
		mockAddNode.mockReturnValue(() => Promise.resolve(E.right(testNode)));
		mockAddContent.mockReturnValue(() => Promise.resolve(E.right(testContent)));

		const markdownContent = `---
title: Front Matter Title
author: Test Author
---

# Heading

Some content here.
`;

		const result = await runTE(
			importMarkdown({
				workspaceId: "workspace-1",
				parentId: null,
				content: markdownContent,
			}),
		);

		expect(E.isRight(result)).toBe(true);
		if (E.isRight(result)) {
			expect(result.right.frontMatter).toBeDefined();
			expect(result.right.frontMatter?.title).toBe("Front Matter Title");
		}
	});

	it("should use default title when no title is available", async () => {
		const testNode = createTestNode({ title: "导入的文档" });
		const testContent = createTestContent({ nodeId: testNode.id });

		mockGetNextOrder.mockReturnValue(() => Promise.resolve(E.right(0)));
		mockAddNode.mockReturnValue(() => Promise.resolve(E.right(testNode)));
		mockAddContent.mockReturnValue(() => Promise.resolve(E.right(testContent)));

		const markdownContent = `Just some plain text without any heading.`;

		const result = await runTE(
			importMarkdown({
				workspaceId: "workspace-1",
				parentId: null,
				content: markdownContent,
			}),
		);

		expect(E.isRight(result)).toBe(true);
		// 验证 addNode 被调用时使用了默认标题
		expect(mockAddNode).toHaveBeenCalledWith(
			"workspace-1",
			"导入的文档",
			expect.any(Object),
		);
	});

	it("should return Left for empty content", async () => {
		const result = await runTE(
			importMarkdown({
				workspaceId: "workspace-1",
				parentId: null,
				content: "",
			}),
		);

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("IMPORT_ERROR");
		}
	});

	it("should return Left when node creation fails", async () => {
		const error = { type: "DB_ERROR" as const, message: "Database error" };

		mockGetNextOrder.mockReturnValue(() => Promise.resolve(E.right(0)));
		mockAddNode.mockReturnValue(() => Promise.resolve(E.left(error)));

		const markdownContent = `# Test Document

Some content.
`;

		const result = await runTE(
			importMarkdown({
				workspaceId: "workspace-1",
				parentId: null,
				content: markdownContent,
			}),
		);

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("DB_ERROR");
		}
	});

	it("should create node under specified parent", async () => {
		const testNode = createTestNode({
			title: "Child Document",
			parent: "parent-node-id",
		});
		const testContent = createTestContent({ nodeId: testNode.id });

		mockGetNextOrder.mockReturnValue(() => Promise.resolve(E.right(2)));
		mockAddNode.mockReturnValue(() => Promise.resolve(E.right(testNode)));
		mockAddContent.mockReturnValue(() => Promise.resolve(E.right(testContent)));

		const markdownContent = `# Child Document

Content under parent.
`;

		const result = await runTE(
			importMarkdown({
				workspaceId: "workspace-1",
				parentId: "parent-node-id",
				content: markdownContent,
			}),
		);

		expect(E.isRight(result)).toBe(true);
		expect(mockGetNextOrder).toHaveBeenCalledWith(
			"parent-node-id",
			"workspace-1",
		);
		expect(mockAddNode).toHaveBeenCalledWith(
			"workspace-1",
			expect.any(String),
			expect.objectContaining({
				parent: "parent-node-id",
				order: 2,
			}),
		);
	});
});

describe("importMarkdownToJson", () => {
	it("should convert Markdown content to Lexical JSON", () => {
		const markdownContent = `# Hello World

This is a paragraph.
`;

		const result = importMarkdownToJson(markdownContent);

		expect(E.isRight(result)).toBe(true);
		if (E.isRight(result)) {
			const parsed = JSON.parse(result.right);
			expect(parsed.root).toBeDefined();
			expect(parsed.root.children).toBeDefined();
			expect(Array.isArray(parsed.root.children)).toBe(true);
		}
	});

	it("should return Left for empty content", () => {
		const result = importMarkdownToJson("");

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("IMPORT_ERROR");
		}
	});

	it("should return Left for whitespace-only content", () => {
		const result = importMarkdownToJson("   \n\t  ");

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("IMPORT_ERROR");
		}
	});

	it("should parse front matter when option is enabled", () => {
		const markdownContent = `---
title: Test Title
tags:
  - tag1
  - tag2
---

# Content

Some text here.
`;

		const result = importMarkdownToJson(markdownContent, {
			parseFrontMatter: true,
		});

		expect(E.isRight(result)).toBe(true);
		if (E.isRight(result)) {
			const parsed = JSON.parse(result.right);
			expect(parsed.root).toBeDefined();
		}
	});

	it("should handle complex Markdown with lists and formatting", () => {
		const markdownContent = `# Complex Document

This is **bold** and *italic* text.

## Section 1

- Item 1
- Item 2
- Item 3

## Section 2

1. First
2. Second
3. Third
`;

		const result = importMarkdownToJson(markdownContent);

		expect(E.isRight(result)).toBe(true);
		if (E.isRight(result)) {
			const parsed = JSON.parse(result.right);
			expect(parsed.root.children.length).toBeGreaterThan(0);
		}
	});
});
