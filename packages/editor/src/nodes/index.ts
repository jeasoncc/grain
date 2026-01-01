/**
 * 节点配置 - 导出所有编辑器需要的节点类型
 *
 * 包含 Lexical 内置节点和自定义节点 (MentionNode, TagNode)
 * 基于 Lexical Playground 的精简配置
 */

import type { Klass, LexicalNode } from "lexical";

// Lexical 内置节点
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { HashtagNode } from "@lexical/hashtag";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { OverflowNode } from "@lexical/overflow";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";

// 自定义节点
import { MentionNode } from "./mention-node";
import { TagNode } from "./tag-node";
import {
  CollapsibleContainerNode,
  CollapsibleTitleNode,
  CollapsibleContentNode,
} from "./collapsible-nodes";

/**
 * 编辑器节点配置
 * 包含所有需要注册到 LexicalComposer 的节点类型
 */
export const EditorNodes: Array<Klass<LexicalNode>> = [
  // 富文本节点
  HeadingNode,
  QuoteNode,

  // 列表节点
  ListNode,
  ListItemNode,

  // 链接节点
  LinkNode,
  AutoLinkNode,

  // 代码节点
  CodeNode,
  CodeHighlightNode,

  // 表格节点
  TableNode,
  TableCellNode,
  TableRowNode,

  // 其他内置节点
  HorizontalRuleNode,
  HashtagNode,
  OverflowNode,

  // 自定义节点
  MentionNode,
  TagNode,
  CollapsibleContainerNode,
  CollapsibleTitleNode,
  CollapsibleContentNode,
];

// 导出自定义节点及其辅助函数
export {
  MentionNode,
  $createMentionNode,
  $isMentionNode,
  type SerializedMentionNode,
} from "./mention-node";

export {
  TagNode,
  $createTagNode,
  $isTagNode,
  type SerializedTagNode,
} from "./tag-node";

export {
  CollapsibleContainerNode,
  CollapsibleTitleNode,
  CollapsibleContentNode,
  $createCollapsibleContainerNode,
  $createCollapsibleTitleNode,
  $createCollapsibleContentNode,
  $isCollapsibleContainerNode,
  $isCollapsibleTitleNode,
  $isCollapsibleContentNode,
} from "./collapsible-nodes";
