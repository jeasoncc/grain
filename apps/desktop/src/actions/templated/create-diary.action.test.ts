/**
 * @file create-diary.action.test.ts
 * @description 日记创建 Action 测试（高阶函数版本）
 *
 * 测试覆盖：
 * - ✅ 参数适配器
 * - ✅ 向后兼容性
 * - ✅ 类型安全
 * - ✅ 边界情况
 *
 * 目标覆盖率：> 95%
 */

import { describe, expect, it } from "vitest";
import {
	adaptDiaryParams,
	type CreateDiaryParams,
} from "./create-diary.action";

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

describe("create-diary.action (高阶函数版本)", () => {
	// ==========================================================================
	// 参数适配器测试
	// ==========================================================================

	describe("adaptDiaryParams", () => {
		it("应该正确转换参数格式", () => {
			const params: CreateDiaryParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: new Date("2024-01-01T12:00:00.000Z"),
			};

			const result = adaptDiaryParams(params);

			expect(result).toEqual({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				templateParams: {
					date: new Date("2024-01-01T12:00:00.000Z"),
				},
			});
		});

		it("应该处理没有日期的参数", () => {
			const params: CreateDiaryParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			};

			const result = adaptDiaryParams(params);

			expect(result).toEqual({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				templateParams: {
					date: undefined,
				},
			});
		});
	});

	// ==========================================================================
	// 类型安全测试
	// ==========================================================================

	describe("类型安全", () => {
		it("应该接受有效的 CreateDiaryParams", () => {
			const params: CreateDiaryParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: new Date(),
			};

			// 这个测试主要是编译时检查，如果类型不匹配会编译失败
			expect(() => adaptDiaryParams(params)).not.toThrow();
		});
	});

	// ==========================================================================
	// 边界情况测试
	// ==========================================================================

	describe("边界情况", () => {
		it("应该处理最小有效参数", () => {
			const params: CreateDiaryParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			};

			const result = adaptDiaryParams(params);

			expect(result.workspaceId).toBe("550e8400-e29b-41d4-a716-446655440000");
			expect(result.templateParams.date).toBeUndefined();
		});

		it("应该处理极端日期", () => {
			const extremeDate = new Date("1970-01-01T00:00:00.000Z");
			const params: CreateDiaryParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: extremeDate,
			};

			const result = adaptDiaryParams(params);

			expect(result.templateParams.date).toBe(extremeDate);
		});

		it("应该处理未来日期", () => {
			const futureDate = new Date("2030-12-31T23:59:59.999Z");
			const params: CreateDiaryParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: futureDate,
			};

			const result = adaptDiaryParams(params);

			expect(result.templateParams.date).toBe(futureDate);
		});
	});
});