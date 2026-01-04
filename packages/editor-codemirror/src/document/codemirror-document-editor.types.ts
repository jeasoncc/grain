/**
 * CodeMirrorDocumentEditor types
 * @module @grain/editor-codemirror/document
 */

import type { EditorView } from "@codemirror/view";
import type { SerializedContent, PreviewPosition } from "@grain/editor-core";

/**
 * Props for CodeMirrorDocumentEditor component
 */
export interface CodeMirrorDocumentEditorProps {
  /** Initial content to load */
  readonly initialContent?: SerializedContent;
  /** Placeholder text when editor is empty */
  readonly placeholder?: string;
  /** Whether the editor is read-only */
  readonly readOnly?: boolean;
  /** Whether to auto-focus on mount */
  readonly autoFocus?: boolean;
  /** Whether to show preview pane */
  readonly showPreview?: boolean;
  /** Preview pane position */
  readonly previewPosition?: PreviewPosition;
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
 * Ref handle for CodeMirrorDocumentEditor
 */
export interface CodeMirrorDocumentEditorHandle {
  /** Get the CodeMirror editor view */
  getView(): EditorView | null;
  /** Get current content */
  getContent(): SerializedContent;
  /** Set content */
  setContent(content: SerializedContent): void;
  /** Focus the editor */
  focus(): void;
  /** Check if content is empty */
  isEmpty(): boolean;
  /** Toggle preview visibility */
  togglePreview(): void;
  /** Check if preview is visible */
  isPreviewVisible(): boolean;
}

/**
 * Configuration for CodeMirrorDocumentAdapter
 */
export interface CodeMirrorDocumentAdapterConfig {
  /** The CodeMirror editor view */
  view: EditorView;
  /** Preview element reference */
  previewElement?: HTMLElement | null;
  /** Callback to toggle preview */
  onTogglePreview?: () => void;
  /** Callback to set preview position */
  onSetPreviewPosition?: (position: PreviewPosition) => void;
  /** Callback to enable/disable sync scroll */
  onEnableSyncScroll?: (enabled: boolean) => void;
}
