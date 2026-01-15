/**
 * @file hooks/use-settings.test.ts
 * @description useSettings Store 测试
 *
 * 包含单元测试和属性测试，验证设置存储的正确性。
 *
 * @requirements REQ-2 (自动保存延迟范围验证)
 */

import fc from "fast-check"
import { afterEach, describe, expect, it } from "vitest"

import { useSettings } from "./use-settings"

describe("useSettings", () => {
	// 每个测试后重置 store 状态
	afterEach(() => {
		useSettings.setState({
			autoSave: true,
			autoSaveInterval: 3,
		})
	})

	// ==========================================================================
	// 单元测试
	// ==========================================================================

	describe("默认值", () => {
		it("autoSave 默认为 true", () => {
			const { autoSave } = useSettings.getState()
			expect(autoSave).toBe(true)
		})

		it("autoSaveInterval 默认为 3 秒", () => {
			const { autoSaveInterval } = useSettings.getState()
			expect(autoSaveInterval).toBe(3)
		})
	})

	describe("setAutoSave", () => {
		it("应该能设置 autoSave 为 false", () => {
			const { setAutoSave } = useSettings.getState()
			setAutoSave(false)
			expect(useSettings.getState().autoSave).toBe(false)
		})

		it("应该能设置 autoSave 为 true", () => {
			const { setAutoSave } = useSettings.getState()
			setAutoSave(false)
			setAutoSave(true)
			expect(useSettings.getState().autoSave).toBe(true)
		})
	})

	describe("setAutoSaveInterval", () => {
		it("应该能设置有效范围内的值", () => {
			const { setAutoSaveInterval } = useSettings.getState()
			setAutoSaveInterval(30)
			expect(useSettings.getState().autoSaveInterval).toBe(30)
		})

		it("应该将小于 1 的值限制为 1", () => {
			const { setAutoSaveInterval } = useSettings.getState()
			setAutoSaveInterval(0)
			expect(useSettings.getState().autoSaveInterval).toBe(1)

			setAutoSaveInterval(-10)
			expect(useSettings.getState().autoSaveInterval).toBe(1)
		})

		it("应该将大于 60 的值限制为 60", () => {
			const { setAutoSaveInterval } = useSettings.getState()
			setAutoSaveInterval(100)
			expect(useSettings.getState().autoSaveInterval).toBe(60)

			setAutoSaveInterval(3600)
			expect(useSettings.getState().autoSaveInterval).toBe(60)
		})

		it("应该接受边界值 1", () => {
			const { setAutoSaveInterval } = useSettings.getState()
			setAutoSaveInterval(1)
			expect(useSettings.getState().autoSaveInterval).toBe(1)
		})

		it("应该接受边界值 60", () => {
			const { setAutoSaveInterval } = useSettings.getState()
			setAutoSaveInterval(60)
			expect(useSettings.getState().autoSaveInterval).toBe(60)
		})
	})

	// ==========================================================================
	// 属性测试
	// ==========================================================================

	describe("属性测试", () => {
		/**
		 * Property 2: Range Validation
		 *
		 * 对于任意输入值，setAutoSaveInterval 应该将结果限制在 [1, 60] 范围内。
		 * 小于 1 的值变为 1，大于 60 的值变为 60。
		 *
		 * @validates REQ-2.1, REQ-2.2
		 */
		it("Property 2: autoSaveInterval 应该始终在 [1, 60] 范围内", () => {
			fc.assert(
				fc.property(fc.integer({ max: 10000, min: -1000 }), (input) => {
					const { setAutoSaveInterval } = useSettings.getState()
					setAutoSaveInterval(input)
					const result = useSettings.getState().autoSaveInterval

					// 验证结果在有效范围内
					return result >= 1 && result <= 60
				}),
				{ numRuns: 100 },
			)
		})

		/**
		 * Property 2 补充: 范围内的值应该保持不变
		 *
		 * 对于 [1, 60] 范围内的任意值，setAutoSaveInterval 应该保持原值不变。
		 */
		it("Property 2 补充: 范围内的值应该保持不变", () => {
			fc.assert(
				fc.property(fc.integer({ max: 60, min: 1 }), (input) => {
					const { setAutoSaveInterval } = useSettings.getState()
					setAutoSaveInterval(input)
					const result = useSettings.getState().autoSaveInterval

					// 范围内的值应该保持不变
					return result === input
				}),
				{ numRuns: 100 },
			)
		})

		/**
		 * Property 2 补充: 小于 1 的值应该变为 1
		 */
		it("Property 2 补充: 小于 1 的值应该变为 1", () => {
			fc.assert(
				fc.property(fc.integer({ max: 0, min: -1000 }), (input) => {
					const { setAutoSaveInterval } = useSettings.getState()
					setAutoSaveInterval(input)
					const result = useSettings.getState().autoSaveInterval

					return result === 1
				}),
				{ numRuns: 50 },
			)
		})

		/**
		 * Property 2 补充: 大于 60 的值应该变为 60
		 */
		it("Property 2 补充: 大于 60 的值应该变为 60", () => {
			fc.assert(
				fc.property(fc.integer({ max: 10000, min: 61 }), (input) => {
					const { setAutoSaveInterval } = useSettings.getState()
					setAutoSaveInterval(input)
					const result = useSettings.getState().autoSaveInterval

					return result === 60
				}),
				{ numRuns: 50 },
			)
		})
	})
})
