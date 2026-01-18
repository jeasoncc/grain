/**
 * 可折叠内容块插件
 * 
 * 快捷键：输入 `>>[空格]` 或 `>>>[空格]` 创建折叠块
 * 
 * 结构：
 * <details>
 *   <summary>标题</summary>
 *   <div>内容</div>
 * </details>
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  LexicalNode,
} from "lexical";
import { useEffect } from "react";
import {
  $createCollapsibleContainerNode,
  $createCollapsibleContentNode,
  $createCollapsibleTitleNode,
  $isCollapsibleContainerNode,
  $isCollapsibleContentNode,
  $isCollapsibleTitleNode,
  CollapsibleContainerNode,
  CollapsibleContentNode,
  CollapsibleTitleNode,
} from "../nodes/collapsible-nodes";

/**
 * 插入折叠块
 */
function insertCollapsible(_text: string): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;

  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode)) return false;

  const textContent = anchorNode.getTextContent();
  
  // 匹配 >> 或 >>> 开头
  if (textContent === ">>" || textContent === ">>>") {
    // 创建折叠块结构
    const container = $createCollapsibleContainerNode(true);
    const title = $createCollapsibleTitleNode();
    const content = $createCollapsibleContentNode();
    const titleParagraph = $createParagraphNode();
    const contentParagraph = $createParagraphNode();

    title.append(titleParagraph);
    content.append(contentParagraph);
    container.append(title, content);

    // 替换当前段落
    const paragraph = anchorNode.getParent();
    if (paragraph) {
      paragraph.replace(container);
      titleParagraph.select();
    }

    return true;
  }

  return false;
}

export default function CollapsiblePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // 注册节点（如果尚未注册）
    if (!editor.hasNodes([CollapsibleContainerNode, CollapsibleTitleNode, CollapsibleContentNode])) {
      console.warn(
        "CollapsiblePlugin: CollapsibleNodes not registered. " +
        "Make sure to include them in your editor config."
      );
    }
  }, [editor]);

  // 监听空格键触发折叠块创建
  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === " ") {
        editor.update(() => {
          const didInsert = insertCollapsible(" ");
          if (didInsert) {
            event.preventDefault();
          }
        });
      }
    };

    rootElement.addEventListener("keydown", handleKeydown);
    return () => rootElement.removeEventListener("keydown", handleKeydown);
  }, [editor]);

  // 处理方向键导航
  useEffect(() => {
    // 从标题向下移动到内容
    const removeArrowDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        const node = selection.anchor.getNode();
        const parent = node.getParent();
        
        if ($isCollapsibleTitleNode(parent)) {
          const container = parent.getParent();
          if ($isCollapsibleContainerNode(container)) {
            const content = container.getChildAtIndex(1);
            if ($isCollapsibleContentNode(content)) {
              const firstChild = content.getFirstChild();
              if (firstChild) {
                firstChild.selectStart();
                return true;
              }
            }
          }
        }
        
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    // 从内容向上移动到标题
    const removeArrowUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        const node = selection.anchor.getNode();
        const parent = node.getParent();
        const grandParent = parent?.getParent();
        
        if ($isCollapsibleContentNode(grandParent)) {
          // 检查是否在内容的第一个子节点
          const firstChild = grandParent.getFirstChild();
          if (firstChild && (node === firstChild || parent === firstChild)) {
            const container = grandParent.getParent();
            if ($isCollapsibleContainerNode(container)) {
              const title = container.getChildAtIndex(0);
              if ($isCollapsibleTitleNode(title)) {
                const titleChild = title.getFirstChild();
                if (titleChild) {
                  titleChild.selectEnd();
                  return true;
                }
              }
            }
          }
        }
        
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    return () => {
      removeArrowDown();
      removeArrowUp();
    };
  }, [editor]);

  // Ctrl+Enter 跳出折叠块
  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const handleKeydown = (event: KeyboardEvent) => {
      // Ctrl+Enter 或 Cmd+Enter 跳出折叠块
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.shiftKey) {
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          const node = selection.anchor.getNode();
          
          // 向上查找 CollapsibleContainerNode
          let current: LexicalNode | null = node;
          while (current) {
            if ($isCollapsibleContainerNode(current)) {
              event.preventDefault();
              const paragraph = $createParagraphNode();
              current.insertAfter(paragraph);
              paragraph.select();
              return;
            }
            current = current.getParent();
          }
        });
      }
    };

    rootElement.addEventListener("keydown", handleKeydown);
    return () => rootElement.removeEventListener("keydown", handleKeydown);
  }, [editor]);

  return null;
}

// 导出节点供外部注册
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
} from "../nodes/collapsible-nodes";
