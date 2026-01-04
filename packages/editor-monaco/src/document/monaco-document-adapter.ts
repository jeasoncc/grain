/**
 * MonacoDocumentAdapter - Implements MarkdownDocumentEditorAdapter for Monaco
 * @module @grain/editor-monaco/document
 */

import type {
  MarkdownDocumentEditorAdapter,
  HeadingLevel,
  ListType,
  SerializedContent,
  PreviewPosition,
} from "@grain/editor-core";
import { createMarkdownContent } from "@grain/editor-core";
import type { editor } from "monaco-editor";

/**
 * Configuration for creating a MonacoDocumentAdapter
 */
export interface MonacoDocumentAdapterConfig {
  /** The Monaco editor instance */
  editor: editor.IStandaloneCodeEditor;
  /** Monaco module reference */
  monaco: typeof import("monaco-editor");
  /** Preview element reference */
  previewElement?: HTMLElement | null;
  /** Callback to toggle preview */
  onTogglePreview?: () => void;
  /** Callback to set preview position */
  onSetPreviewPosition?: (position: PreviewPosition) => void;
  /** Callback to enable/disable sync scroll */
  onEnableSyncScroll?: (enabled: boolean) => void;
}

/**
 * Creates a MarkdownDocumentEditorAdapter implementation for Monaco
 */
export const createMonacoDocumentAdapter = (
  config: MonacoDocumentAdapterConfig
): MarkdownDocumentEditorAdapter => {
  const { editor, monaco } = config;
  
  // State tracking
  let _previewVisible = true;
  let _previewPosition: PreviewPosition = "right";
  let _syncScrollEnabled = true;

  // Store callbacks for cleanup
  const changeCallbacks = new Set<(content: SerializedContent) => void>();
  const focusCallbacks = new Set<() => void>();
  const blurCallbacks = new Set<() => void>();
  const saveCallbacks = new Set<() => void>();

  // Register change listener
  const changeDisposable = editor.onDidChangeModelContent(() => {
    const content = createMarkdownContent(editor.getValue());
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
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    for (const callback of saveCallbacks) {
      callback();
    }
  });

  /**
   * Insert text at cursor position
   */
  const insertText = (text: string) => {
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
  };

  /**
   * Wrap selection with prefix and suffix
   */
  const wrapSelection = (prefix: string, suffix: string) => {
    const selection = editor.getSelection();
    if (selection) {
      const selectedText = editor.getModel()?.getValueInRange(selection) ?? "";
      editor.executeEdits("", [
        {
          range: selection,
          text: `${prefix}${selectedText}${suffix}`,
          forceMoveMarkers: true,
        },
      ]);
    }
  };

  return {
    // ============================================
    // Content Operations
    // ============================================

    getContent(): SerializedContent {
      return createMarkdownContent(editor.getValue());
    },

    setContent(content: SerializedContent): void {
      if (content.format === "markdown") {
        editor.setValue(content.data);
      } else {
        console.warn(`[MonacoDocumentAdapter] Unsupported format: ${content.format}`);
      }
    },

    isEmpty(): boolean {
      return editor.getValue().trim().length === 0;
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
      editor.focus();
    },

    blur(): void {
      (document.activeElement as HTMLElement)?.blur?.();
    },

    destroy(): void {
      changeDisposable.dispose();
      focusDisposable.dispose();
      blurDisposable.dispose();
      changeCallbacks.clear();
      focusCallbacks.clear();
      blurCallbacks.clear();
      saveCallbacks.clear();
    },
  };
};

/**
 * MonacoDocumentAdapter class for object-oriented usage
 */
export class MonacoDocumentAdapter implements MarkdownDocumentEditorAdapter {
  private adapter: MarkdownDocumentEditorAdapter;

  constructor(config: MonacoDocumentAdapterConfig) {
    this.adapter = createMonacoDocumentAdapter(config);
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
