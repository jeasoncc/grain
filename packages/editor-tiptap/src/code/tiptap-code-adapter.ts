/**
 * TiptapCodeAdapter - Implements CodeEditorAdapter for Tiptap
 * @module @grain/editor-tiptap/code
 */

import type { CodeEditorAdapter, SupportedLanguage } from "@grain/editor-core";
import type { TiptapCodeAdapterConfig } from "./tiptap-code-editor.types";

/**
 * Creates a CodeEditorAdapter implementation for Tiptap
 * 
 * Note: Tiptap is primarily a rich text editor, so code editing
 * capabilities are limited compared to Monaco or CodeMirror.
 * This adapter wraps content in a code block.
 */
export const createTiptapCodeAdapter = (
  config: TiptapCodeAdapterConfig
): CodeEditorAdapter => {
  const { editor } = config;
  let currentLanguage: SupportedLanguage = config.language ?? "plaintext";

  // Store callbacks for cleanup
  const changeCallbacks = new Set<(content: string) => void>();
  const focusCallbacks = new Set<() => void>();
  const blurCallbacks = new Set<() => void>();
  const saveCallbacks = new Set<() => void>();

  // Register change listener
  const handleUpdate = () => {
    const content = editor.getText();
    for (const callback of changeCallbacks) {
      callback(content);
    }
  };
  editor.on("update", handleUpdate);

  // Register focus listener
  const handleFocus = () => {
    for (const callback of focusCallbacks) {
      callback();
    }
  };
  editor.on("focus", handleFocus);

  // Register blur listener
  const handleBlur = () => {
    for (const callback of blurCallbacks) {
      callback();
    }
  };
  editor.on("blur", handleBlur);

  return {
    // ============================================
    // Content Operations
    // ============================================

    getContent(): string {
      return editor.getText();
    },

    setContent(content: string): void {
      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "codeBlock",
            attrs: { language: currentLanguage },
            content: [{ type: "text", text: content }],
          },
        ],
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
      // Update the code block language attribute
      editor.commands.updateAttributes("codeBlock", { language });
    },

    // ============================================
    // Code Operations
    // ============================================

    async formatCode(): Promise<void> {
      // Tiptap doesn't have built-in code formatting
      // This would require integration with a formatter like Prettier
      console.warn("[TiptapCodeAdapter] formatCode not implemented");
    },

    insertSnippet(snippet: string): void {
      editor.commands.insertContent(snippet);
    },

    getSelectedText(): string {
      const { from, to } = editor.state.selection;
      return editor.state.doc.textBetween(from, to);
    },

    replaceSelection(text: string): void {
      editor.commands.insertContent(text);
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
      editor.commands.focus();
    },

    blur(): void {
      editor.commands.blur();
    },

    destroy(): void {
      editor.off("update", handleUpdate);
      editor.off("focus", handleFocus);
      editor.off("blur", handleBlur);
      changeCallbacks.clear();
      focusCallbacks.clear();
      blurCallbacks.clear();
      saveCallbacks.clear();
    },
  };
};

/**
 * TiptapCodeAdapter class for object-oriented usage
 */
export class TiptapCodeAdapter implements CodeEditorAdapter {
  private adapter: CodeEditorAdapter;

  constructor(config: TiptapCodeAdapterConfig) {
    this.adapter = createTiptapCodeAdapter(config);
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
