/**
 * @file create-excalidraw.action.test.ts
 * @description Excalidraw 文件创建 Action 测试（高阶函数版本）
 *
 * 测试覆盖：
 * - ✅ 参数适配器
 * - ✅ 向后兼容性
 * - ✅ 类型安全
 * - ✅ 边界情况
 *
 * @requirements 7.2
 */

import { describe, expect, it } from "vitest"
import { adaptExcalidrawParams, type CreateExcalidrawParams } from "./create-excalidraw.flow"

// ============================================================================
// Test Data
// ============================================================================

// Valid params for type checking (not used in tests but ensures type compatibility)
// const validParams: CreateExcalidrawParams = {
// 	workspaceId: "550e8400-e29b-41d4-a716-446655440000",
// 	date: new Date("2024-01-15T12:00:00.000Z"),
// 	title: "测试绘图",
// 	width: 1920,
// 	height: 1080,
// };

// ============================================================================
// Tests
// ============================================================================

describe("create-excalidraw.action (高阶函数版本)", () => {
	// ==========================================================================
	// 参数适配器测试
	// ==========================================================================

	describe("adaptExcalidrawParams", () => {
		it("应该正确转换完整参数格式", () => {
			const params: CreateExcalidrawParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: new Date("2024-01-15T12:00:00.000Z"),
				title: "测试绘图",
				width: 1920,
				height: 1080,
			}

			const result = adaptExcalidrawParams(params)

			expect(result).toEqual({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				templateParams: {
					date: new Date("2024-01-15T12:00:00.000Z"),
					title: "测试绘图",
					width: 1920,
					height: 1080,
				},
			})
		})

		it("应该处理只有工作区 ID 的参数", () => {
			const params: CreateExcalidrawParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			}

			const result = adaptExcalidrawParams(params)

			expect(result).toEqual({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				templateParams: {
					title: undefined,
					date: undefined,
					width: undefined,
					height: undefined,
				},
			})
		})

		it("应该处理只有日期的参数", () => {
			const params: CreateExcalidrawParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: new Date("2024-01-15T12:00:00.000Z"),
			}

			const result = adaptExcalidrawParams(params)

			expect(result.templateParams.date).toEqual(new Date("2024-01-15T12:00:00.000Z"))
			expect(result.templateParams.title).toBeUndefined()
			expect(result.templateParams.width).toBeUndefined()
			expect(result.templateParams.height).toBeUndefined()
		})

		it("应该处理只有标题的参数", () => {
			const params: CreateExcalidrawParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				title: "自定义标题",
			}

			const result = adaptExcalidrawParams(params)

			expect(result.templateParams.title).toBe("自定义标题")
			expect(result.templateParams.date).toBeUndefined()
		})

		it("应该处理自定义尺寸参数", () => {
			const params: CreateExcalidrawParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				width: 2560,
				height: 1440,
			}

			const result = adaptExcalidrawParams(params)

			expect(result.templateParams.width).toBe(2560)
			expect(result.templateParams.height).toBe(1440)
		})
	})

	// ==========================================================================
	// 类型安全测试
	// ==========================================================================

	describe("类型安全", () => {
		it("应该接受有效的 CreateExcalidrawParams", () => {
			const params: CreateExcalidrawParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: new Date(),
				title: "测试",
				width: 1920,
				height: 1080,
			}

			// 这个测试主要是编译时检查，如果类型不匹配会编译失败
			expect(() => adaptExcalidrawParams(params)).not.toThrow()
		})
	})

	// ==========================================================================
	// 边界情况测试
	// ==========================================================================

	describe("边界情况", () => {
		it("应该处理最小有效参数", () => {
			const params: CreateExcalidrawParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			}

			const result = adaptExcalidrawParams(params)

			expect(result.workspaceId).toBe("550e8400-e29b-41d4-a716-446655440000")
			expect(result.templateParams.date).toBeUndefined()
			expect(result.templateParams.title).toBeUndefined()
			expect(result.templateParams.width).toBeUndefined()
			expect(result.templateParams.height).toBeUndefined()
		})

		it("应该处理极端日期", () => {
			const extremeDate = new Date("1970-01-01T00:00:00.000Z")
			const params: CreateExcalidrawParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: extremeDate,
			}

			const result = adaptExcalidrawParams(params)

			expect(result.templateParams.date).toBe(extremeDate)
		})

		it("应该处理未来日期", () => {
			const futureDate = new Date("2030-12-31T23:59:59.999Z")
			const params: CreateExcalidrawParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: futureDate,
			}

			const result = adaptExcalidrawParams(params)

			expect(result.templateParams.date).toBe(futureDate)
		})

		it("应该处理空字符串标题", () => {
			const params: CreateExcalidrawParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				title: "",
			}

			const result = adaptExcalidrawParams(params)

			expect(result.templateParams.title).toBe("")
		})

		it("应该处理极小尺寸", () => {
			const params: CreateExcalidrawParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				width: 1,
				height: 1,
			}

			const result = adaptExcalidrawParams(params)

			expect(result.templateParams.width).toBe(1)
			expect(result.templateParams.height).toBe(1)
		})

		it("应该处理极大尺寸", () => {
			const params: CreateExcalidrawParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				width: 10000,
				height: 10000,
			}

			const result = adaptExcalidrawParams(params)

			expect(result.templateParams.width).toBe(10000)
			expect(result.templateParams.height).toBe(10000)
		})
	})
})
