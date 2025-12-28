/**
 * @file todo.config.ts
 * @description Todo 模板配置
 *
 * 使用 createDateTemplateConfig 工厂函数生成配置，
 * 消除重复的文件夹路径和标题生成逻辑。
 *
 * @requirements Todo 创建功能
 */

import { generateTodoContent } from "@/fn/content";
import {
	type DateTemplateParams,
	createDateTemplateConfig,
	dateParamsSchema,
} from "./date-template.factory";

// ==============================
// Types (Re-export)
// ==============================

export type TodoTemplateParams = DateTemplateParams;
export const todoParamsSchema = dateParamsSchema;

// ==============================
// Configuration
// ==============================

/**
 * Todo 模板配置
 *
 * Todo 按年份、月份和日期组织：
 * Todo > year-YYYY-{Zodiac} > month-MM-{MonthName} > day-DD-{Weekday}
 */
export const todoConfig = createDateTemplateConfig({
	name: "Todo",
	rootFolder: "Todo",
	fileType: "file",
	tag: "todo",
	prefix: "todo",
	generateContent: generateTodoContent,
	includeDayFolder: true,
});
