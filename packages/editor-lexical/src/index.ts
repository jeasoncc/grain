/**
 * @grain/editor-lexical
 * 
 * A reusable Lexical-based rich text editor package for the Grain monorepo.
 * 
 * This package provides:
 * - Document editor (rich text editing with Lexical)
 * - Code editor (syntax highlighting with Prism)
 * - Diagram editor (Mermaid/PlantUML preview)
 * - Custom Lexical nodes (MentionNode, TagNode)
 * - Editor plugins (mentions, tags, tooltips)
 * - Editor themes and styling
 * - TypeScript type definitions
 * 
 * @see Requirements 1.2, 2.2
 */

// ============================================================================
// Styles
// ============================================================================
import "./themes/PlaygroundEditorTheme.css";

// ============================================================================
// Document Editor (Rich Text)
// ============================================================================
export {
  LexicalDocumentEditor,
  LexicalDocumentAdapter,
  createLexicalDocumentAdapter,
} from "./document";

export type {
  LexicalDocumentEditorProps,
  LexicalDocumentEditorHandle,
  LexicalDocumentAdapterConfig,
} from "./document";

// ============================================================================
// Code Editor
// ============================================================================
export {
  LexicalCodeEditor,
  LexicalCodeAdapter,
  createLexicalCodeAdapter,
} from "./code";

export type {
  LexicalCodeEditorProps,
  LexicalCodeEditorHandle,
  LexicalCodeAdapterConfig,
} from "./code";

// ============================================================================
// Diagram Editor
// ============================================================================
export {
  LexicalDiagramEditor,
  LexicalDiagramAdapter,
  createLexicalDiagramAdapter,
} from "./diagram";

export type {
  LexicalDiagramEditorProps,
  LexicalDiagramEditorHandle,
  LexicalDiagramAdapterConfig,
} from "./diagram";

// ============================================================================
// Legacy Components (Backward Compatibility)
// ============================================================================
export {
  Editor,
  EditorInstance,
  EditorInstanceDefault,
  MultiEditorContainer,
  MultiEditorContainerDefault,
} from "./components";

export type {
  EditorProps,
  EditorInstanceProps,
  MultiEditorContainerProps,
} from "./components";

// ============================================================================
// Nodes
// ============================================================================
export {
  EditorNodes,
  MentionNode,
  $createMentionNode,
  $isMentionNode,
  TagNode,
  $createTagNode,
  $isTagNode,
} from "./nodes";

export type {
  SerializedMentionNode,
  SerializedTagNode,
} from "./nodes";

// ============================================================================
// Plugins
// ============================================================================
export {
  MentionsPlugin,
  MentionTooltipPlugin,
  TagTransformPlugin,
  CodeHighlightPlugin,
  CodeBlockShortcutPlugin,
  PrismLanguagesPlugin,
  ChecklistShortcutPlugin,
  TableShortcutPlugin,
  // Re-exported Lexical plugins
  HistoryPlugin,
  RichTextPlugin,
  ListPlugin,
  CheckListPlugin,
  LinkPlugin,
  ClickableLinkPlugin,
  AutoLinkPlugin,
  AutoFocusPlugin,
  HorizontalRulePlugin,
  TablePlugin,
  ClearEditorPlugin,
  MarkdownShortcutPlugin,
  TabIndentationPlugin,
  OnChangePlugin,
} from "./plugins";

export type {
  MentionsPluginProps,
  MentionEntry,
  WikiEntryInterface, // deprecated, use MentionEntry
  MentionMenuTextMatch,
  MentionTooltipPluginProps,
  WikiPreviewState,
  WikiHoverPreviewHook,
} from "./plugins";

// ============================================================================
// Themes
// ============================================================================
export {
  PlaygroundEditorTheme,
} from "./themes";

export type {
  EditorThemeClasses,
} from "./themes";

// ============================================================================
// Types
// ============================================================================
export type {
  SerializedEditorState,
  EditorTab,
  EditorInstanceState,
} from "./types";

// ============================================================================
// Config
// ============================================================================
export {
  FOLD_ICON_OPTIONS,
  DEFAULT_FOLD_ICON_STYLE,
  getFoldIconLetters,
  getFoldIconOption,
} from "./config/fold-icon-config";

export type {
  FoldIconStyle,
  FoldIconOption,
} from "./config/fold-icon-config";

// ============================================================================
// Utils
// ============================================================================
export {
  createInitialDocumentState,
} from "./utils";
