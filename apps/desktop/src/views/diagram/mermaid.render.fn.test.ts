/**
 * @file fn/diagram/mermaid.render.fn.test.ts
 * @description Mermaid 渲染纯函数测试
 *
 * 测试覆盖空白输入和解析失败的验证边界。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resetMermaidState, validateMermaidCode } from "./mermaid.render.fn"

// ============================================================================
// Mocks
// ============================================================================

// Mock mermaid 库
vi.mock("mermaid", () => ({
	default: {
		initialize: vi.fn(),
		parse: vi.fn(),
	},
}))

// 获取 mock 实例
const getMermaidMock = async () => {
	const mermaid = await import("mermaid")
	return {
		parse: mermaid.default.parse as ReturnType<typeof vi.fn>,
	}
}

// ============================================================================
// Test Setup
// ============================================================================

describe("mermaid.render.fn", () => {
	beforeEach(async () => {
		vi.clearAllMocks()
		resetMermaidState()
	})

	afterEach(() => {
		resetMermaidState()
	})


	// ==========================================================================
	// validateMermaidCode Tests
	// ==========================================================================

	describe("validateMermaidCode", () => {
		it("should return false for empty code", async () => {
			const result = await validateMermaidCode("")

			expect(result).toBe(false)
		})

		it("should return false for whitespace-only code", async () => {
			const result = await validateMermaidCode("   \n\t  ")

			expect(result).toBe(false)
		})

		it("should return true for valid code", async () => {
			const mermaid = await getMermaidMock()
			mermaid.parse.mockResolvedValue(undefined)

			const result = await validateMermaidCode("flowchart TD\n  A --> B")

			expect(result).toBe(true)
		})

		it("should return false for invalid code", async () => {
			const mermaid = await getMermaidMock()
			mermaid.parse.mockRejectedValue(new Error("Parse error"))

			const result = await validateMermaidCode("invalid code")

			expect(result).toBe(false)
		})

	})

})
