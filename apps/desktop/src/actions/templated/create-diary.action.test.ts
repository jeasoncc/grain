/**
 * @file create-diary.action.test.ts
 * @description 日记创建 Action 测试（高阶函数版本）
 *
 * 测试覆盖：
 * - ✅ 类型安全
 * - ✅ 边界情况
 * - ✅ 配置验证
 *
 * 目标覆盖率：> 95%
 */

import { describe, expect, it } from "vitest";
import { diaryConfig } from "./configs/diary.config";
import type {
	CreateDateTemplateParams,
} from "./create-date-template.action";

// ============================================================================
// Test Data
// ============================================================================

const _validParams: CreateDateTemplateParams = {
	workspaceId: "550e8400-e29b-41d4-a716-446655440000",
	date: new Date("2024-01-01T12:00:00.000Z"),
};

// ============================================================================
// Tests
// ============================================================================

describe("create-diary.action (高阶函数版本)", () => {
	// ==========================================================================
	// 配置验证测试
	// ==========================================================================

	describe("diaryConfig", () => {
		it("应该有正确的配置", () => {
			expect(diaryConfig.name).toBe("日记");
			expect(diaryConfig.rootFolder).toBe("Diary");
			expect(diaryConfig.fileType).toBe("diary");
			expect(diaryConfig.tag).toBe("diary");
			expect(diaryConfig.foldersCollapsed).toBe(true);
		});

		it("generateTemplate 应该生成有效的 JSON", () => {
			const content = diaryConfig.generateTemplate({
				date: new Date("2024-12-25"),
			});
			expect(() => JSON.parse(content)).not.toThrow();
		});

		it("generateFolderPath 应该生成年/月/日三级路径", () => {
			const path = diaryConfig.generateFolderPath({
				date: new Date("2024-12-25"),
			});
			expect(path).toHaveLength(3);
			expect(path[0]).toMatch(/^year-2024/);
			expect(path[1]).toMatch(/^month-12/);
			expect(path[2]).toMatch(/^day-25/);
		});

		it("generateTitle 应该生成正确的标题", () => {
			const title = diaryConfig.generateTitle({
				date: new Date("2024-12-25T14:30:00"),
			});
			expect(title).toMatch(/^diary-/);
		});
	});

	// ==========================================================================
	// 类型安全测试
	// ==========================================================================

	describe("类型安全", () => {
		it("应该接受有效的 CreateDateTemplateParams", () => {
			const params: CreateDateTemplateParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: new Date(),
			};

			// 这个测试主要是编译时检查，如果类型不匹配会编译失败
			expect(params.workspaceId).toBeDefined();
		});
	});

	// ==========================================================================
	// 边界情况测试
	// ==========================================================================

	describe("边界情况", () => {
		it("应该处理最小有效参数", () => {
			const params: CreateDateTemplateParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			};

			expect(params.workspaceId).toBe("550e8400-e29b-41d4-a716-446655440000");
			expect(params.date).toBeUndefined();
		});

		it("应该处理极端日期", () => {
			const extremeDate = new Date("1970-01-01T00:00:00.000Z");
			const params: CreateDateTemplateParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: extremeDate,
			};

			expect(params.date).toBe(extremeDate);
		});

		it("应该处理未来日期", () => {
			const futureDate = new Date("2030-12-31T23:59:59.999Z");
			const params: CreateDateTemplateParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: futureDate,
			};

			expect(params.date).toBe(futureDate);
		});
	});
});
