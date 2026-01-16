/**
 * EditorInstance - 单个编辑器实例包装器
 *
 * 包装单个 Lexical 编辑器实例，管理：
 * - 滚动位置监听和恢复
 * - 内容变化回调
 * - 可见性控制 (CSS visibility)
 * - 独立的 undo/redo 历史记录 (通过独立的 Editor 实例实现)
 * - 初始状态延迟加载（支持新建文件时模板内容的渲染）
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
import { useCallback, useEffect, useRef, useState } from "react";

import type { FoldIconStyle } from "../config/fold-icon-config";
import Editor, { type EditorProps } from "./Editor";

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
  /** 提及条目列表 (用于 @ 提及) */
  mentionEntries?: EditorProps["mentionEntries"];
  /** @deprecated Use mentionEntries instead */
  wikiEntries?: EditorProps["wikiEntries"];
  /** Wiki 悬浮预览 hook */
  useWikiHoverPreview?: EditorProps["useWikiHoverPreview"];
  /** Wiki 悬浮预览组件 */
  WikiHoverPreview?: EditorProps["WikiHoverPreview"];
  /** 标题折叠图标风格 */
  foldIconStyle?: FoldIconStyle;
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
  mentionEntries,
  wikiEntries,
  useWikiHoverPreview,
  WikiHoverPreview,
  foldIconStyle,
}: EditorInstanceProps): React.ReactElement {
  // Support both new and deprecated prop names
  const entries = mentionEntries ?? wikiEntries;
  // 滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // 是否已恢复初始滚动位置
  const hasRestoredScroll = useRef(false);
  // 上一次的滚动位置，用于防止重复触发
  const lastScrollTop = useRef(initialScrollTop);

  // 跟踪编辑器是否已经有内容
  // 用于生成 key，当 initialState 从 null 变为有值时强制重新挂载 Editor
  const [editorKey, setEditorKey] = useState(() => 
    initialState ? `${tabId}-initialized` : `${tabId}-empty`
  );
  const prevInitialStateRef = useRef(initialState);

  // 当 initialState 从 null/undefined 变为有值时，更新 key 强制重新挂载
  // 这处理了新建文件时模板内容延迟到达的情况
  useEffect(() => {
    const wasEmpty = !prevInitialStateRef.current;
    const hasContent = !!initialState;
    
    if (wasEmpty && hasContent) {
      // initialState 从空变为有值，需要重新挂载 Editor 以加载新内容
      setEditorKey(`${tabId}-initialized-${Date.now()}`);
    }
    
    prevInitialStateRef.current = initialState;
  }, [initialState, tabId]);

  // 当 tabId 变化时重置 key
  useEffect(() => {
    setEditorKey(initialState ? `${tabId}-initialized` : `${tabId}-empty`);
    prevInitialStateRef.current = initialState;
  }, [tabId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          key={editorKey}
          initialState={initialState}
          onChange={handleContentChange}
          placeholder={placeholder}
          readOnly={readOnly}
          namespace={`editor-${tabId}`}
          mentionEntries={entries}
          useWikiHoverPreview={useWikiHoverPreview}
          WikiHoverPreview={WikiHoverPreview}
          foldIconStyle={foldIconStyle}
        />
      </div>
    </div>
  );
}

export default EditorInstance;
