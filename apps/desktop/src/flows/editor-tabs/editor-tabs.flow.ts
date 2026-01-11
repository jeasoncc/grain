/**
 * @file flows/editor-tabs/editor-tabs.flow.ts
 * @description Editor Tabs 业务流程
 *
 * 组合 pipes + state 形成完整的编辑器标签页流程
 *
 * 依赖规则：flows/ 只能依赖 pipes/, io/, state/, types/
 */

import dayjs from "dayjs";
import {
	calculateNextActiveTabId,
	evictLRUEditorStates,
	findTabByNodeId,
	getTabsByWorkspace,
} from "@/pipes/editor-tab";
import type { useEditorTabsStore } from "@/state/editor-tabs.state";
import type {
	EditorInstanceState,
	EditorTab,
	OpenTabPayload,
} from "@/types/editor-tab";
import {
	createDefaultEditorState,
	EditorStateBuilder,
	EditorTabBuilder,
} from "@/types/editor-tab";

// ==============================
// Configuration
// ==============================

const MAX_EDITOR_STATES = 10;

// ==============================
// Tab Operations Flow
// ==============================

/**
 * Open a tab flow
 */
export const openTabFlow = (
	payload: OpenTabPayload,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	const existingTab = findTabByNodeId(
		store.tabs as EditorTab[],
		payload.nodeId,
	);

	if (existingTab) {
		store.setActiveTabId(existingTab.id);
		if (store.editorStates[existingTab.id]) {
			store.updateEditorState(existingTab.id, {
				lastModified: dayjs().valueOf(),
			});
		}
		return;
	}

	const newTab = EditorTabBuilder.create()
		.workspaceId(payload.workspaceId)
		.nodeId(payload.nodeId)
		.title(payload.title)
		.type(payload.type)
		.build();

	// 如果有初始内容，使用它；否则创建空状态
	const newEditorState = payload.initialContent
		? EditorStateBuilder.fromDefault()
				.serializedState(payload.initialContent as any)
				.build()
		: EditorStateBuilder.fromDefault().build();

	// 使用原子操作同时添加 tab、设置 editorState 和激活 tab
	// 避免多次渲染导致 Lexical 初始化时 initialState 为空的问题
	store.addTabWithState(newTab as EditorTab, newEditorState);

	// LRU eviction
	evictEditorStatesFlow(store);
};

/**
 * Close a tab flow
 */
export const closeTabFlow = (
	tabId: string,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	const newActiveTabId = calculateNextActiveTabId(
		store.tabs as EditorTab[],
		tabId,
		store.activeTabId,
	);

	store.removeTab(tabId);
	store.setActiveTabId(newActiveTabId);
	store.removeEditorState(tabId);
};

/**
 * Close other tabs flow
 */
export const closeOtherTabsFlow = (
	tabId: string,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	const tab = store.tabs.find((t: EditorTab) => t.id === tabId);
	if (!tab) return;

	const currentEditorState = store.editorStates[tabId];

	store.setTabs([tab as EditorTab]);
	store.setActiveTabId(tabId);
	store.setEditorStates(
		currentEditorState ? { [tabId]: currentEditorState } : {},
	);
};

/**
 * Set active tab flow
 */
export const setActiveTabFlow = (
	tabId: string,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	if (store.tabs.some((t: EditorTab) => t.id === tabId)) {
		store.setActiveTabId(tabId);
		if (store.editorStates[tabId]) {
			store.updateEditorState(tabId, {
				lastModified: dayjs().valueOf(),
			});
		}
	}
};

/**
 * Reorder tabs flow
 */
export const reorderTabsFlow = (
	fromIndex: number,
	toIndex: number,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	const currentTabs = [...store.tabs] as EditorTab[];
	const [removed] = currentTabs.splice(fromIndex, 1);
	currentTabs.splice(toIndex, 0, removed);
	store.setTabs(currentTabs);
};

/**
 * Update editor state flow
 */
export const updateEditorStateFlow = (
	tabId: string,
	updates: Partial<EditorInstanceState>,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	const existingState = store.editorStates[tabId] || createDefaultEditorState();

	store.setEditorState(tabId, {
		...existingState,
		...updates,
		lastModified: dayjs().valueOf(),
	});

	// LRU eviction
	evictEditorStatesFlow(store);
};

/**
 * Get tabs by workspace flow
 */
export const getTabsByWorkspaceFlow = (
	workspaceId: string,
	tabs: readonly EditorTab[],
): readonly EditorTab[] => {
	return getTabsByWorkspace(tabs, workspaceId);
};

/**
 * Close tabs by workspace flow
 */
export const closeTabsByWorkspaceFlow = (
	workspaceId: string,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	const tabsToClose = store.tabs.filter(
		(t: EditorTab) => t.workspaceId === workspaceId,
	);
	const remainingTabs = store.tabs.filter(
		(t: EditorTab) => t.workspaceId !== workspaceId,
	);

	// Remove editor states for closed tabs
	const newEditorStates = { ...store.editorStates };
	for (const tab of tabsToClose) {
		delete newEditorStates[tab.id];
	}

	// Update active tab if needed
	let newActiveTabId = store.activeTabId;
	if (
		store.activeTabId &&
		tabsToClose.some((t: EditorTab) => t.id === store.activeTabId)
	) {
		newActiveTabId = remainingTabs.length > 0 ? remainingTabs[0].id : null;
	}

	store.setTabs(remainingTabs as EditorTab[]);
	store.setActiveTabId(newActiveTabId);
	store.setEditorStates(newEditorStates);
};

/**
 * LRU eviction flow (internal)
 */
const evictEditorStatesFlow = (
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	const openTabIds = new Set(store.tabs.map((t: EditorTab) => t.id));
	const evictedStates = evictLRUEditorStates(
		store.editorStates,
		store.activeTabId,
		openTabIds as ReadonlySet<string>,
		MAX_EDITOR_STATES,
	);
	store.setEditorStates(evictedStates as Record<string, EditorInstanceState>);
};

/**
 * Find tab by node ID
 */
export const findTabByNodeIdFlow = (
	tabs: readonly EditorTab[],
	nodeId: string,
): EditorTab | undefined => {
	return findTabByNodeId(tabs, nodeId);
};
