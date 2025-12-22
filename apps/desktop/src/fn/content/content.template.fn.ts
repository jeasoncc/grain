/**
 * @file fn/content/content.template.fn.ts
 * @description 内容模板配置和文件结构生成的纯函数
 *
 * 功能说明：
 * - 四种模板类型：diary、todo、ledger、wiki
 * - 统一目录结构生成
 * - 模板配置管理
 *
 * 目录结构格式：
 * {Root}/year-YYYY-{Zodiac}/month-MM-{Month}/day-DD-{Weekday}/{prefix}-{timestamp}
 *
 * 这些函数无副作用，可组合，可测试。
 */

import dayjs from "dayjs";
import {
	type DateFolderStructure,
	getDateFolderStructure,
} from "../date/date.folder.fn";

// ==============================
// Types
// ==============================

/**
 * 模板类型
 */
export type TemplateType = "diary" | "todo" | "ledger" | "wiki";

/**
 * 模板配置
 */
export interface TemplateConfig {
	/** 模板类型 */
	type: TemplateType;
	/** 根文件夹名称 */
	rootFolder: string;
	/** 文件名前缀 */
	filePrefix: string;
	/** 默认标签 */
	defaultTags: string[];
	/** 标题级别 */
	headingLevel: "h1" | "h2" | "h3";
	/** 是否包含空行 */
	includeEmptyLines: boolean;
	/** 节点类型 */
	nodeType: "file" | "diary" | "canvas";
}

/**
 * 文件结构信息
 */
export interface FileStructure {
	/** 根文件夹名称 */
	rootFolder: string;
	/** 年份文件夹名称 */
	yearFolder: string;
	/** 月份文件夹名称 */
	monthFolder: string;
	/** 日期文件夹名称 */
	dayFolder: string;
	/** 文件名 */
	filename: string;
	/** 完整文件夹路径数组 */
	folderPath: string[];
	/** 完整路径（含文件名） */
	fullPath: string;
}

/**
 * 文件创建参数
 */
export interface FileCreationParams {
	/** 工作区 ID */
	workspaceId: string;
	/** 文件结构 */
	structure: FileStructure;
	/** 模板配置 */
	config: TemplateConfig;
	/** 内容（Lexical JSON 字符串） */
	content: string;
}

// ==============================
// Constants - Template Configurations
// ==============================

/**
 * 日记模板配置
 */
export const DIARY_TEMPLATE: TemplateConfig = {
	type: "diary",
	rootFolder: "Diary",
	filePrefix: "diary",
	defaultTags: ["diary", "notes"],
	headingLevel: "h2",
	includeEmptyLines: true,
	nodeType: "diary",
};

/**
 * 待办模板配置
 */
export const TODO_TEMPLATE: TemplateConfig = {
	type: "todo",
	rootFolder: "Todo",
	filePrefix: "todo",
	defaultTags: ["todo", "tasks"],
	headingLevel: "h2",
	includeEmptyLines: true,
	nodeType: "file",
};

/**
 * 账本模板配置
 */
export const LEDGER_TEMPLATE: TemplateConfig = {
	type: "ledger",
	rootFolder: "Ledger",
	filePrefix: "ledger",
	defaultTags: ["ledger", "finance"],
	headingLevel: "h2",
	includeEmptyLines: true,
	nodeType: "file",
};

/**
 * Wiki 模板配置
 */
export const WIKI_TEMPLATE: TemplateConfig = {
	type: "wiki",
	rootFolder: "Wiki",
	filePrefix: "wiki",
	defaultTags: ["wiki", "knowledge"],
	headingLevel: "h2",
	includeEmptyLines: true,
	nodeType: "file",
};

/**
 * 所有模板配置映射
 */
export const TEMPLATE_CONFIGS: Record<TemplateType, TemplateConfig> = {
	diary: DIARY_TEMPLATE,
	todo: TODO_TEMPLATE,
	ledger: LEDGER_TEMPLATE,
	wiki: WIKI_TEMPLATE,
};

// ==============================
// Pure Functions
// ==============================

/**
 * 获取模板配置
 *
 * @param type - 模板类型
 * @returns 模板配置
 */
export function getTemplateConfig(type: TemplateType): TemplateConfig {
	return TEMPLATE_CONFIGS[type];
}

/**
 * 生成文件名
 * 格式：{prefix}-{timestamp}-{HH-mm-ss}
 *
 * @param prefix - 文件名前缀
 * @param date - 日期
 * @returns 文件名
 */
export function generateFilename(prefix: string, date: Date): string {
	const timestamp = Math.floor(date.getTime() / 1000);
	const formattedTime = dayjs(date).format("HH-mm-ss");
	return `${prefix}-${timestamp}-${formattedTime}`;
}

/**
 * 生成文件结构
 * 统一目录结构：{Root}/year-YYYY-{Zodiac}/month-MM-{Month}/day-DD-{Weekday}/{prefix}-{timestamp}
 *
 * @param config - 模板配置
 * @param date - 日期，默认为当前时间
 * @returns 文件结构信息
 */
export function generateFileStructure(
	config: TemplateConfig,
	date: Date = new Date(),
): FileStructure {
	const dateStructure: DateFolderStructure = getDateFolderStructure(date);
	const filename = generateFilename(config.filePrefix, date);

	const folderPath = [
		config.rootFolder,
		dateStructure.yearFolder,
		dateStructure.monthFolder,
		dateStructure.dayFolder,
	];

	return {
		rootFolder: config.rootFolder,
		yearFolder: dateStructure.yearFolder,
		monthFolder: dateStructure.monthFolder,
		dayFolder: dateStructure.dayFolder,
		filename,
		folderPath,
		fullPath: `${folderPath.join("/")}/${filename}`,
	};
}

/**
 * 根据模板类型生成文件结构
 *
 * @param type - 模板类型
 * @param date - 日期，默认为当前时间
 * @returns 文件结构信息
 */
export function generateFileStructureByType(
	type: TemplateType,
	date: Date = new Date(),
): FileStructure {
	const config = getTemplateConfig(type);
	return generateFileStructure(config, date);
}

/**
 * 创建自定义模板配置
 *
 * @param base - 基础模板类型
 * @param overrides - 覆盖配置
 * @returns 自定义模板配置
 */
export function createCustomTemplate(
	base: TemplateType,
	overrides: Partial<TemplateConfig>,
): TemplateConfig {
	const baseConfig = getTemplateConfig(base);
	return {
		...baseConfig,
		...overrides,
	};
}

/**
 * 验证模板类型是否有效
 *
 * @param type - 待验证的类型
 * @returns 是否为有效的模板类型
 */
export function isValidTemplateType(type: string): type is TemplateType {
	return type in TEMPLATE_CONFIGS;
}

/**
 * 获取所有可用的模板类型
 *
 * @returns 模板类型数组
 */
export function getAvailableTemplateTypes(): TemplateType[] {
	return Object.keys(TEMPLATE_CONFIGS) as TemplateType[];
}

/**
 * 构建文件创建参数
 *
 * @param workspaceId - 工作区 ID
 * @param type - 模板类型
 * @param content - 内容
 * @param date - 日期
 * @returns 文件创建参数
 */
export function buildFileCreationParams(
	workspaceId: string,
	type: TemplateType,
	content: string,
	date: Date = new Date(),
): FileCreationParams {
	const config = getTemplateConfig(type);
	const structure = generateFileStructure(config, date);

	return {
		workspaceId,
		structure,
		config,
		content,
	};
}
