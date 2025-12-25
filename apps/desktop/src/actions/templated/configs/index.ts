/**
 * @file index.ts
 * @description 模板配置统一导出
 *
 * 功能说明：
 * - 统一导出所有模板配置
 * - 提供类型安全的配置访问
 * - 支持配置的集中管理
 *
 * @requirements 模板配置管理
 */

// ==============================
// Diary Configuration
// ==============================

export {
	diaryConfig,
	diaryParamsSchema,
	type DiaryTemplateParams,
} from "./diary.config";

// ==============================
// Wiki Configuration
// ==============================

export {
	wikiConfig,
	wikiParamsSchema,
	type WikiTemplateParams,
} from "./wiki.config";

// ==============================
// Ledger Configuration
// ==============================

export {
	ledgerConfig,
	ledgerParamsSchema,
	type LedgerTemplateParams,
} from "./ledger.config";

// ==============================
// Configuration Registry
// ==============================

/**
 * 所有可用的模板配置
 */
export const templateConfigs = {
	diary: () => import("./diary.config").then(m => m.diaryConfig),
	wiki: () => import("./wiki.config").then(m => m.wikiConfig),
	ledger: () => import("./ledger.config").then(m => m.ledgerConfig),
} as const;

/**
 * 模板类型
 */
export type TemplateType = keyof typeof templateConfigs;

/**
 * 获取模板配置
 * 
 * @param type - 模板类型
 * @returns 模板配置
 */
export async function getTemplateConfig(type: TemplateType) {
	const configLoader = templateConfigs[type];
	return await configLoader();
}

/**
 * 检查是否为有效的模板类型
 * 
 * @param type - 要检查的类型
 * @returns 是否为有效的模板类型
 */
export function isValidTemplateType(type: string): type is TemplateType {
	return type in templateConfigs;
}