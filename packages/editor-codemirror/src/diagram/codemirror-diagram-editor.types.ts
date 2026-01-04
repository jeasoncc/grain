/**
 * CodeMirrorDiagramEditor types
 * @module @grain/editor-codemirror/diagram
 */

import type { EditorView } from "@codemirror/view";
import type { DiagramType } from "@grain/editor-core";

/**
 * Props for CodeMirrorDiagramEditor component
 */
export interface CodeMirrorDiagramEditorProps {
  /** Initial diagram source code */
  readonly initialSource?: string;
  /** Diagram type (mermaid or plantuml) */
  readonly diagramType?: DiagramType;
  /** Placeholder text when editor is empty */
  readonly placeholder?: string;
  /** Whether the editor is read-only */
  readonly readOnly?: boolean;
  /** Whether to auto-focus on mount */
  readonly autoFocus?: boolean;
  /** Callback when source changes */
  readonly onChange?: (source: string) => void;
  /** Callback when editor gains focus */
  readonly onFocus?: () => void;
  /** Callback when editor loses focus */
  readonly onBlur?: () => void;
  /** Callback when save is triggered (Ctrl+S) */
  readonly onSave?: () => void;
  /** Callback when render completes */
  readonly onRenderComplete?: (svg: string) => void;
  /** Callback when render fails */
  readonly onRenderError?: (error: Error) => void;
  /** Additional CSS class name */
  readonly className?: string;
}

/**
 * Ref handle for CodeMirrorDiagramEditor
 */
export interface CodeMirrorDiagramEditorHandle {
  /** Get the CodeMirror editor view */
  getView(): EditorView | null;
  /** Get current source */
  getSource(): string;
  /** Set source */
  setSource(source: string): void;
  /** Focus the editor */
  focus(): void;
  /** Get diagram type */
  getDiagramType(): DiagramType;
  /** Set diagram type */
  setDiagramType(type: DiagramType): void;
  /** Render the diagram */
  render(): Promise<string>;
}

/**
 * Configuration for CodeMirrorDiagramAdapter
 */
export interface CodeMirrorDiagramAdapterConfig {
  /** The CodeMirror editor view */
  view: EditorView;
  /** Initial diagram type */
  diagramType?: DiagramType;
  /** Preview element for rendering */
  previewElement?: HTMLElement | null;
}
