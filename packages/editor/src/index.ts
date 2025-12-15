/**
 * @novel-editor/editor
 * 
 * A reusable Lexical-based rich text editor package for the Novel Editor monorepo.
 * 
 * This package provides:
 * - Core editor components (Editor, EditorInstance, MultiEditorContainer)
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
// Components
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
  TagPickerPlugin,
  TagTransformPlugin,
  // Re-exported Lexical plugins
  HistoryPlugin,
  RichTextPlugin,
  ListPlugin,
  LinkPlugin,
  MarkdownShortcutPlugin,
  TabIndentationPlugin,
  OnChangePlugin,
} from "./plugins";

export type {
  MentionsPluginProps,
  WikiEntryInterface,
  MentionMenuTextMatch,
  MentionTooltipPluginProps,
  WikiPreviewState,
  WikiHoverPreviewHook,
  TagPickerPluginProps,
  TagInterface,
  TagMenuTextMatch,
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
