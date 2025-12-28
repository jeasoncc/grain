/**
 * @file note.config.ts
 * @description Note 模板配置
 *
 * 使用 createDateTemplateConfig 工厂函数生成配置，
 * 消除重复的文件夹路径和标题生成逻辑。
 *
 * @requirements Note 创建功能
 */

import { generateNoteContent } from "@/fn/content";
import {
	type DateTemplateParams,
	createDateTemplateConfig,
	dateParamsSchema,
} from "./date-template.factory";

// ==============================
// Types (Re-export)
// ==============================

export type NoteTemplateParams = DateTemplateParams;
export const noteParamsSchema = dateParamsSchema;

// ==============================
// Configuration
// ==============================

/**
 * Note 模板配置
 *
 * Note 按年份、月份和日期组织：
 * Note > year-YYYY-{Zodiac} > month-MM-{MonthName} > day-DD-{Weekday}
 */
export const noteConfig = createDateTemplateConfig({
	name: "Note",
	rootFolder: "Note",
	fileType: "file",
	tag: "note",
	prefix: "note",
	generateContent: generateNoteContent,
	includeDayFolder: true,
});
