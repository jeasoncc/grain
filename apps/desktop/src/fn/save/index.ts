/**
 * @file fn/save/index.ts
 * @description Save 纯函数模块导出
 *
 * 包含：
 * - 标签提取纯函数 (save.debounce.fn.ts)
 * - 文档保存纯函数 (save.document.fn.ts)
 * - 保存服务 (save.service.fn.ts)
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

// 保存服务
export {
	createSaveService,
	type SaveServiceInterface,
	saveService,
} from "./save.service.fn";
