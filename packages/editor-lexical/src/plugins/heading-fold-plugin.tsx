/**
 * 标题折叠插件
 * 
 * 功能：点击标题前的符号可以折叠/展开该标题下的所有内容
 * 折叠后显示 ... 省略号（类似 Vim）
 * 
 * 规则：
 * - H1 折叠到下一个 H1
 * - H2 折叠到下一个 H1 或 H2
 * - H3 折叠到下一个 H1、H2 或 H3
 * - 以此类推
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode, HeadingNode, HeadingTagType } from "@lexical/rich-text";
import {
  $getNodeByKey,
  $getRoot,
  LexicalNode,
  NodeKey,
  ElementNode,
} from "lexical";
import { useEffect, useState, useCallback } from "react";
import type React from "react";
import { createPortal } from "react-dom";
import { 
  type FoldIconStyle, 
  getFoldIconLetters, 
  DEFAULT_FOLD_ICON_STYLE 
} from "../config/fold-icon-config";

// 标题层级映射
const HEADING_LEVELS: Record<HeadingTagType, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

interface FoldState {
  [key: NodeKey]: boolean; // true = 折叠
}

interface FoldButtonProps {
  readonly nodeKey: NodeKey;
  readonly isFolded: boolean;
  readonly element: HTMLElement;
  readonly headingLevel: number;
  readonly letters: readonly string[];
  readonly onToggle: (key: NodeKey) => void;
}

/**
 * 折叠按钮组件 - 可配置字母指示器
 */
function FoldButton({ nodeKey, isFolded, element, headingLevel, letters, onToggle }: FoldButtonProps) {
  const rect = element.getBoundingClientRect();
  const editorRect = element.closest('[data-lexical-editor]')?.getBoundingClientRect();
  
  if (!editorRect) return null;

  // 根据标题层级选择字母
  const letter = letters[headingLevel - 1] || letters[0];

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${rect.left - editorRect.left - 20}px`,
    top: `${rect.top - editorRect.top + (rect.height / 2) - 8}px`,
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontFamily: 'serif',
    color: isFolded ? 'var(--primary)' : 'var(--muted-foreground)',
    transition: 'color 0.15s ease, transform 0.15s ease',
    userSelect: 'none',
    zIndex: 10,
    opacity: isFolded ? 1 : 0.5,
  };

  return (
    <div
      style={style}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(nodeKey);
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.color = 'var(--primary)';
        el.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.color = isFolded ? 'var(--primary)' : 'var(--muted-foreground)';
        el.style.opacity = isFolded ? '1' : '0.5';
      }}
      title={isFolded ? '展开' : '折叠'}
    >
      {letter}
    </div>
  );
}

/**
 * 省略号标记组件 - 折叠后截断标题并显示省略号
 */
function FoldEllipsis({ element }: { readonly element: HTMLElement }) {
  const rect = element.getBoundingClientRect();
  const editorRect = element.closest('[data-lexical-editor]')?.getBoundingClientRect();
  
  if (!editorRect) return null;

  // 隐藏原标题内容，显示截断版本
  useEffect(() => {
    const originalDisplay = element.style.overflow;
    const originalWhiteSpace = element.style.whiteSpace;
    const originalTextOverflow = element.style.textOverflow;
    const originalMaxWidth = element.style.maxWidth;
    
    element.style.overflow = 'hidden';
    element.style.whiteSpace = 'nowrap';
    element.style.textOverflow = 'ellipsis';
    element.style.maxWidth = '300px';
    
    return () => {
      element.style.overflow = originalDisplay;
      element.style.whiteSpace = originalWhiteSpace;
      element.style.textOverflow = originalTextOverflow;
      element.style.maxWidth = originalMaxWidth;
    };
  }, [element]);

  // 在标题后显示折叠行数提示
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${Math.min(rect.right - editorRect.left + 8, 340)}px`,
    top: `${rect.top - editorRect.top + (rect.height / 2) - 9}px`,
    padding: '2px 8px',
    fontSize: '11px',
    fontFamily: 'var(--font-mono, monospace)',
    color: 'var(--muted-foreground)',
    backgroundColor: 'color-mix(in srgb, var(--muted) 80%, transparent)',
    borderRadius: '4px',
    userSelect: 'none',
    pointerEvents: 'none',
    opacity: 0.8,
  };

  return <span style={style}>···</span>;
}

export interface HeadingFoldPluginProps {
  /** 折叠图标风格 */
  readonly foldIconStyle?: FoldIconStyle;
}

export default function HeadingFoldPlugin({ 
  foldIconStyle = DEFAULT_FOLD_ICON_STYLE 
}: HeadingFoldPluginProps = {}): React.ReactElement | null {
  const [editor] = useLexicalComposerContext();
  const [foldState, setFoldState] = useState<FoldState>({});
  const [headingElements, setHeadingElements] = useState<Map<NodeKey, { element: HTMLElement; level: number }>>(new Map());
  const [editorContainer, setEditorContainer] = useState<HTMLElement | null>(null);
  
  // 获取当前风格的字母列表
  const letters = getFoldIconLetters(foldIconStyle);

  // 获取标题下属的所有节点
  const getNodesUnderHeading = useCallback((headingNode: HeadingNode): LexicalNode[] => {
    const nodes: LexicalNode[] = [];
    const headingLevel = HEADING_LEVELS[headingNode.getTag()];
    
    let sibling = headingNode.getNextSibling();
    while (sibling) {
      // 遇到同级或更高级标题时停止
      if ($isHeadingNode(sibling)) {
        const siblingLevel = HEADING_LEVELS[sibling.getTag()];
        if (siblingLevel <= headingLevel) {
          break;
        }
      }
      nodes.push(sibling);
      sibling = sibling.getNextSibling();
    }
    
    return nodes;
  }, []);

  // 切换折叠状态
  const toggleFold = useCallback((nodeKey: NodeKey) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isHeadingNode(node)) return;

      const isFolded = foldState[nodeKey];
      const nodesUnder = getNodesUnderHeading(node);

      // 切换显示/隐藏
      for (const n of nodesUnder) {
        const element = editor.getElementByKey(n.getKey());
        if (element) {
          if (isFolded) {
            // 展开
            element.style.display = '';
            element.style.height = '';
            element.style.overflow = '';
          } else {
            // 折叠
            element.style.display = 'none';
          }
        }
      }
    });

    setFoldState(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey],
    }));
  }, [editor, foldState, getNodesUnderHeading]);

  // 监听编辑器更新，收集标题元素
  useEffect(() => {
    const container = editor.getRootElement()?.parentElement;
    setEditorContainer(container || null);

    const updateHeadings = () => {
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const newHeadingElements = new Map<NodeKey, { element: HTMLElement; level: number }>();
        
        const processNode = (node: LexicalNode) => {
          if ($isHeadingNode(node)) {
            const element = editor.getElementByKey(node.getKey());
            if (element) {
              const level = HEADING_LEVELS[node.getTag()];
              newHeadingElements.set(node.getKey(), { element, level });
            }
          }
          if (node instanceof ElementNode) {
            for (const child of node.getChildren()) {
              processNode(child);
            }
          }
        };

        for (const child of root.getChildren()) {
          processNode(child);
        }

        setHeadingElements(newHeadingElements);
      });
    };

    // 初始更新
    updateHeadings();

    // 监听编辑器变化
    const removeListener = editor.registerUpdateListener(() => {
      updateHeadings();
    });

    return removeListener;
  }, [editor]);

  // 渲染折叠按钮
  if (!editorContainer || headingElements.size === 0) {
    return null;
  }

  return createPortal(
    <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto' }}>
        {Array.from(headingElements.entries()).map(([key, { element, level }]) => (
          <FoldButton
            key={key}
            nodeKey={key}
            isFolded={!!foldState[key]}
            element={element}
            headingLevel={level}
            letters={letters}
            onToggle={toggleFold}
          />
        ))}
      </div>
      {/* 折叠省略号 */}
      {Array.from(headingElements.entries())
        .filter(([key]) => foldState[key])
        .map(([key, { element }]) => (
          <FoldEllipsis key={`ellipsis-${key}`} element={element} />
        ))}
    </div>,
    editorContainer
  );
}
