/**
 * @grain/editor-tiptap/document
 * 
 * Tiptap-based document editor for rich text editing.
 * 
 * @module @grain/editor-tiptap/document
 */

export {
  TiptapDocumentEditor,
  TiptapDocumentEditorDefault,
} from "./tiptap-document-editor";

export {
  TiptapDocumentAdapter,
  createTiptapDocumentAdapter,
} from "./tiptap-document-adapter";

export type {
  TiptapDocumentEditorProps,
  TiptapDocumentEditorHandle,
  TiptapDocumentAdapterConfig,
} from "./tiptap-document-editor.types";
