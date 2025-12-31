/**
 * @file index.ts
 * @description ExcalidrawEditor 包导出
 *
 * @grain/excalidraw-editor - 基于 Excalidraw 的绘图编辑器
 */

export { ExcalidrawEditorView } from "./excalidraw-editor.view.fn";
export {
	EXCALIDRAW_PERFORMANCE_CONFIG,
	EXCALIDRAW_UI_OPTIONS,
	EXCALIDRAW_RENDER_CONFIG,
} from "./excalidraw-editor.config";
export type {
	ExcalidrawEditorViewProps,
	ExcalidrawData,
	ContainerSize,
	PerformanceConfig,
	PerformanceMetrics,
	ExcalidrawPerformanceConfig,
	ExcalidrawPerformanceConfigKey,
	ExcalidrawUIOptions,
	ExcalidrawRenderConfig,
} from "./excalidraw-editor.types";
export type {
	ExcalidrawPerformanceConfig as PerformanceConfigType,
} from "./excalidraw-editor.config";
