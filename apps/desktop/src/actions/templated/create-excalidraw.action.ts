/**
 * @file create-excalidraw.action.ts
 * @description Excalidraw 文件创建 Action（使用高阶函数模式）
 *
 * 功能说明：
 * - 使用高阶函数 createTemplatedFile 创建 Excalidraw 文件
 * - 基于 excalidrawConfig 配置自动生成内容和文件夹结构
 * - 支持自定义日期、标题、宽度、高度参数
 * - 提供同步和异步两种调用方式
 *
 * 设计理念：
 * - 复用高阶函数，避免重复代码
 * - 配置驱动，易于维护和扩展
 * - 类型安全，编译时检查参数类型
 * - 函数式编程，使用 TaskEither 进行错误处理
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import {
	type ExcalidrawTemplateParams,
	excalidrawConfig,
} from "./configs/excalidraw.config";
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
 * 创建 Excalidraw 文件参数
 */
export interface CreateExcalidrawParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 自定义标题（可选） */
	readonly title?: string;
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
	/** 画布宽度（可选，默认 1920） */
	readonly width?: number;
	/** 画布高度（可选，默认 1080） */
	readonly height?: number;
}

/**
 * Excalidraw 文件创建结果
 */
export interface ExcalidrawCreationResult {
	/** 创建的 Excalidraw 节点 */
	readonly node: import("@/types/node").NodeInterface;
	/** 生成的内容（Excalidraw JSON 字符串） */
	readonly content: string;
	/** 解析后的内容（Excalidraw JSON 对象） */
	readonly parsedContent: unknown;
}

// ==============================
// Actions
// ==============================

/**
 * 创建 Excalidraw 文件
 *
 * 使用高阶函数 createTemplatedFile 和 excalidrawConfig 配置创建 Excalidraw 文件。
 * 自动生成文件夹结构：excalidraw > year-YYYY-{Zodiac} > month-MM-{Month} > day-DD-{Weekday}
 * 自动生成 Excalidraw 内容（Excalidraw JSON）
 *
 * @param params - 创建 Excalidraw 参数
 * @returns TaskEither<AppError, ExcalidrawCreationResult>
 */
export const createExcalidraw = createTemplatedFile(excalidrawConfig);

/**
 * 创建 Excalidraw 文件（异步版本）
 *
 * 用于在组件中直接调用，返回 Promise。
 *
 * @param params - 创建 Excalidraw 参数
 * @returns Promise<ExcalidrawCreationResult>
 * @throws Error 如果创建失败
 */
export const createExcalidrawAsync = createTemplatedFileAsync(excalidrawConfig);

// ==============================
// Helper Functions
// ==============================

/**
 * 将 CreateExcalidrawParams 转换为 TemplatedFileParams<ExcalidrawTemplateParams>
 *
 * 这个函数用于适配旧的 API，保持向后兼容性。
 *
 * @param params - 旧的 Excalidraw 创建参数
 * @returns 新的模板化文件参数
 */
export const adaptExcalidrawParams = (
	params: CreateExcalidrawParams,
): TemplatedFileParams<ExcalidrawTemplateParams> => ({
	workspaceId: params.workspaceId,
	templateParams: {
		title: params.title,
		date: params.date,
		width: params.width,
		height: params.height,
	},
});

/**
 * 创建 Excalidraw 文件（兼容旧 API）
 *
 * 为了保持向后兼容性，提供与旧 API 相同的接口。
 * 内部使用新的高阶函数实现。
 *
 * @param params - 创建 Excalidraw 参数（旧格式）
 * @returns TaskEither<AppError, ExcalidrawCreationResult>
 */
export const createExcalidrawCompat = (
	params: CreateExcalidrawParams,
): ReturnType<typeof createExcalidraw> => {
	const adaptedParams = adaptExcalidrawParams(params);
	return createExcalidraw(adaptedParams);
};

/**
 * 创建 Excalidraw 文件（兼容旧 API，异步版本）
 *
 * @param params - 创建 Excalidraw 参数（旧格式）
 * @returns Promise<ExcalidrawCreationResult>
 * @throws Error 如果创建失败
 */
export async function createExcalidrawCompatAsync(
	params: CreateExcalidrawParams,
): Promise<ExcalidrawCreationResult> {
	const adaptedParams = adaptExcalidrawParams(params);
	return createExcalidrawAsync(adaptedParams);
}
