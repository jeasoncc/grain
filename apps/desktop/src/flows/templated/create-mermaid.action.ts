/**
 * @file create-mermaid.action.ts
 * @description Mermaid 图表创建 Action
 *
 * 功能说明：
 * - 使用 createDateTemplateActions 工厂函数生成所有 action
 * - 提供 TaskEither 和 Promise 两种 API
 * - 支持兼容旧 API 的参数格式
 *
 * @requirements 1.1
 */

import { mermaidConfig } from "./configs/mermaid.config";
import { createDateTemplateActions } from "./create-date-template.action";

// ==============================
// Types
// ==============================

/**
 * Mermaid 创建参数
 */
export interface CreateMermaidParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

/**
 * Mermaid 创建结果
 */
export interface MermaidCreationResult {
	/** 创建的节点 */
	readonly node: import("@/types/node").NodeInterface;
	/** 生成的内容（Mermaid 代码） */
	readonly content: string;
	/** 解析后的内容 */
	readonly parsedContent: unknown;
}

// ==============================
// Actions
// ==============================

/** Mermaid actions 对象 */
export const mermaidActions = createDateTemplateActions(mermaidConfig);

/** TaskEither 版本 */
export const createMermaid = mermaidActions.create;

/** Promise 版本 */
export const createMermaidAsync = mermaidActions.createAsync;

/** 兼容旧 API 的 TaskEither 版本 */
export const createMermaidCompat = mermaidActions.createCompat;

/** 兼容旧 API 的 Promise 版本 */
export const createMermaidCompatAsync = mermaidActions.createCompatAsync;
