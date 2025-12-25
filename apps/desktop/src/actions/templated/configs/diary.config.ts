/**
 * @file diary.config.ts
 * @description Diary 模板配置
 *
 * 功能说明：
 * - 定义日记模板的配置参数
 * - 包含模板生成、文件夹结构、标题生成等函数
 * - 支持自定义日期参数
 * - 使用 Zod 进行参数校验
 *
 * @requirements 1.1, 1.5, 3.1
 */

import dayjs from "dayjs";
import { z } from "zod";
import { generateDiaryContent } from "@/fn/content";
import { getDateFolderStructureWithFilename } from "@/fn/date";
import type { TemplateConfig } from "../create-templated-file.action";

// ==============================
// Types
// ==============================

/**
 * 日记模板参数
 */
export interface DiaryTemplateParams {
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

// ==============================
// Schema
// ==============================

/**
 * 日记模板参数校验 Schema
 */
export const diaryParamsSchema = z.object({
	date: z.date().optional(),
});

// ==============================
// Template Functions
// ==============================

/**
 * 生成日记模板内容
 */
const generateDiaryTemplate = (params: DiaryTemplateParams): string => {
	const date = params.date || dayjs().toDate();
	return generateDiaryContent(date);
};

/**
 * 生成日记文件夹路径
 */
const generateDiaryFolderPath = (params: DiaryTemplateParams): string[] => {
	const date = params.date || dayjs().toDate();
	const structure = getDateFolderStructureWithFilename(date, "diary");

	return [structure.yearFolder, structure.monthFolder, structure.dayFolder];
};

/**
 * 生成日记文件标题
 */
const generateDiaryTitle = (params: DiaryTemplateParams): string => {
	const date = params.date || dayjs().toDate();
	const structure = getDateFolderStructureWithFilename(date, "diary");
	return structure.filename;
};

// ==============================
// Configuration
// ==============================

/**
 * 日记模板配置
 */
export const diaryConfig: TemplateConfig<DiaryTemplateParams> = {
	name: "日记",
	rootFolder: "Diary",
	fileType: "diary",
	tag: "diary",
	generateTemplate: generateDiaryTemplate,
	generateFolderPath: generateDiaryFolderPath,
	generateTitle: generateDiaryTitle,
	paramsSchema: diaryParamsSchema,
	foldersCollapsed: true,
};
