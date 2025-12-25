/**
 * @file ledger.config.ts
 * @description 记账模板配置
 *
 * 功能说明：
 * - 定义记账模板的配置参数
 * - 包含模板生成、文件夹结构、标题生成等函数
 * - 支持自定义日期参数
 * - 使用 Zod 进行参数校验
 *
 * @requirements 119
 */

import { z } from "zod";
import dayjs from "dayjs";
import type { TemplateConfig } from "../create-templated-file.action";
import {
	generateLedgerContent,
	getLedgerFolderStructure,
} from "@/fn/ledger";

// ==============================
// Types
// ==============================

/**
 * 记账模板参数
 */
export interface LedgerTemplateParams {
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

// ==============================
// Schema
// ==============================

/**
 * 记账模板参数校验 Schema
 */
export const ledgerParamsSchema = z.object({
	date: z.date().optional(),
});

// ==============================
// Template Functions
// ==============================

/**
 * 生成记账模板内容
 */
const generateLedgerTemplate = (params: LedgerTemplateParams): string => {
	const date = params.date || dayjs().toDate();
	return generateLedgerContent(date);
};

/**
 * 生成记账文件夹路径
 */
const generateLedgerFolderPath = (params: LedgerTemplateParams): string[] => {
	const date = params.date || dayjs().toDate();
	const structure = getLedgerFolderStructure(date);

	return [structure.yearFolder, structure.monthFolder];
};

/**
 * 生成记账文件标题
 */
const generateLedgerTitle = (params: LedgerTemplateParams): string => {
	const date = params.date || dayjs().toDate();
	const structure = getLedgerFolderStructure(date);
	return structure.filename;
};

// ==============================
// Configuration
// ==============================

/**
 * 记账模板配置
 */
export const ledgerConfig: TemplateConfig<LedgerTemplateParams> = {
	name: "记账",
	rootFolder: "Ledger",
	fileType: "file",
	tag: "ledger",
	generateTemplate: generateLedgerTemplate,
	generateFolderPath: generateLedgerFolderPath,
	generateTitle: generateLedgerTitle,
	paramsSchema: ledgerParamsSchema,
	foldersCollapsed: true,
};
