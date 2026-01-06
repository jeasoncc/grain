/**
 * @file index.ts
 * @description Actions 业务操作层
 *
 * @deprecated 请使用 @/flows 代替
 * 此文件保留用于向后兼容
 *
 * 这个目录包含所有业务操作函数，独立于路由层。
 * 每个子目录对应一个业务领域。
 *
 * 目录结构：
 * - export/     - 导出相关操作
 * - import/     - 导入相关操作
 * - node/       - 节点相关操作
 * - settings/   - 设置相关操作
 * - templated/  - 模板化文件创建（日记、Wiki、记账、Excalidraw）
 * - wiki/       - Wiki 迁移操作
 * - workspace/  - 工作区相关操作
 *
 * @requirements 业务操作层统一导出
 */

// ==============================
// File Actions (文件操作队列)
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
// Export Actions
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
// Import Actions
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
// Node Actions
// ==============================

export * from "./node";

// ==============================
// Settings Actions
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
// Templated Actions (日记、Wiki、记账、Excalidraw)
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
// Wiki Actions (迁移)
// ==============================

export {
	checkMigrationNeeded,
	type MigrationResult,
	migrateWikiEntriesToFiles,
	runMigrationIfNeeded,
} from "./wiki";

// ==============================
// Workspace Actions
// ==============================

export {
	type CreateWorkspaceParams,
	createWorkspace,
	deleteWorkspace,
	type UpdateWorkspaceParams,
	updateWorkspace,
} from "./workspace";
