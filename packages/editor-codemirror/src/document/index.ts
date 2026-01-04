/**
 * @grain/editor-codemirror/document
 * 
 * CodeMirror-based document editor for Markdown editing with preview.
 * 
 * @module @grain/editor-codemirror/document
 */

export {
  CodeMirrorDocumentEditor,
  CodeMirrorDocumentEditorDefault,
} from "./codemirror-document-editor";

export {
  CodeMirrorDocumentAdapter,
  createCodeMirrorDocumentAdapter,
} from "./codemirror-document-adapter";

export type {
  CodeMirrorDocumentEditorProps,
  CodeMirrorDocumentEditorHandle,
  CodeMirrorDocumentAdapterConfig,
} from "./codemirror-document-editor.types";
