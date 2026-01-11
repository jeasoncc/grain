/**
 * @file create-plantuml.flow.ts
 * @description PlantUML 图表创建 Flow
 *
 * 功能说明：
 * - 使用 createDateTemplateActions 工厂函数生成所有 action
 * - 提供 TaskEither 和 Promise 两种 API
 * - 支持兼容旧 API 的参数格式
 *
 * @requirements 2.1
 */

import { plantumlConfig } from "./configs/plantuml.config";
import { createDateTemplateActions } from "./create-date-template.flow";

// ==============================
// Types
// ==============================

/**
 * PlantUML 创建参数
 */
export interface CreatePlantUMLParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 日期（可选，默认为当前时间） */
	readonly date?: Date;
}

/**
 * PlantUML 创建结果
 */
export interface PlantUMLCreationResult {
	/** 创建的节点 */
	readonly node: import("@/types/node").NodeInterface;
	/** 生成的内容（PlantUML 代码） */
	readonly content: string;
	/** 解析后的内容 */
	readonly parsedContent: unknown;
}

// ==============================
// Actions
// ==============================

/** PlantUML actions 对象 */
export const plantumlActions = createDateTemplateActions(plantumlConfig);

/** TaskEither 版本 */
export const createPlantUML = plantumlActions.create;

/** Promise 版本 */
export const createPlantUMLAsync = plantumlActions.createAsync;

/** 兼容旧 API 的 TaskEither 版本 */
export const createPlantUMLCompat = plantumlActions.createCompat;

/** 兼容旧 API 的 Promise 版本 */
export const createPlantUMLCompatAsync = plantumlActions.createCompatAsync;
