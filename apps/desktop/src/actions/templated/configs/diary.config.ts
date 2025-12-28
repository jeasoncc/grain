/**
 * @file diary.config.ts
 * @description Diary 模板配置
 *
 * 使用 createDateTemplateConfig 工厂函数生成配置，
 * 消除重复的文件夹路径和标题生成逻辑。
 *
 * @requirements 1.1, 1.5, 3.1
 */

import { generateDiaryContent } from "@/fn/content";
import {
	type DateTemplateParams,
	createDateTemplateConfig,
	dateParamsSchema,
} from "./date-template.factory";

// ==============================
// Types (Re-export)
// ==============================

export type DiaryTemplateParams = DateTemplateParams;
export const diaryParamsSchema = dateParamsSchema;

// ==============================
// Configuration
// ==============================

/**
 * 日记模板配置
 *
 * 日记按年份、月份和日期组织：
 * Diary > year-YYYY-{Zodiac} > month-MM-{MonthName} > day-DD-{Weekday}
 */
export const diaryConfig = createDateTemplateConfig({
	name: "日记",
	rootFolder: "Diary",
	fileType: "diary",
	tag: "diary",
	prefix: "diary",
	generateContent: generateDiaryContent,
	includeDayFolder: true,
});
