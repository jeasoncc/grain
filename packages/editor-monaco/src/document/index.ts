/**
 * Monaco Document Editor
 * Markdown editing with live preview using Monaco Editor
 * @module @grain/editor-monaco/document
 */

// Main component
export { MonacoDocumentEditor, default as MonacoDocumentEditorDefault } from "./monaco-document-editor";
export type {
  MonacoDocumentEditorProps,
  MonacoDocumentEditorHandle,
  PreviewPosition,
} from "./monaco-document-editor.types";

// Adapter
export { MonacoDocumentAdapter, createMonacoDocumentAdapter } from "./monaco-document-adapter";
export type { MonacoDocumentAdapterConfig } from "./monaco-document-adapter";
