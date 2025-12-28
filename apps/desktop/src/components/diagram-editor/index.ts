/**
 * @file diagram-editor/index.ts
 * @description DiagramEditor 组件统一导出
 */

// Container 组件
// 默认导出容器组件
export {
	DiagramEditorContainer,
	DiagramEditorContainer as DiagramEditor,
} from "./diagram-editor.container.fn";
// 类型导出
export type {
	DiagramEditorContainerProps,
	DiagramEditorViewProps,
	DiagramType,
} from "./diagram-editor.types";
// View 组件
export { DiagramEditorView } from "./diagram-editor.view.fn";
