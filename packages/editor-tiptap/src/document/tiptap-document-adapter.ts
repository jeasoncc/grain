/**
 * TiptapDocumentAdapter - Implements DocumentEditorAdapter for Tiptap
 * @module @grain/editor-tiptap/document
 */

import type {
  DocumentEditorAdapter,
  HeadingLevel,
  ListType,
  SerializedContent,
} from "@grain/editor-core";
import { createJsonContent } from "@grain/editor-core";
import type { TiptapDocumentAdapterConfig } from "./tiptap-document-editor.types";

/**
 * Creates a DocumentEditorAdapter implementation for Tiptap
 */
export const createTiptapDocumentAdapter = (
  config: TiptapDocumentAdapterConfig
): DocumentEditorAdapter => {
  const { editor } = config;

  // Store callbacks for cleanup
  const changeCallbacks = new Set<(content: SerializedContent) => void>();
  const focusCallbacks = new Set<() => void>();
  const blurCallbacks = new Set<() => void>();
  const saveCallbacks = new Set<() => void>();

  // Register change listener
  const handleUpdate = () => {
    const content = createJsonContent(editor.getJSON());
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

    getContent(): SerializedContent {
      return createJsonContent(editor.getJSON());
    },

    setContent(content: SerializedContent): void {
      if (content.format === "json") {
        try {
          const json = JSON.parse(content.data);
          editor.commands.setContent(json);
        } catch (e) {
          console.warn("[TiptapDocumentAdapter] Failed to parse JSON content:", e);
        }
      } else if (content.format === "html") {
        editor.commands.setContent(content.data);
      } else if (content.format === "markdown") {
        // Tiptap doesn't natively support markdown, set as plain text
        editor.commands.setContent(`<p>${content.data}</p>`);
      }
    },

    isEmpty(): boolean {
      return editor.isEmpty;
    },

    // ============================================
    // Rich Text Formatting
    // ============================================

    toggleBold(): void {
      editor.chain().focus().toggleBold().run();
    },

    toggleItalic(): void {
      editor.chain().focus().toggleItalic().run();
    },

    toggleStrike(): void {
      editor.chain().focus().toggleStrike().run();
    },

    toggleCode(): void {
      editor.chain().focus().toggleCode().run();
    },

    // ============================================
    // Block Operations
    // ============================================

    insertHeading(level: HeadingLevel): void {
      editor.chain().focus().toggleHeading({ level }).run();
    },

    insertList(type: ListType): void {
      switch (type) {
        case "bullet":
          editor.chain().focus().toggleBulletList().run();
          break;
        case "ordered":
          editor.chain().focus().toggleOrderedList().run();
          break;
        case "task":
          editor.chain().focus().toggleTaskList().run();
          break;
      }
    },

    insertBlockquote(): void {
      editor.chain().focus().toggleBlockquote().run();
    },

    insertHorizontalRule(): void {
      editor.chain().focus().setHorizontalRule().run();
    },

    insertCodeBlock(language?: string): void {
      editor.chain().focus().toggleCodeBlock({ language: language ?? "" }).run();
    },

    insertTable(rows: number, cols: number): void {
      editor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
    },

    // ============================================
    // Link Operations
    // ============================================

    insertLink(url: string, text?: string): void {
      if (text) {
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${url}">${text}</a>`)
          .run();
      } else {
        editor.chain().focus().setLink({ href: url }).run();
      }
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
 * TiptapDocumentAdapter class for object-oriented usage
 */
export class TiptapDocumentAdapter implements DocumentEditorAdapter {
  private adapter: DocumentEditorAdapter;

  constructor(config: TiptapDocumentAdapterConfig) {
    this.adapter = createTiptapDocumentAdapter(config);
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
  onChange = (callback: (content: SerializedContent) => void) =>
    this.adapter.onChange(callback);
  onFocus = (callback: () => void) => this.adapter.onFocus(callback);
  onBlur = (callback: () => void) => this.adapter.onBlur(callback);
  onSave = (callback: () => void) => this.adapter.onSave(callback);
  focus = () => this.adapter.focus();
  blur = () => this.adapter.blur();
  destroy = () => this.adapter.destroy();
}
