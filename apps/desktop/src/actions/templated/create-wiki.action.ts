/**
 * @file create-wiki.action.ts
 * @description Wiki 条目创建 Action
 *
 * 功能说明：
 * - 使用高阶函数模式创建 Wiki 条目
 * - 基于 createTemplatedFile 高阶函数
 * - 支持自定义标题和创建日期
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
import {
	createTemplatedFile,
	createTemplatedFileAsync,
} from "./create-templated-file.action";

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
// Type Exports
// ==============================

export type { WikiTemplateParams };
