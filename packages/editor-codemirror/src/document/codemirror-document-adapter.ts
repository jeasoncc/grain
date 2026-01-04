/**
 * CodeMirrorDocumentAdapter - Implements MarkdownDocumentEditorAdapter for CodeMirror
 * @module @grain/editor-codemirror/document
 */

import type {
  MarkdownDocumentEditorAdapter,
  HeadingLevel,
  ListType,
  SerializedContent,
  PreviewPosition,
} from "@grain/editor-core";
import { createMarkdownContent } from "@grain/editor-core";
import type { CodeMirrorDocumentAdapterConfig } from "./codemirror-document-editor.types";

/**
 * Creates a MarkdownDocumentEditorAdapter implementation for CodeMirror
 */
export const createCodeMirrorDocumentAdapter = (
  config: CodeMirrorDocumentAdapterConfig
): MarkdownDocumentEditorAdapter => {
  const { view } = config;

  // State tracking
  let _previewVisible = true;
  let _previewPosition: PreviewPosition = "right";
  let _syncScrollEnabled = true;

  // Store callbacks for cleanup
  const changeCallbacks = new Set<(content: SerializedContent) => void>();
  const focusCallbacks = new Set<() => void>();
  const blurCallbacks = new Set<() => void>();
  const saveCallbacks = new Set<() => void>();

  /**
   * Insert text at cursor position
   */
  const insertText = (text: string) => {
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
  };

  /**
   * Wrap selection with prefix and suffix
   */
  const wrapSelection = (prefix: string, suffix: string) => {
    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);
    const newText = `${prefix}${selectedText}${suffix}`;
    view.dispatch({
      changes: { from, to, insert: newText },
      selection: { anchor: from + prefix.length, head: from + prefix.length + selectedText.length },
    });
  };

  return {
    // ============================================
    // Content Operations
    // ============================================

    getContent(): SerializedContent {
      return createMarkdownContent(view.state.doc.toString());
    },

    setContent(content: SerializedContent): void {
      if (content.format === "markdown") {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content.data },
        });
      } else {
        console.warn(`[CodeMirrorDocumentAdapter] Unsupported format: ${content.format}`);
      }
    },

    isEmpty(): boolean {
      return view.state.doc.length === 0;
    },

    // ============================================
    // Rich Text Formatting (Markdown syntax)
    // ============================================

    toggleBold(): void {
      wrapSelection("**", "**");
    },

    toggleItalic(): void {
      wrapSelection("*", "*");
    },

    toggleStrike(): void {
      wrapSelection("~~", "~~");
    },

    toggleCode(): void {
      wrapSelection("`", "`");
    },

    // ============================================
    // Block Operations
    // ============================================

    insertHeading(level: HeadingLevel): void {
      const prefix = "#".repeat(level) + " ";
      insertText(prefix);
    },

    insertList(type: ListType): void {
      switch (type) {
        case "bullet":
          insertText("- ");
          break;
        case "ordered":
          insertText("1. ");
          break;
        case "task":
          insertText("- [ ] ");
          break;
      }
    },

    insertBlockquote(): void {
      insertText("> ");
    },

    insertHorizontalRule(): void {
      insertText("\n---\n");
    },

    insertCodeBlock(language?: string): void {
      insertText(`\n\`\`\`${language ?? ""}\n\n\`\`\`\n`);
    },

    insertTable(rows: number, cols: number): void {
      let table = "\n|";
      for (let c = 0; c < cols; c++) {
        table += ` Header ${c + 1} |`;
      }
      table += "\n|";
      for (let c = 0; c < cols; c++) {
        table += " --- |";
      }
      for (let r = 0; r < rows; r++) {
        table += "\n|";
        for (let c = 0; c < cols; c++) {
          table += ` Cell ${r + 1}-${c + 1} |`;
        }
      }
      table += "\n";
      insertText(table);
    },

    // ============================================
    // Link Operations
    // ============================================

    insertLink(url: string, text?: string): void {
      const linkText = text ?? url;
      insertText(`[${linkText}](${url})`);
    },

    // ============================================
    // Preview Operations (MarkdownDocumentEditorAdapter)
    // ============================================

    togglePreview(): void {
      _previewVisible = !_previewVisible;
      config.onTogglePreview?.();
    },

    isPreviewVisible(): boolean {
      return _previewVisible;
    },

    setPreviewPosition(position: PreviewPosition): void {
      _previewPosition = position;
      config.onSetPreviewPosition?.(position);
    },

    getPreviewPosition(): PreviewPosition {
      return _previewPosition;
    },

    enableSyncScroll(enabled: boolean): void {
      _syncScrollEnabled = enabled;
      config.onEnableSyncScroll?.(enabled);
    },

    isSyncScrollEnabled(): boolean {
      return _syncScrollEnabled;
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
 * CodeMirrorDocumentAdapter class for object-oriented usage
 */
export class CodeMirrorDocumentAdapter implements MarkdownDocumentEditorAdapter {
  private adapter: MarkdownDocumentEditorAdapter;

  constructor(config: CodeMirrorDocumentAdapterConfig) {
    this.adapter = createCodeMirrorDocumentAdapter(config);
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
  togglePreview = () => this.adapter.togglePreview();
  isPreviewVisible = () => this.adapter.isPreviewVisible();
  setPreviewPosition = (position: PreviewPosition) => this.adapter.setPreviewPosition(position);
  getPreviewPosition = () => this.adapter.getPreviewPosition();
  enableSyncScroll = (enabled: boolean) => this.adapter.enableSyncScroll(enabled);
  isSyncScrollEnabled = () => this.adapter.isSyncScrollEnabled();
  onChange = (callback: (content: SerializedContent) => void) => this.adapter.onChange(callback);
  onFocus = (callback: () => void) => this.adapter.onFocus(callback);
  onBlur = (callback: () => void) => this.adapter.onBlur(callback);
  onSave = (callback: () => void) => this.adapter.onSave(callback);
  focus = () => this.adapter.focus();
  blur = () => this.adapter.blur();
  destroy = () => this.adapter.destroy();
}
