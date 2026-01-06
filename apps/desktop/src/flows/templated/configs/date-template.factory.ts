/**
 * @file date-template.factory.ts
 * @description 日期模板配置工厂函数
 *
 * 功能说明：
 * - 提供通用的日期模板配置生成工厂
 * - 消除 diary/wiki/todo/note/ledger 等配置中的重复代码
 * - 支持自定义内容生成函数和文件夹层级
 *
 * @requirements 代码复用，函数式编程规范
 */

import dayjs from "dayjs";
import { z } from "zod";
import { getDateFolderStructureWithFilename } from "@/utils/date.util";
import { NODE_TYPE_TO_EXTENSION_MAP } from "@/views/editor";
import type { FileNodeType } from "@/types/node";
import type { TemplateConfig } from "../create-templated-file.action";

// ==============================
// Types
// ==============================

/**
 * 日期模板参数（所有日期模板共用）
 */
export interface DateTemplateParams {
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

/**
 * 日期模板配置选项
 */
export interface DateTemplateOptions {
	/** 模块名称（用于日志） */
	readonly name: string;
	/** 根文件夹名称 */
	readonly rootFolder: string;
	/** 文件类型（日期模板只支持文本类文件，排除 folder 和 drawing） */
	readonly fileType: Exclude<FileNodeType, "drawing">;
	/** 默认标签 */
	readonly tag: string;
	/** 文件名前缀 */
	readonly prefix: string;
	/** 内容生成函数 */
	readonly generateContent: (date: Date) => string;
	/** 是否包含日期文件夹（年/月/日 vs 年/月） */
	readonly includeDayFolder?: boolean;
	/** 文件夹是否折叠 */
	readonly foldersCollapsed?: boolean;
	/** 是否跳过 JSON 解析（用于纯文本内容如 Mermaid/PlantUML） */
	readonly skipJsonParse?: boolean;
}

// ==============================
// Schema
// ==============================

/**
 * 日期模板参数校验 Schema（所有日期模板共用）
 */
export const dateParamsSchema = z.object({
	date: z.date().optional(),
});

// ==============================
// Factory Function
// ==============================

/**
 * 创建日期模板配置的工厂函数
 *
 * 消除 diary/wiki/todo/note/ledger 等配置中的重复代码。
 * 所有日期模板都有相同的参数结构和文件夹生成逻辑，
 * 只有内容生成函数和配置选项不同。
 *
 * @param options - 日期模板配置选项
 * @returns 完整的模板配置
 *
 * @example
 * ```typescript
 * export const wikiConfig = createDateTemplateConfig({
 *   name: "Wiki",
 *   rootFolder: "Wiki",
 *   fileType: "file",
 *   tag: "wiki",
 *   prefix: "wiki",
 *   generateContent: generateWikiContent,
 *   includeDayFolder: true,
 * });
 * ```
 */
export const createDateTemplateConfig = (
	options: DateTemplateOptions,
): TemplateConfig<DateTemplateParams> => {
	const {
		name,
		rootFolder,
		fileType,
		tag,
		prefix,
		generateContent,
		includeDayFolder = true,
		foldersCollapsed = true,
		skipJsonParse = false,
	} = options;

	/**
	 * 生成模板内容
	 */
	const generateTemplate = (params: DateTemplateParams): string => {
		const date = params.date || dayjs().toDate();
		return generateContent(date);
	};

	/**
	 * 生成文件夹路径
	 */
	const generateFolderPath = (params: DateTemplateParams): string[] => {
		const date = params.date || dayjs().toDate();
		const structure = getDateFolderStructureWithFilename(date, prefix);

		return includeDayFolder
			? [structure.yearFolder, structure.monthFolder, structure.dayFolder]
			: [structure.yearFolder, structure.monthFolder];
	};

	/**
	 * 生成文件标题（包含扩展名）
	 */
	const generateTitle = (params: DateTemplateParams): string => {
		const date = params.date || dayjs().toDate();
		const structure = getDateFolderStructureWithFilename(date, prefix);
		// 添加扩展名
		const extension = NODE_TYPE_TO_EXTENSION_MAP[fileType] ?? ".grain";
		return `${structure.filename}${extension}`;
	};

	return {
		name,
		rootFolder,
		fileType,
		tag,
		generateTemplate,
		generateFolderPath,
		generateTitle,
		paramsSchema: dateParamsSchema,
		foldersCollapsed,
		skipJsonParse,
	};
};
