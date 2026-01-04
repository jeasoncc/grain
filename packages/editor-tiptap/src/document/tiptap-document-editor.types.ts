/**
 * TiptapDocumentEditor types
 * @module @grain/editor-tiptap/document
 */

import type { Editor } from "@tiptap/react";
import type { SerializedContent } from "@grain/editor-core";

/**
 * Configuration for TiptapDocumentAdapter
 */
export interface TiptapDocumentAdapterConfig {
  /** The Tiptap editor instance */
  editor: Editor;
}

/**
 * Character count result
 */
export interface CharacterCountResult {
  /** Total character count */
  characters: number;
  /** Total word count */
  words: number;
}

/**
 * TiptapDocumentEditor component props
 */
export interface TiptapDocumentEditorProps {
  /** Initial content to load */
  initialContent?: SerializedContent;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
  /** Character limit (optional) */
  characterLimit?: number;
  /** Callback when content changes */
  onChange?: (content: SerializedContent) => void;
  /** Callback when editor gains focus */
  onFocus?: () => void;
  /** Callback when editor loses focus */
  onBlur?: () => void;
  /** Callback for save action (Ctrl+S) */
  onSave?: () => void;
  /** Callback when character count changes */
  onCharacterCountChange?: (count: CharacterCountResult) => void;
  /** Additional CSS class name */
  className?: string;
}

/**
 * TiptapDocumentEditor imperative handle
 */
export interface TiptapDocumentEditorHandle {
  /** Get the underlying Tiptap editor instance */
  getEditor: () => Editor | null;
  /** Get the current content as SerializedContent */
  getContent: () => SerializedContent;
  /** Set the editor content */
  setContent: (content: SerializedContent) => void;
  /** Focus the editor */
  focus: () => void;
  /** Check if the editor is empty */
  isEmpty: () => boolean;
  /** Get character and word count */
  getCharacterCount: () => CharacterCountResult;

  // Text formatting commands
  /** Toggle bold formatting */
  toggleBold: () => boolean | undefined;
  /** Toggle italic formatting */
  toggleItalic: () => boolean | undefined;
  /** Toggle strikethrough formatting */
  toggleStrike: () => boolean | undefined;
  /** Toggle underline formatting */
  toggleUnderline: () => boolean | undefined;
  /** Toggle subscript formatting */
  toggleSubscript: () => boolean | undefined;
  /** Toggle superscript formatting */
  toggleSuperscript: () => boolean | undefined;
  /** Toggle inline code formatting */
  toggleCode: () => boolean | undefined;
  /** Toggle code block */
  toggleCodeBlock: () => boolean | undefined;
  /** Toggle blockquote */
  toggleBlockquote: () => boolean | undefined;

  // Heading commands
  /** Set heading level (1-6) */
  setHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) => boolean | undefined;
  /** Set paragraph (remove heading) */
  setParagraph: () => boolean | undefined;

  // List commands
  /** Toggle bullet list */
  toggleBulletList: () => boolean | undefined;
  /** Toggle ordered list */
  toggleOrderedList: () => boolean | undefined;
  /** Toggle task list */
  toggleTaskList: () => boolean | undefined;

  // Alignment commands
  /** Set text alignment */
  setTextAlign: (align: "left" | "center" | "right" | "justify") => boolean | undefined;

  // Color commands
  /** Set text color */
  setColor: (color: string) => boolean | undefined;
  /** Remove text color */
  unsetColor: () => boolean | undefined;
  /** Set highlight/background color */
  setHighlight: (color: string) => boolean | undefined;
  /** Remove highlight */
  unsetHighlight: () => boolean | undefined;

  // Font commands
  /** Set font family */
  setFontFamily: (fontFamily: string) => boolean | undefined;
  /** Remove font family */
  unsetFontFamily: () => boolean | undefined;

  // Link commands
  /** Set link URL */
  setLink: (url: string) => boolean | undefined;
  /** Remove link */
  unsetLink: () => boolean | undefined;

  // Image commands
  /** Insert image */
  insertImage: (src: string, alt?: string, title?: string) => boolean | undefined;

  // YouTube commands
  /** Insert YouTube video */
  insertYoutube: (src: string) => boolean | undefined;

  // Table commands
  /** Insert table */
  insertTable: (rows?: number, cols?: number) => boolean | undefined;
  /** Add column before current */
  addColumnBefore: () => boolean | undefined;
  /** Add column after current */
  addColumnAfter: () => boolean | undefined;
  /** Delete current column */
  deleteColumn: () => boolean | undefined;
  /** Add row before current */
  addRowBefore: () => boolean | undefined;
  /** Add row after current */
  addRowAfter: () => boolean | undefined;
  /** Delete current row */
  deleteRow: () => boolean | undefined;
  /** Delete entire table */
  deleteTable: () => boolean | undefined;
  /** Merge selected cells */
  mergeCells: () => boolean | undefined;
  /** Split merged cell */
  splitCell: () => boolean | undefined;
  /** Toggle header row */
  toggleHeaderRow: () => boolean | undefined;
  /** Toggle header column */
  toggleHeaderColumn: () => boolean | undefined;
  /** Toggle header cell */
  toggleHeaderCell: () => boolean | undefined;

  // History commands
  /** Undo last action */
  undo: () => boolean | undefined;
  /** Redo last undone action */
  redo: () => boolean | undefined;

  // Other commands
  /** Insert horizontal rule */
  insertHorizontalRule: () => boolean | undefined;
  /** Insert hard break (Shift+Enter) */
  insertHardBreak: () => boolean | undefined;
  /** Clear all formatting */
  clearFormatting: () => boolean | undefined;
}
