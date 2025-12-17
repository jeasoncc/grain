/**
 * 多编辑器工作区组件
 * 支持同时渲染多个编辑器实例，通过 CSS visibility 控制显示
 * 每个标签页保持独立的编辑器状态（内容、光标、滚动位置）
 */
import { useCallback, useEffect, useRef } from "react";
import type { SerializedEditorState } from "lexical";
import { Editor, type MentionEntry } from "@novel-editor/editor";
import { cn } from "@/lib/utils";
import type { EditorTab, EditorInstanceState } from "@/stores/editor-tabs";
import { useWikiHoverPreview } from "@/hooks/use-wiki-hover-preview";
import { WikiHoverPreview } from "@/components/blocks/wiki-hover-preview";

interface MultiEditorWorkspaceProps {
  /** 所有打开的标签页 */
  tabs: EditorTab[];
  /** 当前活动标签页 ID */
  activeTabId: string | null;
  /** 每个标签的编辑器状态 */
  editorStates: Record<string, EditorInstanceState>;
  /** 编辑器内容变化回调 */
  onEditorChange: (tabId: string, state: SerializedEditorState) => void;
  /** 滚动位置变化回调 */
  onScrollChange: (tabId: string, scrollTop: number, scrollLeft: number) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 提及条目列表 (用于 @ 提及) */
  mentionEntries?: MentionEntry[];
}

/**
 * 多编辑器工作区
 * 渲染所有编辑器实例，通过 CSS visibility 控制可见性
 * 只有活动编辑器可见，其他编辑器保持隐藏但保留状态
 */
export function MultiEditorWorkspace({
  tabs,
  activeTabId,
  editorStates,
  onEditorChange,
  onScrollChange,
  placeholder = "开始写作...",
  mentionEntries,
}: MultiEditorWorkspaceProps) {
  // 存储每个编辑器容器的 ref
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // 存储上一个活动标签 ID，用于检测切换
  const prevActiveTabIdRef = useRef<string | null>(null);

  // 设置容器 ref
  const setContainerRef = useCallback((tabId: string, el: HTMLDivElement | null) => {
    containerRefs.current[tabId] = el;
  }, []);

  // 处理滚动事件
  const handleScroll = useCallback((tabId: string, e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    onScrollChange(tabId, target.scrollTop, target.scrollLeft);
  }, [onScrollChange]);

  // 当切换到新标签时，恢复滚动位置
  useEffect(() => {
    if (activeTabId && activeTabId !== prevActiveTabIdRef.current) {
      const container = containerRefs.current[activeTabId];
      const editorState = editorStates[activeTabId];
      
      if (container && editorState) {
        // 使用 requestAnimationFrame 确保 DOM 已更新
        requestAnimationFrame(() => {
          container.scrollTop = editorState.scrollTop || 0;
          container.scrollLeft = editorState.scrollLeft || 0;
        });
      }
      
      prevActiveTabIdRef.current = activeTabId;
    }
  }, [activeTabId, editorStates]);

  // 清理已关闭标签的 refs
  useEffect(() => {
    const tabIds = new Set(tabs.map(t => t.id));
    for (const tabId of Object.keys(containerRefs.current)) {
      if (!tabIds.has(tabId)) {
        delete containerRefs.current[tabId];
      }
    }
  }, [tabs]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="relative h-full w-full">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const editorState = editorStates[tab.id];
        const serializedState = editorState?.serializedState;

        return (
          <div
            key={tab.id}
            ref={(el) => setContainerRef(tab.id, el)}
            className={cn(
              "absolute inset-0 overflow-y-auto scroll-smooth scrollbar-thin",
              isActive ? "visible z-10" : "invisible z-0"
            )}
            onScroll={(e) => handleScroll(tab.id, e)}
          >
            <article className="editor-container min-h-[calc(100vh-10rem)] w-full max-w-4xl mx-auto px-16 py-12">
              <div className="min-h-[600px]">
                <Editor
                  initialState={serializedState ? (typeof serializedState === "string" ? serializedState : JSON.stringify(serializedState)) : null}
                  onChange={(state: SerializedEditorState) => onEditorChange(tab.id, state)}
                  placeholder={placeholder}
                  namespace={`editor-${tab.id}`}
                  mentionEntries={mentionEntries}
                  useWikiHoverPreview={useWikiHoverPreview}
                  WikiHoverPreview={WikiHoverPreview}
                />
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
}
