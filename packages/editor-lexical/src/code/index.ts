/**
 * Lexical Code Editor
 * Code editing with syntax highlighting using Lexical
 * @module @grain/editor-lexical/code
 */

// Main component
export { default as LexicalCodeEditor } from "./lexical-code-editor";
export type {
  LexicalCodeEditorProps,
  LexicalCodeEditorHandle,
} from "./lexical-code-editor";

// Adapter
export {
  LexicalCodeAdapter,
  createLexicalCodeAdapter,
} from "./lexical-code-adapter";
export type { LexicalCodeAdapterConfig } from "./lexical-code-adapter";
