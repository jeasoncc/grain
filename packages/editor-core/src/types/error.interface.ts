/**
 * Editor error types for consistent error handling
 * @module @grain/editor-core/types/error
 */

/**
 * Error codes for editor operations
 */
export type EditorErrorCode =
  | "CONTENT_PARSE_ERROR"
  | "CONTENT_SERIALIZE_ERROR"
  | "UNSUPPORTED_FORMAT"
  | "EDITOR_NOT_INITIALIZED"
  | "RENDER_ERROR"
  | "MIGRATION_ERROR";

/**
 * Editor error structure
 */
export interface EditorError {
  /** The error code */
  readonly code: EditorErrorCode;
  /** Human-readable error message */
  readonly message: string;
  /** Additional error details */
  readonly details?: unknown;
}

/**
 * Create an editor error
 * @param code - The error code
 * @param message - The error message
 * @param details - Optional additional details
 * @returns An EditorError object
 */
export const createEditorError = (
  code: EditorErrorCode,
  message: string,
  details?: unknown
): EditorError => ({
  code,
  message,
  details,
});

/**
 * Type guard to check if an error is an EditorError
 * @param error - The error to check
 * @returns true if the error is an EditorError
 */
export const isEditorError = (error: unknown): error is EditorError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as EditorError).code === "string" &&
    typeof (error as EditorError).message === "string"
  );
};

/**
 * Create a content parse error
 * @param message - The error message
 * @param details - Optional parsing details
 * @returns An EditorError for content parsing failures
 */
export const contentParseError = (
  message: string,
  details?: unknown
): EditorError => createEditorError("CONTENT_PARSE_ERROR", message, details);

/**
 * Create a content serialize error
 * @param message - The error message
 * @param details - Optional serialization details
 * @returns An EditorError for content serialization failures
 */
export const contentSerializeError = (
  message: string,
  details?: unknown
): EditorError =>
  createEditorError("CONTENT_SERIALIZE_ERROR", message, details);

/**
 * Create an unsupported format error
 * @param format - The unsupported format
 * @returns An EditorError for unsupported format
 */
export const unsupportedFormatError = (format: string): EditorError =>
  createEditorError("UNSUPPORTED_FORMAT", `Unsupported content format: ${format}`);

/**
 * Create an editor not initialized error
 * @returns An EditorError for uninitialized editor
 */
export const editorNotInitializedError = (): EditorError =>
  createEditorError(
    "EDITOR_NOT_INITIALIZED",
    "Editor has not been initialized"
  );

/**
 * Create a render error
 * @param message - The error message
 * @param details - Optional render details
 * @returns An EditorError for render failures
 */
export const renderError = (message: string, details?: unknown): EditorError =>
  createEditorError("RENDER_ERROR", message, details);

/**
 * Create a migration error
 * @param message - The error message
 * @param details - Optional migration details
 * @returns An EditorError for migration failures
 */
export const migrationError = (
  message: string,
  details?: unknown
): EditorError => createEditorError("MIGRATION_ERROR", message, details);
