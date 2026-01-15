/**
 * @file export.path.fn.test.ts
 * @description Export 路径管理纯函数测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	clearDefaultExportPath,
	getDefaultExportPath,
	getExportSettings,
	getLastUsedPath,
	isTauriEnvironment,
	saveExportSettings,
	setDefaultExportPath,
	setLastUsedPath,
} from "./export.path.fn"

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {}
	return {
		clear: vi.fn(() => {
			store = {}
		}),
		getItem: vi.fn((key: string) => store[key] || null),
		removeItem: vi.fn((key: string) => {
			delete store[key]
		}),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value
		}),
	}
})()

Object.defineProperty(global, "localStorage", {
	value: localStorageMock,
})

describe("export.path.fn", () => {
	beforeEach(() => {
		localStorageMock.clear()
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	// ============================================================================
	// isTauriEnvironment
	// ============================================================================

	describe("isTauriEnvironment", () => {
		it("should return false when window.__TAURI__ is not defined", () => {
			// 默认测试环境没有 __TAURI__
			expect(isTauriEnvironment()).toBe(false)
		})

		it("should return false when window is undefined", () => {
			const originalWindow = global.window
			// @ts-expect-error - 测试 window undefined 场景
			delete global.window

			// 由于函数内部检查 typeof window !== "undefined"
			// 在 Node 环境下 window 可能是 undefined
			const result = isTauriEnvironment()
			expect(result).toBe(false)

			global.window = originalWindow
		})
	})

	// ============================================================================
	// getExportSettings / saveExportSettings
	// ============================================================================

	describe("getExportSettings", () => {
		it("should return default settings when localStorage is empty", () => {
			const settings = getExportSettings()

			expect(settings).toEqual({
				defaultExportPath: null,
				lastUsedPath: null,
			})
		})

		it("should return stored settings from localStorage", () => {
			const storedSettings = {
				defaultExportPath: "/home/user/exports",
				lastUsedPath: "/home/user/documents",
			}
			localStorageMock.setItem("grain-export-settings", JSON.stringify(storedSettings))

			const settings = getExportSettings()

			expect(settings).toEqual(storedSettings)
		})

		it("should return default settings when localStorage contains invalid JSON", () => {
			// 直接设置 store 而不是通过 mock
			localStorageMock.getItem.mockImplementationOnce(() => "invalid json {")

			const settings = getExportSettings()

			expect(settings).toEqual({
				defaultExportPath: null,
				lastUsedPath: null,
			})
		})

		it("should return default settings when data fails Zod validation", () => {
			// 设置一个不符合 schema 的数据
			const invalidSettings = {
				defaultExportPath: 123, // 应该是 string | null
				lastUsedPath: { invalid: true }, // 应该是 string | null
			}
			localStorageMock.setItem("grain-export-settings", JSON.stringify(invalidSettings))

			const settings = getExportSettings()

			expect(settings).toEqual({
				defaultExportPath: null,
				lastUsedPath: null,
			})
		})
	})

	describe("saveExportSettings", () => {
		it("should save settings to localStorage", () => {
			const settings = {
				defaultExportPath: "/home/user/exports",
				lastUsedPath: "/home/user/documents",
			}

			saveExportSettings(settings)

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"grain-export-settings",
				JSON.stringify(settings),
			)
		})

		it("should handle null values", () => {
			const settings = {
				defaultExportPath: null,
				lastUsedPath: null,
			}

			saveExportSettings(settings)

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"grain-export-settings",
				JSON.stringify(settings),
			)
		})
	})

	// ============================================================================
	// getDefaultExportPath / setDefaultExportPath
	// ============================================================================

	describe("getDefaultExportPath", () => {
		it("should return null when no default path is set", () => {
			expect(getDefaultExportPath()).toBeNull()
		})

		it("should return the stored default path", () => {
			const storedSettings = {
				defaultExportPath: "/home/user/exports",
				lastUsedPath: null,
			}
			localStorageMock.setItem("grain-export-settings", JSON.stringify(storedSettings))

			expect(getDefaultExportPath()).toBe("/home/user/exports")
		})
	})

	describe("setDefaultExportPath", () => {
		it("should set the default export path", () => {
			setDefaultExportPath("/home/user/new-exports")

			const settings = JSON.parse(localStorageMock.setItem.mock.calls[0][1] as string)
			expect(settings.defaultExportPath).toBe("/home/user/new-exports")
		})

		it("should preserve lastUsedPath when setting default path", () => {
			const initialSettings = {
				defaultExportPath: null,
				lastUsedPath: "/home/user/documents",
			}
			localStorageMock.setItem("grain-export-settings", JSON.stringify(initialSettings))

			setDefaultExportPath("/home/user/exports")

			// 获取最后一次调用的参数
			const lastCall =
				localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1]
			const settings = JSON.parse(lastCall[1] as string)
			expect(settings.defaultExportPath).toBe("/home/user/exports")
			expect(settings.lastUsedPath).toBe("/home/user/documents")
		})

		it("should allow setting path to null", () => {
			setDefaultExportPath("/home/user/exports")
			setDefaultExportPath(null)

			const lastCall =
				localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1]
			const settings = JSON.parse(lastCall[1] as string)
			expect(settings.defaultExportPath).toBeNull()
		})
	})

	// ============================================================================
	// getLastUsedPath / setLastUsedPath
	// ============================================================================

	describe("getLastUsedPath", () => {
		it("should return null when no last used path is set", () => {
			expect(getLastUsedPath()).toBeNull()
		})

		it("should return the stored last used path", () => {
			const storedSettings = {
				defaultExportPath: null,
				lastUsedPath: "/home/user/documents",
			}
			localStorageMock.setItem("grain-export-settings", JSON.stringify(storedSettings))

			expect(getLastUsedPath()).toBe("/home/user/documents")
		})
	})

	describe("setLastUsedPath", () => {
		it("should set the last used path", () => {
			setLastUsedPath("/home/user/documents")

			const settings = JSON.parse(localStorageMock.setItem.mock.calls[0][1] as string)
			expect(settings.lastUsedPath).toBe("/home/user/documents")
		})

		it("should preserve defaultExportPath when setting last used path", () => {
			const initialSettings = {
				defaultExportPath: "/home/user/exports",
				lastUsedPath: null,
			}
			localStorageMock.setItem("grain-export-settings", JSON.stringify(initialSettings))

			setLastUsedPath("/home/user/documents")

			const lastCall =
				localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1]
			const settings = JSON.parse(lastCall[1] as string)
			expect(settings.defaultExportPath).toBe("/home/user/exports")
			expect(settings.lastUsedPath).toBe("/home/user/documents")
		})
	})

	// ============================================================================
	// clearDefaultExportPath
	// ============================================================================

	describe("clearDefaultExportPath", () => {
		it("should clear the default export path", () => {
			const initialSettings = {
				defaultExportPath: "/home/user/exports",
				lastUsedPath: "/home/user/documents",
			}
			localStorageMock.setItem("grain-export-settings", JSON.stringify(initialSettings))

			clearDefaultExportPath()

			const lastCall =
				localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1]
			const settings = JSON.parse(lastCall[1] as string)
			expect(settings.defaultExportPath).toBeNull()
			expect(settings.lastUsedPath).toBe("/home/user/documents")
		})
	})

	// ============================================================================
	// 集成测试：设置流程
	// ============================================================================

	describe("settings workflow", () => {
		it("should handle complete settings workflow", () => {
			// 1. 初始状态
			expect(getDefaultExportPath()).toBeNull()
			expect(getLastUsedPath()).toBeNull()

			// 2. 设置默认路径
			setDefaultExportPath("/home/user/exports")
			expect(getDefaultExportPath()).toBe("/home/user/exports")

			// 3. 设置最后使用路径
			setLastUsedPath("/home/user/documents")
			expect(getLastUsedPath()).toBe("/home/user/documents")

			// 4. 验证两个路径都保留
			const settings = getExportSettings()
			expect(settings.defaultExportPath).toBe("/home/user/exports")
			expect(settings.lastUsedPath).toBe("/home/user/documents")

			// 5. 清除默认路径
			clearDefaultExportPath()
			expect(getDefaultExportPath()).toBeNull()
			expect(getLastUsedPath()).toBe("/home/user/documents")
		})
	})
})
