/**
 * @file wiki.config.ts
 * @description Wiki 模板配置
 *
 * 使用 createDateTemplateConfig 工厂函数生成配置，
 * 消除重复的文件夹路径和标题生成逻辑。
 *
 * @requirements Wiki 条目创建功能
 */

import { generateWikiContent } from "@/fn/content";
import {
	type DateTemplateParams,
	createDateTemplateConfig,
	dateParamsSchema,
} from "./date-template.factory";

// ==============================
// Types (Re-export)
// ==============================

export type WikiTemplateParams = DateTemplateParams;
export const wikiParamsSchema = dateParamsSchema;

// ==============================
// Configuration
// ==============================

/**
 * Wiki 模板配置
 *
 * Wiki 条目按年份、月份和日期组织：
 * Wiki > year-YYYY-{Zodiac} > month-MM-{MonthName} > day-DD-{Weekday}
 */
export const wikiConfig = createDateTemplateConfig({
	name: "Wiki",
	rootFolder: "Wiki",
	fileType: "file",
	tag: "wiki",
	prefix: "wiki",
	generateContent: generateWikiContent,
	includeDayFolder: true,
});
