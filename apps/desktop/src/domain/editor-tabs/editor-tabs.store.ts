/**
 * Editor Tabs - Zustand Store with Immer
 * 
 * 使用 Zustand + Immer 实现不可变状态管理
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
	EditorTab,
	EditorInstanceState,
	EditorTabsState,
	OpenTabPayload,
} from "./editor-tabs.interface";
import {
	createDefaultEditorState,
	findTabByNodeId,
	calculateNextActiveTabId,
	evictLRUEditorStates,
	getTabsByWorkspace,
} from "./editor-tabs.utils";
import { EditorTabBuilder, EditorStateBuilder } from "./editor-tabs.builder";

// ==============================
// Store Actions Interface
// ==============================

interface EditorTabsActions {
	// Tab Operations
	openTab: (payload: OpenTabPayload) => void;
	closeTab: (tabId: string) => void;
	closeOtherTabs: (tabId: string) => void;
	closeAllTabs: () => void;
	setActiveTab: (tabId: string) => void;
	updateTabTitle: (tabId: string, title: string) => void;
	setTabDirty: (tabId: string, isDirty: boolean) => void;
	reorderTabs: (fromIndex: number, toIndex: number) => void;

	// Editor State Operations
	updateEditorState: (tabId: string, state: Partial<EditorInstanceState>) => void;
	getEditorState: (tabId: string) => EditorInstanceState | undefined;

	// Workspace Operations
	getTabsByWorkspace: (workspaceId: string) => EditorTab[];
	closeTabsByWorkspace: (workspaceId: string) => void;
}

// ==============================
// Store Type
// ==============================

type EditorTabsStore = EditorTabsState & EditorTabsActions;

// ==============================
// Configuration
// ==============================

const MAX_EDITOR_STATES = 10;

// ==============================
// Store Implementation
// ==============================

export const useEditorTabsStore = create<EditorTabsStore>()(
	persist(
		immer((set, get) => ({
			// Initial State
			tabs: [],
			activeTabId: null,
			editorStates: {},

			// ==============================
			// Tab Operations
			// ==============================

			openTab: (payload) => {
				const { tabs, editorStates } = get();
				const existingTab = findTabByNodeId(tabs, payload.nodeId);

				if (existingTab) {
					// 已存在，切换到该标签
					set((state) => {
						state.activeTabId = existingTab.id;
						if (state.editorStates[existingTab.id]) {
							state.editorStates[existingTab.id].lastModified = Date.now();
						}
					});
					return;
				}

				// 使用 Builder 创建新标签
				const newTab = EditorTabBuilder.create()
					.workspaceId(payload.workspaceId)
					.nodeId(payload.nodeId)
					.title(payload.title)
					.type(payload.type)
					.build();

				// 创建编辑器状态
				const newEditorState = EditorStateBuilder.fromDefault().build();

				set((state) => {
					state.tabs.push(newTab as EditorTab);
					state.activeTabId = newTab.id;
					state.editorStates[newTab.id] = newEditorState;

					// LRU 清理
					const openTabIds = new Set(state.tabs.map((t) => t.id));
					state.editorStates = evictLRUEditorStates(
						state.editorStates,
						state.activeTabId,
						openTabIds,
						MAX_EDITOR_STATES
					);
				});
			},

			closeTab: (tabId) => {
				set((state) => {
					const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
					if (tabIndex === -1) return;

					// 计算新的活动标签
					state.activeTabId = calculateNextActiveTabId(
						state.tabs,
						tabId,
						state.activeTabId
					);

					// 移除标签和编辑器状态
					state.tabs.splice(tabIndex, 1);
					delete state.editorStates[tabId];
				});
			},

			closeOtherTabs: (tabId) => {
				set((state) => {
					const tab = state.tabs.find((t) => t.id === tabId);
					if (!tab) return;

					// 只保留当前标签
					state.tabs = [tab];
					state.activeTabId = tabId;

					// 只保留当前标签的编辑器状态
					const currentState = state.editorStates[tabId];
					state.editorStates = currentState ? { [tabId]: currentState } : {};
				});
			},

			closeAllTabs: () => {
				set((state) => {
					state.tabs = [];
					state.activeTabId = null;
					state.editorStates = {};
				});
			},

			setActiveTab: (tabId) => {
				set((state) => {
					if (state.tabs.some((t) => t.id === tabId)) {
						state.activeTabId = tabId;
						if (state.editorStates[tabId]) {
							state.editorStates[tabId].lastModified = Date.now();
						}
					}
				});
			},

			updateTabTitle: (tabId, title) => {
				set((state) => {
					const tab = state.tabs.find((t) => t.id === tabId);
					if (tab) {
						tab.title = title;
					}
				});
			},

			setTabDirty: (tabId, isDirty) => {
				set((state) => {
					const tab = state.tabs.find((t) => t.id === tabId);
					if (tab) {
						tab.isDirty = isDirty;
					}
				});
			},

			reorderTabs: (fromIndex, toIndex) => {
				set((state) => {
					const [removed] = state.tabs.splice(fromIndex, 1);
					state.tabs.splice(toIndex, 0, removed);
				});
			},

			// ==============================
			// Editor State Operations
			// ==============================

			updateEditorState: (tabId, updates) => {
				set((state) => {
					const existingState = state.editorStates[tabId] || createDefaultEditorState();
					state.editorStates[tabId] = {
						...existingState,
						...updates,
						lastModified: Date.now(),
					};

					// LRU 清理
					const openTabIds = new Set(state.tabs.map((t) => t.id));
					state.editorStates = evictLRUEditorStates(
						state.editorStates,
						state.activeTabId,
						openTabIds,
						MAX_EDITOR_STATES
					);
				});
			},

			getEditorState: (tabId) => {
				return get().editorStates[tabId];
			},

			// ==============================
			// Workspace Operations
			// ==============================

			getTabsByWorkspace: (workspaceId) => {
				return getTabsByWorkspace(get().tabs, workspaceId) as EditorTab[];
			},

			closeTabsByWorkspace: (workspaceId) => {
				set((state) => {
					const tabsToClose = state.tabs.filter((t) => t.workspaceId === workspaceId);
					const remainingTabs = state.tabs.filter((t) => t.workspaceId !== workspaceId);

					// 清理编辑器状态
					for (const tab of tabsToClose) {
						delete state.editorStates[tab.id];
					}

					// 更新活动标签
					if (state.activeTabId && tabsToClose.some((t) => t.id === state.activeTabId)) {
						state.activeTabId = remainingTabs.length > 0 ? remainingTabs[0].id : null;
					}

					state.tabs = remainingTabs;
				});
			},
		})),
		{
			name: "grain-editor-tabs-v2",
			partialize: () => ({}), // 不持久化任何状态
		}
	)
);

// ==============================
// Selector Hooks
// ==============================

/**
 * 获取当前活动标签
 */
export const useActiveTab = (): EditorTab | null => {
	const tabs = useEditorTabsStore((s) => s.tabs);
	const activeTabId = useEditorTabsStore((s) => s.activeTabId);
	return tabs.find((t) => t.id === activeTabId) ?? null;
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
