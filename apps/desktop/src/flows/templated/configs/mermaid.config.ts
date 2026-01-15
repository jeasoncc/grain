/**
 * @file mermaid.config.ts
 * @description Mermaid 模板配置
 *
 * 使用 createDateTemplateConfig 工厂函数生成配置，
 * 消除重复的文件夹路径和标题生成逻辑。
 *
 * @requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { generateMermaidContent } from "@/pipes/content"
import {
	createDateTemplateConfig,
	type DateTemplateParams,
	dateParamsSchema,
} from "./date-template.factory"

// ==============================
// Types (Re-export)
// ==============================

export type MermaidTemplateParams = DateTemplateParams
export const mermaidParamsSchema = dateParamsSchema

// ==============================
// Configuration
// ==============================

/**
 * Mermaid 模板配置
 *
 * Mermaid 图表按年份和月份组织（不包含日期文件夹）：
 * Mermaid > year-YYYY-{Zodiac} > month-MM-{MonthName}
 */
export const mermaidConfig = createDateTemplateConfig({
	fileType: "mermaid",
	generateContent: generateMermaidContent,
	includeDayFolder: false,
	name: "Mermaid",
	prefix: "mermaid",
	rootFolder: "Mermaid",
	skipJsonParse: true,
	tag: "mermaid",
})
