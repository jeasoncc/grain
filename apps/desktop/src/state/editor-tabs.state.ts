/**
 * @file state/editor-tabs.state.ts
 * @description Editor Tabs 状态管理
 *
 * 只存储编辑器标签页状态数据，不包含业务逻辑。
 * 业务逻辑（如 LRU 缓存清理）在使用时由调用方处理。
 *
 * 依赖规则：state/ 只能依赖 types/
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
	EditorInstanceState,
	EditorTab,
	EditorTabsState,
} from "@/types/editor-tab";

// ==============================
// Store Actions Interface
// ==============================

interface EditorTabsStoreActions {
	// Tab Operations
	addTab: (tab: EditorTab) => void;
	addTabWithState: (tab: EditorTab, editorState: EditorInstanceState) => void;
	removeTab: (tabId: string) => void;
	setTabs: (tabs: EditorTab[]) => void;
	setActiveTabId: (tabId: string | null) => void;
	updateTab: (tabId: string, updates: Partial<EditorTab>) => void;

	// Editor State Operations
	setEditorState: (tabId: string, state: EditorInstanceState) => void;
	updateEditorState: (
		tabId: string,
		updates: Partial<EditorInstanceState>,
	) => void;
	removeEditorState: (tabId: string) => void;
	setEditorStates: (states: Record<string, EditorInstanceState>) => void;
}

// ==============================
// Store Type
// ==============================

type EditorTabsStore = EditorTabsState & EditorTabsStoreActions;

// ==============================
// Store Implementation
// ==============================

export const useEditorTabsStore = create<EditorTabsStore>()(
	immer((set) => ({
		// Initial State
		tabs: [],
		activeTabId: null,
		editorStates: {},

		// ==============================
		// Pure State Setters (no business logic)
		// ==============================

		addTab: (tab) => {
			set((state) => {
				state.tabs.push(tab as EditorTab);
			});
		},

		/**
		 * 原子操作：同时添加 tab 和设置 editorState
		 * 避免多次渲染导致的时序问题
		 */
		addTabWithState: (tab, editorState) => {
			set((state) => {
				state.tabs.push(tab as EditorTab);
				state.editorStates[tab.id] = editorState;
				state.activeTabId = tab.id;
			});
		},

		removeTab: (tabId) => {
			set((state) => {
				const index = state.tabs.findIndex((t: EditorTab) => t.id === tabId);
				if (index !== -1) {
					state.tabs.splice(index, 1);
				}
			});
		},

		setTabs: (tabs) => {
			set((state) => {
				state.tabs = tabs;
			});
		},

		setActiveTabId: (tabId) => {
			set((state) => {
				state.activeTabId = tabId;
			});
		},

		updateTab: (tabId, updates) => {
			set((state) => {
				const tab = state.tabs.find((t: EditorTab) => t.id === tabId);
				if (tab) {
					Object.assign(tab, updates);
				}
			});
		},

		setEditorState: (tabId, editorState) => {
			set((state) => {
				state.editorStates[tabId] = editorState;
			});
		},

		updateEditorState: (tabId, updates) => {
			set((state) => {
				if (state.editorStates[tabId]) {
					Object.assign(state.editorStates[tabId], updates);
				}
			});
		},

		removeEditorState: (tabId) => {
			set((state) => {
				delete state.editorStates[tabId];
			});
		},

		setEditorStates: (states) => {
			set((state) => {
				state.editorStates = states;
			});
		},
	})),
);

// ==============================
// Selector Hooks
// ==============================

/**
 * 获取所有标签
 */
export const useTabs = (): readonly EditorTab[] => {
	return useEditorTabsStore((s) => s.tabs) as readonly EditorTab[];
};

/**
 * 获取活动标签 ID
 */
export const useActiveTabId = (): string | null => {
	return useEditorTabsStore((s) => s.activeTabId);
};

/**
 * 获取当前活动标签
 */
export const useActiveTab = (): EditorTab | null => {
	const tabs = useEditorTabsStore((s) => s.tabs);
	const activeTabId = useEditorTabsStore((s) => s.activeTabId);
	return (tabs.find((t) => t.id === activeTabId) as EditorTab) ?? null;
};

/**
 * 获取标签数量
 */
export const useTabCount = (): number => {
	return useEditorTabsStore((s) => s.tabs.length);
};

/**
 * 检查是否有未保存的标签
 */
export const useHasDirtyTabs = (): boolean => {
	return useEditorTabsStore((s) => s.tabs.some((t) => t.isDirty));
};

/**
 * 检查指定标签是否为活动标签
 */
export const useIsActiveTab = (tabId: string): boolean => {
	return useEditorTabsStore((s) => s.activeTabId === tabId);
};

/**
 * 获取指定标签的编辑器状态
 */
export const useEditorState = (
	tabId: string | null,
): EditorInstanceState | undefined => {
	return useEditorTabsStore((s) => (tabId ? s.editorStates[tabId] : undefined));
};

/**
 * 获取所有编辑器状态
 */
export const useEditorStates = (): Readonly<
	Record<string, EditorInstanceState>
> => {
	return useEditorTabsStore((s) => s.editorStates);
};
