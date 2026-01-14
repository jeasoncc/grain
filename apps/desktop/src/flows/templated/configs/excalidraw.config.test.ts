/**
 * @file excalidraw.config.test.ts
 * @description Excalidraw 模板配置的单元测试
 *
 * 测试覆盖：
 * - ✅ 配置对象结构
 * - ✅ Schema 校验
 * - ✅ 纯函数特性
 * - ✅ 标题生成（默认和自定义）
 * - ✅ 文件夹路径生成（年/月/日结构）
 *
 * @requirements 7.1
 */

import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
	type ExcalidrawTemplateParams,
	excalidrawConfig,
	excalidrawParamsSchema,
} from "./excalidraw.config";

// ============================================================================
// Tests
// ============================================================================

describe("excalidrawConfig", () => {
	describe("配置对象结构", () => {
		it("应该包含所有必需的配置字段", () => {
			expect(excalidrawConfig.name).toBe("Excalidraw 绘图");
			expect(excalidrawConfig.rootFolder).toBe("excalidraw");
			expect(excalidrawConfig.fileType).toBe("canvas");
			expect(excalidrawConfig.tag).toBe("excalidraw");
			expect(excalidrawConfig.foldersCollapsed).toBe(true);
			expect(typeof excalidrawConfig.generateTemplate).toBe("function");
			expect(typeof excalidrawConfig.generateFolderPath).toBe("function");
			expect(typeof excalidrawConfig.generateTitle).toBe("function");
			expect(excalidrawConfig.paramsSchema).toBeDefined();
		});

		it("rootFolder 应该为 excalidraw", () => {
			expect(excalidrawConfig.rootFolder).toBe("excalidraw");
		});

		it("fileType 应该为 canvas", () => {
			// 确保 fileType 不是 "folder"
			expect(excalidrawConfig.fileType).not.toBe("folder");
			expect(excalidrawConfig.fileType).toBe("canvas");
		});

		it("tag 应该为 excalidraw", () => {
			expect(excalidrawConfig.tag).toBe("excalidraw");
		});
	});

	describe("paramsSchema", () => {
		it("应该接受空对象", () => {
			const result = excalidrawParamsSchema.safeParse({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBeUndefined();
				expect(result.data.date).toBeUndefined();
				expect(result.data.width).toBeUndefined();
				expect(result.data.height).toBeUndefined();
			}
		});

		it("应该接受有效的日期", () => {
			const validDate = dayjs("2024-05-15T12:30:00.000Z").toDate();
			const result = excalidrawParamsSchema.safeParse({ date: validDate });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.date).toEqual(validDate);
			}
		});

		it("应该接受有效的标题", () => {
			const result = excalidrawParamsSchema.safeParse({ title: "My Drawing" });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBe("My Drawing");
			}
		});

		it("应该接受有效的宽度和高度", () => {
			const result = excalidrawParamsSchema.safeParse({
				width: 2560,
				height: 1440,
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.width).toBe(2560);
				expect(result.data.height).toBe(1440);
			}
		});

		it("应该拒绝无效的日期类型", () => {
			const invalidInputs = [
				{ date: "2024-01-01" }, // 字符串
				{ date: 1704067200000 }, // 数字
				{ date: null }, // null
			];

			for (const input of invalidInputs) {
				const result = excalidrawParamsSchema.safeParse(input);
				expect(result.success).toBe(false);
			}
		});

		it("应该拒绝非正数的宽度和高度", () => {
			const invalidInputs = [
				{ width: 0 },
				{ width: -100 },
				{ height: 0 },
				{ height: -100 },
			];

			for (const input of invalidInputs) {
				const result = excalidrawParamsSchema.safeParse(input);
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
				const result = excalidrawParamsSchema.safeParse({ date });
				expect(result.success).toBe(true);
			}
		});
	});

	describe("标题生成", () => {
		const testDate = dayjs("2024-01-15T10:30:00.000Z").toDate();

		it("应该使用自定义标题（如果提供）", () => {
			const params: ExcalidrawTemplateParams = {
				title: "My Custom Drawing",
				date: testDate,
			};

			const result = excalidrawConfig.generateTitle(params);

			expect(result).toBe("My Custom Drawing");
		});

		it("应该生成默认标题（如果未提供自定义标题）", () => {
			const params: ExcalidrawTemplateParams = { date: testDate };

			const result = excalidrawConfig.generateTitle(params);

			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(0);
			expect(result).toMatch(/^drawing-/);
		});

		it("应该在没有参数时使用当前日期生成标题", () => {
			const params: ExcalidrawTemplateParams = {};

			const result = excalidrawConfig.generateTitle(params);

			expect(typeof result).toBe("string");
			expect(result).toMatch(/^drawing-/);
		});
	});

	describe("文件夹路径生成", () => {
		const testDate = dayjs("2024-01-15T10:30:00.000Z").toDate();

		it("应该生成年/月/日文件夹结构", () => {
			const params: ExcalidrawTemplateParams = { date: testDate };

			const result = excalidrawConfig.generateFolderPath(params);

			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(3);
			expect(result[0]).toMatch(/^year-/);
			expect(result[1]).toMatch(/^month-/);
			expect(result[2]).toMatch(/^day-/);
		});

		it("应该在没有日期参数时使用当前日期", () => {
			const params: ExcalidrawTemplateParams = {};

			const result = excalidrawConfig.generateFolderPath(params);

			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(3);
			expect(result[0]).toMatch(/^year-/);
			expect(result[1]).toMatch(/^month-/);
			expect(result[2]).toMatch(/^day-/);
		});

		it("应该为不同日期生成不同的路径", () => {
			const date1 = dayjs("2024-01-15T10:30:00.000Z").toDate();
			const date2 = dayjs("2024-06-20T10:30:00.000Z").toDate();

			const result1 = excalidrawConfig.generateFolderPath({ date: date1 });
			const result2 = excalidrawConfig.generateFolderPath({ date: date2 });

			// 年份相同，但月份不同
			expect(result1[0]).toBe(result2[0]); // 同一年
			expect(result1[1]).not.toBe(result2[1]); // 不同月
		});
	});

	describe("纯函数特性", () => {
		const testDate = dayjs("2024-01-15T10:30:00.000Z").toDate();

		it("应该生成一致的结果（纯函数特性）", () => {
			const params: ExcalidrawTemplateParams = { date: testDate };

			// 多次调用应该产生相同结果
			const template1 = excalidrawConfig.generateTemplate(params);
			const template2 = excalidrawConfig.generateTemplate(params);
			const folderPath1 = excalidrawConfig.generateFolderPath(params);
			const folderPath2 = excalidrawConfig.generateFolderPath(params);
			const title1 = excalidrawConfig.generateTitle(params);
			const title2 = excalidrawConfig.generateTitle(params);

			expect(template1).toBe(template2);
			expect(folderPath1).toEqual(folderPath2);
			expect(title1).toBe(title2);
		});

		it("应该生成有效的 Excalidraw JSON 模板", () => {
			const params: ExcalidrawTemplateParams = { date: testDate };

			const result = excalidrawConfig.generateTemplate(params);

			// 应该是有效的 JSON
			expect(() => JSON.parse(result)).not.toThrow();

			const parsed = JSON.parse(result);
			expect(parsed.type).toBe("excalidraw");
			expect(parsed.version).toBeDefined();
			expect(parsed.elements).toBeDefined();
			expect(Array.isArray(parsed.elements)).toBe(true);
			expect(parsed.appState).toBeDefined();
			expect(parsed.files).toBeDefined();
		});

		it("应该生成空的 elements 数组", () => {
			const params: ExcalidrawTemplateParams = {};

			const result = excalidrawConfig.generateTemplate(params);
			const parsed = JSON.parse(result);

			expect(parsed.elements).toEqual([]);
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
				expect(excalidrawConfig).toHaveProperty(field);
				expect(
					excalidrawConfig[field as keyof typeof excalidrawConfig],
				).toBeDefined();
			}
		});

		it("应该处理完整的创建流程", () => {
			const params: ExcalidrawTemplateParams = {
				date: dayjs("2024-01-15T10:30:00.000Z").toDate(),
				title: "Test Drawing",
				width: 1920,
				height: 1080,
			};

			// 1. 校验参数
			const validation = excalidrawConfig.paramsSchema.safeParse(params);
			expect(validation.success).toBe(true);

			// 2. 生成模板
			const template = excalidrawConfig.generateTemplate(params);
			expect(() => JSON.parse(template)).not.toThrow();

			// 3. 生成路径
			const folderPath = excalidrawConfig.generateFolderPath(params);
			expect(folderPath).toHaveLength(3);

			// 4. 生成标题
			const title = excalidrawConfig.generateTitle(params);
			expect(title).toBe("Test Drawing");
		});
	});
});
