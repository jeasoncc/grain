/**
 * CodeMirrorCodeEditor types
 * @module @grain/editor-codemirror/code
 */

import type { EditorView } from "@codemirror/view";
import type { SupportedLanguage } from "@grain/editor-core";

/**
 * Props for CodeMirrorCodeEditor component
 */
export interface CodeMirrorCodeEditorProps {
  /** Initial code content */
  readonly initialContent?: string;
  /** Programming language for syntax highlighting */
  readonly language?: SupportedLanguage;
  /** Placeholder text when editor is empty */
  readonly placeholder?: string;
  /** Whether the editor is read-only */
  readonly readOnly?: boolean;
  /** Whether to auto-focus on mount */
  readonly autoFocus?: boolean;
  /** Callback when content changes */
  readonly onChange?: (content: string) => void;
  /** Callback when editor gains focus */
  readonly onFocus?: () => void;
  /** Callback when editor loses focus */
  readonly onBlur?: () => void;
  /** Callback when save is triggered (Ctrl+S) */
  readonly onSave?: () => void;
  /** Additional CSS class name */
  readonly className?: string;
}

/**
 * Ref handle for CodeMirrorCodeEditor
 */
export interface CodeMirrorCodeEditorHandle {
  /** Get the CodeMirror editor view */
  getView(): EditorView | null;
  /** Get current content */
  getContent(): string;
  /** Set content */
  setContent(content: string): void;
  /** Focus the editor */
  focus(): void;
  /** Get current language */
  getLanguage(): SupportedLanguage;
  /** Set language */
  setLanguage(language: SupportedLanguage): void;
}

/**
 * Configuration for CodeMirrorCodeAdapter
 */
export interface CodeMirrorCodeAdapterConfig {
  /** The CodeMirror editor view */
  view: EditorView;
  /** Initial language */
  language?: SupportedLanguage;
}
