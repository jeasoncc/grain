/**
 * Editor Plugins
 * 
 * This module exports all custom editor plugins and commonly used Lexical plugins.
 */

// Custom plugins
export { default as MentionsPlugin } from "./mentions-plugin";
export type { 
  MentionsPluginProps, 
  WikiEntryInterface, 
  MenuTextMatch as MentionMenuTextMatch 
} from "./mentions-plugin";

export { default as MentionTooltipPlugin } from "./mention-tooltip-plugin";
export type { 
  MentionTooltipPluginProps,
  WikiPreviewState,
  WikiHoverPreviewHook
} from "./mention-tooltip-plugin";

export { default as TagPickerPlugin } from "./tag-picker-plugin";
export type { 
  TagPickerPluginProps,
  TagInterface,
  MenuTextMatch as TagMenuTextMatch
} from "./tag-picker-plugin";

export { default as TagTransformPlugin } from "./tag-transform-plugin";

// Re-export commonly used Lexical plugins for convenience
export { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
export { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
export { ListPlugin } from "@lexical/react/LexicalListPlugin";
export { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
export { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
export { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
export { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
