/**
 * Editor configuration types for runtime editor selection
 * @module @grain/editor-core/types/config
 */

import type { DocumentEditorAdapter } from "./document.interface";
import type { CodeEditorAdapter } from "./code.interface";
import type { DiagramEditorAdapter } from "./diagram.interface";

/**
 * Available document editor implementations
 */
export type DocumentEditorType = "lexical" | "tiptap" | "monaco" | "codemirror";

/**
 * Available code editor implementations
 */
export type CodeEditorType = "lexical" | "tiptap" | "monaco" | "codemirror";

/**
 * Available diagram editor implementations
 */
export type DiagramEditorType = "lexical" | "tiptap" | "monaco" | "codemirror";

/**
 * Editor configuration for runtime editor selection
 * Allows selecting different editor implementations for each editor type
 */
export interface EditorConfig {
  /** The document editor implementation to use */
  readonly documentEditor: DocumentEditorType;
  /** The code editor implementation to use */
  readonly codeEditor: CodeEditorType;
  /** The diagram editor implementation to use */
  readonly diagramEditor: DiagramEditorType;
}

/**
 * Default editor configuration
 * Uses Lexical for documents, Monaco for code and diagrams
 */
export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  documentEditor: "lexical",
  codeEditor: "monaco",
  diagramEditor: "monaco",
};

/**
 * Editor factory function type for lazy loading
 */
export type EditorFactory<T> = () => Promise<T>;

/**
 * Editor registry for dynamic editor loading
 * Maps editor types to their factory functions
 */
export interface EditorRegistry {
  /** Document editor factories by implementation type */
  document: Partial<
    Record<DocumentEditorType, EditorFactory<DocumentEditorAdapter>>
  >;
  /** Code editor factories by implementation type */
  code: Partial<Record<CodeEditorType, EditorFactory<CodeEditorAdapter>>>;
  /** Diagram editor factories by implementation type */
  diagram: Partial<
    Record<DiagramEditorType, EditorFactory<DiagramEditorAdapter>>
  >;
}

/**
 * Create an empty editor registry
 * @returns An empty EditorRegistry
 */
export const createEditorRegistry = (): EditorRegistry => ({
  document: {},
  code: {},
  diagram: {},
});

/**
 * Register a document editor factory
 * @param registry - The registry to update
 * @param type - The editor type
 * @param factory - The factory function
 * @returns Updated registry
 */
export const registerDocumentEditor = (
  registry: EditorRegistry,
  type: DocumentEditorType,
  factory: EditorFactory<DocumentEditorAdapter>
): EditorRegistry => ({
  ...registry,
  document: { ...registry.document, [type]: factory },
});

/**
 * Register a code editor factory
 * @param registry - The registry to update
 * @param type - The editor type
 * @param factory - The factory function
 * @returns Updated registry
 */
export const registerCodeEditor = (
  registry: EditorRegistry,
  type: CodeEditorType,
  factory: EditorFactory<CodeEditorAdapter>
): EditorRegistry => ({
  ...registry,
  code: { ...registry.code, [type]: factory },
});

/**
 * Register a diagram editor factory
 * @param registry - The registry to update
 * @param type - The editor type
 * @param factory - The factory function
 * @returns Updated registry
 */
export const registerDiagramEditor = (
  registry: EditorRegistry,
  type: DiagramEditorType,
  factory: EditorFactory<DiagramEditorAdapter>
): EditorRegistry => ({
  ...registry,
  diagram: { ...registry.diagram, [type]: factory },
});
