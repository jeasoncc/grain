/**
 * @file create-templated-file.action.test.ts
 * @description 模板化文件创建高阶函数测试
 */

import * as E from "fp-ts/Either";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
	createTemplatedFile,
	createTemplatedFileAsync,
	type TemplateConfig,
	type TemplatedFileParams,
} from "./create-templated-file.action";

// ==============================
// Mocks
// ==============================

vi.mock("@/actions/node", () => ({
	createFileInTree: vi.fn(),
}));

vi.mock("@/log", () => ({
	default: {
		start: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
	},
}));

import { createFileInTree } from "@/actions/node";
import logger from "@/log";

// ==============================
// Test Data
// ==============================

interface TestTemplateParams {
	readonly name: string;
	readonly date: Date;
}

const testParamsSchema = z.object({
	name: z.string().min(1, "名称不能为空"),
	date: z.date(),
});

const mockTemplateConfig: TemplateConfig<TestTemplateParams> = {
	rootFolder: "TestRoot",
	fileType: "file",
	tag: "test",
	generateTemplate: (params) => JSON.stringify({
		root: {
			children: [
				{
					type: "paragraph",
					children: [
						{
							type: "text",
							text: `Test content for ${params.name} on ${params.date.toISOString()}`,
						},
					],
				},
			],
		},
	}),
	generateFolderPath: (params) => [
		`year-${params.date.getFullYear()}`,
		`month-${params.date.getMonth() + 1}`,
	],
	generateTitle: (params) => `test-${params.name}-${params.date.getTime()}`,
	paramsSchema: testParamsSchema,
};

const mockNode = {
	id: "550e8400-e29b-41d4-a716-446655440000",
	workspace: "550e8400-e29b-41d4-a716-446655440001",
	parent: "550e8400-e29b-41d4-a716-446655440002",
	type: "file" as const,
	title: "test-example-1640995200000",
	order: 0,
	collapsed: true,
	createDate: "2024-01-01T12:00:00.000Z",
	lastEdit: "2024-01-01T12:00:00.000Z",
	tags: ["test"],
};

const mockCreateFileResult = {
	node: mockNode,
	parentFolder: { ...mockNode, type: "folder" as const },
};

// ==============================
// Tests
// ==============================

describe("createTemplatedFile", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("成功场景", () => {
		it("应该成功创建模板化文件", async () => {
			// Arrange
			const testDate = new Date("2024-01-01T12:00:00.000Z");
			const params: TemplatedFileParams<TestTemplateParams> = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440001",
				templateParams: {
					name: "example",
					date: testDate,
				},
			};

			vi.mocked(createFileInTree).mockResolvedValue(mockCreateFileResult);

			// Act
			const createFn = createTemplatedFile(mockTemplateConfig);
			const result = await createFn(params)();

			// Assert
			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.node).toEqual(mockNode);
				expect(result.right.content).toContain("Test content for example");
				expect(result.right.parsedContent).toBeDefined();
			}

			expect(vi.mocked(createFileInTree)).toHaveBeenCalledWith({
				workspaceId: "550e8400-e29b-41d4-a716-446655440001",
				title: expect.stringMatching(/^test-example-\d+$/),
				folderPath: ["TestRoot", "year-2024", "month-1"],
				type: "file",
				tags: ["test"],
				content: expect.stringContaining("Test content for example"),
				foldersCollapsed: true,
			});

			expect(logger.start).toHaveBeenCalledWith("[Action] 创建TestRoot文件...");
			expect(logger.success).toHaveBeenCalledWith(
				"[Action] TestRoot文件创建成功:",
				mockNode.id,
			);
		});

		it("应该正确解析生成的 JSON 内容", async () => {
			// Arrange
			const testDate = new Date("2024-01-01T12:00:00.000Z");
			const params: TemplatedFileParams<TestTemplateParams> = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440001",
				templateParams: {
					name: "json-test",
					date: testDate,
				},
			};

			vi.mocked(createFileInTree).mockResolvedValue(mockCreateFileResult);

			// Act
			const createFn = createTemplatedFile(mockTemplateConfig);
			const result = await createFn(params)();

			// Assert
			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				const parsed = result.right.parsedContent as any;
				expect(parsed.root).toBeDefined();
				expect(parsed.root.children).toHaveLength(1);
				expect(parsed.root.children[0].children[0].text).toContain("json-test");
			}
		});
	});

	describe("参数校验", () => {
		it("应该在工作区 ID 无效时返回错误", async () => {
			// Arrange
			const params: TemplatedFileParams<TestTemplateParams> = {
				workspaceId: "invalid-uuid",
				templateParams: {
					name: "test",
					date: new Date(),
				},
			};

			// Act
			const createFn = createTemplatedFile(mockTemplateConfig);
			const result = await createFn(params)();

			// Assert
			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("基础参数校验失败");
			}
		});

		it("应该在模板参数无效时返回错误", async () => {
			// Arrange
			const params: TemplatedFileParams<TestTemplateParams> = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440001",
				templateParams: {
					name: "", // 空名称应该失败
					date: new Date(),
				},
			};

			// Act
			const createFn = createTemplatedFile(mockTemplateConfig);
			const result = await createFn(params)();

			// Assert
			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("模板参数校验失败");
			}
		});
	});

	describe("内容解析错误", () => {
		it("应该在生成的内容不是有效 JSON 时返回错误", async () => {
			// Arrange
			const invalidConfig: TemplateConfig<TestTemplateParams> = {
				...mockTemplateConfig,
				generateTemplate: () => "invalid json content",
			};

			const params: TemplatedFileParams<TestTemplateParams> = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440001",
				templateParams: {
					name: "test",
					date: new Date(),
				},
			};

			// Act
			const createFn = createTemplatedFile(invalidConfig);
			const result = await createFn(params)();

			// Assert
			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("内容解析失败");
			}
		});
	});

	describe("文件创建错误", () => {
		it("应该在文件创建失败时返回错误", async () => {
			// Arrange
			const params: TemplatedFileParams<TestTemplateParams> = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440001",
				templateParams: {
					name: "test",
					date: new Date(),
				},
			};

			vi.mocked(createFileInTree).mockRejectedValue(new Error("数据库连接失败"));

			// Act
			const createFn = createTemplatedFile(mockTemplateConfig);
			const result = await createFn(params)();

			// Assert
			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
				expect(result.left.message).toContain("创建文件失败");
			}
		});
	});
});

describe("createTemplatedFileAsync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("应该成功创建文件并返回结果", async () => {
		// Arrange
		const testDate = new Date("2024-01-01T12:00:00.000Z");
		const params: TemplatedFileParams<TestTemplateParams> = {
			workspaceId: "550e8400-e29b-41d4-a716-446655440001",
			templateParams: {
				name: "async-test",
				date: testDate,
			},
		};

		vi.mocked(createFileInTree).mockResolvedValue(mockCreateFileResult);

		// Act
		const createAsyncFn = createTemplatedFileAsync(mockTemplateConfig);
		const result = await createAsyncFn(params);

		// Assert
		expect(result.node).toEqual(mockNode);
		expect(result.content).toContain("Test content for async-test");
		expect(result.parsedContent).toBeDefined();
	});

	it("应该在创建失败时抛出错误", async () => {
		// Arrange
		const params: TemplatedFileParams<TestTemplateParams> = {
			workspaceId: "invalid-uuid",
			templateParams: {
				name: "test",
				date: new Date(),
			},
		};

		// Act & Assert
		const createAsyncFn = createTemplatedFileAsync(mockTemplateConfig);
		await expect(createAsyncFn(params)).rejects.toThrow("基础参数校验失败");
	});
});

describe("高阶函数特性", () => {
	it("应该支持不同类型的模板参数", async () => {
		// Arrange
		interface CustomParams {
			readonly title: string;
			readonly category: string;
		}

		const customParamsSchema = z.object({
			title: z.string().min(1),
			category: z.string().min(1),
		});

		const customConfig: TemplateConfig<CustomParams> = {
			rootFolder: "Custom",
			fileType: "file",
			tag: "custom",
			generateTemplate: (params) => JSON.stringify({
				root: {
					children: [
						{
							type: "paragraph",
							children: [
								{
									type: "text",
									text: `${params.category}: ${params.title}`,
								},
							],
						},
					],
				},
			}),
			generateFolderPath: (params) => [params.category],
			generateTitle: (params) => params.title,
			paramsSchema: customParamsSchema,
		};

		const params: TemplatedFileParams<CustomParams> = {
			workspaceId: "550e8400-e29b-41d4-a716-446655440001",
			templateParams: {
				title: "Custom File",
				category: "documents",
			},
		};

		vi.mocked(createFileInTree).mockResolvedValue(mockCreateFileResult);

		// Act
		const createFn = createTemplatedFile(customConfig);
		const result = await createFn(params)();

		// Assert
		expect(E.isRight(result)).toBe(true);
		expect(vi.mocked(createFileInTree)).toHaveBeenCalledWith({
			workspaceId: "550e8400-e29b-41d4-a716-446655440001",
			title: "Custom File",
			folderPath: ["Custom", "documents"],
			type: "file",
			tags: ["custom"],
			content: expect.stringContaining("documents: Custom File"),
			foldersCollapsed: true,
		});
	});
});