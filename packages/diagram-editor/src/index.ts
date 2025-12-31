/**
 * @file index.ts
 * @description DiagramEditor 包导出
 *
 * @grain/diagram-editor - 图表编辑器（支持 Mermaid/PlantUML）
 */

export { DiagramEditorView } from "./diagram-editor.view.fn";
export {
	DiagramPreviewView,
	DiagramLoadingState,
	DiagramErrorDisplay,
	DiagramEmptyState,
	DiagramSvgContent,
} from "./diagram-preview.view.fn";
export type {
	DiagramEditorViewProps,
	DiagramPreviewViewProps,
	DiagramType,
	DiagramError,
	DiagramErrorType,
} from "./diagram-editor.types";
