/**
 * LexicalCodeAdapter - Implements CodeEditorAdapter for Lexical
 * @module @grain/editor-lexical/code
 */

import type { CodeEditorAdapter, SupportedLanguage } from "@grain/editor-core";
import type { LexicalEditor } from "lexical";
import { $getRoot, $getSelection, $isRangeSelection, COMMAND_PRIORITY_NORMAL, KEY_ENTER_COMMAND } from "lexical";

/**
 * Configuration for creating a LexicalCodeAdapter
 */
export interface LexicalCodeAdapterConfig {
  /** The Lexical editor instance */
  editor: LexicalEditor;
  /** Initial language */
  language?: SupportedLanguage;
}

/**
 * Creates a CodeEditorAdapter implementation for Lexical
 * 
 * Note: Lexical is primarily designed for rich text editing.
 * For full-featured code editing, consider using Monaco or CodeMirror.
 * 
 * @param config - Configuration containing the Lexical editor instance
 * @returns CodeEditorAdapter implementation
 */
export const createLexicalCodeAdapter = (
  config: LexicalCodeAdapterConfig
): CodeEditorAdapter => {
  const { editor } = config;
  let currentLanguage: SupportedLanguage = config.language ?? "plaintext";

  // Store callbacks for cleanup
  const changeCallbacks = new Set<(content: string) => void>();
  const focusCallbacks = new Set<() => void>();
  const blurCallbacks = new Set<() => void>();
  const saveCallbacks = new Set<() => void>();

  // Register update listener for change events
  const removeUpdateListener = editor.registerUpdateListener(({ editorState }) => {
    if (changeCallbacks.size > 0) {
      editorState.read(() => {
        const root = $getRoot();
        const content = root.getTextContent();
        for (const callback of changeCallbacks) {
          callback(content);
        }
      });
    }
  });

  // Register keyboard listener for save (Ctrl+S)
  const removeSaveListener = editor.registerCommand(
    KEY_ENTER_COMMAND,
    (event) => {
      if (event && (event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        for (const callback of saveCallbacks) {
          callback();
        }
        return true;
      }
      return false;
    },
    COMMAND_PRIORITY_NORMAL
  );

  return {
    // ============================================
    // Content Operations
    // ============================================

    getContent(): string {
      let content = "";
      editor.getEditorState().read(() => {
        const root = $getRoot();
        content = root.getTextContent();
      });
      return content;
    },

    setContent(content: string): void {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        const { $createTextNode, $createParagraphNode } = require("lexical");
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(content));
        root.append(paragraph);
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
      // Lexical code highlighting is handled by CodeHighlightPlugin
      // Language change would need to trigger re-highlighting
    },

    // ============================================
    // Code Operations
    // ============================================

    async formatCode(): Promise<void> {
      // Lexical doesn't have built-in code formatting
      // This would require integration with Prettier or similar
      console.warn("[LexicalCodeAdapter] formatCode not implemented - use Monaco for code formatting");
    },

    insertSnippet(snippet: string): void {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(snippet);
        }
      });
    },

    getSelectedText(): string {
      let selectedText = "";
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selectedText = selection.getTextContent();
        }
      });
      return selectedText;
    },

    replaceSelection(text: string): void {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(text);
        }
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
      editor.focus();
    },

    blur(): void {
      editor.blur();
    },

    destroy(): void {
      removeUpdateListener();
      removeSaveListener();
      changeCallbacks.clear();
      focusCallbacks.clear();
      blurCallbacks.clear();
      saveCallbacks.clear();
    },
  };
};

/**
 * LexicalCodeAdapter class for object-oriented usage
 */
export class LexicalCodeAdapter implements CodeEditorAdapter {
  private adapter: CodeEditorAdapter;

  constructor(config: LexicalCodeAdapterConfig) {
    this.adapter = createLexicalCodeAdapter(config);
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
