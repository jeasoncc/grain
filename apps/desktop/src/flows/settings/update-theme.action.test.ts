/**
 * @file update-theme.action.test.ts
 * @description 更新主题设置 Action 的单元测试
 *
 * 测试覆盖：
 * - 更新主题 key
 * - 更新主题模式
 * - 切换主题模式
 * - 更新过渡动画设置
 * - 参数校验
 *
 * @requirements 4.1, 4.2, 4.3, 4.4
 */

import * as E from "fp-ts/Either"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ============================================================================
// Mock Setup
// ============================================================================

const mockSetTheme = vi.fn()
const mockSetMode = vi.fn()
const mockToggleMode = vi.fn()
const mockSetEnableTransition = vi.fn()
const mockGetState = vi.fn()

vi.mock("@/state/theme.state", () => ({
	useThemeStore: {
		getState: () => mockGetState(),
	},
}))

vi.mock("@/log", () => ({
	default: {
		start: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}))

// Import after mocking
import {
	toggleThemeMode,
	updateTheme,
	updateThemeMode,
	updateThemeTransition,
} from "./update-theme.flow"

// ============================================================================
// Unit Tests
// ============================================================================

describe("update-theme.flow", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetState.mockReturnValue({
			setTheme: mockSetTheme,
			setMode: mockSetMode,
			toggleMode: mockToggleMode,
			setEnableTransition: mockSetEnableTransition,
			mode: "dark",
		})
	})

	// ==========================================================================
	// updateTheme
	// ==========================================================================

	describe("updateTheme", () => {
		it("should return Right and update theme on valid key", () => {
			const result = updateTheme({ themeKey: "github-dark" })

			expect(E.isRight(result)).toBe(true)
			expect(mockSetTheme).toHaveBeenCalledWith("github-dark")
		})

		it("should return Left with validation error on empty key", () => {
			const result = updateTheme({ themeKey: "" })

			expect(E.isLeft(result)).toBe(true)
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR")
				expect(result.left.message).toContain("主题 key 不能为空")
			}
			expect(mockSetTheme).not.toHaveBeenCalled()
		})

		it("should return Left with validation error on whitespace-only key", () => {
			const result = updateTheme({ themeKey: "   " })

			expect(E.isLeft(result)).toBe(true)
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR")
			}
			expect(mockSetTheme).not.toHaveBeenCalled()
		})

		it("should handle various valid theme keys", () => {
			const validKeys = ["light", "dark", "github-dark", "monokai", "nord"]

			for (const key of validKeys) {
				vi.clearAllMocks()
				const result = updateTheme({ themeKey: key })

				expect(E.isRight(result)).toBe(true)
				expect(mockSetTheme).toHaveBeenCalledWith(key)
			}
		})
	})

	// ==========================================================================
	// updateThemeMode
	// ==========================================================================

	describe("updateThemeMode", () => {
		it("should return Right and update mode to light", () => {
			const result = updateThemeMode({ mode: "light" })

			expect(E.isRight(result)).toBe(true)
			expect(mockSetMode).toHaveBeenCalledWith("light")
		})

		it("should return Right and update mode to dark", () => {
			const result = updateThemeMode({ mode: "dark" })

			expect(E.isRight(result)).toBe(true)
			expect(mockSetMode).toHaveBeenCalledWith("dark")
		})

		it("should return Right and update mode to system", () => {
			const result = updateThemeMode({ mode: "system" })

			expect(E.isRight(result)).toBe(true)
			expect(mockSetMode).toHaveBeenCalledWith("system")
		})

		it("should return Left with validation error on invalid mode", () => {
			const result = updateThemeMode({ mode: "invalid" as never })

			expect(E.isLeft(result)).toBe(true)
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR")
				expect(result.left.message).toContain("无效的主题模式")
			}
			expect(mockSetMode).not.toHaveBeenCalled()
		})
	})

	// ==========================================================================
	// toggleThemeMode
	// ==========================================================================

	describe("toggleThemeMode", () => {
		it("should return Right with new mode after toggle", () => {
			mockGetState.mockReturnValue({
				setTheme: mockSetTheme,
				setMode: mockSetMode,
				toggleMode: mockToggleMode,
				setEnableTransition: mockSetEnableTransition,
				mode: "light",
			})

			const result = toggleThemeMode()

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toBe("light")
			}
			expect(mockToggleMode).toHaveBeenCalled()
		})

		it("should call toggleMode on store", () => {
			toggleThemeMode()

			expect(mockToggleMode).toHaveBeenCalledTimes(1)
		})

		it("should return current mode from store after toggle", () => {
			// 模拟 toggle 后模式变为 system
			mockGetState
				.mockReturnValueOnce({
					setTheme: mockSetTheme,
					setMode: mockSetMode,
					toggleMode: mockToggleMode,
					setEnableTransition: mockSetEnableTransition,
					mode: "dark",
				})
				.mockReturnValueOnce({
					setTheme: mockSetTheme,
					setMode: mockSetMode,
					toggleMode: mockToggleMode,
					setEnableTransition: mockSetEnableTransition,
					mode: "system",
				})

			const result = toggleThemeMode()

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toBe("system")
			}
		})
	})

	// ==========================================================================
	// updateThemeTransition
	// ==========================================================================

	describe("updateThemeTransition", () => {
		it("should return Right and enable transition", () => {
			const result = updateThemeTransition({ enable: true })

			expect(E.isRight(result)).toBe(true)
			expect(mockSetEnableTransition).toHaveBeenCalledWith(true)
		})

		it("should return Right and disable transition", () => {
			const result = updateThemeTransition({ enable: false })

			expect(E.isRight(result)).toBe(true)
			expect(mockSetEnableTransition).toHaveBeenCalledWith(false)
		})
	})
})
