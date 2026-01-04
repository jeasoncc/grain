/**
 * @grain/editor-codemirror
 * 
 * CodeMirror-based editor package for the Grain monorepo.
 * 
 * This package provides:
 * - Document editor (Markdown with live preview)
 * - Code editor (syntax highlighting for multiple languages)
 * - Diagram editor (Mermaid/PlantUML with preview)
 * - Adapters implementing @grain/editor-core interfaces
 * 
 * @module @grain/editor-codemirror
 */

// ============================================================================
// Document Editor (Markdown with Preview)
// ============================================================================
export {
  CodeMirrorDocumentEditor,
  CodeMirrorDocumentEditorDefault,
  CodeMirrorDocumentAdapter,
  createCodeMirrorDocumentAdapter,
} from "./document";

export type {
  CodeMirrorDocumentEditorProps,
  CodeMirrorDocumentEditorHandle,
  CodeMirrorDocumentAdapterConfig,
} from "./document";

// ============================================================================
// Code Editor
// ============================================================================
export {
  CodeMirrorCodeEditor,
  CodeMirrorCodeEditorDefault,
  CodeMirrorCodeAdapter,
  createCodeMirrorCodeAdapter,
} from "./code";

export type {
  CodeMirrorCodeEditorProps,
  CodeMirrorCodeEditorHandle,
  CodeMirrorCodeAdapterConfig,
} from "./code";

// ============================================================================
// Diagram Editor
// ============================================================================
export {
  CodeMirrorDiagramEditor,
  CodeMirrorDiagramEditorDefault,
  CodeMirrorDiagramAdapter,
  createCodeMirrorDiagramAdapter,
} from "./diagram";

export type {
  CodeMirrorDiagramEditorProps,
  CodeMirrorDiagramEditorHandle,
  CodeMirrorDiagramAdapterConfig,
} from "./diagram";
