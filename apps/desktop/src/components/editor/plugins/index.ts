/**
 * 编辑器插件导出
 *
 * 包含 Lexical 内置插件和自定义插件
 * 基于 Lexical Playground 的精简配置
 */

// ============================================
// Lexical 内置插件 (从 @lexical/react 导出)
// ============================================

// 核心插件
export { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
export { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
export { ListPlugin } from "@lexical/react/LexicalListPlugin";
export { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
export { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";

// Markdown 支持
export { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
export { TRANSFORMERS } from "@lexical/markdown";

// 链接支持
export { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
export { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";

// 表格支持
export { TablePlugin } from "@lexical/react/LexicalTablePlugin";

// 其他实用插件
export { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
export { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";

// ============================================
// 自定义插件
// ============================================

// Wiki @提及插件
export { default as MentionsPlugin } from "./mentions-plugin";

// 提及悬浮预览插件
export { default as MentionTooltipPlugin } from "./mention-tooltip-plugin";

// #[tags] 标签选择器插件
export { default as TagPickerPlugin } from "./tag-picker-plugin";
