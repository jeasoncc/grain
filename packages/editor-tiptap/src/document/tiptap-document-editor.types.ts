/**
 * TiptapDocumentEditor types
 * @module @grain/editor-tiptap/document
 */

import type { Editor } from "@tiptap/react";
import type { SerializedContent } from "@grain/editor-core";

/**
 * Props for TiptapDocumentEditor component
 */
export interface TiptapDocumentEditorProps {
  /** Initial content to load */
  readonly initialContent?: SerializedContent;
  /** Placeholder text when editor is empty */
  readonly placeholder?: string;
  /** Whether the editor is read-only */
  readonly readOnly?: boolean;
  /** Whether to auto-focus on mount */
  readonly autoFocus?: boolean;
  /** Callback when content changes */
  readonly onChange?: (content: SerializedContent) => void;
  /** Callback when editor gains focus */
  readonly onFocus?: () => void;
  /** Callback when editor loses focus */
  readonly onBlur?: () => void;
  /** Callback when save is triggered (Ctrl+S) */
  readonly onSave?: () => void;
  /** Additional CSS class name */
  readonly className?: string;
}

/**
 * Ref handle for TiptapDocumentEditor
 */
export interface TiptapDocumentEditorHandle {
  /** Get the Tiptap editor instance */
  getEditor(): Editor | null;
  /** Get current content */
  getContent(): SerializedContent;
  /** Set content */
  setContent(content: SerializedContent): void;
  /** Focus the editor */
  focus(): void;
  /** Check if content is empty */
  isEmpty(): boolean;
}

/**
 * Configuration for TiptapDocumentAdapter
 */
export interface TiptapDocumentAdapterConfig {
  /** The Tiptap editor instance */
  editor: Editor;
}
