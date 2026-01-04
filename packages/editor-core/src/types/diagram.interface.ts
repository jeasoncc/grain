/**
 * Diagram editor adapter interface for diagram editing
 * @module @grain/editor-core/types/diagram
 */

/**
 * Supported diagram types
 */
export type DiagramType = "mermaid" | "plantuml";

/**
 * Diagram editor adapter interface
 * Defines the contract for diagram editing implementations
 */
export interface DiagramEditorAdapter {
  // ============================================
  // Content Operations
  // ============================================

  /**
   * Get the current diagram source code
   * @returns The diagram source as a string
   */
  getSource(): string;

  /**
   * Set the diagram source code
   * @param source - The diagram source to load
   */
  setSource(source: string): void;

  // ============================================
  // Diagram Type
  // ============================================

  /**
   * Get the current diagram type
   * @returns The current diagram type
   */
  getDiagramType(): DiagramType;

  /**
   * Set the diagram type
   * @param type - The diagram type to set
   */
  setDiagramType(type: DiagramType): void;

  // ============================================
  // Rendering
  // ============================================

  /**
   * Render the diagram and return the SVG string
   * @returns Promise that resolves with the SVG string
   */
  render(): Promise<string>;

  /**
   * Get the preview element containing the rendered diagram
   * @returns The preview HTML element, or null if not available
   */
  getPreviewElement(): HTMLElement | null;

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Register a callback for source changes
   * @param callback - Function called when source changes
   * @returns Unsubscribe function
   */
  onChange(callback: (source: string) => void): () => void;

  /**
   * Register a callback for successful render completion
   * @param callback - Function called with the rendered SVG
   * @returns Unsubscribe function
   */
  onRenderComplete(callback: (svg: string) => void): () => void;

  /**
   * Register a callback for render errors
   * @param callback - Function called with the error
   * @returns Unsubscribe function
   */
  onRenderError(callback: (error: Error) => void): () => void;

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Focus the editor
   */
  focus(): void;

  /**
   * Remove focus from the editor
   */
  blur(): void;

  /**
   * Clean up editor resources
   */
  destroy(): void;
}
