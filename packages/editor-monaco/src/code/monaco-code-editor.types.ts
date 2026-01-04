/**
 * Monaco Code Editor Types
 * @module @grain/editor-monaco/code
 */

import type { editor } from "monaco-editor";

/**
 * Monaco editor supported languages
 */
export type MonacoLanguage =
  | "javascript"
  | "typescript"
  | "json"
  | "html"
  | "css"
  | "markdown"
  | "python"
  | "java"
  | "c"
  | "cpp"
  | "csharp"
  | "go"
  | "rust"
  | "ruby"
  | "php"
  | "swift"
  | "kotlin"
  | "sql"
  | "yaml"
  | "xml"
  | "shell"
  | "plaintext";

/**
 * Editor theme colors configuration
 * Used to customize Monaco editor colors to match the app theme
 */
export interface EditorThemeColors {
  /** Editor background color */
  readonly background?: string;
  /** Editor foreground color (text color) */
  readonly foreground?: string;
  /** Selected text background color */
  readonly selection?: string;
  /** Current line highlight background color */
  readonly lineHighlight?: string;
  /** Cursor color */
  readonly cursor?: string;
  /** Line number color */
  readonly lineNumber?: string;
  /** Active line number color */
  readonly lineNumberActive?: string;
}

/**
 * MonacoCodeEditor Props
 */
export interface MonacoCodeEditorProps {
  /** Code content */
  readonly code: string;
  /** Programming language */
  readonly language: MonacoLanguage;
  /** Base theme (light/dark) */
  readonly theme: "light" | "dark";
  /** Custom theme colors (optional) */
  readonly themeColors?: EditorThemeColors;
  /** Code change callback */
  readonly onCodeChange: (code: string) => void;
  /** Save callback (Ctrl+S) */
  readonly onSave: () => void;
  /** Read-only mode */
  readonly readOnly?: boolean;
  /** Custom class name */
  readonly className?: string;
  /** Editor options */
  readonly options?: editor.IStandaloneEditorConstructionOptions;
}

/**
 * MonacoCodeEditor ref handle
 */
export interface MonacoCodeEditorHandle {
  /** Get current code content */
  getContent: () => string;
  /** Set code content */
  setContent: (content: string) => void;
  /** Get current language */
  getLanguage: () => MonacoLanguage;
  /** Set language */
  setLanguage: (language: MonacoLanguage) => void;
  /** Format code */
  formatCode: () => Promise<void>;
  /** Get selected text */
  getSelectedText: () => string;
  /** Replace selection */
  replaceSelection: (text: string) => void;
  /** Focus the editor */
  focus: () => void;
  /** Blur the editor */
  blur: () => void;
}
