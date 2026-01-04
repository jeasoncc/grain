/**
 * MonacoDiagramAdapter - Implements DiagramEditorAdapter for Monaco
 * @module @grain/editor-monaco/diagram
 */

import type { DiagramEditorAdapter, DiagramType } from "@grain/editor-core";
import type { editor } from "monaco-editor";

/**
 * Configuration for creating a MonacoDiagramAdapter
 */
export interface MonacoDiagramAdapterConfig {
  /** The Monaco editor instance */
  editor: editor.IStandaloneCodeEditor;
  /** Monaco module reference */
  monaco: typeof import("monaco-editor");
  /** Initial diagram type */
  diagramType?: DiagramType;
  /** Preview element reference */
  previewElement?: HTMLElement | null;
  /** Render function */
  renderFn?: (source: string, type: DiagramType) => Promise<string>;
}

/**
 * Creates a DiagramEditorAdapter implementation for Monaco
 */
export const createMonacoDiagramAdapter = (
  config: MonacoDiagramAdapterConfig
): DiagramEditorAdapter => {
  const { editor } = config;
  let currentDiagramType: DiagramType = config.diagramType ?? "mermaid";
  let previewElement: HTMLElement | null = config.previewElement ?? null;

  // Store callbacks for cleanup
  const changeCallbacks = new Set<(source: string) => void>();
  const renderCompleteCallbacks = new Set<(svg: string) => void>();
  const renderErrorCallbacks = new Set<(error: Error) => void>();

  // Register change listener
  const changeDisposable = editor.onDidChangeModelContent(() => {
    const source = editor.getValue();
    for (const callback of changeCallbacks) {
      callback(source);
    }
  });

  return {
    // ============================================
    // Content Operations
    // ============================================

    getSource(): string {
      return editor.getValue();
    },

    setSource(source: string): void {
      editor.setValue(source);
    },

    // ============================================
    // Diagram Type
    // ============================================

    getDiagramType(): DiagramType {
      return currentDiagramType;
    },

    setDiagramType(type: DiagramType): void {
      currentDiagramType = type;
    },

    // ============================================
    // Rendering
    // ============================================

    async render(): Promise<string> {
      const source = editor.getValue();

      if (config.renderFn) {
        try {
          const svg = await config.renderFn(source, currentDiagramType);
          
          if (previewElement) {
            previewElement.innerHTML = svg;
          }

          for (const callback of renderCompleteCallbacks) {
            callback(svg);
          }

          return svg;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          for (const callback of renderErrorCallbacks) {
            callback(err);
          }
          throw err;
        }
      }

      // Default: no render function provided
      const error = new Error("No render function provided");
      for (const callback of renderErrorCallbacks) {
        callback(error);
      }
      throw error;
    },

    getPreviewElement(): HTMLElement | null {
      return previewElement;
    },

    // ============================================
    // Event Handlers
    // ============================================

    onChange(callback: (source: string) => void): () => void {
      changeCallbacks.add(callback);
      return () => {
        changeCallbacks.delete(callback);
      };
    },

    onRenderComplete(callback: (svg: string) => void): () => void {
      renderCompleteCallbacks.add(callback);
      return () => {
        renderCompleteCallbacks.delete(callback);
      };
    },

    onRenderError(callback: (error: Error) => void): () => void {
      renderErrorCallbacks.add(callback);
      return () => {
        renderErrorCallbacks.delete(callback);
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
      changeCallbacks.clear();
      renderCompleteCallbacks.clear();
      renderErrorCallbacks.clear();
      previewElement = null;
    },
  };
};

/**
 * MonacoDiagramAdapter class for object-oriented usage
 */
export class MonacoDiagramAdapter implements DiagramEditorAdapter {
  private adapter: DiagramEditorAdapter;

  constructor(config: MonacoDiagramAdapterConfig) {
    this.adapter = createMonacoDiagramAdapter(config);
  }

  getSource = () => this.adapter.getSource();
  setSource = (source: string) => this.adapter.setSource(source);
  getDiagramType = () => this.adapter.getDiagramType();
  setDiagramType = (type: DiagramType) => this.adapter.setDiagramType(type);
  render = () => this.adapter.render();
  getPreviewElement = () => this.adapter.getPreviewElement();
  onChange = (callback: (source: string) => void) => this.adapter.onChange(callback);
  onRenderComplete = (callback: (svg: string) => void) => this.adapter.onRenderComplete(callback);
  onRenderError = (callback: (error: Error) => void) => this.adapter.onRenderError(callback);
  focus = () => this.adapter.focus();
  blur = () => this.adapter.blur();
  destroy = () => this.adapter.destroy();
}
