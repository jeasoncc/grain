/**
 * LexicalDiagramAdapter - Implements DiagramEditorAdapter for Lexical
 * @module @grain/editor-lexical/diagram
 */

import type { DiagramEditorAdapter, DiagramType } from "@grain/editor-core";
import type { LexicalEditor } from "lexical";
import { $getRoot, COMMAND_PRIORITY_NORMAL, KEY_ENTER_COMMAND } from "lexical";

/**
 * Configuration for creating a LexicalDiagramAdapter
 */
export interface LexicalDiagramAdapterConfig {
  /** The Lexical editor instance */
  editor: LexicalEditor;
  /** Initial diagram type */
  diagramType?: DiagramType;
  /** Preview element reference */
  previewElement?: HTMLElement | null;
}

/**
 * Creates a DiagramEditorAdapter implementation for Lexical
 * 
 * @param config - Configuration containing the Lexical editor instance
 * @returns DiagramEditorAdapter implementation
 */
export const createLexicalDiagramAdapter = (
  config: LexicalDiagramAdapterConfig
): DiagramEditorAdapter => {
  const { editor } = config;
  let currentDiagramType: DiagramType = config.diagramType ?? "mermaid";
  let previewElement: HTMLElement | null = config.previewElement ?? null;

  // Store callbacks for cleanup
  const changeCallbacks = new Set<(source: string) => void>();
  const renderCompleteCallbacks = new Set<(svg: string) => void>();
  const renderErrorCallbacks = new Set<(error: Error) => void>();

  // Register update listener for change events
  const removeUpdateListener = editor.registerUpdateListener(({ editorState }) => {
    if (changeCallbacks.size > 0) {
      editorState.read(() => {
        const root = $getRoot();
        const source = root.getTextContent();
        for (const callback of changeCallbacks) {
          callback(source);
        }
      });
    }
  });

  /**
   * Render the diagram using Mermaid
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

      // Update preview element if available
      if (previewElement) {
        previewElement.innerHTML = svg;
      }

      // Notify callbacks
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
  };

  /**
   * Render PlantUML diagram
   * Note: PlantUML requires server-side rendering
   */
  const renderPlantUML = async (_source: string): Promise<string> => {
    const error = new Error("PlantUML rendering requires server-side support");
    for (const callback of renderErrorCallbacks) {
      callback(error);
    }
    throw error;
  };

  return {
    // ============================================
    // Content Operations
    // ============================================

    getSource(): string {
      let source = "";
      editor.getEditorState().read(() => {
        const root = $getRoot();
        source = root.getTextContent();
      });
      return source;
    },

    setSource(source: string): void {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        const { $createTextNode, $createParagraphNode } = require("lexical");
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(source));
        root.append(paragraph);
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
      let source = "";
      editor.getEditorState().read(() => {
        const root = $getRoot();
        source = root.getTextContent();
      });

      if (currentDiagramType === "mermaid") {
        return renderMermaid(source);
      }
      return renderPlantUML(source);
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
      editor.blur();
    },

    destroy(): void {
      removeUpdateListener();
      changeCallbacks.clear();
      renderCompleteCallbacks.clear();
      renderErrorCallbacks.clear();
      previewElement = null;
    },
  };
};

/**
 * LexicalDiagramAdapter class for object-oriented usage
 */
export class LexicalDiagramAdapter implements DiagramEditorAdapter {
  private adapter: DiagramEditorAdapter;

  constructor(config: LexicalDiagramAdapterConfig) {
    this.adapter = createLexicalDiagramAdapter(config);
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
