/**
 * @file wiki.config.ts
 * @description Wiki 模板配置
 *
 * 功能说明：
 * - 定义 Wiki 模板的配置参数
 * - 包含模板生成、文件夹结构、标题生成等函数
 * - 支持自定义标题参数
 * - 使用 Zod 进行参数校验
 *
 * @requirements Wiki 条目创建功能
 */

import dayjs from "dayjs";
import { z } from "zod";
import { generateWikiTemplate } from "@/fn/wiki";
import type { TemplateConfig } from "../create-templated-file.action";

// ==============================
// Types
// ==============================

/**
 * Wiki 模板参数
 */
export interface WikiTemplateParams {
	/** Wiki 条目标题 */
	readonly title: string;
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
	title: z.string().min(1, "标题不能为空").max(200, "标题不能超过200个字符"),
	date: z.date().optional(),
});

// ==============================
// Template Functions
// ==============================

/**
 * 生成 Wiki 模板内容
 */
const generateWikiTemplateContent = (params: WikiTemplateParams): string => {
	return generateWikiTemplate(params.title);
};

/**
 * 生成 Wiki 文件夹路径
 *
 * Wiki 条目按年份和月份组织：
 * Wiki > year-YYYY > month-MM-MonthName
 */
const generateWikiFolderPath = (params: WikiTemplateParams): string[] => {
	const date = params.date || new Date();
	const year = date.getFullYear();
	const month = date.getMonth();

	// Month names in English
	const monthNames = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	const yearFolder = `year-${year}`;
	const monthFolder = `month-${String(month + 1).padStart(2, "0")}-${monthNames[month]}`;

	return [yearFolder, monthFolder];
};

/**
 * 生成 Wiki 文件标题
 *
 * 格式：wiki-{timestamp}-{sanitized-title}
 */
const generateWikiTitle = (params: WikiTemplateParams): string => {
	const date = params.date || new Date();
	const timestamp = Math.floor(date.getTime() / 1000);

	// Sanitize title for filename (remove special characters, replace spaces with hyphens)
	const sanitizedTitle = params.title
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "") // Remove special characters
		.replace(/\s+/g, "-") // Replace spaces with hyphens
		.replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
		.replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

	return `wiki-${timestamp}-${sanitizedTitle}`;
};

// ==============================
// Configuration
// ==============================

/**
 * Wiki 模板配置
 */
export const wikiConfig: TemplateConfig<WikiTemplateParams> = {
	name: "Wiki 条目",
	rootFolder: "Wiki",
	fileType: "file",
	tag: "wiki",
	generateTemplate: generateWikiTemplateContent,
	generateFolderPath: generateWikiFolderPath,
	generateTitle: generateWikiTitle,
	paramsSchema: wikiParamsSchema,
	foldersCollapsed: true,
};
