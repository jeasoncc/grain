/**
 * MonacoCodeAdapter - Implements CodeEditorAdapter for Monaco
 * @module @grain/editor-monaco/code
 */

import type { CodeEditorAdapter, SupportedLanguage } from "@grain/editor-core";
import type { editor } from "monaco-editor";

/**
 * Configuration for creating a MonacoCodeAdapter
 */
export interface MonacoCodeAdapterConfig {
  /** The Monaco editor instance */
  editor: editor.IStandaloneCodeEditor;
  /** Monaco module reference */
  monaco: typeof import("monaco-editor");
  /** Initial language */
  language?: SupportedLanguage;
}

/**
 * Map SupportedLanguage to Monaco language ID
 */
const languageMap: Record<SupportedLanguage, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  rust: "rust",
  go: "go",
  java: "java",
  c: "c",
  cpp: "cpp",
  csharp: "csharp",
  ruby: "ruby",
  php: "php",
  html: "html",
  css: "css",
  scss: "scss",
  json: "json",
  yaml: "yaml",
  toml: "toml",
  markdown: "markdown",
  sql: "sql",
  shell: "shell",
  xml: "xml",
  plaintext: "plaintext",
};

/**
 * Creates a CodeEditorAdapter implementation for Monaco
 */
export const createMonacoCodeAdapter = (
  config: MonacoCodeAdapterConfig
): CodeEditorAdapter => {
  const { editor, monaco } = config;
  let currentLanguage: SupportedLanguage = config.language ?? "plaintext";

  // Store callbacks for cleanup
  const changeCallbacks = new Set<(content: string) => void>();
  const focusCallbacks = new Set<() => void>();
  const blurCallbacks = new Set<() => void>();
  const saveCallbacks = new Set<() => void>();

  // Register change listener
  const changeDisposable = editor.onDidChangeModelContent(() => {
    const content = editor.getValue();
    for (const callback of changeCallbacks) {
      callback(content);
    }
  });

  // Register focus listener
  const focusDisposable = editor.onDidFocusEditorText(() => {
    for (const callback of focusCallbacks) {
      callback();
    }
  });

  // Register blur listener
  const blurDisposable = editor.onDidBlurEditorText(() => {
    for (const callback of blurCallbacks) {
      callback();
    }
  });

  // Register Ctrl+S command
  // Note: addCommand returns a string (command ID), not a disposable
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    for (const callback of saveCallbacks) {
      callback();
    }
  });

  return {
    // ============================================
    // Content Operations
    // ============================================

    getContent(): string {
      return editor.getValue();
    },

    setContent(content: string): void {
      editor.setValue(content);
    },

    // ============================================
    // Language
    // ============================================

    getLanguage(): SupportedLanguage {
      return currentLanguage;
    },

    setLanguage(language: SupportedLanguage): void {
      currentLanguage = language;
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, languageMap[language] ?? "plaintext");
      }
    },

    // ============================================
    // Code Operations
    // ============================================

    async formatCode(): Promise<void> {
      await editor.getAction("editor.action.formatDocument")?.run();
    },

    insertSnippet(snippet: string): void {
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits("", [
          {
            range: selection,
            text: snippet,
            forceMoveMarkers: true,
          },
        ]);
      }
    },

    getSelectedText(): string {
      const selection = editor.getSelection();
      if (selection) {
        return editor.getModel()?.getValueInRange(selection) ?? "";
      }
      return "";
    },

    replaceSelection(text: string): void {
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits("", [
          {
            range: selection,
            text,
            forceMoveMarkers: true,
          },
        ]);
      }
    },

    // ============================================
    // Event Handlers
    // ============================================

    onChange(callback: (content: string) => void): () => void {
      changeCallbacks.add(callback);
      return () => {
        changeCallbacks.delete(callback);
      };
    },

    onFocus(callback: () => void): () => void {
      focusCallbacks.add(callback);
      return () => {
        focusCallbacks.delete(callback);
      };
    },

    onBlur(callback: () => void): () => void {
      blurCallbacks.add(callback);
      return () => {
        blurCallbacks.delete(callback);
      };
    },

    onSave(callback: () => void): () => void {
      saveCallbacks.add(callback);
      return () => {
        saveCallbacks.delete(callback);
      };
    },

    // ============================================
    // Lifecycle
    // ============================================

    focus(): void {
      editor.focus();
    },

    blur(): void {
      (document.activeElement as HTMLElement)?.blur?.();
    },

    destroy(): void {
      changeDisposable.dispose();
      focusDisposable.dispose();
      blurDisposable.dispose();
      // saveDisposable is a string (command ID), not disposable
      changeCallbacks.clear();
      focusCallbacks.clear();
      blurCallbacks.clear();
      saveCallbacks.clear();
    },
  };
};

/**
 * MonacoCodeAdapter class for object-oriented usage
 */
export class MonacoCodeAdapter implements CodeEditorAdapter {
  private adapter: CodeEditorAdapter;

  constructor(config: MonacoCodeAdapterConfig) {
    this.adapter = createMonacoCodeAdapter(config);
  }

  getContent = () => this.adapter.getContent();
  setContent = (content: string) => this.adapter.setContent(content);
  getLanguage = () => this.adapter.getLanguage();
  setLanguage = (language: SupportedLanguage) => this.adapter.setLanguage(language);
  formatCode = () => this.adapter.formatCode();
  insertSnippet = (snippet: string) => this.adapter.insertSnippet(snippet);
  getSelectedText = () => this.adapter.getSelectedText();
  replaceSelection = (text: string) => this.adapter.replaceSelection(text);
  onChange = (callback: (content: string) => void) => this.adapter.onChange(callback);
  onFocus = (callback: () => void) => this.adapter.onFocus(callback);
  onBlur = (callback: () => void) => this.adapter.onBlur(callback);
  onSave = (callback: () => void) => this.adapter.onSave(callback);
  focus = () => this.adapter.focus();
  blur = () => this.adapter.blur();
  destroy = () => this.adapter.destroy();
}
