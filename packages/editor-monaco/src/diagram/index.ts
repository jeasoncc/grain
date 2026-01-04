/**
 * Monaco Diagram Editor
 * Diagram editing with Monaco and preview
 * @module @grain/editor-monaco/diagram
 */

// Main component
export { MonacoDiagramEditor, default as MonacoDiagramEditorDefault } from "./monaco-diagram-editor";
export type {
  MonacoDiagramEditorProps,
  MonacoDiagramEditorHandle,
  DiagramType,
  DiagramError,
  DiagramErrorType,
  DiagramPreviewProps,
} from "./monaco-diagram-editor.types";

// Preview component
export {
  DiagramPreview,
  DiagramLoadingState,
  DiagramErrorDisplay,
  DiagramEmptyState,
  DiagramSvgContent,
} from "./diagram-preview";

// Adapter
export { MonacoDiagramAdapter, createMonacoDiagramAdapter } from "./monaco-diagram-adapter";
export type { MonacoDiagramAdapterConfig } from "./monaco-diagram-adapter";

// Legacy exports for backward compatibility
export { MonacoDiagramEditor as DiagramEditorView } from "./monaco-diagram-editor";
export { DiagramPreview as DiagramPreviewView } from "./diagram-preview";
export type { MonacoDiagramEditorProps as DiagramEditorViewProps } from "./monaco-diagram-editor.types";
export type { DiagramPreviewProps as DiagramPreviewViewProps } from "./monaco-diagram-editor.types";
