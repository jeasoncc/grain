/**
 * @grain/editor-tiptap
 * 
 * Tiptap-based editor package for the Grain monorepo.
 * 
 * This package provides:
 * - Document editor (rich text editing with Tiptap)
 * - Code editor (syntax highlighting with lowlight)
 * - Diagram editor (Mermaid/PlantUML with preview)
 * - Adapters implementing @grain/editor-core interfaces
 * 
 * @module @grain/editor-tiptap
 */

// ============================================================================
// Document Editor (Rich Text)
// ============================================================================
export {
  TiptapDocumentEditor,
  TiptapDocumentEditorDefault,
  TiptapDocumentAdapter,
  createTiptapDocumentAdapter,
} from "./document";

export type {
  TiptapDocumentEditorProps,
  TiptapDocumentEditorHandle,
  TiptapDocumentAdapterConfig,
} from "./document";

// ============================================================================
// Code Editor
// ============================================================================
export {
  TiptapCodeEditor,
  TiptapCodeEditorDefault,
  TiptapCodeAdapter,
  createTiptapCodeAdapter,
} from "./code";

export type {
  TiptapCodeEditorProps,
  TiptapCodeEditorHandle,
  TiptapCodeAdapterConfig,
} from "./code";

// ============================================================================
// Diagram Editor
// ============================================================================
export {
  TiptapDiagramEditor,
  TiptapDiagramEditorDefault,
  TiptapDiagramAdapter,
  createTiptapDiagramAdapter,
} from "./diagram";

export type {
  TiptapDiagramEditorProps,
  TiptapDiagramEditorHandle,
  TiptapDiagramAdapterConfig,
} from "./diagram";
