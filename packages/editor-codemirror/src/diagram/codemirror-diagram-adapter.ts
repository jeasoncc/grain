/**
 * CodeMirrorDiagramAdapter - Implements DiagramEditorAdapter for CodeMirror
 * @module @grain/editor-codemirror/diagram
 */

import type { DiagramEditorAdapter, DiagramType } from "@grain/editor-core";
import type { CodeMirrorDiagramAdapterConfig } from "./codemirror-diagram-editor.types";

/**
 * Creates a DiagramEditorAdapter implementation for CodeMirror
 */
export const createCodeMirrorDiagramAdapter = (
  config: CodeMirrorDiagramAdapterConfig
): DiagramEditorAdapter => {
  const { view } = config;
  let currentDiagramType: DiagramType = config.diagramType ?? "mermaid";
  let previewElement = config.previewElement ?? null;

  // Store callbacks for cleanup
  const changeCallbacks = new Set<(source: string) => void>();
  const renderCompleteCallbacks = new Set<(svg: string) => void>();
  const renderErrorCallbacks = new Set<(error: Error) => void>();

  /**
   * Render Mermaid diagram
   */
  const renderMermaid = async (source: string): Promise<string> => {
    try {
      const mermaid = await import("mermaid");
      mermaid.default.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
      });

      const { svg } = await mermaid.default.render(
        `mermaid-${Date.now()}`,
        source
      );
      return svg;
    } catch (error) {
      throw new Error(
        `Mermaid render failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  /**
   * Render PlantUML diagram
   */
  const renderPlantUML = async (source: string): Promise<string> => {
    const encoded = btoa(unescape(encodeURIComponent(source)));
    const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`PlantUML server error: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      throw new Error(
        `PlantUML render failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  return {
    // ============================================
    // Content Operations
    // ============================================

    getSource(): string {
      return view.state.doc.toString();
    },

    setSource(source: string): void {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: source },
      });
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
      const source = view.state.doc.toString();
      if (!source.trim()) {
        return "";
      }

      try {
        let svg: string;
        if (currentDiagramType === "mermaid") {
          svg = await renderMermaid(source);
        } else {
          svg = await renderPlantUML(source);
        }

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
      view.focus();
    },

    blur(): void {
      view.contentDOM.blur();
    },

    destroy(): void {
      changeCallbacks.clear();
      renderCompleteCallbacks.clear();
      renderErrorCallbacks.clear();
      previewElement = null;
    },
  };
};

/**
 * CodeMirrorDiagramAdapter class for object-oriented usage
 */
export class CodeMirrorDiagramAdapter implements DiagramEditorAdapter {
  private adapter: DiagramEditorAdapter;

  constructor(config: CodeMirrorDiagramAdapterConfig) {
    this.adapter = createCodeMirrorDiagramAdapter(config);
  }

  getSource = () => this.adapter.getSource();
  setSource = (source: string) => this.adapter.setSource(source);
  getDiagramType = () => this.adapter.getDiagramType();
  setDiagramType = (type: DiagramType) => this.adapter.setDiagramType(type);
  render = () => this.adapter.render();
  getPreviewElement = () => this.adapter.getPreviewElement();
  onChange = (callback: (source: string) => void) => this.adapter.onChange(callback);
  onRenderComplete = (callback: (svg: string) => void) =>
    this.adapter.onRenderComplete(callback);
  onRenderError = (callback: (error: Error) => void) =>
    this.adapter.onRenderError(callback);
  focus = () => this.adapter.focus();
  blur = () => this.adapter.blur();
  destroy = () => this.adapter.destroy();
}
