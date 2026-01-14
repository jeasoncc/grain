/**
 * @file diary.config.test.ts
 * @description Diary 模板配置的单元测试
 *
 * 测试覆盖：
 * - ✅ 配置对象结构
 * - ✅ Schema 校验
 * - ✅ 纯函数特性
 *
 * 目标覆盖率：> 90%
 */

import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
	type DiaryTemplateParams,
	diaryConfig,
	diaryParamsSchema,
} from "./diary.config";

// ============================================================================
// Tests
// ============================================================================

describe("diaryConfig", () => {
	describe("配置对象结构", () => {
		it("应该包含所有必需的配置字段", () => {
			expect(diaryConfig.name).toBe("日记");
			expect(diaryConfig.rootFolder).toBe("Diary");
			expect(diaryConfig.fileType).toBe("diary");
			expect(diaryConfig.tag).toBe("diary");
			expect(diaryConfig.foldersCollapsed).toBe(true);
			expect(typeof diaryConfig.generateTemplate).toBe("function");
			expect(typeof diaryConfig.generateFolderPath).toBe("function");
			expect(typeof diaryConfig.generateTitle).toBe("function");
			expect(diaryConfig.paramsSchema).toBeDefined();
		});

		it("应该使用正确的文件类型", () => {
			// 确保 fileType 不是 "folder"
			expect(diaryConfig.fileType).not.toBe("folder");
			expect(diaryConfig.fileType).toBe("diary");
		});
	});

	describe("paramsSchema", () => {
		it("应该接受空对象", () => {
			const result = diaryParamsSchema.safeParse({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.date).toBeUndefined();
			}
		});

		it("应该接受有效的日期", () => {
			const validDate = dayjs("2024-05-15T12:30:00.000Z").toDate();
			const result = diaryParamsSchema.safeParse({ date: validDate });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.date).toEqual(validDate);
			}
		});

		it("应该拒绝无效的日期类型", () => {
			const invalidInputs = [
				{ date: "2024-01-01" }, // 字符串
				{ date: 1704067200000 }, // 数字
				{ date: null }, // null
			];

			for (const input of invalidInputs) {
				const result = diaryParamsSchema.safeParse(input);
				expect(result.success).toBe(false);
			}
		});

		it("应该处理边界日期值", () => {
			const edgeDates = [
				dayjs(0).toDate(), // Unix epoch
				dayjs("1900-01-01").toDate(), // 很早的日期
				dayjs("2100-12-31").toDate(), // 很晚的日期
			];

			for (const date of edgeDates) {
				const result = diaryParamsSchema.safeParse({ date });
				expect(result.success).toBe(true);
			}
		});
	});

	describe("纯函数特性", () => {
		const testDate = dayjs("2024-01-15T10:30:00.000Z").toDate();

		it("应该生成一致的结果（纯函数特性）", () => {
			const params: DiaryTemplateParams = { date: testDate };

			// 多次调用应该产生相同结果
			const template1 = diaryConfig.generateTemplate(params);
			const template2 = diaryConfig.generateTemplate(params);
			const folderPath1 = diaryConfig.generateFolderPath(params);
			const folderPath2 = diaryConfig.generateFolderPath(params);
			const title1 = diaryConfig.generateTitle(params);
			const title2 = diaryConfig.generateTitle(params);

			expect(template1).toBe(template2);
			expect(folderPath1).toEqual(folderPath2);
			expect(title1).toBe(title2);
		});

		it("应该生成有效的 JSON 模板", () => {
			const params: DiaryTemplateParams = { date: testDate };

			const result = diaryConfig.generateTemplate(params);

			// 应该是有效的 JSON
			expect(() => JSON.parse(result)).not.toThrow();

			const parsed = JSON.parse(result);
			expect(parsed.root).toBeDefined();
		});

		it("应该生成正确的文件夹结构", () => {
			const params: DiaryTemplateParams = { date: testDate };

			const result = diaryConfig.generateFolderPath(params);

			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(3);
			expect(result[0]).toMatch(/^year-/);
			expect(result[1]).toMatch(/^month-/);
			expect(result[2]).toMatch(/^day-/);
		});

		it("应该生成有效的文件标题", () => {
			const params: DiaryTemplateParams = { date: testDate };

			const result = diaryConfig.generateTitle(params);

			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(0);
			expect(result).toMatch(/^diary-/);
		});
	});

	describe("集成测试", () => {
		it("应该与 createTemplatedFile 高阶函数兼容", () => {
			// 验证配置对象包含高阶函数所需的所有字段
			const requiredFields = [
				"name",
				"rootFolder",
				"fileType",
				"tag",
				"generateTemplate",
				"generateFolderPath",
				"generateTitle",
				"paramsSchema",
			];

			for (const field of requiredFields) {
				expect(diaryConfig).toHaveProperty(field);
				expect(diaryConfig[field as keyof typeof diaryConfig]).toBeDefined();
			}
		});

		it("应该处理完整的创建流程", () => {
			const params: DiaryTemplateParams = {
				date: dayjs("2024-01-15T10:30:00.000Z").toDate(),
			};

			// 1. 校验参数
			const validation = diaryConfig.paramsSchema.safeParse(params);
			expect(validation.success).toBe(true);

			// 2. 生成模板
			const template = diaryConfig.generateTemplate(params);
			expect(() => JSON.parse(template)).not.toThrow();

			// 3. 生成路径
			const folderPath = diaryConfig.generateFolderPath(params);
			expect(folderPath).toHaveLength(3);

			// 4. 生成标题
			const title = diaryConfig.generateTitle(params);
			expect(title).toBeTruthy();
			expect(typeof title).toBe("string");
		});
	});
});
