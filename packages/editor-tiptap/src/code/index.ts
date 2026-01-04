/**
 * @grain/editor-tiptap/code
 * 
 * Tiptap-based code editor with syntax highlighting.
 * 
 * @module @grain/editor-tiptap/code
 */

export {
  TiptapCodeEditor,
  TiptapCodeEditorDefault,
} from "./tiptap-code-editor";

export {
  TiptapCodeAdapter,
  createTiptapCodeAdapter,
} from "./tiptap-code-adapter";

export type {
  TiptapCodeEditorProps,
  TiptapCodeEditorHandle,
  TiptapCodeAdapterConfig,
} from "./tiptap-code-editor.types";
