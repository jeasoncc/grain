/**
 * @file create-diary.action.ts
 * @description 日记创建 Action（使用高阶函数模式）
 *
 * 功能说明：
 * - 使用高阶函数 createTemplatedFile 创建日记
 * - 基于 diaryConfig 配置自动生成日记内容和文件夹结构
 * - 支持自定义日期参数
 * - 提供同步和异步两种调用方式
 *
 * 设计理念：
 * - 复用高阶函数，避免重复代码
 * - 配置驱动，易于维护和扩展
 * - 类型安全，编译时检查参数类型
 * - 函数式编程，使用 TaskEither 进行错误处理
 *
 * @requirements 1.1, 1.5, 3.1
 */

import * as E from "fp-ts/Either";
import { type DiaryTemplateParams, diaryConfig } from "./configs/diary.config";
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
 * 创建日记参数
 */
export interface CreateDiaryParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

/**
 * 日记创建结果
 */
export interface DiaryCreationResult {
	/** 创建的日记节点 */
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
 * 创建日记条目
 *
 * 使用高阶函数 createTemplatedFile 和 diaryConfig 配置创建日记。
 * 自动生成文件夹结构：Diary > year-YYYY-{Zodiac} > month-MM-{Month} > day-DD-{Weekday}
 * 自动生成日记内容（Lexical JSON）
 *
 * @param params - 创建日记参数
 * @returns TaskEither<AppError, DiaryCreationResult>
 */
export const createDiary = createTemplatedFile(diaryConfig);

/**
 * 创建日记条目（异步版本）
 *
 * 用于在组件中直接调用，返回 Promise。
 *
 * @param params - 创建日记参数
 * @returns Promise<DiaryCreationResult>
 * @throws Error 如果创建失败
 */
export const createDiaryAsync = createTemplatedFileAsync(diaryConfig);

// ==============================
// Helper Functions
// ==============================

/**
 * 将 CreateDiaryParams 转换为 TemplatedFileParams<DiaryTemplateParams>
 *
 * 这个函数用于适配旧的 API，保持向后兼容性。
 *
 * @param params - 旧的日记创建参数
 * @returns 新的模板化文件参数
 */
export const adaptDiaryParams = (
	params: CreateDiaryParams,
): TemplatedFileParams<DiaryTemplateParams> => ({
	workspaceId: params.workspaceId,
	templateParams: {
		date: params.date,
	},
});

/**
 * 创建日记条目（兼容旧 API）
 *
 * 为了保持向后兼容性，提供与旧 API 相同的接口。
 * 内部使用新的高阶函数实现。
 *
 * @param params - 创建日记参数（旧格式）
 * @returns TaskEither<AppError, DiaryCreationResult>
 */
export const createDiaryCompat = (
	params: CreateDiaryParams,
): ReturnType<typeof createDiary> => {
	const adaptedParams = adaptDiaryParams(params);
	return createDiary(adaptedParams);
};

/**
 * 创建日记条目（兼容旧 API，异步版本）
 *
 * @param params - 创建日记参数（旧格式）
 * @returns Promise<DiaryCreationResult>
 * @throws Error 如果创建失败
 */
export async function createDiaryCompatAsync(
	params: CreateDiaryParams,
): Promise<DiaryCreationResult> {
	const adaptedParams = adaptDiaryParams(params);
	return createDiaryAsync(adaptedParams);
}
