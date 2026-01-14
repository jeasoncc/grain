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
	readonly addTab: (tab: EditorTab) => void;
	readonly addTabWithState: (tab: EditorTab, editorState: EditorInstanceState) => void;
	readonly removeTab: (tabId: string) => void;
	readonly setTabs: (tabs: ReadonlyArray<EditorTab>) => void;
	readonly setActiveTabId: (tabId: string | null) => void;
	readonly updateTab: (tabId: string, updates: Partial<EditorTab>) => void;

	// Editor State Operations
	readonly setEditorState: (tabId: string, state: EditorInstanceState) => void;
	readonly updateEditorState: (
		tabId: string,
		updates: Partial<EditorInstanceState>,
	) => void;
	readonly removeEditorState: (tabId: string) => void;
	readonly setEditorStates: (states: Record<string, EditorInstanceState>) => void;
}

// ==============================
// Store Type
// ==============================

type EditorTabsStore = EditorTabsState & EditorTabsStoreActions;

// ==============================
// Store Implementation
// ==============================

export const useEditorTabsStore = create<EditorTabsStore>()((set) => ({
	// Initial State
	tabs: [],
	activeTabId: null,
	editorStates: {},

	// ==============================
	// Pure State Setters (no business logic)
	// ==============================

	addTab: (tab) => {
		set((state) => ({
			...state,
			tabs: [...state.tabs, tab],
		}));
	},

	/**
	 * 原子操作：同时添加 tab 和设置 editorState
	 * 避免多次渲染导致的时序问题
	 */
	addTabWithState: (tab, editorState) => {
		set((state) => ({
			...state,
			tabs: [...state.tabs, tab],
			editorStates: { ...state.editorStates, [tab.id]: editorState },
			activeTabId: tab.id,
		}));
	},

	removeTab: (tabId) => {
		set((state) => ({
			...state,
			tabs: state.tabs.filter((t: EditorTab) => t.id !== tabId),
		}));
	},

	setTabs: (tabs) => {
		set((state) => ({
			...state,
			tabs: [...tabs],
		}));
	},

	setActiveTabId: (tabId) => {
		set((state) => ({
			...state,
			activeTabId: tabId,
		}));
	},

	updateTab: (tabId, updates) => {
		set((state) => ({
			...state,
			tabs: state.tabs.map((t: EditorTab) => 
				t.id === tabId ? { ...t, ...updates } : t
			),
		}));
	},

	setEditorState: (tabId, editorState) => {
		set((state) => ({
			...state,
			editorStates: { ...state.editorStates, [tabId]: editorState },
		}));
	},

	updateEditorState: (tabId, updates) => {
		set((state) => ({
			...state,
			editorStates: state.editorStates[tabId] 
				? {
					...state.editorStates,
					[tabId]: { ...state.editorStates[tabId], ...updates }
				}
				: state.editorStates,
		}));
	},

	removeEditorState: (tabId) => {
		set((state) => {
			const { [tabId]: removed, ...rest } = state.editorStates;
			return {
				...state,
				editorStates: rest,
			};
		});
	},

	setEditorStates: (states) => {
		set((state) => ({
			...state,
			editorStates: { ...states },
		}));
	},
}));

// ==============================
// Selector Hooks
// ==============================

/**
 * 获取所有标签
 */
export const useTabs = (): ReadonlyArray<EditorTab> => {
	return useEditorTabsStore((s) => s.tabs) as ReadonlyArray<EditorTab>;
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
