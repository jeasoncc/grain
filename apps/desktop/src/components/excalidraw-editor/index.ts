/**
 * ExcalidrawEditor 组件统一导出
 *
 * @requirements 5.2
 */

export {
	ExcalidrawEditorContainer,
	ExcalidrawEditorContainer as ExcalidrawEditor,
} from "./excalidraw-editor.container.fn";
export {
	EXCALIDRAW_PERFORMANCE_CONFIG,
	type ExcalidrawPerformanceConfig,
	type ExcalidrawPerformanceConfigKey,
} from "./excalidraw-editor.config";
export type {
	ContainerSize,
	ExcalidrawData,
	ExcalidrawEditorContainerProps,
	ExcalidrawEditorViewProps,
	PerformanceConfig,
	PerformanceMetrics,
} from "./excalidraw-editor.types";
export { ExcalidrawEditorView } from "./excalidraw-editor.view.fn";
