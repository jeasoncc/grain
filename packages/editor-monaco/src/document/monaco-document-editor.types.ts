/**
 * Monaco Document Editor Types
 * @module @grain/editor-monaco/document
 */

import type { editor } from "monaco-editor";
import type { EditorThemeColors } from "../code/monaco-code-editor.types";

/**
 * Preview position for split-view
 */
export type PreviewPosition = "right" | "bottom";

/**
 * MonacoDocumentEditor Props
 */
export interface MonacoDocumentEditorProps {
  /** Markdown content */
  readonly content: string;
  /** Base theme (light/dark) */
  readonly theme: "light" | "dark";
  /** Custom theme colors (optional) */
  readonly themeColors?: EditorThemeColors;
  /** Content change callback */
  readonly onChange: (content: string) => void;
  /** Save callback (Ctrl+S) */
  readonly onSave: () => void;
  /** Read-only mode */
  readonly readOnly?: boolean;
  /** Show preview panel */
  readonly showPreview?: boolean;
  /** Preview position */
  readonly previewPosition?: PreviewPosition;
  /** Enable synchronized scrolling */
  readonly syncScroll?: boolean;
  /** Custom class name */
  readonly className?: string;
  /** Editor options */
  readonly options?: editor.IStandaloneEditorConstructionOptions;
}

/**
 * MonacoDocumentEditor ref handle
 */
export interface MonacoDocumentEditorHandle {
  /** Get current content */
  getContent: () => string;
  /** Set content */
  setContent: (content: string) => void;
  /** Toggle preview visibility */
  togglePreview: () => void;
  /** Check if preview is visible */
  isPreviewVisible: () => boolean;
  /** Set preview position */
  setPreviewPosition: (position: PreviewPosition) => void;
  /** Enable/disable sync scroll */
  enableSyncScroll: (enabled: boolean) => void;
  /** Focus the editor */
  focus: () => void;
  /** Blur the editor */
  blur: () => void;
}
