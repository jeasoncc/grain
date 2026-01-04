/**
 * @grain/editor-core
 *
 * Unified editor interfaces and types for Grain editor packages.
 * Provides core types and utilities for the Lexical editor.
 *
 * Note: Multi-editor support has been removed. Grain now uses Lexical exclusively.
 *
 * @packageDocumentation
 */

// ============================================
// Types
// ============================================

// Content types
export type {
  ContentFormat,
  SerializedContent,
} from "./types/content.interface";

export {
  createJsonContent,
  createMarkdownContent,
  createHtmlContent,
  parseSerializedContent,
} from "./types/content.interface";

// Document editor types
export type {
  HeadingLevel,
  ListType,
  PreviewPosition,
  DocumentEditorAdapter,
  MarkdownDocumentEditorAdapter,
} from "./types/document.interface";

// Code editor types
export type {
  SupportedLanguage,
  CodeEditorAdapter,
} from "./types/code.interface";

// Diagram editor types
export type {
  DiagramType,
  DiagramEditorAdapter,
} from "./types/diagram.interface";

// File type resolver
export type {
  EditorType,
  FileTypeMapping,
} from "./types/file-type.interface";

export {
  FILE_TYPE_MAPPINGS,
  resolveFileType,
  getEditorType,
  getDefaultLanguage,
  getDiagramType,
  isEditorType,
  getExtensionsForEditorType,
} from "./types/file-type.interface";

// Error types
export type {
  EditorErrorCode,
  EditorError,
} from "./types/error.interface";

export {
  createEditorError,
  isEditorError,
  contentParseError,
  contentSerializeError,
  unsupportedFormatError,
  editorNotInitializedError,
  renderError,
  migrationError,
} from "./types/error.interface";

// ============================================
// Utils
// ============================================

export type {
  ConversionResult,
  ContentConverter,
} from "./utils/content-converter";

export {
  conversionSuccess,
  conversionFailure,
  jsonToMarkdownConverter,
  markdownToJsonConverter,
  jsonToHtmlConverter,
  htmlToJsonConverter,
  markdownToHtmlConverter,
  htmlToMarkdownConverter,
  converters,
  findConverter,
  convertContent,
  convertContentWithFallback,
} from "./utils/content-converter";
