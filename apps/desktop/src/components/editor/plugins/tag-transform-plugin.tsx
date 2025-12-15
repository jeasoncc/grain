/**
 * Tag Transform Plugin - 自动将 #[标签名] 文本转换为 TagNode
 *
 * 功能：
 * - 监听文本变化，自动识别 #[xxx] 格式
 * - 将匹配的文本转换为 TagNode
 * - 支持中文、英文、数字、下划线
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  TextNode,
} from "lexical";
import { useEffect } from "react";

import { $createTagNode, TagNode } from "@/components/editor/nodes/tag-node";

// 匹配完整的 #[标签名] 格式
const TAG_PATTERN = /#\[([\u4e00-\u9fa5a-zA-Z0-9_]+)\]/g;

function findAndTransformTag(node: TextNode): null | TextNode {
  const text = node.getTextContent();

  // 重置正则表达式的 lastIndex
  TAG_PATTERN.lastIndex = 0;
  const match = TAG_PATTERN.exec(text);

  if (match === null) {
    return null;
  }

  const tagName = match[1];
  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;

  let targetNode: TextNode;

  // 如果匹配不在文本开头，需要先分割
  if (matchStart === 0) {
    [targetNode] = node.splitText(matchEnd);
  } else {
    [, targetNode] = node.splitText(matchStart, matchEnd);
  }

  // 创建 TagNode 替换匹配的文本
  const tagNode = $createTagNode(tagName);
  targetNode.replace(tagNode);

  return tagNode;
}

function textNodeTransform(node: TextNode): void {
  // 不要转换已经是 TagNode 的节点
  if (node instanceof TagNode) {
    return;
  }

  let currentNode: TextNode | null = node;

  // 循环处理，因为一个文本节点可能包含多个标签
  while (currentNode !== null) {
    const nextNode = findAndTransformTag(currentNode);
    if (nextNode === null) {
      break;
    }
    // 获取下一个兄弟节点继续处理
    const sibling = nextNode.getNextSibling();
    currentNode = $isTextNode(sibling) ? sibling : null;
  }
}

export default function TagTransformPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // 注册文本节点转换
    const removeTransform = editor.registerNodeTransform(
      TextNode,
      textNodeTransform
    );

    return () => {
      removeTransform();
    };
  }, [editor]);

  return null;
}
