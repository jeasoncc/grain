/**
 * 编辑器模块导出
 *
 * 基于 Lexical Playground 的精简编辑器实现
 */

// 主编辑器组件
export { default as Editor } from "./Editor";
export type { EditorProps } from "./Editor";

// 节点
export { EditorNodes } from "./nodes";
export {
  MentionNode,
  $createMentionNode,
  $isMentionNode,
  type SerializedMentionNode,
} from "./nodes";
export {
  TagNode,
  $createTagNode,
  $isTagNode,
  type SerializedTagNode,
} from "./nodes";

// 插件
export {
  MentionsPlugin,
  MentionTooltipPlugin,
  TagPickerPlugin,
} from "./plugins";

// 主题
export { default as PlaygroundEditorTheme } from "./themes/PlaygroundEditorTheme";
