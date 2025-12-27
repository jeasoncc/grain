/**
 * @file create-wiki.action.ts
 * @description Wiki 条目创建 Action
 *
 * 功能说明：
 * - 使用高阶函数模式创建 Wiki 条目
 * - 基于 createTemplatedFile 高阶函数
 * - 支持自定义日期参数
 * - 自动生成 Wiki 模板内容
 *
 * 设计理念：
 * - 复用 createTemplatedFile 高阶函数，避免重复代码
 * - 函数式编程模式，使用 TaskEither 进行错误处理
 * - 类型安全的参数传递
 *
 * @requirements Wiki 条目创建功能
 */

import { type WikiTemplateParams, wikiConfig } from "./configs/wiki.config";
import type {
	TemplatedFileParams,
	TemplatedFileResult,
} from "./create-templated-file.action";
import {
	createTemplatedFile,
	createTemplatedFileAsync,
} from "./create-templated-file.action";

// ==============================
// Types
// ==============================

/**
 * 创建 Wiki 参数
 */
export interface CreateWikiParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

/**
 * Wiki 创建结果
 */
export interface WikiCreationResult {
	/** 创建的 Wiki 节点 */
	readonly node: import("@/types/node").NodeInterface;
	/** 生成的内容（Lexical JSON 字符串） */
	readonly content: string;
	/** 解析后的内容（Lexical JSON 对象） */
	readonly parsedContent: unknown;
}

// ==============================
// Actions
// ==============================

/**
 * 创建 Wiki 条目（TaskEither 版本）
 *
 * 使用高阶函数 createTemplatedFile 和 wikiConfig 配置
 * 返回 TaskEither 类型，支持函数式错误处理
 */
export const createWiki = createTemplatedFile(wikiConfig);

/**
 * 创建 Wiki 条目（Promise 版本）
 *
 * 使用高阶函数 createTemplatedFileAsync 和 wikiConfig 配置
 * 返回 Promise 类型，适用于组件中直接调用
 */
export const createWikiAsync = createTemplatedFileAsync(wikiConfig);

// ==============================
// Helper Functions
// ==============================

/**
 * 将 CreateWikiParams 转换为 TemplatedFileParams<WikiTemplateParams>
 *
 * @param params - Wiki 创建参数
 * @returns 模板化文件参数
 */
export const adaptWikiParams = (
	params: CreateWikiParams,
): TemplatedFileParams<WikiTemplateParams> => ({
	workspaceId: params.workspaceId,
	templateParams: {
		date: params.date,
	},
});

/**
 * 创建 Wiki 条目（兼容旧 API）
 *
 * @param params - 创建 Wiki 参数（旧格式）
 * @returns TaskEither<AppError, WikiCreationResult>
 */
export const createWikiCompat = (
	params: CreateWikiParams,
): ReturnType<typeof createWiki> => {
	const adaptedParams = adaptWikiParams(params);
	return createWiki(adaptedParams);
};

/**
 * 创建 Wiki 条目（兼容旧 API，异步版本）
 *
 * @param params - 创建 Wiki 参数（旧格式）
 * @returns Promise<WikiCreationResult>
 * @throws Error 如果创建失败
 */
export async function createWikiCompatAsync(
	params: CreateWikiParams,
): Promise<WikiCreationResult> {
	const adaptedParams = adaptWikiParams(params);
	return createWikiAsync(adaptedParams);
}

// ==============================
// Type Exports
// ==============================

export type { WikiTemplateParams };
