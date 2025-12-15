/**
 * EditorInstance - 单个编辑器实例包装器
 *
 * 包装单个 Lexical 编辑器实例，管理：
 * - 滚动位置监听和恢复
 * - 内容变化回调
 * - 可见性控制 (CSS visibility)
 * - 独立的 undo/redo 历史记录 (通过独立的 Editor 实例实现)
 *
 * 历史记录隔离 (Requirements 6.3):
 * 每个 EditorInstance 创建独立的 Editor 组件，
 * 每个 Editor 有自己的 LexicalComposer 和 HistoryPlugin，
 * 确保 undo/redo 操作在不同标签页之间完全隔离。
 *
 * @see Requirements 3.1, 3.2, 3.3, 6.3
 */

import type { SerializedEditorState } from "lexical";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";

import Editor from "./Editor";

export interface EditorInstanceProps {
  /** 标签页 ID */
  tabId: string;
  /** 初始内容 (JSON 字符串) */
  initialState?: string | null;
  /** 是否可见 */
  isVisible: boolean;
  /** 初始滚动位置 */
  initialScrollTop?: number;
  /** 内容变化回调 */
  onContentChange?: (state: SerializedEditorState) => void;
  /** 滚动位置变化回调 */
  onScrollChange?: (scrollTop: number) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否只读 */
  readOnly?: boolean;
}

/**
 * 编辑器实例包装器组件
 *
 * 每个打开的文件对应一个 EditorInstance，通过 CSS visibility 控制显示/隐藏。
 * 隐藏的编辑器保留完整状态（光标、滚动、undo历史）。
 */
export function EditorInstance({
  tabId,
  initialState,
  isVisible,
  initialScrollTop = 0,
  onContentChange,
  onScrollChange,
  placeholder,
  readOnly = false,
}: EditorInstanceProps): React.ReactElement {
  // 滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // 是否已恢复初始滚动位置
  const hasRestoredScroll = useRef(false);
  // 上一次的滚动位置，用于防止重复触发
  const lastScrollTop = useRef(initialScrollTop);

  /**
   * 处理内容变化
   * 将序列化的编辑器状态传递给父组件
   */
  const handleContentChange = useCallback(
    (state: SerializedEditorState) => {
      onContentChange?.(state);
    },
    [onContentChange]
  );

  /**
   * 处理滚动事件
   * 节流处理，避免频繁更新状态
   */
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;

    // 只有当滚动位置变化超过阈值时才触发回调
    if (Math.abs(scrollTop - lastScrollTop.current) > 5) {
      lastScrollTop.current = scrollTop;
      onScrollChange?.(scrollTop);
    }
  }, [onScrollChange]);

  /**
   * 恢复滚动位置
   * 当编辑器变为可见时，恢复之前保存的滚动位置
   */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 首次挂载或变为可见时恢复滚动位置
    if (isVisible && !hasRestoredScroll.current && initialScrollTop > 0) {
      // 使用 requestAnimationFrame 确保 DOM 已渲染
      requestAnimationFrame(() => {
        container.scrollTop = initialScrollTop;
        lastScrollTop.current = initialScrollTop;
        hasRestoredScroll.current = true;
      });
    }
  }, [isVisible, initialScrollTop]);

  /**
   * 监听滚动事件
   */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 使用 passive 选项提高滚动性能
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  /**
   * 当 tabId 变化时重置滚动恢复标志
   */
  useEffect(() => {
    hasRestoredScroll.current = false;
    lastScrollTop.current = initialScrollTop;
  }, [tabId, initialScrollTop]);

  return (
    <div
      data-editor-instance={tabId}
      className="absolute inset-0 flex flex-col"
      style={{
        // 使用 visibility 而非 display:none，保持 DOM 和状态
        visibility: isVisible ? "visible" : "hidden",
        // 隐藏时禁用指针事件，避免意外交互
        pointerEvents: isVisible ? "auto" : "none",
        // 隐藏时设置 z-index 为负值，确保不会遮挡可见编辑器
        zIndex: isVisible ? 1 : -1,
      }}
    >
      {/* 滚动容器 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto"
        data-scroll-container={tabId}
      >
        <Editor
          initialState={initialState}
          onChange={handleContentChange}
          placeholder={placeholder}
          readOnly={readOnly}
          namespace={`editor-${tabId}`}
        />
      </div>
    </div>
  );
}

export default EditorInstance;
