/**
 * @file fn/save/index.ts
 * @description Save 纯函数模块导出
 *
 * 包含：
 * - 标签提取纯函数 (save.debounce.fn.ts)
 * - 文档保存纯函数 (save.document.fn.ts)
 * - 保存服务 (save.service.fn.ts)
 * - 统一编辑器保存服务 (editor-save.service.ts)
 * - 统一保存服务 (unified-save.service.ts) - 推荐使用
 */

// 旧版统一编辑器保存服务（Monaco、Excalidraw 等）- 已废弃，请使用 unified-save.service
export {
	createEditorSaveService,
	type EditorSaveConfig,
	type EditorSaveServiceInterface,
} from "./editor-save.service";
// 标签提取纯函数
export {
	extractTagsFromContent,
	parseTagString,
} from "./save.debounce.fn";
// 文档保存纯函数
export {
	createErrorResult,
	createNoChangeResult,
	createSuccessResult,
	hasContentChanged,
	type SaveDocumentParams,
	type SaveResult,
	saveDocument,
	saveDocumentAsync,
	serializeContent,
} from "./save.document.fn";
// 旧版保存服务（Lexical 专用）- 已废弃，请使用 unified-save.service
export {
	createSaveService,
	type SaveServiceInterface,
	saveService,
} from "./save.service.fn";
// 统一保存服务（推荐：所有编辑器共用）
export {
	createUnifiedSaveService,
	type UnifiedSaveConfig,
	type UnifiedSaveServiceInterface,
} from "./unified-save.service";
