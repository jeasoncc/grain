/**
 * @file fn/save/index.ts
 * @description Save 纯函数模块导出
 *
 * 包含：
 * - 标签提取纯函数 (save.debounce.fn.ts)
 * - 文档保存纯函数 (save.document.fn.ts)
 * - 统一保存服务 (unified-save.service.ts) - 所有编辑器共用
 */

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

// 统一保存服务（所有编辑器共用）
export {
	createUnifiedSaveService,
	type UnifiedSaveConfig,
	type UnifiedSaveServiceInterface,
} from "./unified-save.service";
