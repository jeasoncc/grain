/**
 * @file index.ts
 * @description 模板化文件创建相关的业务操作
 *
 * 功能说明：
 * - 导出高阶函数 createTemplatedFile
 * - 导出所有模板化创建函数（日记、Wiki、Todo、Note、记账、Excalidraw）
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
// 日期模板统一创建（Diary/Wiki/Todo/Note/Ledger）
// ==============================

export {
	// 工厂函数
	createDateTemplateActions,
	// 类型
	type CreateDateTemplateParams,
	type DateTemplateCreationResult,
	// Actions 对象
	diaryActions,
	wikiActions,
	todoActions,
	noteActions,
	ledgerActions,
	// Diary
	createDiary,
	createDiaryAsync,
	createDiaryCompat,
	createDiaryCompatAsync,
	// Wiki
	createWiki,
	createWikiAsync,
	createWikiCompat,
	createWikiCompatAsync,
	// Todo
	createTodo,
	createTodoAsync,
	createTodoCompat,
	createTodoCompatAsync,
	// Note
	createNote,
	createNoteAsync,
	createNoteCompat,
	createNoteCompatAsync,
	// Ledger
	createLedger,
	createLedgerAsync,
	createLedgerCompat,
	createLedgerCompatAsync,
} from "./create-date-template.action";

// ==============================
// Excalidraw 创建（有额外参数，单独处理）
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
	// 工厂函数
	type DateTemplateParams,
	type DateTemplateOptions,
	createDateTemplateConfig,
	dateParamsSchema,
	// Diary config
	type DiaryTemplateParams,
	diaryConfig,
	diaryParamsSchema,
	// Wiki config
	type WikiTemplateParams,
	wikiConfig,
	wikiParamsSchema,
	// Todo config
	type TodoTemplateParams,
	todoConfig,
	todoParamsSchema,
	// Note config
	type NoteTemplateParams,
	noteConfig,
	noteParamsSchema,
	// Ledger config
	type LedgerTemplateParams,
	ledgerConfig,
	ledgerParamsSchema,
	// Excalidraw config
	type ExcalidrawTemplateParams,
	excalidrawConfig,
	excalidrawParamsSchema,
	// Registry
	getTemplateConfig,
	isValidTemplateType,
	type TemplateType,
	templateConfigs,
} from "./configs";
