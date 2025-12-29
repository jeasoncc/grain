/**
 * @file diagram-editor/index.ts
 * @description DiagramEditor 组件统一导出
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

// Container 组件
// 默认导出容器组件（便于使用）
export {
	DiagramEditorContainer,
	DiagramEditorContainer as DiagramEditor,
} from "./diagram-editor.container.fn";
// 类型导出
export type {
	DiagramEditorContainerProps,
	DiagramEditorViewProps,
	DiagramError,
	DiagramErrorType,
	DiagramType,
} from "./diagram-editor.types";
// View 组件
export { DiagramEditorView } from "./diagram-editor.view.fn";
export type { DiagramPreviewViewProps } from "./diagram-preview.view.fn";
// Preview 组件
export {
	DiagramEmptyState,
	DiagramErrorDisplay,
	DiagramLoadingState,
	DiagramPreviewView,
	DiagramSvgContent,
} from "./diagram-preview.view.fn";
