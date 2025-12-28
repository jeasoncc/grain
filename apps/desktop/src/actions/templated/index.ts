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
	// 类型
	type CreateDateTemplateParams,
	// 工厂函数
	createDateTemplateActions,
	// Diary
	createDiary,
	createDiaryAsync,
	createDiaryCompat,
	createDiaryCompatAsync,
	// Ledger
	createLedger,
	createLedgerAsync,
	createLedgerCompat,
	createLedgerCompatAsync,
	// Note
	createNote,
	createNoteAsync,
	createNoteCompat,
	createNoteCompatAsync,
	// Todo
	createTodo,
	createTodoAsync,
	createTodoCompat,
	createTodoCompatAsync,
	// Wiki
	createWiki,
	createWikiAsync,
	createWikiCompat,
	createWikiCompatAsync,
	type DateTemplateCreationResult,
	// Actions 对象
	diaryActions,
	ledgerActions,
	noteActions,
	todoActions,
	wikiActions,
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
// Mermaid 创建
// ==============================

export {
	type CreateMermaidParams,
	createMermaid,
	createMermaidAsync,
	createMermaidCompat,
	createMermaidCompatAsync,
	mermaidActions,
	type MermaidCreationResult,
} from "./create-mermaid.action";

// ==============================
// PlantUML 创建
// ==============================

export {
	type CreatePlantUMLParams,
	createPlantUML,
	createPlantUMLAsync,
	createPlantUMLCompat,
	createPlantUMLCompatAsync,
	plantumlActions,
	type PlantUMLCreationResult,
} from "./create-plantuml.action";

// ==============================
// 模板配置
// ==============================

export {
	createDateTemplateConfig,
	type DateTemplateOptions,
	// 工厂函数
	type DateTemplateParams,
	// Diary config
	type DiaryTemplateParams,
	dateParamsSchema,
	diaryConfig,
	diaryParamsSchema,
	// Excalidraw config
	type ExcalidrawTemplateParams,
	excalidrawConfig,
	excalidrawParamsSchema,
	// Registry
	getTemplateConfig,
	isValidTemplateType,
	// Ledger config
	type LedgerTemplateParams,
	ledgerConfig,
	ledgerParamsSchema,
	// Note config
	type NoteTemplateParams,
	noteConfig,
	noteParamsSchema,
	type TemplateType,
	// Todo config
	type TodoTemplateParams,
	templateConfigs,
	todoConfig,
	todoParamsSchema,
	// Wiki config
	type WikiTemplateParams,
	wikiConfig,
	wikiParamsSchema,
} from "./configs";
