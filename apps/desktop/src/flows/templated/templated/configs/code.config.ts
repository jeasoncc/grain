/**
 * @file code.config.ts
 * @description Code 模板配置
 *
 * 使用 createDateTemplateConfig 工厂函数生成配置，
 * 消除重复的文件夹路径和标题生成逻辑。
 *
 * @requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { generateCodeContent } from "@/pipes/content";
import {
	createDateTemplateConfig,
	type DateTemplateParams,
	dateParamsSchema,
} from "./date-template.factory";

// ==============================
// Types (Re-export)
// ==============================

export type CodeTemplateParams = DateTemplateParams;
export const codeParamsSchema = dateParamsSchema;

// ==============================
// Configuration
// ==============================

/**
 * Code 模板配置
 *
 * 代码文件按年份和月份组织（不包含日期文件夹）：
 * Code > year-YYYY-{Zodiac} > month-MM-{MonthName}
 */
export const codeConfig = createDateTemplateConfig({
	name: "Code",
	rootFolder: "Code",
	fileType: "code",
	tag: "code",
	prefix: "code",
	generateContent: generateCodeContent,
	includeDayFolder: false,
	skipJsonParse: true,
});
