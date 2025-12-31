/**
 * Editor Plugins
 * 
 * This module exports all custom editor plugins and commonly used Lexical plugins.
 */

// Custom plugins
export { default as MentionsPlugin } from "./mentions-plugin";
export type { 
  MentionsPluginProps, 
  MentionEntry,
  WikiEntryInterface, // deprecated, use MentionEntry
  MenuTextMatch as MentionMenuTextMatch 
} from "./mentions-plugin";

export { default as MentionTooltipPlugin } from "./mention-tooltip-plugin";
export type { 
  MentionTooltipPluginProps,
  WikiPreviewState,
  WikiHoverPreviewHook
} from "./mention-tooltip-plugin";

export { default as TagTransformPlugin } from "./tag-transform-plugin";

export { default as CodeHighlightPlugin } from "./code-highlight-plugin";

// Re-export commonly used Lexical plugins for convenience
export { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
export { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
export { ListPlugin } from "@lexical/react/LexicalListPlugin";
export { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
export { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
export { TablePlugin } from "@lexical/react/LexicalTablePlugin";
export { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
export { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
export { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
export { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
export { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
