/**
 * @file ledger.config.ts
 * @description 记账模板配置
 *
 * 使用 createDateTemplateConfig 工厂函数生成配置，
 * 消除重复的文件夹路径和标题生成逻辑。
 *
 * @requirements 119
 */

import { generateLedgerContent } from "@/pipes/ledger";
import {
	createDateTemplateConfig,
	type DateTemplateParams,
	dateParamsSchema,
} from "./date-template.factory";

// ==============================
// Types (Re-export)
// ==============================

export type LedgerTemplateParams = DateTemplateParams;
export const ledgerParamsSchema = dateParamsSchema;

// ==============================
// Configuration
// ==============================

/**
 * 记账模板配置
 *
 * 记账按年份和月份组织（不包含日期文件夹）：
 * Ledger > year-YYYY-{Zodiac} > month-MM-{MonthName}
 */
export const ledgerConfig = createDateTemplateConfig({
	name: "记账",
	rootFolder: "Ledger",
	fileType: "ledger",
	tag: "ledger",
	prefix: "ledger",
	generateContent: generateLedgerContent,
	includeDayFolder: false, // 记账不需要日期文件夹
});
