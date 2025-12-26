/**
 * @file index.ts
 * @description 模板化文件创建相关的业务操作
 *
 * 功能说明：
 * - 导出高阶函数 createTemplatedFile
 * - 导出所有模板化创建函数（日记、Wiki、记账）
 * - 导出所有模板配置
 * - 提供统一的导入入口
 *
 * @requirements 模板化文件创建功能
 */

// ==============================
// 高阶函数
// ==============================

export {
	createTemplatedFile,
	createTemplatedFileAsync,
	type TemplateConfig,
	type TemplatedFileParams,
	type TemplatedFileResult,
} from "./create-templated-file.action";

// ==============================
// 日记创建
// ==============================

export {
	adaptDiaryParams,
	type CreateDiaryParams,
	createDiary,
	createDiaryAsync,
	createDiaryCompat,
	createDiaryCompatAsync,
	type DiaryCreationResult,
} from "./create-diary.action";

// ==============================
// Wiki 创建
// ==============================

export {
	createWiki,
	createWikiAsync,
	type WikiTemplateParams,
} from "./create-wiki.action";

// ==============================
// 记账创建
// ==============================

export {
	adaptLedgerParams,
	type CreateLedgerParams,
	createLedger,
	createLedgerAsync,
	createLedgerCompat,
	createLedgerCompatAsync,
	type LedgerCreationResult,
} from "./create-ledger.action";

// ==============================
// Excalidraw 创建
// ==============================

export {
	adaptExcalidrawParams,
	type CreateExcalidrawParams,
	createExcalidraw,
	createExcalidrawAsync,
	createExcalidrawCompat,
	createExcalidrawCompatAsync,
	type ExcalidrawCreationResult,
} from "./create-excalidraw.action";

// ==============================
// 模板配置
// ==============================

export {
	type DiaryTemplateParams,
	// Diary config
	diaryConfig,
	diaryParamsSchema,
	// Excalidraw config
	type ExcalidrawTemplateParams,
	excalidrawConfig,
	excalidrawParamsSchema,
	// Registry
	getTemplateConfig,
	isValidTemplateType,
	type LedgerTemplateParams,
	// Ledger config
	ledgerConfig,
	ledgerParamsSchema,
	type TemplateType,
	templateConfigs,
	// Wiki config
	wikiConfig,
	wikiParamsSchema,
} from "./configs";
