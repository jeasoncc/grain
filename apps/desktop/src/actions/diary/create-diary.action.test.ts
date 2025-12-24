/**
 * @file create-diary.action.test.ts
 * @description 创建日记 Action 测试
 *
 * 测试覆盖：
 * - ✅ 参数校验（Zod Schema）
 * - ✅ 成功创建流程
 * - ✅ 错误处理
 * - ✅ 异步版本
 * - ✅ 边界值
 *
 * 目标覆盖率：> 95%
 */

import * as E from "fp-ts/Either";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type CreateDiaryParams,
	createDiary,
	createDiaryAsync,
	DIARY_ROOT_FOLDER,
} from "./create-diary.action";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/actions/node", () => ({
	createFileInTree: vi.fn(),
}));

vi.mock("@/domain/diary/diary.utils", () => ({
	generateDiaryContent: vi.fn(),
	getDiaryFolderStructure: vi.fn(),
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
import {
	generateDiaryContent,
	getDiaryFolderStructure,
} from "@/domain/diary/diary.utils";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建带有无效参数的日记（用于测试校验失败场景）
 * 使用此函数避免在测试中使用 `as any`
 */
const createDiaryWithInvalidParams = (params: unknown) =>
	createDiary(params as CreateDiaryParams);

/**
 * 创建 mock 日记数据
 */
const createMockDiaryResult = (
	overrides: Partial<{
		id: string;
		title: string;
		content: string;
	}> = {},
) => ({
	node: {
		id: "550e8400-e29b-41d4-a716-446655440001",
		workspace: "550e8400-e29b-41d4-a716-446655440000",
		parent: null,
		type: "diary" as const,
		title: "diary-20240101-12-00-00",
		order: 0,
		collapsed: false,
		createDate: "2024-01-01T00:00:00.000Z",
		lastEdit: "2024-01-01T00:00:00.000Z",
		tags: ["diary"],
		...overrides,
	},
});

/**
 * 创建 mock 文件夹结构
 */
const createMockFolderStructure = () => ({
	yearFolder: "year-2024-Dragon",
	monthFolder: "month-01-January",
	dayFolder: "day-01-Monday",
	filename: "diary-20240101-12-00-00",
});

/**
 * 创建 mock Lexical 内容
 */
const createMockLexicalContent = () =>
	JSON.stringify({
		root: {
			children: [
				{
					type: "paragraph",
					children: [{ type: "text", text: "今天是 2024-01-01", format: 0 }],
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	});

// ============================================================================
// Test Data
// ============================================================================

const validParams: CreateDiaryParams = {
	workspaceId: "550e8400-e29b-41d4-a716-446655440000",
	date: new Date("2024-01-01T12:00:00.000Z"),
};

// ============================================================================
// Tests
// ============================================================================

describe("createDiary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		
		// 设置默认 mock 返回值
		vi.mocked(getDiaryFolderStructure).mockReturnValue(createMockFolderStructure());
		vi.mocked(generateDiaryContent).mockReturnValue(createMockLexicalContent());
		vi.mocked(createFileInTree).mockReturnValue(() =>
			Promise.resolve(E.right(createMockDiaryResult())),
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
	});

	// ==========================================================================
	// Schema 校验测试
	// ==========================================================================

	describe("参数校验", () => {
		it("应该接受有效的参数", async () => {
			const result = await createDiary(validParams)();
			expect(E.isRight(result)).toBe(true);
		});

		it("应该拒绝无效的 workspaceId", async () => {
			const result = await createDiaryWithInvalidParams({
				workspaceId: "invalid-id",
			})();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("UUID");
			}
		});

		it("应该拒绝空的 workspaceId", async () => {
			const result = await createDiaryWithInvalidParams({
				workspaceId: "",
			})();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
			}
		});

		it("应该接受只有 workspaceId 的参数", async () => {
			const result = await createDiary({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			})();

			expect(E.isRight(result)).toBe(true);
		});

		it("应该接受有效的日期", async () => {
			const result = await createDiary({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: new Date("2024-12-25T10:30:00.000Z"),
			})();

			expect(E.isRight(result)).toBe(true);
		});
	});

	// ==========================================================================
	// createDiary 功能测试
	// ==========================================================================

	describe("createDiary 功能", () => {
		it("应该成功创建日记并返回正确数据", async () => {
			const result = await createDiary(validParams)();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.node.id).toBe("550e8400-e29b-41d4-a716-446655440001");
				expect(result.right.node.type).toBe("diary");
				expect(result.right.node.tags).toContain("diary");
				expect(result.right.content).toBeDefined();
				expect(result.right.parsedContent).toBeDefined();
			}
		});

		it("应该使用提供的日期", async () => {
			const customDate = new Date("2024-12-25T10:30:00.000Z");
			await createDiary({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: customDate,
			})();

			expect(vi.mocked(getDiaryFolderStructure)).toHaveBeenCalledWith(customDate);
			expect(vi.mocked(generateDiaryContent)).toHaveBeenCalledWith(customDate);
		});

		it("应该使用当前时间（当未提供日期时）", async () => {
			const beforeCall = new Date();
			await createDiary({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			})();
			const afterCall = new Date();

			const calls = vi.mocked(getDiaryFolderStructure).mock.calls;
			expect(calls.length).toBe(1);
			const usedDate = calls[0]?.[0];
			expect(usedDate).toBeInstanceOf(Date);
			expect(usedDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
			expect(usedDate.getTime()).toBeLessThanOrEqual(afterCall.getTime());
		});

		it("应该使用正确的文件夹路径", async () => {
			await createDiary(validParams)();

			expect(vi.mocked(createFileInTree)).toHaveBeenCalledWith({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				title: "diary-20240101-12-00-00",
				folderPath: [
					DIARY_ROOT_FOLDER,
					"year-2024-Dragon",
					"month-01-January",
					"day-01-Monday",
				],
				type: "diary",
				tags: ["diary"],
				content: expect.any(String),
				foldersCollapsed: true,
			});
		});

		it("应该解析生成的内容", async () => {
			const result = await createDiary(validParams)();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.parsedContent).toEqual({
					root: {
						children: [
							{
								type: "paragraph",
								children: [{ type: "text", text: "今天是 2024-01-01", format: 0 }],
							},
						],
						direction: "ltr",
						format: "",
						indent: 0,
						type: "root",
						version: 1,
					},
				});
			}
		});
	});

	// ==========================================================================
	// 错误处理测试
	// ==========================================================================

	describe("错误处理", () => {
		it("应该在参数校验失败时返回 VALIDATION_ERROR", async () => {
			const result = await createDiaryWithInvalidParams({
				workspaceId: "invalid-id",
			})();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("参数校验失败");
			}
		});

		it("应该在内容解析失败时返回 VALIDATION_ERROR", async () => {
			vi.mocked(generateDiaryContent).mockReturnValue("invalid json");

			const result = await createDiary(validParams)();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("内容解析失败");
			}
		});

		it("应该在文件创建失败时返回错误", async () => {
			vi.mocked(createFileInTree).mockReturnValue(() =>
				Promise.resolve(
					E.left({ type: "DB_ERROR" as const, message: "数据库连接失败" }),
				),
			);

			const result = await createDiary(validParams)();

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
				expect(result.left.message).toContain("数据库");
			}
		});
	});

	// ==========================================================================
	// createDiaryAsync 测试
	// ==========================================================================

	describe("createDiaryAsync", () => {
		it("应该成功创建日记并返回结果", async () => {
			const diary = await createDiaryAsync(validParams);

			expect(diary.node.id).toBe("550e8400-e29b-41d4-a716-446655440001");
			expect(diary.node.type).toBe("diary");
			expect(diary.content).toBeDefined();
			expect(diary.parsedContent).toBeDefined();
		});

		it("应该在创建失败时抛出错误", async () => {
			vi.mocked(createFileInTree).mockReturnValue(() =>
				Promise.resolve(
					E.left({ type: "DB_ERROR" as const, message: "数据库错误" }),
				),
			);

			await expect(createDiaryAsync(validParams)).rejects.toThrow("数据库错误");
		});

		it("应该在参数校验失败时抛出错误", async () => {
			await expect(
				createDiaryAsync({
					workspaceId: "invalid-id",
				} as CreateDiaryParams),
			).rejects.toThrow("参数校验失败");
		});
	});

	// ==========================================================================
	// 边界情况测试
	// ==========================================================================

	describe("边界情况", () => {
		it("应该处理最小有效参数", async () => {
			const result = await createDiary({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			})();

			expect(E.isRight(result)).toBe(true);
		});

		it("应该处理极端日期", async () => {
			const extremeDate = new Date("1970-01-01T00:00:00.000Z");
			const result = await createDiary({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: extremeDate,
			})();

			expect(E.isRight(result)).toBe(true);
			expect(vi.mocked(getDiaryFolderStructure)).toHaveBeenCalledWith(extremeDate);
		});

		it("应该处理未来日期", async () => {
			const futureDate = new Date("2030-12-31T23:59:59.999Z");
			const result = await createDiary({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: futureDate,
			})();

			expect(E.isRight(result)).toBe(true);
			expect(vi.mocked(getDiaryFolderStructure)).toHaveBeenCalledWith(futureDate);
		});

		it("应该处理空的生成内容", async () => {
			vi.mocked(generateDiaryContent).mockReturnValue("{}");

			const result = await createDiary(validParams)();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.parsedContent).toEqual({});
			}
		});
	});
});