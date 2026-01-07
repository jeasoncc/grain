/**
 * Flows - 管道系统层
 *
 * 职责：组合 pipes + io 形成业务流程
 * 依赖：pipes/, io/, state/, types/
 */

// ==============================
// File Flows (文件操作队列)
// ==============================

export {
	type CreateFileParams,
	type CreateFileResult,
	createFile,
	createFileAsync,
	type OpenFileParams,
	type OpenFileResult,
	openFile,
	openFileAsync,
} from "./file";

// ==============================
// Export Flows
// ==============================

export {
	type ExportJsonParams,
	type ExportMarkdownParams,
	type ExportOrgmodeParams,
	type ExportResult,
	exportAll,
	exportAllAsync,
	exportAllAsZip,
	exportAllAsZipAsync,
	exportAsMarkdown,
	exportAsMarkdownAsync,
	exportContentToJson,
	exportContentToMarkdown,
	exportContentToOrgmode,
	exportNodeToJson,
	exportNodeToMarkdown,
	exportNodeToOrgmode,
	exportProject,
	exportToEpub,
	exportToPdf,
	exportToTxt,
	exportToWord,
} from "./export";

// ==============================
// Import Flows
// ==============================

export {
	type ImportMarkdownParams,
	type ImportResult,
	importFromJson,
	importFromJsonAsync,
	importMarkdown,
	importMarkdownToJson,
} from "./import";

// ==============================
// Node Flows
// ==============================

export * from "./node";

// ==============================
// Settings Flows
// ==============================

export {
	getFontSettings,
	resetFontSettings,
	toggleThemeMode,
	type UpdateEditorFontParams,
	type UpdateThemeModeParams,
	type UpdateThemeParams,
	type UpdateTransitionParams,
	type UpdateTypographyParams,
	type UpdateUiFontParams,
	updateEditorFont,
	updateTheme,
	updateThemeMode,
	updateThemeTransition,
	updateTypography,
	updateUiFont,
} from "./settings";

// ==============================
// Templated Flows (日记、Wiki、记账、Excalidraw)
// ==============================

export {
	// Excalidraw
	adaptExcalidrawParams,
	type CreateDateTemplateParams,
	type CreateExcalidrawParams,
	createDiary,
	createDiaryAsync,
	createDiaryCompat,
	createDiaryCompatAsync,
	// Excalidraw
	createExcalidraw,
	createExcalidrawAsync,
	createExcalidrawCompat,
	createExcalidrawCompatAsync,
	createLedger,
	createLedgerAsync,
	createLedgerCompat,
	createLedgerCompatAsync,
	// Note
	createNote,
	createNoteAsync,
	createNoteCompat,
	createNoteCompatAsync,
	// 高阶函数
	createTemplatedFile,
	createTemplatedFileAsync,
	// Todo
	createTodo,
	createTodoAsync,
	createTodoCompat,
	createTodoCompatAsync,
	// Wiki
	createWiki,
	createWikiAsync,
	type DateTemplateCreationResult,
	type DiaryTemplateParams,
	diaryConfig,
	diaryParamsSchema,
	// Excalidraw config
	type ExcalidrawCreationResult,
	type ExcalidrawTemplateParams,
	excalidrawConfig,
	excalidrawParamsSchema,
	// 配置注册表
	getTemplateConfig,
	isValidTemplateType,
	type LedgerTemplateParams,
	ledgerConfig,
	ledgerParamsSchema,
	type NoteTemplateParams,
	noteConfig,
	noteParamsSchema,
	type TemplateConfig,
	type TemplatedFileParams,
	type TemplatedFileResult,
	type TemplateType,
	type TodoTemplateParams,
	templateConfigs,
	todoConfig,
	todoParamsSchema,
	type WikiTemplateParams,
	wikiConfig,
	wikiParamsSchema,
} from "./templated";

// ==============================
// Wiki Flows (迁移)
// ==============================

export {
	checkMigrationNeeded,
	type MigrationResult,
	migrateWikiEntriesToFiles,
	runMigrationIfNeeded,
} from "./wiki";

// ==============================
// Workspace Flows
// ==============================

export {
	type CreateWorkspaceParams,
	createWorkspace,
	deleteWorkspace,
	type UpdateWorkspaceParams,
	updateWorkspace,
	touchWorkspace,
} from "./workspace";

// ==============================
// Save Flows (保存相关)
// ==============================

export * as saveFlow from "./save";

// ==============================
// Updater Flows (更新检查)
// ==============================

export * as updaterFlow from "./updater";

// ==============================
// Migration Flows (数据迁移)
// ==============================

export * as migrationFlow from "./migration";

// ==============================
// Search Flows (搜索引擎)
// ==============================

export {
	SearchEngine,
	type SearchOptions,
	type SearchResult,
	type SearchResultType,
	searchEngine,
} from "./search";
