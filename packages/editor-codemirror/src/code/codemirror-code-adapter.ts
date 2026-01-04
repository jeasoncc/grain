/**
 * CodeMirrorCodeAdapter - Implements CodeEditorAdapter for CodeMirror
 * @module @grain/editor-codemirror/code
 */

import type { CodeEditorAdapter, SupportedLanguage } from "@grain/editor-core";
import type { CodeMirrorCodeAdapterConfig } from "./codemirror-code-editor.types";

/**
 * Creates a CodeEditorAdapter implementation for CodeMirror
 */
export const createCodeMirrorCodeAdapter = (
  config: CodeMirrorCodeAdapterConfig
): CodeEditorAdapter => {
  const { view } = config;
  let currentLanguage: SupportedLanguage = config.language ?? "plaintext";

  // Store callbacks for cleanup
  const changeCallbacks = new Set<(content: string) => void>();
  const focusCallbacks = new Set<() => void>();
  const blurCallbacks = new Set<() => void>();
  const saveCallbacks = new Set<() => void>();

  return {
    // ============================================
    // Content Operations
    // ============================================

    getContent(): string {
      return view.state.doc.toString();
    },

    setContent(content: string): void {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    },

    // ============================================
    // Language
    // ============================================

    getLanguage(): SupportedLanguage {
      return currentLanguage;
    },

    setLanguage(language: SupportedLanguage): void {
      currentLanguage = language;
      // Note: Changing language in CodeMirror requires reconfiguring extensions
      // This is a simplified implementation
      console.warn("[CodeMirrorCodeAdapter] setLanguage requires editor reconfiguration");
    },

    // ============================================
    // Code Operations
    // ============================================

    async formatCode(): Promise<void> {
      // CodeMirror doesn't have built-in formatting
      // Would need integration with Prettier or similar
      console.warn("[CodeMirrorCodeAdapter] formatCode not implemented");
    },

    insertSnippet(snippet: string): void {
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + snippet.length },
      });
    },

    getSelectedText(): string {
      const { from, to } = view.state.selection.main;
      return view.state.sliceDoc(from, to);
    },

    replaceSelection(text: string): void {
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
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
      view.focus();
    },

    blur(): void {
      view.contentDOM.blur();
    },

    destroy(): void {
      changeCallbacks.clear();
      focusCallbacks.clear();
      blurCallbacks.clear();
      saveCallbacks.clear();
    },
  };
};

/**
 * CodeMirrorCodeAdapter class for object-oriented usage
 */
export class CodeMirrorCodeAdapter implements CodeEditorAdapter {
  private adapter: CodeEditorAdapter;

  constructor(config: CodeMirrorCodeAdapterConfig) {
    this.adapter = createCodeMirrorCodeAdapter(config);
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
