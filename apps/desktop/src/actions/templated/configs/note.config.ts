/**
 * @file note.config.ts
 * @description Note 模板配置
 *
 * 功能说明：
 * - 定义笔记模板的配置参数
 * - 包含模板生成、文件夹结构、标题生成等函数
 * - 支持自定义日期参数
 * - 使用 Zod 进行参数校验
 *
 * @requirements Note 创建功能
 */

import dayjs from "dayjs";
import { z } from "zod";
import { generateNoteContent } from "@/fn/content";
import { getDateFolderStructureWithFilename } from "@/fn/date";
import type { TemplateConfig } from "../create-templated-file.action";

// ==============================
// Types
// ==============================

/**
 * Note 模板参数
 */
export interface NoteTemplateParams {
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

// ==============================
// Schema
// ==============================

/**
 * Note 模板参数校验 Schema
 */
export const noteParamsSchema = z.object({
	date: z.date().optional(),
});

// ==============================
// Template Functions
// ==============================

/**
 * 生成 Note 模板内容
 */
const generateNoteTemplate = (params: NoteTemplateParams): string => {
	const date = params.date || dayjs().toDate();
	return generateNoteContent(date);
};

/**
 * 生成 Note 文件夹路径
 *
 * Note 按年份、月份和日期组织：
 * Note > year-YYYY-{Zodiac} > month-MM-{MonthName} > day-DD-{Weekday}
 */
const generateNoteFolderPath = (params: NoteTemplateParams): string[] => {
	const date = params.date || dayjs().toDate();
	const structure = getDateFolderStructureWithFilename(date, "note");

	return [structure.yearFolder, structure.monthFolder, structure.dayFolder];
};

/**
 * 生成 Note 文件标题
 */
const generateNoteTitle = (params: NoteTemplateParams): string => {
	const date = params.date || dayjs().toDate();
	const structure = getDateFolderStructureWithFilename(date, "note");
	return structure.filename;
};

// ==============================
// Configuration
// ==============================

/**
 * Note 模板配置
 */
export const noteConfig: TemplateConfig<NoteTemplateParams> = {
	name: "Note",
	rootFolder: "Note",
	fileType: "file",
	tag: "note",
	generateTemplate: generateNoteTemplate,
	generateFolderPath: generateNoteFolderPath,
	generateTitle: generateNoteTitle,
	paramsSchema: noteParamsSchema,
	foldersCollapsed: true,
};
