/**
 * @file create-templated-file.action.test.ts
 * @description 模板化文件创建高阶函数的单元测试
 *
 * 测试覆盖：
 * - ✅ 高阶函数配置
 * - ✅ 参数校验（基础参数和模板参数）
 * - ✅ 模板生成流程
 * - ✅ 文件创建流程
 * - ✅ 错误处理
 * - ✅ 异步版本
 * - ✅ 边界值测试
 *
 * 目标覆盖率：> 95%
 */

import * as E from "fp-ts/Either";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { NodeInterface, NodeType } from "@/types/node";
import {
	type TemplateConfig,
	type TemplatedFileParams,
	createTemplatedFile,
	createTemplatedFileAsync,
} from "./create-templated-file.action";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/actions/node", () => ({
	createFileInTree: vi.fn(),
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

import { createFileInTree } from "@/actions/node";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 测试用的模板参数类型
 */
interface TestTemplateParams {
	name: string;
	category: string;
	priority?: number;
}

/**
 * 测试用的模板参数 Schema
 */
const testTemplateParamsSchema = z.object({
	name: z.string().min(1, "名称不能为空").max(100, "名称过长"),
	category: z.string().min(1, "分类不能为空"),
	priority: z.number().min(1).max(10).optional(),
});

/**
 * 创建测试用的模板配置
 */
const createTestTemplateConfig = (
	overrides: Partial<TemplateConfig<TestTemplateParams>> = {},
): TemplateConfig<TestTemplateParams> => ({
	rootFolder: "TestFolder",
	fileType: "file" as NodeType,
	tag: "test",
	generateTemplate: (params) =>
		JSON.stringify({
			root: {
				children: [
					{
						type: "paragraph",
						children: [
							{
								type: "text",
								text: `Test: ${params.name} - ${params.category}`,
								format: 0,
							},
						],
					},
				],
				direction: "ltr",
				format: "",
				indent: 0,
				type: "root",
				version: 1,
			},
		}),
	generateFolderPath: (params) => [params.category],
	generateTitle: (params) => `${params.name} (${params.category})`,
	paramsSchema: testTemplateParamsSchema,
	...overrides,
});

/**
 * 创建 mock 节点数据
 */
const createMockNode = (
	overrides: Partial<NodeInterface> = {},
): NodeInterface => ({
	id: "550e8400-e29b-41d4-a716-446655440001",
	workspace: "550e8400-e29b-41d4-a716-446655440000",
	parent: null,
	type: "file",
	title: "Test File",
	order: 0,
	collapsed: false,
	createDate: "2024-01-01T00:00:00.000Z",
	lastEdit: "2024-01-01T00:00:00.000Z",
	tags: ["test"],
	...overrides,
});

/**
 * 创建带有无效参数的模板（用于测试校验失败场景）
 */
const createTemplatedFileWithInvalidParams = <T>(
	config: TemplateConfig<T>,
	params: unknown,
) => {
	const createFn = createTemplatedFile(config);
	return createFn(params as TemplatedFileParams<T>);
};

// ============================================================================
// Test Data
// ============================================================================

const validWorkspaceId = "550e8400-e29b-41d4-a716-446655440000";
const validTemplateParams: TestTemplateParams = {
	name: "测试文件",
	category: "工作",
	priority: 5,
};

const validParams: TemplatedFileParams<TestTemplateParams> = {
	workspaceId: validWorkspaceId,
	templateParams: validTemplateParams,
};

// ============================================================================
// Tests
// ============================================================================

describe("createTemplatedFile", () => {
	let testConfig: TemplateConfig<TestTemplateParams>;

	beforeEach(() => {
		vi.clearAllMocks();
		testConfig = createTestTemplateConfig();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
	});

	// ==========================================================================
	// 高阶函数配置测试
	// ==========================================================================

	describe("高阶函数配置", () => {
		it("应该返回一个函数", () => {
			const createFn = createTemplatedFile(testConfig);
			expect(typeof createFn).toBe("function");
		});

		it("应该使用配置中的根文件夹", async () => {
			const mockNode = createMockNode();
			vi.mocked(createFileInTree).mockResolvedValue({ node: mockNode });

			const createFn = createTemplatedFile(testConfig);
			await createFn(validParams)();

			expect(vi.mocked(createFileInTree)).toHaveBeenCalledWith(
				expect.objectContaining({
					folderPath: ["TestFolder", "工作"],
				}),
			);
		});

		it("应该使用配置中的文件类型", async () => {
			const mockNode = createMockNode();
			vi.mocked(createFileInTree).mockResolvedValue({ node: mockNode });

			const createFn = createTemplatedFile(testConfig);
			await createFn(validParams)();

			expect(vi.mocked(createFileInTree)).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "file",
				}),
			);
		});

		it("应该使用配置中的标签", async () => {
			const mockNode = createMockNode();
			vi.mocked(createFileInTree).mockResolvedValue({ node: mockNode });

			const createFn = createTemplatedFile(testConfig);
			await createFn(validParams)();

			expect(vi.mocked(createFileInTree)).toHaveBeenCalledWith(
				expect.objectContaining({
					tags: ["test"],
				}),
			);
		});
	});

	// ==========================================================================
	// 参数校验测试
	// ==========================================================================

	describe("参数校验", () => {
		beforeEach(() => {
			const mockNode = createMockNode();
			vi.mocked(createFileInTree).mockResolvedValue({ node: mockNode });
		});

		it("应该接受有效的参数", async () => {
			const createFn = createTemplatedFile(testConfig);
			const result = await createFn(validParams)();
			expect(E.isRight(result)).toBe(true);
		});

		it("应该拒绝无效的工作区 ID", async () => {
			const createFn = createTemplatedFile(testConfig);
			const result = await createTemplatedFileWithInvalidParams(testConfig, {
				workspaceId: "invalid-id",
				templateParams: validTemplateParams,
			})();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("UUID");
			}
		});

		it("应该拒绝空的工作区 ID", async () => {
			const createFn = createTemplatedFile(testConfig);
			const result = await createTemplatedFileWithInvalidParams(testConfig, {
				workspaceId: "",
				templateParams: validTemplateParams,
			})();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
			}
		});

		it("应该拒绝无效的模板参数", async () => {
			const createFn = createTemplatedFile(testConfig);
			const result = await createTemplatedFileWithInvalidParams(testConfig, {
				workspaceId: validWorkspaceId,
				templateParams: {
					name: "", // 空名称
					category: "工作",
				},
			})();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("模板参数校验失败");
			}
		});

		it("应该拒绝过长的名称", async () => {
			const createFn = createTemplatedFile(testConfig);
			const result = await createTemplatedFileWithInvalidParams(testConfig, {
				workspaceId: validWorkspaceId,
				templateParams: {
					name: "a".repeat(101), // 超过最大长度
					category: "工作",
				},
			})();

			expect(E.isLeft(result)).toBe(true);
		});

		it("应该拒绝空的分类", async () => {
			const createFn = createTemplatedFile(testConfig);
			const result = await createTemplatedFileWithInvalidParams(testConfig, {
				workspaceId: validWorkspaceId,
				templateParams: {
					name: "测试",
					category: "", // 空分类
				},
			})();

			expect(E.isLeft(result)).toBe(true);
		});

		it("应该拒绝超出范围的优先级", async () => {
			const createFn = createTemplatedFile(testConfig);
			const result = await createTemplatedFileWithInvalidParams(testConfig, {
				workspaceId: validWorkspaceId,
				templateParams: {
					name: "测试",
					category: "工作",
					priority: 11, // 超出范围
				},
			})();

			expect(E.isLeft(result)).toBe(true);
		});

		it("应该接受可选的优先级参数", async () => {
			const createFn = createTemplatedFile(testConfig);
			const result = await createFn({
				workspaceId: validWorkspaceId,
				templateParams: {
					name: "测试",
					category: "工作",
					// 不提供 priority
				},
			})();

			expect(E.isRight(result)).toBe(true);
		});
	});

	// ==========================================================================
	// 模板生成测试
	// ==========================================================================

	describe("模板生成", () => {
		beforeEach(() => {
			const mockNode = createMockNode();
			vi.mocked(createFileInTree).mockResolvedValue({ node: mockNode });
		});

		it("应该调用模板生成函数", async () => {
			const generateTemplateSpy = vi.fn().mockReturnValue(
				JSON.stringify({
					root: { children: [], type: "root", version: 1 },
				}),
			);

			const config = createTestTemplateConfig({
				generateTemplate: generateTemplateSpy,
			});

			const createFn = createTemplatedFile(config);
			await createFn(validParams)();

			expect(generateTemplateSpy).toHaveBeenCalledWith(validTemplateParams);
		});

		it("应该调用文件夹路径生成函数", async () => {
			const generateFolderPathSpy = vi.fn().mockReturnValue(["custom", "path"]);

			const config = createTestTemplateConfig({
				generateFolderPath: generateFolderPathSpy,
			});

			const createFn = createTemplatedFile(config);
			await createFn(validParams)();

			expect(generateFolderPathSpy).toHaveBeenCalledWith(validTemplateParams);
			expect(vi.mocked(createFileInTree)).toHaveBeenCalledWith(
				expect.objectContaining({
					folderPath: ["TestFolder", "custom", "path"],
				}),
			);
		});

		it("应该调用标题生成函数", async () => {
			const generateTitleSpy = vi.fn().mockReturnValue("Custom Title");

			const config = createTestTemplateConfig({
				generateTitle: generateTitleSpy,
			});

			const createFn = createTemplatedFile(config);
			await createFn(validParams)();

			expect(generateTitleSpy).toHaveBeenCalledWith(validTemplateParams);
			expect(vi.mocked(createFileInTree)).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Custom Title",
				}),
			);
		});

		it("应该验证生成的内容是有效的 JSON", async () => {
			const config = createTestTemplateConfig({
				generateTemplate: () => "invalid json",
			});

			const createFn = createTemplatedFile(config);
			const result = await createFn(validParams)();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("内容解析失败");
			}
		});
	});

	// ==========================================================================
	// 文件创建测试
	// ==========================================================================

	describe("文件创建", () => {
		it("应该成功创建文件并返回正确数据", async () => {
			const mockNode = createMockNode({
				title: "测试文件 (工作)",
			});
			vi.mocked(createFileInTree).mockResolvedValue({ node: mockNode });

			const createFn = createTemplatedFile(testConfig);
			const result = await createFn(validParams)();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.node).toBeDefined();
				expect(result.right.content).toBeDefined();
				expect(result.right.parsedContent).toBeDefined();
				expect(result.right.node.id).toBe(mockNode.id);
			}
		});

		it("应该传递正确的参数给 createFileInTree", async () => {
			const mockNode = createMockNode();
			vi.mocked(createFileInTree).mockResolvedValue({ node: mockNode });

			const createFn = createTemplatedFile(testConfig);
			await createFn(validParams)();

			expect(vi.mocked(createFileInTree)).toHaveBeenCalledWith({
				workspaceId: validWorkspaceId,
				title: "测试文件 (工作)",
				folderPath: ["TestFolder", "工作"],
				type: "file",
				tags: ["test"],
				content: expect.any(String),
				foldersCollapsed: true,
			});
		});

		it("应该返回解析后的内容", async () => {
			const mockNode = createMockNode();
			vi.mocked(createFileInTree).mockResolvedValue({ node: mockNode });

			const createFn = createTemplatedFile(testConfig);
			const result = await createFn(validParams)();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.parsedContent).toBeDefined();
				expect(typeof result.right.parsedContent).toBe("object");
			}
		});
	});

	// ==========================================================================
	// 错误处理测试
	// ==========================================================================

	describe("错误处理", () => {
		it("应该在文件创建失败时返回 DB_ERROR", async () => {
			vi.mocked(createFileInTree).mockRejectedValue(
				new Error("Database connection failed"),
			);

			const createFn = createTemplatedFile(testConfig);
			const result = await createFn(validParams)();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
				expect(result.left.message).toContain("创建文件失败");
			}
		});

		it("应该正确传递文件创建错误信息", async () => {
			const errorMessage = "Unique constraint violation";
			vi.mocked(createFileInTree).mockRejectedValue(new Error(errorMessage));

			const createFn = createTemplatedFile(testConfig);
			const result = await createFn(validParams)();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain(errorMessage);
			}
		});
	});

	// ==========================================================================
	// 边界情况测试
	// ==========================================================================

	describe("边界情况", () => {
		beforeEach(() => {
			const mockNode = createMockNode();
			vi.mocked(createFileInTree).mockResolvedValue({ node: mockNode });
		});

		it("应该处理最小有效参数", async () => {
			const createFn = createTemplatedFile(testConfig);
			const result = await createFn({
				workspaceId: validWorkspaceId,
				templateParams: {
					name: "a",
					category: "b",
				},
			})();

			expect(E.isRight(result)).toBe(true);
		});

		it("应该处理最大长度的名称", async () => {
			const createFn = createTemplatedFile(testConfig);
			const result = await createFn({
				workspaceId: validWorkspaceId,
				templateParams: {
					name: "a".repeat(100),
					category: "工作",
				},
			})();

			expect(E.isRight(result)).toBe(true);
		});

		it("应该处理特殊字符", async () => {
			const createFn = createTemplatedFile(testConfig);
			const result = await createFn({
				workspaceId: validWorkspaceId,
				templateParams: {
					name: "测试 @#$%^&*() 文件",
					category: "工作 & 学习",
				},
			})();

			expect(E.isRight(result)).toBe(true);
		});

		it("应该处理 Unicode 字符", async () => {
			const createFn = createTemplatedFile(testConfig);
			const result = await createFn({
				workspaceId: validWorkspaceId,
				templateParams: {
					name: "测试 🎨 文件 中文 日本語",
					category: "工作 📝",
				},
			})();

			expect(E.isRight(result)).toBe(true);
		});

		it("应该处理空的文件夹路径", async () => {
			const config = createTestTemplateConfig({
				generateFolderPath: () => [],
			});

			const createFn = createTemplatedFile(config);
			await createFn(validParams)();

			expect(vi.mocked(createFileInTree)).toHaveBeenCalledWith(
				expect.objectContaining({
					folderPath: ["TestFolder"],
				}),
			);
		});

		it("应该处理复杂的 JSON 内容", async () => {
			const complexContent = {
				root: {
					children: [
						{
							type: "heading",
							tag: "h1",
							children: [{ type: "text", text: "Title", format: 1 }],
						},
						{
							type: "paragraph",
							children: [
								{ type: "text", text: "Bold ", format: 1 },
								{ type: "text", text: "italic ", format: 2 },
								{ type: "text", text: "normal", format: 0 },
							],
						},
						{
							type: "list",
							listType: "bullet",
							children: [
								{
									type: "listitem",
									children: [
										{
											type: "paragraph",
											children: [{ type: "text", text: "Item 1", format: 0 }],
										},
									],
								},
							],
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "root",
					version: 1,
				},
			};

			const config = createTestTemplateConfig({
				generateTemplate: () => JSON.stringify(complexContent),
			});

			const createFn = createTemplatedFile(config);
			const result = await createFn(validParams)();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.parsedContent).toEqual(complexContent);
			}
		});
	});
});

describe("createTemplatedFileAsync", () => {
	let testConfig: TemplateConfig<TestTemplateParams>;

	beforeEach(() => {
		vi.clearAllMocks();
		testConfig = createTestTemplateConfig();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
	});

	it("应该成功创建文件并返回结果", async () => {
		const mockNode = createMockNode({
			title: "测试文件 (工作)",
		});
		vi.mocked(createFileInTree).mockResolvedValue({ node: mockNode });

		const createFnAsync = createTemplatedFileAsync(testConfig);
		const result = await createFnAsync(validParams);

		expect(result.node).toBeDefined();
		expect(result.content).toBeDefined();
		expect(result.parsedContent).toBeDefined();
		expect(result.node.id).toBe(mockNode.id);
	});

	it("应该在文件创建失败时抛出错误", async () => {
		vi.mocked(createFileInTree).mockRejectedValue(
			new Error("Database error"),
		);

		const createFnAsync = createTemplatedFileAsync(testConfig);

		await expect(createFnAsync(validParams)).rejects.toThrow("创建文件失败");
	});

	it("应该在参数校验失败时抛出错误", async () => {
		const createFnAsync = createTemplatedFileAsync(testConfig);

		await expect(
			createFnAsync({
				workspaceId: "invalid-id",
				templateParams: validTemplateParams,
			} as TemplatedFileParams<TestTemplateParams>),
		).rejects.toThrow();
	});

	it("应该在模板参数校验失败时抛出错误", async () => {
		const createFnAsync = createTemplatedFileAsync(testConfig);

		await expect(
			createFnAsync({
				workspaceId: validWorkspaceId,
				templateParams: {
					name: "", // 无效参数
					category: "工作",
				},
			}),
		).rejects.toThrow();
	});
});