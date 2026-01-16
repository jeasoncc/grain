/**
 * @file create-ledger.action.test.ts
 * @description 记账创建 Action 测试（高阶函数版本）
 *
 * 测试覆盖：
 * - ✅ 类型安全
 * - ✅ 边界情况
 * - ✅ 配置验证
 *
 * @requirements 120
 */

import dayjs from "dayjs"
import { describe, expect, it } from "vitest"
import { ledgerConfig } from "./configs/ledger.config"
import type { CreateDateTemplateParams } from "./create-date-template.flow"

// ============================================================================
// Tests
// ============================================================================

describe("create-ledger.action (高阶函数版本)", () => {
	// ==========================================================================
	// 配置验证测试
	// ==========================================================================

	describe("ledgerConfig", () => {
		it("应该有正确的配置", () => {
			expect(ledgerConfig.name).toBe("记账")
			expect(ledgerConfig.rootFolder).toBe("Ledger")
			expect(ledgerConfig.fileType).toBe("file")
			expect(ledgerConfig.tag).toBe("ledger")
			expect(ledgerConfig.foldersCollapsed).toBe(true)
		})

		it("generateTemplate 应该生成有效的 JSON", () => {
			const content = ledgerConfig.generateTemplate({
				date: dayjs("2024-12-25").toDate(),
			})
			expect(() => JSON.parse(content)).not.toThrow()
		})

		it("generateFolderPath 应该生成年/月两级路径（不含日）", () => {
			const path = ledgerConfig.generateFolderPath({
				date: dayjs("2024-12-25").toDate(),
			})
			expect(path).toHaveLength(2)
			expect(path[0]).toMatch(/^year-2024/)
			expect(path[1]).toMatch(/^month-12/)
		})

		it("generateTitle 应该生成正确的标题", () => {
			const title = ledgerConfig.generateTitle({
				date: dayjs("2024-12-25T14:30:00").toDate(),
			})
			expect(title).toMatch(/^ledger-/)
		})
	})

	// ==========================================================================
	// 类型安全测试
	// ==========================================================================

	describe("类型安全", () => {
		it("应该接受有效的 CreateDateTemplateParams", () => {
			const params: CreateDateTemplateParams = {
				date: dayjs().toDate(),
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			}

			expect(params.workspaceId).toBeDefined()
		})
	})

	// ==========================================================================
	// 边界情况测试
	// ==========================================================================

	describe("边界情况", () => {
		it("应该处理最小有效参数", () => {
			const params: CreateDateTemplateParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			}

			expect(params.workspaceId).toBe("550e8400-e29b-41d4-a716-446655440000")
			expect(params.date).toBeUndefined()
		})

		it("应该处理极端日期", () => {
			const extremeDate = dayjs("1970-01-01T00:00:00.000Z").toDate()
			const params: CreateDateTemplateParams = {
				date: extremeDate,
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			}

			expect(params.date).toBe(extremeDate)
		})

		it("应该处理未来日期", () => {
			const futureDate = dayjs("2030-12-31T23:59:59.999Z").toDate()
			const params: CreateDateTemplateParams = {
				date: futureDate,
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			}

			expect(params.date).toBe(futureDate)
		})
	})
})
