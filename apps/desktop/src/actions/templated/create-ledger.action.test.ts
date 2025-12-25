/**
 * @file create-ledger.action.test.ts
 * @description 记账创建 Action 测试（高阶函数版本）
 *
 * 测试覆盖：
 * - ✅ 参数适配器
 * - ✅ 类型安全
 * - ✅ 边界情况
 * - ✅ 配置验证
 *
 * @requirements 120
 */

import { describe, expect, it } from "vitest";
import {
	adaptLedgerParams,
	type CreateLedgerParams,
} from "./create-ledger.action";

// ============================================================================
// Tests
// ============================================================================

describe("create-ledger.action (高阶函数版本)", () => {
	// ==========================================================================
	// 参数适配器测试
	// ==========================================================================

	describe("adaptLedgerParams", () => {
		it("应该正确转换参数格式", () => {
			const params: CreateLedgerParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: new Date("2024-12-25T12:00:00.000Z"),
			};

			const result = adaptLedgerParams(params);

			expect(result).toEqual({
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				templateParams: {
					date: new Date("2024-12-25T12:00:00.000Z"),
				},
			});
		});

		it("应该处理没有日期的参数", () => {
			const params: CreateLedgerParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			};

			const result = adaptLedgerParams(params);

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
		it("应该接受有效的 CreateLedgerParams", () => {
			const params: CreateLedgerParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: new Date(),
			};

			expect(() => adaptLedgerParams(params)).not.toThrow();
		});
	});

	// ==========================================================================
	// 边界情况测试
	// ==========================================================================

	describe("边界情况", () => {
		it("应该处理最小有效参数", () => {
			const params: CreateLedgerParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
			};

			const result = adaptLedgerParams(params);

			expect(result.workspaceId).toBe("550e8400-e29b-41d4-a716-446655440000");
			expect(result.templateParams.date).toBeUndefined();
		});

		it("应该处理极端日期", () => {
			const extremeDate = new Date("1970-01-01T00:00:00.000Z");
			const params: CreateLedgerParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: extremeDate,
			};

			const result = adaptLedgerParams(params);

			expect(result.templateParams.date).toBe(extremeDate);
		});

		it("应该处理未来日期", () => {
			const futureDate = new Date("2030-12-31T23:59:59.999Z");
			const params: CreateLedgerParams = {
				workspaceId: "550e8400-e29b-41d4-a716-446655440000",
				date: futureDate,
			};

			const result = adaptLedgerParams(params);

			expect(result.templateParams.date).toBe(futureDate);
		});
	});

	// ==========================================================================
	// 配置验证测试
	// ==========================================================================

	describe("ledgerConfig", () => {
		it("应该有正确的配置", async () => {
			const { ledgerConfig } = await import("./configs/ledger.config");

			expect(ledgerConfig.name).toBe("记账");
			expect(ledgerConfig.rootFolder).toBe("Ledger");
			expect(ledgerConfig.fileType).toBe("file");
			expect(ledgerConfig.tag).toBe("ledger");
			expect(ledgerConfig.foldersCollapsed).toBe(true);
		});

		it("generateTemplate 应该生成有效的 JSON", async () => {
			const { ledgerConfig } = await import("./configs/ledger.config");
			const content = ledgerConfig.generateTemplate({
				date: new Date("2024-12-25"),
			});

			expect(() => JSON.parse(content)).not.toThrow();
		});

		it("generateFolderPath 应该生成正确的路径", async () => {
			const { ledgerConfig } = await import("./configs/ledger.config");
			const path = ledgerConfig.generateFolderPath({
				date: new Date("2024-12-25"),
			});

			expect(path).toEqual(["year-2024", "month-12-December"]);
		});

		it("generateTitle 应该生成正确的标题", async () => {
			const { ledgerConfig } = await import("./configs/ledger.config");
			const title = ledgerConfig.generateTitle({
				date: new Date("2024-12-25"),
			});

			expect(title).toBe("ledger-2024-12-25");
		});
	});
});
