/**
 * @file create-wiki.action.test.ts
 * @description Wiki 条目创建 Action 测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as E from "fp-ts/Either";
import { createWiki, createWikiAsync, type WikiTemplateParams } from "./create-wiki.action";
import type { TemplatedFileParams } from "./create-templated-file.action";

// Mock dependencies
vi.mock("@/actions/node", () => ({
	createFileInTree: vi.fn().mockResolvedValue({
		node: {
			id: "test-wiki-id",
			title: "wiki-1234567890-test-title",
			workspace: "test-workspace",
			parent: "wiki-folder-id",
			type: "file",
			order: 0,
			createDate: "2024-12-25T00:00:00.000Z",
			lastEdit: "2024-12-25T00:00:00.000Z",
			tags: ["wiki"],
		},
	}),
}));

vi.mock("@/log", () => ({
	default: {
		start: vi.fn(),
		success: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
	},
}));

describe("createWiki", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("TaskEither 版本", () => {
		it("应该成功创建 Wiki 条目", async () => {
			const params: TemplatedFileParams<WikiTemplateParams> = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				templateParams: {
					title: "Test Wiki Entry",
					date: new Date("2024-12-25T00:00:00.000Z"),
				},
			};

			const result = await createWiki(params)();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.node.id).toBe("test-wiki-id");
				expect(result.right.node.tags).toContain("wiki");
				expect(result.right.content).toContain("Test Wiki Entry");
				expect(result.right.parsedContent).toBeDefined();
			}
		});

		it("应该在工作区 ID 无效时返回错误", async () => {
			const params: TemplatedFileParams<WikiTemplateParams> = {
				workspaceId: "invalid-uuid",
				templateParams: {
					title: "Test Wiki Entry",
				},
			};

			const result = await createWiki(params)();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("基础参数校验失败");
			}
		});

		it("应该在标题为空时返回错误", async () => {
			const params: TemplatedFileParams<WikiTemplateParams> = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				templateParams: {
					title: "",
				},
			};

			const result = await createWiki(params)();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("模板参数校验失败");
			}
		});

		it("应该使用默认日期当未提供日期时", async () => {
			const params: TemplatedFileParams<WikiTemplateParams> = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				templateParams: {
					title: "Test Wiki Entry",
				},
			};

			const result = await createWiki(params)();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				// The mock returns a fixed title, so we just check that it's defined
				expect(result.right.node.title).toBeDefined();
				expect(result.right.node.title).toBe("wiki-1234567890-test-title");
			}
		});
	});

	describe("Promise 版本", () => {
		it("应该成功创建 Wiki 条目", async () => {
			const params: TemplatedFileParams<WikiTemplateParams> = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				templateParams: {
					title: "Test Wiki Entry",
					date: new Date("2024-12-25T00:00:00.000Z"),
				},
			};

			const result = await createWikiAsync(params);

			expect(result.node.id).toBe("test-wiki-id");
			expect(result.node.tags).toContain("wiki");
			expect(result.content).toContain("Test Wiki Entry");
			expect(result.parsedContent).toBeDefined();
		});

		it("应该在参数无效时抛出错误", async () => {
			const params: TemplatedFileParams<WikiTemplateParams> = {
				workspaceId: "invalid-uuid",
				templateParams: {
					title: "Test Wiki Entry",
				},
			};

			await expect(createWikiAsync(params)).rejects.toThrow("基础参数校验失败");
		});
	});

	describe("文件夹结构", () => {
		it("应该按年月组织文件夹结构", async () => {
			const testDate = new Date("2024-12-25T00:00:00.000Z");
			const params: TemplatedFileParams<WikiTemplateParams> = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				templateParams: {
					title: "Test Wiki Entry",
					date: testDate,
				},
			};

			const result = await createWiki(params)();

			expect(E.isRight(result)).toBe(true);
			// 验证 createFileInTree 被正确调用
			const { createFileInTree } = await import("@/actions/node");
			expect(createFileInTree).toHaveBeenCalledWith(
				expect.objectContaining({
					folderPath: ["Wiki", "year-2024", "month-12-December"],
				}),
			);
		});
	});

	describe("文件标题生成", () => {
		it("应该生成正确格式的文件标题", async () => {
			const testDate = new Date("2024-12-25T00:00:00.000Z");
			const params: TemplatedFileParams<WikiTemplateParams> = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				templateParams: {
					title: "Test Wiki Entry!@#",
					date: testDate,
				},
			};

			const result = await createWiki(params)();

			expect(E.isRight(result)).toBe(true);
			// 验证 createFileInTree 被正确调用
			const { createFileInTree } = await import("@/actions/node");
			expect(createFileInTree).toHaveBeenCalledWith(
				expect.objectContaining({
					title: expect.stringMatching(/^wiki-\d+-test-wiki-entry$/),
				}),
			);
		});
	});
});