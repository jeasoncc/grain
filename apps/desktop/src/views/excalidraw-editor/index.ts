/**
 * ExcalidrawEditor 组件统一导出
 *
 * @requirements 5.2
 */

export {
	EXCALIDRAW_PERFORMANCE_CONFIG,
	EXCALIDRAW_RENDER_CONFIG,
	EXCALIDRAW_UI_OPTIONS,
	type ExcalidrawPerformanceConfig,
	type ExcalidrawPerformanceConfigKey,
	type ExcalidrawRenderConfig,
	type ExcalidrawUIOptions,
} from "./excalidraw-editor.config"
export {
	ExcalidrawEditorContainer,
	ExcalidrawEditorContainer as ExcalidrawEditor,
} from "./excalidraw-editor.container.fn"
export type {
	ContainerSize,
	ExcalidrawData,
	ExcalidrawEditorContainerProps,
	ExcalidrawEditorViewProps,
	PerformanceConfig,
	PerformanceMetrics,
} from "./excalidraw-editor.types"
export {
	checkAndLogHardwareAcceleration,
	clearHardwareAccelerationCache,
	detectHardwareAcceleration,
	getHardwareAccelerationStatus,
	type HardwareAccelerationStatus,
	logHardwareAccelerationStatus,
} from "./excalidraw-editor.utils"
export { ExcalidrawEditorView } from "./excalidraw-editor.view.fn"
