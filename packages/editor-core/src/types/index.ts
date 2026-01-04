/**
 * Editor core types
 * @module @grain/editor-core/types
 *
 * Note: Multi-editor config types have been removed. Grain now uses Lexical exclusively.
 */

// Content types
export type {
  ContentFormat,
  SerializedContent,
} from "./content.interface";

export {
  createJsonContent,
  createMarkdownContent,
  createHtmlContent,
  parseSerializedContent,
} from "./content.interface";

// Document editor types
export type {
  HeadingLevel,
  ListType,
  PreviewPosition,
  DocumentEditorAdapter,
  MarkdownDocumentEditorAdapter,
} from "./document.interface";

// Code editor types
export type {
  SupportedLanguage,
  CodeEditorAdapter,
} from "./code.interface";

// Diagram editor types
export type {
  DiagramType,
  DiagramEditorAdapter,
} from "./diagram.interface";

// File type resolver
export type {
  EditorType,
  FileTypeMapping,
} from "./file-type.interface";

export {
  FILE_TYPE_MAPPINGS,
  resolveFileType,
  getEditorType,
  getDefaultLanguage,
  getDiagramType,
  isEditorType,
  getExtensionsForEditorType,
} from "./file-type.interface";

// Error types
export type {
  EditorErrorCode,
  EditorError,
} from "./error.interface";

export {
  createEditorError,
  isEditorError,
  contentParseError,
  contentSerializeError,
  unsupportedFormatError,
  editorNotInitializedError,
  renderError,
  migrationError,
} from "./error.interface";
