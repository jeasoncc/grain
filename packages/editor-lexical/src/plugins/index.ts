/**
 * Editor Plugins
 * 
 * This module exports all custom editor plugins and commonly used Lexical plugins.
 */

// Custom plugins
// TEMPORARILY DISABLED: Mentions plugins (has dependency issues)
// export { default as MentionsPlugin } from "./mentions-plugin";
// export type { 
//   MentionsPluginProps, 
//   MentionEntry,
//   WikiEntryInterface, // deprecated, use MentionEntry
//   MenuTextMatch as MentionMenuTextMatch 
// } from "./mentions-plugin";

// export { default as MentionTooltipPlugin } from "./mention-tooltip-plugin";
// export type { 
//   MentionTooltipPluginProps,
//   WikiPreviewState,
//   WikiHoverPreviewHook
// } from "./mention-tooltip-plugin";

export { default as TagTransformPlugin } from "./tag-transform-plugin";

export { default as CodeHighlightPlugin } from "./code-highlight-plugin";
export { default as CodeBlockShortcutPlugin } from "./code-block-shortcut-plugin";
export { default as PrismLanguagesPlugin } from "./prism-languages-plugin";
export { default as ChecklistShortcutPlugin } from "./checklist-shortcut-plugin";
// TEMPORARILY DISABLED: Table plugins (has dependency issues)
// export { default as TableShortcutPlugin } from "./table-shortcut-plugin";
export { default as HorizontalRuleShortcutPlugin } from "./horizontal-rule-shortcut-plugin";

// Re-export commonly used Lexical plugins for convenience
// 只导出实际在 Editor 中使用的插件
export { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
export { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
export { ListPlugin } from "@lexical/react/LexicalListPlugin";
export { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
export { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
export { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
export { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
export { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
export { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
// TEMPORARILY DISABLED: TablePlugin (has dependency issues)
// export { TablePlugin } from "@lexical/react/LexicalTablePlugin";
export { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
export { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
export { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
export { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
