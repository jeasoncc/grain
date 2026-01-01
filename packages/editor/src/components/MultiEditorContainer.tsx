/**
 * MultiEditorContainer - 多编辑器容器组件
 *
 * 管理所有打开的编辑器实例，实现：
 * - 多个 EditorInstance 的同时挂载
 * - CSS visibility 切换逻辑（而非销毁/重建）
 * - 标签切换时的状态恢复
 *
 * @see Requirements 4.1
 * @see Design: MultiEditorContainer 接口定义
 */

import type { SerializedEditorState } from "lexical";
import type React from "react";
import { useCallback, useMemo } from "react";

import type { FoldIconStyle } from "../config/fold-icon-config";
import type { EditorTab, EditorInstanceState } from "../types";
import { EditorInstance, type EditorInstanceProps } from "./EditorInstance";

export interface MultiEditorContainerProps {
  /** 所有打开的标签页 */
  tabs: EditorTab[];
  /** 当前活动标签页 ID */
  activeTabId: string | null;
  /** 编辑器状态映射 */
  editorStates: Record<string, EditorInstanceState>;
  /** 内容变化回调 */
  onContentChange: (tabId: string, state: SerializedEditorState) => void;
  /** 滚动位置变化回调 */
  onScrollChange: (tabId: string, scrollTop: number) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否只读 */
  readOnly?: boolean;
  /** 空状态组件 */
  emptyState?: React.ReactNode;
  /** 提及条目列表 (用于 @ 提及) */
  mentionEntries?: EditorInstanceProps["mentionEntries"];
  /** @deprecated Use mentionEntries instead */
  wikiEntries?: EditorInstanceProps["wikiEntries"];
  /** Wiki 悬浮预览 hook */
  useWikiHoverPreview?: EditorInstanceProps["useWikiHoverPreview"];
  /** Wiki 悬浮预览组件 */
  WikiHoverPreview?: EditorInstanceProps["WikiHoverPreview"];
  /** 标题折叠图标风格 */
  foldIconStyle?: FoldIconStyle;
}

/**
 * 多编辑器容器组件
 *
 * 所有编辑器实例同时挂载在 DOM 中，通过 CSS visibility 控制显示/隐藏。
 * 这种方式保留了隐藏编辑器的完整状态（光标、滚动、undo历史）。
 *
 * Property 3: Visibility 模式切换
 * 对于任意标签切换操作，DOM 中的编辑器元素数量应该保持不变，
 * 只有 CSS visibility 属性发生变化。
 */
export function MultiEditorContainer({
  tabs,
  activeTabId,
  editorStates,
  onContentChange,
  onScrollChange,
  placeholder = "开始写作...",
  readOnly = false,
  emptyState,
  mentionEntries,
  wikiEntries,
  useWikiHoverPreview,
  WikiHoverPreview,
  foldIconStyle,
}: MultiEditorContainerProps): React.ReactElement {
  // Support both new and deprecated prop names
  const entries = mentionEntries ?? wikiEntries;
  /**
   * 创建内容变化处理器
   * 使用 useCallback 确保每个 tab 的回调稳定
   */
  const createContentChangeHandler = useCallback(
    (tabId: string) => (state: SerializedEditorState) => {
      onContentChange(tabId, state);
    },
    [onContentChange]
  );

  /**
   * 创建滚动变化处理器
   * 使用 useCallback 确保每个 tab 的回调稳定
   */
  const createScrollChangeHandler = useCallback(
    (tabId: string) => (scrollTop: number) => {
      onScrollChange(tabId, scrollTop);
    },
    [onScrollChange]
  );

  /**
   * 获取编辑器的初始状态（JSON 字符串）
   * 如果存在序列化状态，将其转换为 JSON 字符串
   */
  const getInitialState = useCallback(
    (tabId: string): string | null => {
      const state = editorStates[tabId];
      if (state?.serializedState) {
        // 如果已经是字符串，直接返回；否则序列化
        if (typeof state.serializedState === "string") {
          return state.serializedState;
        }
        return JSON.stringify(state.serializedState);
      }
      return null;
    },
    [editorStates]
  );

  /**
   * 获取编辑器的初始滚动位置
   */
  const getInitialScrollTop = useCallback(
    (tabId: string): number => {
      return editorStates[tabId]?.scrollTop ?? 0;
    },
    [editorStates]
  );

  /**
   * 渲染所有编辑器实例
   * 使用 useMemo 避免不必要的重新渲染
   */
  const editorInstances = useMemo(() => {
    return tabs.map((tab) => {
      const isVisible = tab.id === activeTabId;
      const initialState = getInitialState(tab.id);
      const initialScrollTop = getInitialScrollTop(tab.id);

      return (
        <EditorInstance
          key={tab.id}
          tabId={tab.id}
          initialState={initialState}
          isVisible={isVisible}
          initialScrollTop={initialScrollTop}
          onContentChange={createContentChangeHandler(tab.id)}
          onScrollChange={createScrollChangeHandler(tab.id)}
          placeholder={placeholder}
          readOnly={readOnly}
          mentionEntries={entries}
          useWikiHoverPreview={useWikiHoverPreview}
          WikiHoverPreview={WikiHoverPreview}
          foldIconStyle={foldIconStyle}
        />
      );
    });
  }, [
    tabs,
    activeTabId,
    getInitialState,
    getInitialScrollTop,
    createContentChangeHandler,
    createScrollChangeHandler,
    placeholder,
    readOnly,
    entries,
    useWikiHoverPreview,
    WikiHoverPreview,
    foldIconStyle,
  ]);

  // 如果没有打开的标签，显示空状态
  if (tabs.length === 0) {
    return (
      <div
        className="flex h-full w-full items-center justify-center text-muted-foreground"
        data-testid="multi-editor-empty"
      >
        {emptyState || <p>没有打开的文件</p>}
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full"
      data-testid="multi-editor-container"
      data-editor-count={tabs.length}
      data-active-tab={activeTabId}
    >
      {editorInstances}
    </div>
  );
}

export default MultiEditorContainer;
