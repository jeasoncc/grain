/**
 * LexicalDocumentAdapter - Implements DocumentEditorAdapter for Lexical
 * @module @grain/editor-lexical/document
 */

import type {
  DocumentEditorAdapter,
  HeadingLevel,
  ListType,
  SerializedContent,
} from "@grain/editor-core";
import { createJsonContent } from "@grain/editor-core";
import type { LexicalEditor, SerializedEditorState } from "lexical";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  FORMAT_TEXT_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  KEY_ENTER_COMMAND,
} from "lexical";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
} from "@lexical/list";
import { $createCodeNode } from "@lexical/code";
import { $createLinkNode } from "@lexical/link";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { INSERT_TABLE_COMMAND } from "@lexical/table";

/**
 * Configuration for creating a LexicalDocumentAdapter
 */
export interface LexicalDocumentAdapterConfig {
  /** The Lexical editor instance */
  editor: LexicalEditor;
}

/**
 * Creates a DocumentEditorAdapter implementation for Lexical
 * 
 * @param config - Configuration containing the Lexical editor instance
 * @returns DocumentEditorAdapter implementation
 */
export const createLexicalDocumentAdapter = (
  config: LexicalDocumentAdapterConfig
): DocumentEditorAdapter => {
  const { editor } = config;
  
  // Store callbacks for cleanup
  const changeCallbacks = new Set<(content: SerializedContent) => void>();
  const focusCallbacks = new Set<() => void>();
  const blurCallbacks = new Set<() => void>();
  const saveCallbacks = new Set<() => void>();

  // Register update listener for change events
  const removeUpdateListener = editor.registerUpdateListener(({ editorState }) => {
    if (changeCallbacks.size > 0) {
      const serialized = editorState.toJSON();
      const content = createJsonContent(serialized);
      for (const callback of changeCallbacks) {
        callback(content);
      }
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

    getContent(): SerializedContent {
      const editorState = editor.getEditorState();
      const serialized = editorState.toJSON();
      return createJsonContent(serialized);
    },

    setContent(content: SerializedContent): void {
      if (content.format !== "json") {
        console.warn(`[LexicalDocumentAdapter] Unsupported format: ${content.format}`);
        return;
      }

      try {
        const state = JSON.parse(content.data) as SerializedEditorState;
        const editorState = editor.parseEditorState(state);
        editor.setEditorState(editorState);
      } catch (error) {
        console.error("[LexicalDocumentAdapter] Failed to set content:", error);
      }
    },

    isEmpty(): boolean {
      let isEmpty = true;
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const textContent = root.getTextContent();
        isEmpty = textContent.trim().length === 0;
      });
      return isEmpty;
    },

    // ============================================
    // Rich Text Formatting
    // ============================================

    toggleBold(): void {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
    },

    toggleItalic(): void {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
    },

    toggleStrike(): void {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
    },

    toggleCode(): void {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
    },

    // ============================================
    // Block Operations
    // ============================================

    insertHeading(level: HeadingLevel): void {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const headingTag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
          const headingNode = $createHeadingNode(headingTag);
          selection.insertNodes([headingNode]);
        }
      });
    },

    insertList(type: ListType): void {
      switch (type) {
        case "bullet":
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          break;
        case "ordered":
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          break;
        case "task":
          editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
          break;
      }
    },

    insertBlockquote(): void {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const quoteNode = $createQuoteNode();
          selection.insertNodes([quoteNode]);
        }
      });
    },

    insertHorizontalRule(): void {
      editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
    },

    insertCodeBlock(language?: string): void {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const codeNode = $createCodeNode(language);
          selection.insertNodes([codeNode]);
        }
      });
    },

    insertTable(rows: number, cols: number): void {
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        rows: String(rows),
        columns: String(cols),
      });
    },

    // ============================================
    // Link Operations
    // ============================================

    insertLink(url: string, text?: string): void {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const linkNode = $createLinkNode(url);
          if (text) {
            // If text is provided, we need to create a text node inside the link
            const { $createTextNode } = require("lexical");
            const textNode = $createTextNode(text);
            linkNode.append(textNode);
            selection.insertNodes([linkNode]);
          } else {
            // Wrap selection in link
            selection.insertNodes([linkNode]);
          }
        }
      });
    },

    // ============================================
    // Event Handlers
    // ============================================

    onChange(callback: (content: SerializedContent) => void): () => void {
      changeCallbacks.add(callback);
      return () => {
        changeCallbacks.delete(callback);
      };
    },

    onFocus(callback: () => void): () => void {
      focusCallbacks.add(callback);
      // Lexical doesn't have a built-in focus event, would need DOM listener
      return () => {
        focusCallbacks.delete(callback);
      };
    },

    onBlur(callback: () => void): () => void {
      blurCallbacks.add(callback);
      // Lexical doesn't have a built-in blur event, would need DOM listener
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
      // Clean up listeners
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
 * LexicalDocumentAdapter class for object-oriented usage
 */
export class LexicalDocumentAdapter implements DocumentEditorAdapter {
  private adapter: DocumentEditorAdapter;

  constructor(config: LexicalDocumentAdapterConfig) {
    this.adapter = createLexicalDocumentAdapter(config);
  }

  getContent = () => this.adapter.getContent();
  setContent = (content: SerializedContent) => this.adapter.setContent(content);
  isEmpty = () => this.adapter.isEmpty();
  toggleBold = () => this.adapter.toggleBold();
  toggleItalic = () => this.adapter.toggleItalic();
  toggleStrike = () => this.adapter.toggleStrike();
  toggleCode = () => this.adapter.toggleCode();
  insertHeading = (level: HeadingLevel) => this.adapter.insertHeading(level);
  insertList = (type: ListType) => this.adapter.insertList(type);
  insertBlockquote = () => this.adapter.insertBlockquote();
  insertHorizontalRule = () => this.adapter.insertHorizontalRule();
  insertCodeBlock = (language?: string) => this.adapter.insertCodeBlock(language);
  insertTable = (rows: number, cols: number) => this.adapter.insertTable(rows, cols);
  insertLink = (url: string, text?: string) => this.adapter.insertLink(url, text);
  onChange = (callback: (content: SerializedContent) => void) => this.adapter.onChange(callback);
  onFocus = (callback: () => void) => this.adapter.onFocus(callback);
  onBlur = (callback: () => void) => this.adapter.onBlur(callback);
  onSave = (callback: () => void) => this.adapter.onSave(callback);
  focus = () => this.adapter.focus();
  blur = () => this.adapter.blur();
  destroy = () => this.adapter.destroy();
}
