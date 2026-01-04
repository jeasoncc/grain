/**
 * @grain/editor-monaco
 * 
 * Monaco-based editor package for the Grain monorepo.
 * 
 * This package provides:
 * - Document editor (Markdown with live preview)
 * - Code editor (syntax highlighting, formatting)
 * - Diagram editor (Mermaid/PlantUML with preview)
 * - Adapters implementing @grain/editor-core interfaces
 * 
 * @module @grain/editor-monaco
 */

// ============================================================================
// Document Editor (Markdown with Preview)
// ============================================================================
export {
  MonacoDocumentEditor,
  MonacoDocumentEditorDefault,
  MonacoDocumentAdapter,
  createMonacoDocumentAdapter,
} from "./document";

export type {
  MonacoDocumentEditorProps,
  MonacoDocumentEditorHandle,
  MonacoDocumentAdapterConfig,
  PreviewPosition,
} from "./document";

// ============================================================================
// Code Editor
// ============================================================================
export {
  MonacoCodeEditor,
  MonacoCodeEditorDefault,
  MonacoCodeAdapter,
  createMonacoCodeAdapter,
  // Legacy export
  CodeEditorView,
} from "./code";

export type {
  MonacoCodeEditorProps,
  MonacoCodeEditorHandle,
  MonacoCodeAdapterConfig,
  MonacoLanguage,
  EditorThemeColors,
  // Legacy export
  CodeEditorViewProps,
} from "./code";

// ============================================================================
// Diagram Editor
// ============================================================================
export {
  MonacoDiagramEditor,
  MonacoDiagramEditorDefault,
  MonacoDiagramAdapter,
  createMonacoDiagramAdapter,
  DiagramPreview,
  DiagramLoadingState,
  DiagramErrorDisplay,
  DiagramEmptyState,
  DiagramSvgContent,
  // Legacy exports
  DiagramEditorView,
  DiagramPreviewView,
} from "./diagram";

export type {
  MonacoDiagramEditorProps,
  MonacoDiagramEditorHandle,
  MonacoDiagramAdapterConfig,
  DiagramType,
  DiagramError,
  DiagramErrorType,
  DiagramPreviewProps,
  // Legacy exports
  DiagramEditorViewProps,
  DiagramPreviewViewProps,
} from "./diagram";
