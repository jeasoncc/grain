/**
 * @file wiki.resolve.fn.test.ts
 * @description Wiki 解析函数测试
 */

import * as E from "fp-ts/Either";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createWikiFileAsync,
	generateWikiTemplate,
	getWikiFilesAsync,
} from "./wiki.resolve.fn";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/db", () => ({
	getContentsByNodeIds: vi.fn(),
	getNodesByWorkspace: vi.fn(),
}));

vi.mock("@/db/database", () => ({
	database: {
		nodes: {
			where: vi.fn().mockReturnThis(),
			equals: vi.fn().mockReturnThis(),
			and: vi.fn().mockReturnThis(),
			toArray: vi.fn(),
		},
	},
}));

vi.mock("@/routes/actions", () => ({
	createFileInTree: vi.fn(),
	ensureRootFolder: vi.fn(),
}));

vi.mock("@/log/index", () => ({
	default: {
		info: vi.fn(),
		success: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		start: vi.fn(),
	},
}));

import { getContentsByNodeIds, getNodesByWorkspace } from "@/db";
import { database } from "@/db/database";
import { createFileInTree } from "@/routes/actions";

// ============================================================================
// Test Data
// ============================================================================

const mockNode = {
	id: "node-1",
	title: "测试 Wiki",
	type: "file" as const,
	workspace: "ws-1",
	parent: null,
	order: 0,
	collapsed: false,
	tags: ["wiki"],
	createDate: "2024-01-01T00:00:00.000Z",
	lastEdit: "2024-01-01T00:00:00.000Z",
};

const mockContent = {
	id: "content-1",
	nodeId: "node-1",
	content: JSON.stringify({
		root: {
			children: [
				{
					type: "paragraph",
					children: [{ type: "text", text: "测试内容" }],
				},
			],
		},
	}),
	contentType: "lexical" as const,
	lastEdit: "2024-01-01T00:00:00.000Z",
};

// ============================================================================
// Tests
// ============================================================================

describe("Wiki Resolution Functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// generateWikiTemplate Tests
	// ==========================================================================

	describe("generateWikiTemplate", () => {
		it("应该生成有效的 Lexical JSON 模板", () => {
			const template = generateWikiTemplate("测试标题");
			const parsed = JSON.parse(template);

			expect(parsed.root).toBeDefined();
			expect(parsed.root.type).toBe("root");
			expect(parsed.root.children).toBeInstanceOf(Array);
			expect(parsed.root.children.length).toBeGreaterThan(0);
		});

		it("应该在模板中包含标题", () => {
			const title = "我的 Wiki 条目";
			const template = generateWikiTemplate(title);
			const parsed = JSON.parse(template);

			const titleNode = parsed.root.children.find(
				(child: { type: string }) => child.type === "heading",
			);
			expect(titleNode).toBeDefined();
			expect(titleNode.children[0].text).toBe(title);
		});

		it("应该在模板中包含 wiki 标签", () => {
			const template = generateWikiTemplate("测试");
			const parsed = JSON.parse(template);

			const tagNode = parsed.root.children[0];
			expect(tagNode.children).toBeInstanceOf(Array);
			expect(
				tagNode.children.some(
					(child: { type: string }) => child.type === "tag",
				),
			).toBe(true);
		});

		it("应该在模板中包含日期标签", () => {
			const template = generateWikiTemplate("测试");
			const parsed = JSON.parse(template);

			const tagNode = parsed.root.children[0];
			const dateTag = tagNode.children.find(
				(child: { type: string; tagName?: string }) =>
					child.type === "tag" && child.tagName?.includes("-"),
			);
			expect(dateTag).toBeDefined();
		});
	});

	// ==========================================================================
	// createWikiFileAsync Tests
	// ==========================================================================

	describe("createWikiFileAsync", () => {
		it("应该成功创建 Wiki 文件", async () => {
			vi.mocked(createFileInTree).mockResolvedValue({
				node: mockNode,
				parentFolder: { ...mockNode, type: "folder" as const },
			});

			const result = await createWikiFileAsync({
				workspaceId: "ws-1",
				name: "测试 Wiki",
			})();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.node.id).toBe("node-1");
				expect(result.right.content).toBeDefined();
				expect(result.right.parsedContent).toBeDefined();
			}
		});

		it("应该使用提供的内容而不是模板", async () => {
			const customContent = JSON.stringify({ root: { children: [] } });
			vi.mocked(createFileInTree).mockResolvedValue({
				node: mockNode,
				parentFolder: { ...mockNode, type: "folder" as const },
			});

			const result = await createWikiFileAsync({
				workspaceId: "ws-1",
				name: "测试",
				content: customContent,
				useTemplate: false,
			})();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.content).toBe(customContent);
			}
		});

		it("应该处理无效的参数", async () => {
			const result = await createWikiFileAsync({
				workspaceId: "invalid-id",
				name: "",
			} as any)();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
			}
		});

		it("应该处理创建文件失败", async () => {
			vi.mocked(createFileInTree).mockRejectedValue(new Error("创建失败"));

			const result = await createWikiFileAsync({
				workspaceId: "ws-1",
				name: "测试",
			})();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});

		it("应该处理无效的 JSON 内容", async () => {
			const result = await createWikiFileAsync({
				workspaceId: "ws-1",
				name: "测试",
				content: "invalid json {",
				useTemplate: false,
			})();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
			}
		});
	});

	// ==========================================================================
	// getWikiFilesAsync Tests
	// ==========================================================================

	describe("getWikiFilesAsync", () => {
		it("应该成功获取 Wiki 文件列表", async () => {
			vi.mocked(database.nodes.toArray).mockResolvedValue([mockNode]);
			vi.mocked(getContentsByNodeIds).mockReturnValue(() =>
				Promise.resolve(E.right([mockContent])),
			);
			vi.mocked(getNodesByWorkspace).mockReturnValue(() =>
				Promise.resolve(E.right([mockNode])),
			);

			const result = await getWikiFilesAsync("ws-1")();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeInstanceOf(Array);
				expect(result.right.length).toBe(1);
				expect(result.right[0].id).toBe("node-1");
				expect(result.right[0].name).toBe("测试 Wiki");
			}
		});

		it("应该处理空的 Wiki 文件列表", async () => {
			vi.mocked(database.nodes.toArray).mockResolvedValue([]);
			vi.mocked(getContentsByNodeIds).mockReturnValue(() =>
				Promise.resolve(E.right([])),
			);
			vi.mocked(getNodesByWorkspace).mockReturnValue(() =>
				Promise.resolve(E.right([])),
			);

			const result = await getWikiFilesAsync("ws-1")();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual([]);
			}
		});

		it("应该处理数据库查询失败", async () => {
			vi.mocked(database.nodes.toArray).mockRejectedValue(
				new Error("查询失败"),
			);

			const result = await getWikiFilesAsync("ws-1")();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});

		it("应该构建正确的文件路径", async () => {
			const parentNode = {
				...mockNode,
				id: "parent-1",
				title: "Wiki",
				type: "folder" as const,
			};

			const childNode = {
				...mockNode,
				parent: "parent-1",
			};

			vi.mocked(database.nodes.toArray).mockResolvedValue([childNode]);
			vi.mocked(getContentsByNodeIds).mockReturnValue(() =>
				Promise.resolve(E.right([mockContent])),
			);
			vi.mocked(getNodesByWorkspace).mockReturnValue(() =>
				Promise.resolve(E.right([parentNode, childNode])),
			);

			const result = await getWikiFilesAsync("ws-1")();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right[0].path).toBe("Wiki/测试 Wiki");
			}
		});

		it("应该处理缺失的内容", async () => {
			vi.mocked(database.nodes.toArray).mockResolvedValue([mockNode]);
			vi.mocked(getContentsByNodeIds).mockReturnValue(() =>
				Promise.resolve(E.right([])),
			);
			vi.mocked(getNodesByWorkspace).mockReturnValue(() =>
				Promise.resolve(E.right([mockNode])),
			);

			const result = await getWikiFilesAsync("ws-1")();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right[0].content).toBe("");
			}
		});
	});
});
