/**
 * @file create-ledger.action.ts
 * @description 记账创建 Action（使用高阶函数模式）
 *
 * 功能说明：
 * - 使用高阶函数 createTemplatedFile 创建记账
 * - 基于 ledgerConfig 配置自动生成记账内容和文件夹结构
 * - 支持自定义日期参数
 * - 提供同步和异步两种调用方式
 *
 * @requirements 120
 */

import {
	type LedgerTemplateParams,
	ledgerConfig,
} from "./configs/ledger.config";
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
 * 创建记账参数
 */
export interface CreateLedgerParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

/**
 * 记账创建结果
 */
export interface LedgerCreationResult {
	/** 创建的记账节点 */
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
 * 创建记账条目
 *
 * 使用高阶函数 createTemplatedFile 和 ledgerConfig 配置创建记账。
 * 自动生成文件夹结构：Ledger > year-YYYY > month-MM-MonthName
 * 自动生成记账内容（Lexical JSON）
 *
 * @param params - 创建记账参数
 * @returns TaskEither<AppError, LedgerCreationResult>
 */
export const createLedger = createTemplatedFile(ledgerConfig);

/**
 * 创建记账条目（异步版本）
 *
 * 用于在组件中直接调用，返回 Promise。
 *
 * @param params - 创建记账参数
 * @returns Promise<LedgerCreationResult>
 * @throws Error 如果创建失败
 */
export const createLedgerAsync = createTemplatedFileAsync(ledgerConfig);

// ==============================
// Helper Functions
// ==============================

/**
 * 将 CreateLedgerParams 转换为 TemplatedFileParams<LedgerTemplateParams>
 *
 * @param params - 记账创建参数
 * @returns 模板化文件参数
 */
export const adaptLedgerParams = (
	params: CreateLedgerParams,
): TemplatedFileParams<LedgerTemplateParams> => ({
	workspaceId: params.workspaceId,
	templateParams: {
		date: params.date,
	},
});

/**
 * 创建记账条目（兼容旧 API）
 *
 * @param params - 创建记账参数（旧格式）
 * @returns TaskEither<AppError, LedgerCreationResult>
 */
export const createLedgerCompat = (
	params: CreateLedgerParams,
): ReturnType<typeof createLedger> => {
	const adaptedParams = adaptLedgerParams(params);
	return createLedger(adaptedParams);
};

/**
 * 创建记账条目（兼容旧 API，异步版本）
 *
 * @param params - 创建记账参数（旧格式）
 * @returns Promise<LedgerCreationResult>
 * @throws Error 如果创建失败
 */
export async function createLedgerCompatAsync(
	params: CreateLedgerParams,
): Promise<LedgerCreationResult> {
	const adaptedParams = adaptLedgerParams(params);
	return createLedgerAsync(adaptedParams);
}
