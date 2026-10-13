/**
 * LexicalDiagramAdapter - Implements DiagramEditorAdapter for Lexical
 * @module @grain/editor-lexical/diagram
 */

import type { DiagramEditorAdapter, DiagramType } from "@grain/editor-core";
import type { LexicalEditor } from "lexical";
import { $createParagraphNode, $createTextNode, $getRoot } from "lexical";
import mermaid from "mermaid";

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
  let renderVersion = 0;
  let destroyed = false;
  const renderContainers = new Set<HTMLDivElement>();

  // Store callbacks for cleanup
  const changeCallbacks = new Set<(source: string) => void>();
  const renderCompleteCallbacks = new Set<(svg: string) => void>();
  const renderErrorCallbacks = new Set<(error: Error) => void>();

  // Register update listener for change events
  const removeUpdateListener = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
    if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
      ++renderVersion;
      if (previewElement) previewElement.innerHTML = "";
    }
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
  const renderDiagram = async (source: string): Promise<string> => {
    const version = ++renderVersion;
    let renderContainer: HTMLDivElement | undefined;
    if (previewElement) previewElement.innerHTML = "";
    try {
      if (destroyed) throw new Error("Cannot render a destroyed diagram editor");
      if (currentDiagramType === "plantuml") {
        throw new Error("PlantUML preview is unavailable. A server-side renderer is required.");
      }
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        layout: "dagre",
        look: "classic",
        securityLevel: "loose",
      });

      // Contain Mermaid's temporary SVG, including the SVG left on parse failure.
      renderContainer = document.createElement("div");
      renderContainer.setAttribute("aria-hidden", "true");
      renderContainer.style.cssText = "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none";
      document.body.append(renderContainer);
      renderContainers.add(renderContainer);
      const { svg } = await mermaid.render(
        `mermaid-${crypto.randomUUID()}`,
        source,
        renderContainer
      );
      if (destroyed || version !== renderVersion) return svg;

      // Update preview element if available
      if (previewElement) {
        previewElement.innerHTML = svg;
      }

      // Notify callbacks
      for (const callback of renderCompleteCallbacks) {
        if (destroyed || version !== renderVersion) break;
        callback(svg);
      }

      return svg;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (!destroyed && version === renderVersion) {
        if (previewElement) previewElement.innerHTML = "";
        for (const callback of renderErrorCallbacks) {
          if (destroyed || version !== renderVersion) break;
          callback(err);
        }
      }
      throw err;
    } finally {
      if (renderContainer) {
        renderContainer.remove();
        renderContainers.delete(renderContainer);
      }
    }
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
      ++renderVersion;
      if (previewElement) previewElement.innerHTML = "";
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        // Keep a block child even for empty source; childless roots are invalid.
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(source));
        root.append(paragraph);
      }, { discrete: true });
    },

    // ============================================
    // Diagram Type
    // ============================================

    getDiagramType(): DiagramType {
      return currentDiagramType;
    },

    setDiagramType(type: DiagramType): void {
      currentDiagramType = type;
      ++renderVersion;
      if (previewElement) previewElement.innerHTML = "";
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

      return renderDiagram(source);
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
      destroyed = true;
      ++renderVersion;
      for (const container of renderContainers) container.remove();
      renderContainers.clear();
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
