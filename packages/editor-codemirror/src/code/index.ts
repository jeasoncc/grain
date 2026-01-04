/**
 * @grain/editor-codemirror/code
 * 
 * CodeMirror-based code editor with syntax highlighting.
 * 
 * @module @grain/editor-codemirror/code
 */

export {
  CodeMirrorCodeEditor,
  CodeMirrorCodeEditorDefault,
} from "./codemirror-code-editor";

export {
  CodeMirrorCodeAdapter,
  createCodeMirrorCodeAdapter,
} from "./codemirror-code-adapter";

export type {
  CodeMirrorCodeEditorProps,
  CodeMirrorCodeEditorHandle,
  CodeMirrorCodeAdapterConfig,
} from "./codemirror-code-editor.types";
