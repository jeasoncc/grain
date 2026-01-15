/**
 * @file create-code.flow.ts
 * @description Code 文件创建 Flow
 *
 * 功能说明：
 * - 使用 createDateTemplateActions 工厂函数生成所有 action
 * - 提供 TaskEither 和 Promise 两种 API
 * - 支持兼容旧 API 的参数格式
 *
 * @requirements 3.3, 3.4, 3.5
 */

import { codeConfig } from "./configs/code.config"
import { createDateTemplateActions } from "./create-date-template.flow"

// ==============================
// Types
// ==============================

/**
 * Code 创建参数
 */
export interface CreateCodeParams {
	/** 工作区 ID */
	readonly workspaceId: string
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date
}

/**
 * Code 创建结果
 */
export interface CodeCreationResult {
	/** 创建的节点 */
	readonly node: import("@/types/node").NodeInterface
	/** 生成的内容（代码） */
	readonly content: string
	/** 解析后的内容 */
	readonly parsedContent: unknown
}

// ==============================
// Actions
// ==============================

/** Code actions 对象 */
export const codeActions = createDateTemplateActions(codeConfig)

/** TaskEither 版本 */
export const createCode = codeActions.create

/** Promise 版本 */
export const createCodeAsync = codeActions.createAsync

/** 兼容旧 API 的 TaskEither 版本 */
export const createCodeCompat = codeActions.createCompat

/** 兼容旧 API 的 Promise 版本 */
export const createCodeCompatAsync = codeActions.createCompatAsync
