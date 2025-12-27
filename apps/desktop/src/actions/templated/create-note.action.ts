/**
 * @file create-note.action.ts
 * @description Note 创建 Action（使用高阶函数模式）
 *
 * 功能说明：
 * - 使用高阶函数 createTemplatedFile 创建笔记
 * - 基于 noteConfig 配置自动生成笔记内容和文件夹结构
 * - 支持自定义日期参数
 * - 提供同步和异步两种调用方式
 *
 * @requirements Note 创建功能
 */

import { type NoteTemplateParams, noteConfig } from "./configs/note.config";
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
 * 创建 Note 参数
 */
export interface CreateNoteParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

/**
 * Note 创建结果
 */
export interface NoteCreationResult {
	/** 创建的 Note 节点 */
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
 * 创建 Note 条目（TaskEither 版本）
 */
export const createNote = createTemplatedFile(noteConfig);

/**
 * 创建 Note 条目（Promise 版本）
 */
export const createNoteAsync = createTemplatedFileAsync(noteConfig);

// ==============================
// Helper Functions
// ==============================

/**
 * 将 CreateNoteParams 转换为 TemplatedFileParams<NoteTemplateParams>
 */
export const adaptNoteParams = (
	params: CreateNoteParams,
): TemplatedFileParams<NoteTemplateParams> => ({
	workspaceId: params.workspaceId,
	templateParams: {
		date: params.date,
	},
});

/**
 * 创建 Note 条目（兼容旧 API）
 */
export const createNoteCompat = (
	params: CreateNoteParams,
): ReturnType<typeof createNote> => {
	const adaptedParams = adaptNoteParams(params);
	return createNote(adaptedParams);
};

/**
 * 创建 Note 条目（兼容旧 API，异步版本）
 */
export async function createNoteCompatAsync(
	params: CreateNoteParams,
): Promise<NoteCreationResult> {
	const adaptedParams = adaptNoteParams(params);
	return createNoteAsync(adaptedParams);
}

// ==============================
// Type Exports
// ==============================

export type { NoteTemplateParams };
