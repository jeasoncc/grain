/**
 * 编辑器标签页状态管理
 * 支持同时打开多个文件（基于 Node 文件树结构）
 * 支持多编辑器实例状态管理
 * 
 * Implements LRU cache for editor states to limit memory usage
 * Requirements: 4.3, 4.4, 5.2, 5.4
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SerializedEditorState } from "lexical";
import type { EditorInstanceState as BaseEditorInstanceState } from "@novel-editor/editor";

/**
 * Maximum number of editor states to keep in memory (LRU cache limit)
 * Requirements: 5.2, 5.4
 */
const MAX_EDITOR_STATES = 10;

export interface EditorTab {
  id: string; // 唯一标识，通常是 nodeId
  projectId: string; // 工作空间/项目 ID
  nodeId: string; // 节点 ID
  title: string;
  type: "file" | "diary" | "canvas" | "folder"; // 节点类型
  isDirty?: boolean; // 是否有未保存的更改
}

/**
 * 编辑器实例状态
 * 扩展基础的 EditorInstanceState，添加额外的应用特定字段
 */
export interface EditorInstanceState extends BaseEditorInstanceState {
  /** 光标/选区状态 */
  selectionState?: {
    anchor: { key: string; offset: number };
    focus: { key: string; offset: number };
  };
  /** 水平滚动位置 */
  scrollLeft?: number;
  /** 是否有未保存更改 */
  isDirty?: boolean;
  /** 最后修改时间戳，用于 LRU 清理 */
  lastModified?: number;
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
  /** 获取指定 workspace 的标签 */
  getTabsByWorkspace: (workspaceId: string) => EditorTab[];
  /** 关闭指定 workspace 的所有标签 */
  closeTabsByWorkspace: (workspaceId: string) => void;
}

/**
 * 创建默认的编辑器实例状态
 */
function createDefaultEditorState(): EditorInstanceState {
  return {
    serializedState: undefined,
    selectionState: undefined,
    scrollTop: 0,
    scrollLeft: 0,
    isDirty: false,
    lastModified: Date.now(),
  };
}

/**
 * LRU cache eviction for editor states
 * Removes the least recently used states when exceeding MAX_EDITOR_STATES
 * Only evicts states that are not dirty (have unsaved changes)
 * 
 * @param editorStates - Current editor states map
 * @param activeTabId - Currently active tab ID (should not be evicted)
 * @param openTabIds - Set of currently open tab IDs (should not be evicted)
 * @returns New editor states map with evicted entries removed
 * 
 * Requirements: 5.2, 5.4
 */
function evictLRUEditorStates(
  editorStates: Record<string, EditorInstanceState>,
  activeTabId: string | null,
  openTabIds: Set<string>
): Record<string, EditorInstanceState> {
  const entries = Object.entries(editorStates);
  
  // If under the limit, no eviction needed
  if (entries.length <= MAX_EDITOR_STATES) {
    return editorStates;
  }

  // Sort by lastModified (oldest first)
  const sortedEntries = entries.sort(
    ([, a], [, b]) => (a.lastModified || 0) - (b.lastModified || 0)
  );

  // Calculate how many to evict
  const toEvict = entries.length - MAX_EDITOR_STATES;
  let evicted = 0;
  const evictedIds = new Set<string>();

  for (const [id, state] of sortedEntries) {
    if (evicted >= toEvict) break;
    
    // Don't evict:
    // 1. Active tab
    // 2. Open tabs
    // 3. Dirty states (unsaved changes)
    if (id === activeTabId || openTabIds.has(id) || state.isDirty) {
      continue;
    }
    
    evictedIds.add(id);
    evicted++;
  }

  // If we couldn't evict enough (all are protected), return as-is
  if (evictedIds.size === 0) {
    return editorStates;
  }

  // Create new object without evicted entries
  const newStates: Record<string, EditorInstanceState> = {};
  for (const [id, state] of entries) {
    if (!evictedIds.has(id)) {
      newStates[id] = state;
    }
  }

  return newStates;
}

/**
 * Editor tabs store with clear separation:
 * - Tab list (tabs, activeTabId): Persisted in Zustand for session restoration
 * - Editor states (editorStates): In-memory only for runtime performance
 * 
 * Requirements: 4.3, 4.4
 */
export const useEditorTabsStore = create<EditorTabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      // Editor states are kept in memory only (not persisted)
      // This improves performance and avoids stale state issues
      editorStates: {},

      openTab: (tabData) => {
        const { tabs, editorStates } = get();
        const tabId = tabData.nodeId;
        
        // 检查是否已经打开
        const existingTab = tabs.find(t => t.nodeId === tabData.nodeId);
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

        // 使用已存在的编辑器状态（如果有），否则创建新的默认状态
        // 这允许在打开标签前预加载内容
        const newEditorState = editorStates[tabId] || createDefaultEditorState();
        const newTabs = [...tabs, newTab];
        
        // Apply LRU eviction before adding new state
        const updatedStates = {
          ...editorStates,
          [tabId]: newEditorState,
        };
        const openTabIds = new Set(newTabs.map(t => t.id));
        const evictedStates = evictLRUEditorStates(
          updatedStates,
          tabId,
          openTabIds
        );

        set({
          tabs: newTabs,
          activeTabId: tabId,
          editorStates: evictedStates,
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
          const updatedStates = {
            ...currentState.editorStates,
            [tabId]: {
              ...existingState,
              ...state,
              lastModified: Date.now(),
            },
          };
          
          // Apply LRU eviction to keep memory usage bounded
          const openTabIds = new Set(currentState.tabs.map(t => t.id));
          const evictedStates = evictLRUEditorStates(
            updatedStates,
            currentState.activeTabId,
            openTabIds
          );
          
          return { editorStates: evictedStates };
        });
      },

      getEditorState: (tabId) => {
        return get().editorStates[tabId];
      },

      getTabsByWorkspace: (workspaceId) => {
        return get().tabs.filter(t => t.projectId === workspaceId);
      },

      closeTabsByWorkspace: (workspaceId) => {
        const { tabs, activeTabId, editorStates } = get();
        const tabsToClose = tabs.filter(t => t.projectId === workspaceId);
        const remainingTabs = tabs.filter(t => t.projectId !== workspaceId);
        
        // 清理对应的编辑器状态
        const newEditorStates = { ...editorStates };
        for (const tab of tabsToClose) {
          delete newEditorStates[tab.id];
        }
        
        // 如果当前活动标签被关闭，切换到剩余标签的第一个
        let newActiveTabId = activeTabId;
        if (activeTabId && tabsToClose.some(t => t.id === activeTabId)) {
          newActiveTabId = remainingTabs.length > 0 ? remainingTabs[0].id : null;
        }
        
        set({
          tabs: remainingTabs,
          activeTabId: newActiveTabId,
          editorStates: newEditorStates,
        });
      },
    }),
    {
      name: "novel-editor-tabs",
      // Only persist tab list and active tab (session state)
      // Editor states are NOT persisted - they are runtime/memory only
      partialize: (state) => ({
        tabs: state.tabs.map(t => ({ ...t, isDirty: false })), // 不持久化 dirty 状态
        activeTabId: state.activeTabId,
        // editorStates is intentionally NOT included - kept in memory only
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
