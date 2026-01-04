/**
 * @grain/editor-core
 *
 * Unified editor interfaces and types for Grain editor packages.
 * Provides a pluggable architecture supporting multiple editor implementations
 * (Lexical, Tiptap, Monaco, CodeMirror) with a consistent API.
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

// Config types
export type {
  DocumentEditorType,
  CodeEditorType,
  DiagramEditorType,
  EditorConfig,
  EditorFactory,
  EditorRegistry,
} from "./types/config.interface";

export {
  DEFAULT_EDITOR_CONFIG,
  createEditorRegistry,
  registerDocumentEditor,
  registerCodeEditor,
  registerDiagramEditor,
} from "./types/config.interface";

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
// Components
// ============================================

export {
  EditorProvider,
  useEditorConfig,
  useEditorConfigSafe,
  useDocumentEditorType,
  useCodeEditorType,
  useDiagramEditorType,
} from "./components/editor-provider";

export type { EditorProviderProps } from "./components/editor-provider";

export {
  EditorSelector,
  createLazyEditorRegistry,
  useLazyEditor,
} from "./components/editor-selector";

export type {
  DocumentEditorProps,
  CodeEditorProps,
  DiagramEditorProps,
  EditorComponentRegistry,
  LazyEditorRegistry,
  EditorSelectorProps,
} from "./components/editor-selector";

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
