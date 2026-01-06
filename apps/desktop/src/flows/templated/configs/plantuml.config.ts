/**
 * @file plantuml.config.ts
 * @description PlantUML 模板配置
 *
 * 使用 createDateTemplateConfig 工厂函数生成配置，
 * 消除重复的文件夹路径和标题生成逻辑。
 *
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { generatePlantUMLContent } from "@/pipes/content";
import {
	createDateTemplateConfig,
	type DateTemplateParams,
	dateParamsSchema,
} from "./date-template.factory";

// ==============================
// Types (Re-export)
// ==============================

export type PlantUMLTemplateParams = DateTemplateParams;
export const plantumlParamsSchema = dateParamsSchema;

// ==============================
// Configuration
// ==============================

/**
 * PlantUML 模板配置
 *
 * PlantUML 图表按年份和月份组织（不包含日期文件夹）：
 * PlantUML > year-YYYY-{Zodiac} > month-MM-{MonthName}
 */
export const plantumlConfig = createDateTemplateConfig({
	name: "PlantUML",
	rootFolder: "PlantUML",
	fileType: "plantuml",
	tag: "plantuml",
	prefix: "plantuml",
	generateContent: generatePlantUMLContent,
	includeDayFolder: false,
	skipJsonParse: true,
});
