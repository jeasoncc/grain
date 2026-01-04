/**
 * Lexical Document Editor
 * Rich text editing with Lexical
 * @module @grain/editor-lexical/document
 */

// Main components
export { default as LexicalDocumentEditor } from "./lexical-document-editor";
export type {
  LexicalDocumentEditorProps,
  LexicalDocumentEditorHandle,
} from "./lexical-document-editor";

// Adapter
export {
  LexicalDocumentAdapter,
  createLexicalDocumentAdapter,
} from "./lexical-document-adapter";
export type { LexicalDocumentAdapterConfig } from "./lexical-document-adapter";

// Re-export legacy components for backward compatibility
export { default as Editor } from "../components/Editor";
export type { EditorProps } from "../components/Editor";

export { EditorInstance, default as EditorInstanceDefault } from "../components/EditorInstance";
export type { EditorInstanceProps } from "../components/EditorInstance";

export { MultiEditorContainer, default as MultiEditorContainerDefault } from "../components/MultiEditorContainer";
export type { MultiEditorContainerProps } from "../components/MultiEditorContainer";
