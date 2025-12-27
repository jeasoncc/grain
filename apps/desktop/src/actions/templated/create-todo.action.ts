/**
 * @file create-todo.action.ts
 * @description Todo 创建 Action（使用高阶函数模式）
 *
 * 功能说明：
 * - 使用高阶函数 createTemplatedFile 创建待办
 * - 基于 todoConfig 配置自动生成待办内容和文件夹结构
 * - 支持自定义日期参数
 * - 提供同步和异步两种调用方式
 *
 * @requirements Todo 创建功能
 */

import { type TodoTemplateParams, todoConfig } from "./configs/todo.config";
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
 * 创建 Todo 参数
 */
export interface CreateTodoParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

/**
 * Todo 创建结果
 */
export interface TodoCreationResult {
	/** 创建的 Todo 节点 */
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
 * 创建 Todo 条目（TaskEither 版本）
 */
export const createTodo = createTemplatedFile(todoConfig);

/**
 * 创建 Todo 条目（Promise 版本）
 */
export const createTodoAsync = createTemplatedFileAsync(todoConfig);

// ==============================
// Helper Functions
// ==============================

/**
 * 将 CreateTodoParams 转换为 TemplatedFileParams<TodoTemplateParams>
 */
export const adaptTodoParams = (
	params: CreateTodoParams,
): TemplatedFileParams<TodoTemplateParams> => ({
	workspaceId: params.workspaceId,
	templateParams: {
		date: params.date,
	},
});

/**
 * 创建 Todo 条目（兼容旧 API）
 */
export const createTodoCompat = (
	params: CreateTodoParams,
): ReturnType<typeof createTodo> => {
	const adaptedParams = adaptTodoParams(params);
	return createTodo(adaptedParams);
};

/**
 * 创建 Todo 条目（兼容旧 API，异步版本）
 */
export async function createTodoCompatAsync(
	params: CreateTodoParams,
): Promise<TodoCreationResult> {
	const adaptedParams = adaptTodoParams(params);
	return createTodoAsync(adaptedParams);
}

// ==============================
// Type Exports
// ==============================

export type { TodoTemplateParams };
