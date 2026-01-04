/**
 * Monaco Code Editor
 * Code editing with Monaco Editor
 * @module @grain/editor-monaco/code
 */

// Main component
export { MonacoCodeEditor, default as MonacoCodeEditorDefault } from "./monaco-code-editor";
export type {
  MonacoCodeEditorProps,
  MonacoCodeEditorHandle,
  MonacoLanguage,
  EditorThemeColors,
} from "./monaco-code-editor.types";

// Adapter
export { MonacoCodeAdapter, createMonacoCodeAdapter } from "./monaco-code-adapter";
export type { MonacoCodeAdapterConfig } from "./monaco-code-adapter";

// Legacy exports for backward compatibility
export { MonacoCodeEditor as CodeEditorView } from "./monaco-code-editor";
export type { MonacoCodeEditorProps as CodeEditorViewProps } from "./monaco-code-editor.types";
