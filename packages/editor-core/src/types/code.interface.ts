/**
 * Code editor adapter interface for code editing
 * @module @grain/editor-core/types/code
 */

/**
 * Supported programming languages for syntax highlighting
 */
export type SupportedLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "rust"
  | "go"
  | "java"
  | "c"
  | "cpp"
  | "csharp"
  | "ruby"
  | "php"
  | "html"
  | "css"
  | "scss"
  | "json"
  | "yaml"
  | "toml"
  | "markdown"
  | "sql"
  | "shell"
  | "xml"
  | "plaintext";

/**
 * Code editor adapter interface
 * Defines the contract for code editing implementations
 */
export interface CodeEditorAdapter {
  // ============================================
  // Content Operations
  // ============================================

  /**
   * Get the current editor content as plain text
   * @returns The code content as a string
   */
  getContent(): string;

  /**
   * Set the editor content
   * @param content - The code content to load
   */
  setContent(content: string): void;

  // ============================================
  // Language
  // ============================================

  /**
   * Get the current language mode
   * @returns The current language
   */
  getLanguage(): SupportedLanguage;

  /**
   * Set the language mode for syntax highlighting
   * @param language - The language to set
   */
  setLanguage(language: SupportedLanguage): void;

  // ============================================
  // Code Operations
  // ============================================

  /**
   * Format the code using the appropriate formatter
   * @returns Promise that resolves when formatting is complete
   */
  formatCode(): Promise<void>;

  /**
   * Insert a code snippet at the current cursor position
   * @param snippet - The snippet to insert
   */
  insertSnippet(snippet: string): void;

  /**
   * Get the currently selected text
   * @returns The selected text, or empty string if no selection
   */
  getSelectedText(): string;

  /**
   * Replace the current selection with new text
   * @param text - The text to replace the selection with
   */
  replaceSelection(text: string): void;

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Register a callback for content changes
   * @param callback - Function called when content changes
   * @returns Unsubscribe function
   */
  onChange(callback: (content: string) => void): () => void;

  /**
   * Register a callback for focus events
   * @param callback - Function called when editor gains focus
   * @returns Unsubscribe function
   */
  onFocus(callback: () => void): () => void;

  /**
   * Register a callback for blur events
   * @param callback - Function called when editor loses focus
   * @returns Unsubscribe function
   */
  onBlur(callback: () => void): () => void;

  /**
   * Register a callback for save events (e.g., Ctrl+S)
   * @param callback - Function called when save is triggered
   * @returns Unsubscribe function
   */
  onSave(callback: () => void): () => void;

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
