/**
 * @file excalidraw.config.ts
 * @description Excalidraw 模板配置
 *
 * 功能说明：
 * - 定义 Excalidraw 模板的配置参数
 * - 包含模板生成、文件夹结构、标题生成等函数
 * - 支持自定义日期、宽度、高度参数
 * - 使用 Zod 进行参数校验
 *
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */

import dayjs from "dayjs";
import { z } from "zod";
import { generateExcalidrawContent } from "@/fn/content";
import { getDateFolderStructureWithFilename } from "@/fn/date";
import type { TemplateConfig } from "../create-templated-file.action";

// ==============================
// Types
// ==============================

/**
 * Excalidraw 模板参数
 */
export interface ExcalidrawTemplateParams {
	/** 自定义标题（可选） */
	readonly title?: string;
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
	/** 画布宽度（可选，默认 1920） */
	readonly width?: number;
	/** 画布高度（可选，默认 1080） */
	readonly height?: number;
}

// ==============================
// Schema
// ==============================

/**
 * Excalidraw 模板参数校验 Schema
 */
export const excalidrawParamsSchema = z.object({
	title: z.string().optional(),
	date: z.date().optional(),
	width: z.number().positive().optional(),
	height: z.number().positive().optional(),
});

// ==============================
// Template Functions
// ==============================

/**
 * 生成 Excalidraw 模板内容
 *
 * @param params - 模板参数
 * @returns Excalidraw JSON 字符串
 */
const generateExcalidrawTemplate = (
	params: ExcalidrawTemplateParams,
): string => {
	return generateExcalidrawContent({
		width: params.width,
		height: params.height,
	});
};

/**
 * 生成 Excalidraw 文件夹路径（年/月/日结构）
 *
 * Excalidraw 文件按日期组织：
 * excalidraw > year-YYYY-Zodiac > month-MM-MonthName > day-DD-Weekday
 *
 * @param params - 模板参数
 * @returns 文件夹路径数组
 */
const generateExcalidrawFolderPath = (
	params: ExcalidrawTemplateParams,
): string[] => {
	const date = params.date || dayjs().toDate();
	const structure = getDateFolderStructureWithFilename(date, "drawing");

	return [structure.yearFolder, structure.monthFolder, structure.dayFolder];
};

/**
 * 生成 Excalidraw 文件标题
 *
 * 如果提供了自定义标题，则使用自定义标题。
 * 否则使用日期生成的默认标题（如：drawing-1703145600-14-30-00）
 *
 * @param params - 模板参数
 * @returns 文件标题
 */
const generateExcalidrawTitle = (params: ExcalidrawTemplateParams): string => {
	if (params.title) {
		return params.title;
	}
	const date = params.date || dayjs().toDate();
	const structure = getDateFolderStructureWithFilename(date, "drawing");
	return structure.filename;
};

// ==============================
// Configuration
// ==============================

/**
 * Excalidraw 模板配置
 */
export const excalidrawConfig: TemplateConfig<ExcalidrawTemplateParams> = {
	name: "Excalidraw 绘图",
	rootFolder: "excalidraw",
	fileType: "canvas",
	tag: "excalidraw",
	generateTemplate: generateExcalidrawTemplate,
	generateFolderPath: generateExcalidrawFolderPath,
	generateTitle: generateExcalidrawTitle,
	paramsSchema: excalidrawParamsSchema,
	foldersCollapsed: true,
};
