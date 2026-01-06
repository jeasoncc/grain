/**
 * @file editor-tabs.store.ts
 * @description Editor Tabs 状态管理
 *
 * 管理编辑器标签页状态，包括：
 * - 标签页的打开、关闭、切换
 * - 编辑器实例状态（滚动位置、选择状态等）
 * - LRU 缓存清理
 *
 * 使用 Zustand + Immer 实现不可变状态管理。
 */

import dayjs from "dayjs";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
	calculateNextActiveTabId,
	evictLRUEditorStates,
	findTabByNodeId,
	getTabsByWorkspace,
} from "@/fn/editor-tab";
import logger from "@/log";
import type {
	EditorInstanceState,
	EditorTab,
	EditorTabsState,
	OpenTabPayload,
} from "@/types/editor-tab";
import {
	createDefaultEditorState,
	EditorStateBuilder,
	EditorTabBuilder,
} from "@/types/editor-tab";

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
	updateEditorState: (
		tabId: string,
		state: Partial<EditorInstanceState>,
	) => void;
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
	immer((set, get) => ({
		// Initial State
		tabs: [],
		activeTabId: null,
		editorStates: {},

		// ==============================
		// Tab Operations
		// ==============================

		openTab: (payload) => {
			logger.info("[Store] 打开标签:", payload.title);
			const { tabs } = get();
			const existingTab = findTabByNodeId(tabs as EditorTab[], payload.nodeId);

			if (existingTab) {
				// 已存在，切换到该标签
				logger.info("[Store] 标签已存在，切换到:", existingTab.id);
				set((state) => {
					state.activeTabId = existingTab.id;
					if (state.editorStates[existingTab.id]) {
						state.editorStates[existingTab.id].lastModified = dayjs().valueOf();
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
				const openTabIds = new Set(state.tabs.map((t: EditorTab) => t.id));
				state.editorStates = evictLRUEditorStates(
					state.editorStates,
					state.activeTabId,
					openTabIds as ReadonlySet<string>,
					MAX_EDITOR_STATES,
				);
			});

			logger.success("[Store] 标签创建成功:", newTab.id);
		},

		closeTab: (tabId) => {
			logger.info("[Store] 关闭标签:", tabId);
			set((state) => {
				const tabIndex = state.tabs.findIndex((t: EditorTab) => t.id === tabId);
				if (tabIndex === -1) {
					logger.warn("[Store] 标签不存在:", tabId);
					return;
				}

				// 计算新的活动标签
				state.activeTabId = calculateNextActiveTabId(
					state.tabs as EditorTab[],
					tabId,
					state.activeTabId,
				);

				// 移除标签和编辑器状态
				state.tabs.splice(tabIndex, 1);
				delete state.editorStates[tabId];

				logger.success("[Store] 标签关闭成功:", tabId);
			});
		},

		closeOtherTabs: (tabId) => {
			logger.info("[Store] 关闭其他标签，保留:", tabId);
			set((state) => {
				const tab = state.tabs.find((t: EditorTab) => t.id === tabId);
				if (!tab) {
					logger.warn("[Store] 标签不存在:", tabId);
					return;
				}

				// 只保留当前标签
				state.tabs = [tab];
				state.activeTabId = tabId;

				// 只保留当前标签的编辑器状态
				const currentState = state.editorStates[tabId];
				state.editorStates = currentState ? { [tabId]: currentState } : {};

				logger.success("[Store] 其他标签已关闭");
			});
		},

		closeAllTabs: () => {
			logger.info("[Store] 关闭所有标签");
			set((state) => {
				state.tabs = [];
				state.activeTabId = null;
				state.editorStates = {};
			});
			logger.success("[Store] 所有标签已关闭");
		},

		setActiveTab: (tabId) => {
			logger.info("[Store] 设置活动标签:", tabId);
			set((state) => {
				if (state.tabs.some((t: EditorTab) => t.id === tabId)) {
					state.activeTabId = tabId;
					if (state.editorStates[tabId]) {
						state.editorStates[tabId].lastModified = dayjs().valueOf();
					}
				} else {
					logger.warn("[Store] 标签不存在:", tabId);
				}
			});
		},

		updateTabTitle: (tabId, title) => {
			logger.info("[Store] 更新标签标题:", tabId, title);
			set((state) => {
				const tab = state.tabs.find((t: EditorTab) => t.id === tabId);
				if (tab) {
					tab.title = title;
				}
			});
		},

		setTabDirty: (tabId, isDirty) => {
			logger.debug("[Store] 设置标签脏状态:", tabId, isDirty);
			set((state) => {
				const tab = state.tabs.find((t: EditorTab) => t.id === tabId);
				if (tab) {
					tab.isDirty = isDirty;
				}
			});
		},

		reorderTabs: (fromIndex, toIndex) => {
			logger.info("[Store] 重新排序标签:", fromIndex, "→", toIndex);
			set((state) => {
				const [removed] = state.tabs.splice(fromIndex, 1);
				state.tabs.splice(toIndex, 0, removed);
			});
		},

		// ==============================
		// Editor State Operations
		// ==============================

		updateEditorState: (tabId, updates) => {
			logger.debug("[Store] 更新编辑器状态:", tabId);
			set((state) => {
				const existingState =
					state.editorStates[tabId] || createDefaultEditorState();
				state.editorStates[tabId] = {
					...existingState,
					...updates,
					lastModified: dayjs().valueOf(),
				};

				// LRU 清理
				const openTabIds = new Set(state.tabs.map((t: EditorTab) => t.id));
				state.editorStates = evictLRUEditorStates(
					state.editorStates,
					state.activeTabId,
					openTabIds as ReadonlySet<string>,
					MAX_EDITOR_STATES,
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
			return getTabsByWorkspace(
				get().tabs as EditorTab[],
				workspaceId,
			) as EditorTab[];
		},

		closeTabsByWorkspace: (workspaceId) => {
			logger.info("[Store] 关闭工作区标签:", workspaceId);
			set((state) => {
				const tabsToClose = state.tabs.filter(
					(t: EditorTab) => t.workspaceId === workspaceId,
				);
				const remainingTabs = state.tabs.filter(
					(t: EditorTab) => t.workspaceId !== workspaceId,
				);

				// 清理编辑器状态
				for (const tab of tabsToClose) {
					delete state.editorStates[tab.id];
				}

				// 更新活动标签
				if (
					state.activeTabId &&
					tabsToClose.some((t: EditorTab) => t.id === state.activeTabId)
				) {
					state.activeTabId =
						remainingTabs.length > 0 ? remainingTabs[0].id : null;
				}

				state.tabs = remainingTabs;

				logger.success("[Store] 工作区标签已关闭，数量:", tabsToClose.length);
			});
		},
	})),
);

// ==============================
// Selector Hooks
// ==============================

/**
 * 获取当前活动标签
 * 优化：仅在活动标签变化时重新渲染
 */
export const useActiveTab = (): EditorTab | null => {
	const tabs = useEditorTabsStore((s) => s.tabs);
	const activeTabId = useEditorTabsStore((s) => s.activeTabId);
	return (tabs.find((t) => t.id === activeTabId) as EditorTab) ?? null;
};

/**
 * 获取标签数量
 * 优化：仅在标签数量变化时重新渲染
 */
export const useTabCount = (): number => {
	return useEditorTabsStore((s) => s.tabs.length);
};

/**
 * 检查是否有未保存的标签
 * 优化：仅在脏状态变化时重新渲染
 */
export const useHasDirtyTabs = (): boolean => {
	return useEditorTabsStore((s) => s.tabs.some((t) => t.isDirty));
};

/**
 * 获取所有标签
 * 优化：仅在标签列表变化时重新渲染
 */
export const useTabs = (): readonly EditorTab[] => {
	return useEditorTabsStore((s) => s.tabs) as readonly EditorTab[];
};

/**
 * 获取活动标签 ID
 * 优化：仅在活动标签 ID 变化时重新渲染
 */
export const useActiveTabId = (): string | null => {
	return useEditorTabsStore((s) => s.activeTabId);
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
