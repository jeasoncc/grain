/**
 * Monaco Diagram Editor Types
 * @module @grain/editor-monaco/diagram
 */

import type { EditorThemeColors } from "../code/monaco-code-editor.types";

/**
 * Diagram type
 */
export type DiagramType = "mermaid" | "plantuml";

/**
 * Diagram error type
 */
export type DiagramErrorType = "network" | "syntax" | "server" | "config" | "unknown";

/**
 * Diagram error information
 */
export interface DiagramError {
  /** Error type */
  readonly type: DiagramErrorType;
  /** Error message */
  readonly message: string;
  /** Whether the error is retryable */
  readonly retryable: boolean;
  /** Retry count */
  readonly retryCount: number;
}

/**
 * MonacoDiagramEditor Props
 */
export interface MonacoDiagramEditorProps {
  /** Diagram source code */
  readonly code: string;
  /** Diagram type */
  readonly diagramType: DiagramType;
  /** Preview SVG content */
  readonly previewSvg: string | null;
  /** Whether preview is loading */
  readonly isLoading: boolean;
  /** Error information */
  readonly error: DiagramError | null;
  /** Whether Kroki is configured */
  readonly isKrokiConfigured: boolean;
  /** Base theme (light/dark) */
  readonly theme?: "light" | "dark";
  /** Custom theme colors */
  readonly themeColors?: EditorThemeColors;
  /** Code change callback */
  readonly onCodeChange: (code: string) => void;
  /** Save callback (Ctrl+S) */
  readonly onSave?: () => void;
  /** Open settings callback */
  readonly onOpenSettings: () => void;
  /** Retry callback */
  readonly onRetry: () => void;
}

/**
 * MonacoDiagramEditor ref handle
 */
export interface MonacoDiagramEditorHandle {
  /** Get current source */
  getSource: () => string;
  /** Set source */
  setSource: (source: string) => void;
  /** Get diagram type */
  getDiagramType: () => DiagramType;
  /** Set diagram type */
  setDiagramType: (type: DiagramType) => void;
  /** Get preview element */
  getPreviewElement: () => HTMLElement | null;
  /** Focus the editor */
  focus: () => void;
  /** Blur the editor */
  blur: () => void;
}

/**
 * DiagramPreview Props
 */
export interface DiagramPreviewProps {
  /** Preview SVG content */
  readonly previewSvg: string | null;
  /** Whether preview is loading */
  readonly isLoading: boolean;
  /** Error information */
  readonly error: DiagramError | null;
  /** Retry callback */
  readonly onRetry: () => void;
  /** Empty state text */
  readonly emptyText?: string;
  /** Custom class name */
  readonly className?: string;
}
