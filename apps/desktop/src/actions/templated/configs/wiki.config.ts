/**
 * @file wiki.config.ts
 * @description Wiki 模板配置
 *
 * 功能说明：
 * - 定义 Wiki 模板的配置参数
 * - 包含模板生成、文件夹结构、标题生成等函数
 * - 支持自定义日期参数
 * - 使用 Zod 进行参数校验
 *
 * @requirements Wiki 条目创建功能
 */

import dayjs from "dayjs";
import { z } from "zod";
import { generateWikiContent } from "@/fn/content";
import { getDateFolderStructureWithFilename } from "@/fn/date";
import type { TemplateConfig } from "../create-templated-file.action";

// ==============================
// Types
// ==============================

/**
 * Wiki 模板参数
 */
export interface WikiTemplateParams {
	/** 创建日期（可选，默认为当前时间） */
	readonly date?: Date;
}

// ==============================
// Schema
// ==============================

/**
 * Wiki 模板参数校验 Schema
 */
export const wikiParamsSchema = z.object({
	date: z.date().optional(),
});

// ==============================
// Template Functions
// ==============================

/**
 * 生成 Wiki 模板内容
 */
const generateWikiTemplateContent = (params: WikiTemplateParams): string => {
	const date = params.date || dayjs().toDate();
	return generateWikiContent(date);
};

/**
 * 生成 Wiki 文件夹路径
 *
 * Wiki 条目按年份和月份组织：
 * Wiki > year-YYYY-{Zodiac} > month-MM-{MonthName}
 */
const generateWikiFolderPath = (params: WikiTemplateParams): string[] => {
	const date = params.date || dayjs().toDate();
	const structure = getDateFolderStructureWithFilename(date, "wiki");

	return [structure.yearFolder, structure.monthFolder];
};

/**
 * 生成 Wiki 文件标题
 */
const generateWikiTitle = (params: WikiTemplateParams): string => {
	const date = params.date || dayjs().toDate();
	const structure = getDateFolderStructureWithFilename(date, "wiki");
	return structure.filename;
};

// ==============================
// Configuration
// ==============================

/**
 * Wiki 模板配置
 */
export const wikiConfig: TemplateConfig<WikiTemplateParams> = {
	name: "Wiki",
	rootFolder: "Wiki",
	fileType: "file",
	tag: "wiki",
	generateTemplate: generateWikiTemplateContent,
	generateFolderPath: generateWikiFolderPath,
	generateTitle: generateWikiTitle,
	paramsSchema: wikiParamsSchema,
	foldersCollapsed: true,
};
