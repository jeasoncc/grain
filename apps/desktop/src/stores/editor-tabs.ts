/**
 * 编辑器标签页状态管理
 * 支持同时打开多个文件（场景/日记）
 * 支持多编辑器实例状态管理
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SerializedEditorState } from "lexical";

export interface EditorTab {
  id: string; // 唯一标识，通常是 sceneId
  projectId: string;
  chapterId: string;
  sceneId: string;
  title: string;
  type: "scene" | "diary" | "canvas";
  isDirty?: boolean; // 是否有未保存的更改
}

/**
 * 编辑器实例状态
 * 存储每个标签页的编辑器状态，包括内容、光标、滚动位置等
 */
export interface EditorInstanceState {
  /** Lexical 序列化状态 */
  serializedState: SerializedEditorState | null;
  /** 光标/选区状态 */
  selectionState?: {
    anchor: { key: string; offset: number };
    focus: { key: string; offset: number };
  };
  /** 垂直滚动位置 */
  scrollTop: number;
  /** 水平滚动位置 */
  scrollLeft: number;
  /** 是否有未保存更改 */
  isDirty: boolean;
  /** 最后修改时间戳，用于 LRU 清理 */
  lastModified: number;
}

interface EditorTabsState {
  tabs: EditorTab[];
  activeTabId: string | null;
  /** 每个标签的编辑器实例状态 */
  editorStates: Record<string, EditorInstanceState>;
  
  // Actions
  openTab: (tab: Omit<EditorTab, "id">) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (tabId: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  /** 更新指定标签的编辑器状态 */
  updateEditorState: (tabId: string, state: Partial<EditorInstanceState>) => void;
  /** 获取指定标签的编辑器状态 */
  getEditorState: (tabId: string) => EditorInstanceState | undefined;
}

/**
 * 创建默认的编辑器实例状态
 */
function createDefaultEditorState(): EditorInstanceState {
  return {
    serializedState: null,
    selectionState: undefined,
    scrollTop: 0,
    scrollLeft: 0,
    isDirty: false,
    lastModified: Date.now(),
  };
}

export const useEditorTabsStore = create<EditorTabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      editorStates: {},

      openTab: (tabData) => {
        const { tabs, editorStates } = get();
        const tabId = tabData.sceneId;
        
        // 检查是否已经打开
        const existingTab = tabs.find(t => t.sceneId === tabData.sceneId);
        if (existingTab) {
          // 已存在，切换到该标签，更新 lastModified
          const existingState = editorStates[existingTab.id];
          if (existingState) {
            set({
              activeTabId: existingTab.id,
              editorStates: {
                ...editorStates,
                [existingTab.id]: {
                  ...existingState,
                  lastModified: Date.now(),
                },
              },
            });
          } else {
            set({ activeTabId: existingTab.id });
          }
          return;
        }

        // 创建新标签
        const newTab: EditorTab = {
          id: tabId,
          ...tabData,
        };

        // 创建新的编辑器状态
        const newEditorState = createDefaultEditorState();

        set({
          tabs: [...tabs, newTab],
          activeTabId: tabId,
          editorStates: {
            ...editorStates,
            [tabId]: newEditorState,
          },
        });
      },

      closeTab: (tabId) => {
        const { tabs, activeTabId, editorStates } = get();
        const tabIndex = tabs.findIndex(t => t.id === tabId);
        
        if (tabIndex === -1) return;

        const newTabs = tabs.filter(t => t.id !== tabId);
        
        // 清理对应的编辑器状态，释放内存
        const newEditorStates = { ...editorStates };
        delete newEditorStates[tabId];
        
        // 如果关闭的是当前活动标签，切换到相邻标签
        let newActiveTabId = activeTabId;
        if (activeTabId === tabId) {
          if (newTabs.length === 0) {
            newActiveTabId = null;
          } else if (tabIndex >= newTabs.length) {
            newActiveTabId = newTabs[newTabs.length - 1].id;
          } else {
            newActiveTabId = newTabs[tabIndex].id;
          }
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
          editorStates: newEditorStates,
        });
      },

      closeOtherTabs: (tabId) => {
        const { tabs, editorStates } = get();
        const tab = tabs.find(t => t.id === tabId);
        if (!tab) return;

        // 只保留当前标签的编辑器状态
        const newEditorStates: Record<string, EditorInstanceState> = {};
        if (editorStates[tabId]) {
          newEditorStates[tabId] = editorStates[tabId];
        }

        set({
          tabs: [tab],
          activeTabId: tabId,
          editorStates: newEditorStates,
        });
      },

      closeAllTabs: () => {
        set({
          tabs: [],
          activeTabId: null,
          editorStates: {},
        });
      },

      setActiveTab: (tabId) => {
        const { tabs, editorStates } = get();
        if (tabs.some(t => t.id === tabId)) {
          // 更新 lastModified 时间戳
          const existingState = editorStates[tabId];
          if (existingState) {
            set({
              activeTabId: tabId,
              editorStates: {
                ...editorStates,
                [tabId]: {
                  ...existingState,
                  lastModified: Date.now(),
                },
              },
            });
          } else {
            set({ activeTabId: tabId });
          }
        }
      },

      updateTabTitle: (tabId, title) => {
        set(state => ({
          tabs: state.tabs.map(t =>
            t.id === tabId ? { ...t, title } : t
          ),
        }));
      },

      setTabDirty: (tabId, isDirty) => {
        set(state => ({
          tabs: state.tabs.map(t =>
            t.id === tabId ? { ...t, isDirty } : t
          ),
        }));
      },

      reorderTabs: (fromIndex, toIndex) => {
        set(state => {
          const newTabs = [...state.tabs];
          const [removed] = newTabs.splice(fromIndex, 1);
          newTabs.splice(toIndex, 0, removed);
          return { tabs: newTabs };
        });
      },

      updateEditorState: (tabId, state) => {
        set(currentState => {
          const existingState = currentState.editorStates[tabId] || createDefaultEditorState();
          return {
            editorStates: {
              ...currentState.editorStates,
              [tabId]: {
                ...existingState,
                ...state,
                lastModified: Date.now(),
              },
            },
          };
        });
      },

      getEditorState: (tabId) => {
        return get().editorStates[tabId];
      },
    }),
    {
      name: "novel-editor-tabs",
      partialize: (state) => ({
        tabs: state.tabs.map(t => ({ ...t, isDirty: false })), // 不持久化 dirty 状态
        activeTabId: state.activeTabId,
        // 持久化编辑器状态，但重置瞬态状态（光标、滚动位置）
        editorStates: Object.fromEntries(
          Object.entries(state.editorStates).map(([tabId, editorState]) => [
            tabId,
            {
              ...editorState,
              // 重置瞬态状态
              selectionState: undefined,
              scrollTop: 0,
              scrollLeft: 0,
              isDirty: false,
            },
          ])
        ),
      }),
    }
  )
);

/**
 * 获取当前活动标签
 */
export function useActiveTab(): EditorTab | null {
  const tabs = useEditorTabsStore(s => s.tabs);
  const activeTabId = useEditorTabsStore(s => s.activeTabId);
  return tabs.find(t => t.id === activeTabId) || null;
}
