/**
 * @file todo.config.ts
 * @description Todo 模板配置
 *
 * 功能说明：
 * - 定义待办模板的配置参数
 * - 包含模板生成、文件夹结构、标题生成等函数
 * - 支持自定义日期参数
 * - 使用 Zod 进行参数校验
 *
 * @requirements Todo 创建功能
 */

import dayjs from "dayjs";
import { z } from "zod";
import { generateTodoContent } from "@/fn/content";
import { getDateFolderStructureWithFilename } from "@/fn/date";
import type { TemplateConfig } from "../create-templated-file.action";

// ==============================
// Types
// ==============================

/**
 * Todo 模板参数
 */
export interface TodoTemplateParams {
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

// ==============================
// Schema
// ==============================

/**
 * Todo 模板参数校验 Schema
 */
export const todoParamsSchema = z.object({
	date: z.date().optional(),
});

// ==============================
// Template Functions
// ==============================

/**
 * 生成 Todo 模板内容
 */
const generateTodoTemplate = (params: TodoTemplateParams): string => {
	const date = params.date || dayjs().toDate();
	return generateTodoContent(date);
};

/**
 * 生成 Todo 文件夹路径
 */
const generateTodoFolderPath = (params: TodoTemplateParams): string[] => {
	const date = params.date || dayjs().toDate();
	const structure = getDateFolderStructureWithFilename(date, "todo");

	return [structure.yearFolder, structure.monthFolder];
};

/**
 * 生成 Todo 文件标题
 */
const generateTodoTitle = (params: TodoTemplateParams): string => {
	const date = params.date || dayjs().toDate();
	const structure = getDateFolderStructureWithFilename(date, "todo");
	return structure.filename;
};

// ==============================
// Configuration
// ==============================

/**
 * Todo 模板配置
 */
export const todoConfig: TemplateConfig<TodoTemplateParams> = {
	name: "Todo",
	rootFolder: "Todo",
	fileType: "file",
	tag: "todo",
	generateTemplate: generateTodoTemplate,
	generateFolderPath: generateTodoFolderPath,
	generateTitle: generateTodoTitle,
	paramsSchema: todoParamsSchema,
	foldersCollapsed: true,
};
