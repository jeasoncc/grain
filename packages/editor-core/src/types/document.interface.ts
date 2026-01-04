/**
 * Document editor adapter interface for rich text editing
 * @module @grain/editor-core/types/document
 */

import type { SerializedContent } from "./content.interface";

/**
 * Heading levels supported by document editors
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * List types supported by document editors
 */
export type ListType = "bullet" | "ordered" | "task";

/**
 * Document editor adapter interface
 * Defines the contract for rich text document editing implementations
 */
export interface DocumentEditorAdapter {
  // ============================================
  // Content Operations
  // ============================================

  /**
   * Get the current editor content in serialized format
   * @returns The serialized content
   */
  getContent(): SerializedContent;

  /**
   * Set the editor content from serialized format
   * @param content - The serialized content to load
   */
  setContent(content: SerializedContent): void;

  /**
   * Check if the editor content is empty
   * @returns true if the editor has no content
   */
  isEmpty(): boolean;

  // ============================================
  // Rich Text Formatting
  // ============================================

  /**
   * Toggle bold formatting on the current selection
   */
  toggleBold(): void;

  /**
   * Toggle italic formatting on the current selection
   */
  toggleItalic(): void;

  /**
   * Toggle strikethrough formatting on the current selection
   */
  toggleStrike(): void;

  /**
   * Toggle inline code formatting on the current selection
   */
  toggleCode(): void;

  // ============================================
  // Block Operations
  // ============================================

  /**
   * Insert a heading at the current position
   * @param level - The heading level (1-6)
   */
  insertHeading(level: HeadingLevel): void;

  /**
   * Insert a list at the current position
   * @param type - The type of list to insert
   */
  insertList(type: ListType): void;

  /**
   * Insert a blockquote at the current position
   */
  insertBlockquote(): void;

  /**
   * Insert a horizontal rule at the current position
   */
  insertHorizontalRule(): void;

  /**
   * Insert a code block at the current position
   * @param language - Optional language for syntax highlighting
   */
  insertCodeBlock(language?: string): void;

  /**
   * Insert a table at the current position
   * @param rows - Number of rows
   * @param cols - Number of columns
   */
  insertTable(rows: number, cols: number): void;

  // ============================================
  // Link Operations
  // ============================================

  /**
   * Insert a link at the current position or wrap selection
   * @param url - The URL for the link
   * @param text - Optional display text (uses URL if not provided)
   */
  insertLink(url: string, text?: string): void;

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Register a callback for content changes
   * @param callback - Function called when content changes
   * @returns Unsubscribe function
   */
  onChange(callback: (content: SerializedContent) => void): () => void;

  /**
   * Register a callback for focus events
   * @param callback - Function called when editor gains focus
   * @returns Unsubscribe function
   */
  onFocus(callback: () => void): () => void;

  /**
   * Register a callback for blur events
   * @param callback - Function called when editor loses focus
   * @returns Unsubscribe function
   */
  onBlur(callback: () => void): () => void;

  /**
   * Register a callback for save events (e.g., Ctrl+S)
   * @param callback - Function called when save is triggered
   * @returns Unsubscribe function
   */
  onSave(callback: () => void): () => void;

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Focus the editor
   */
  focus(): void;

  /**
   * Remove focus from the editor
   */
  blur(): void;

  /**
   * Clean up editor resources
   */
  destroy(): void;
}

/**
 * Preview position for split-view editors
 */
export type PreviewPosition = "right" | "bottom";

/**
 * Extended document editor adapter for Markdown split-view preview
 * Used by Monaco and CodeMirror document editors
 */
export interface MarkdownDocumentEditorAdapter extends DocumentEditorAdapter {
  /**
   * Toggle the preview pane visibility
   */
  togglePreview(): void;

  /**
   * Check if the preview pane is visible
   * @returns true if preview is visible
   */
  isPreviewVisible(): boolean;

  /**
   * Set the position of the preview pane
   * @param position - The position of the preview pane
   */
  setPreviewPosition(position: PreviewPosition): void;

  /**
   * Enable or disable synchronized scrolling between editor and preview
   * @param enabled - Whether sync scroll should be enabled
   */
  enableSyncScroll(enabled: boolean): void;
}
