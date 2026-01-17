/**
 * @file flows/editor-tabs/editor-tabs.flow.ts
 * @description Editor Tabs 业务流程
 *
 * 组合 pipes + state 形成完整的编辑器标签页流程
 *
 * 依赖规则：flows/ 只能依赖 pipes/, io/, state/, types/
 */

import dayjs from "dayjs"
import type { SerializedEditorState } from "lexical"
import {
	calculateNextActiveTabId,
	findTabByNodeId,
	getTabsByWorkspace,
} from "@/pipes/editor-tab"
import type { useEditorTabsStore } from "@/state/editor-tabs.state"
import type { EditorInstanceState, EditorTab, OpenTabPayload } from "@/types/editor-tab"
import { createDefaultEditorState, EditorStateBuilder, EditorTabBuilder } from "@/types/editor-tab"

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
	const existingTab = findTabByNodeId(store.tabs as readonly EditorTab[], payload.nodeId)

	if (existingTab) {
		store.setActiveTabId(existingTab.id)
		if (store.editorStates[existingTab.id]) {
			store.updateEditorState(existingTab.id, {
				lastModified: dayjs().valueOf(),
			})
		}
		return
	}

	const newTab = EditorTabBuilder.create()
		.workspaceId(payload.workspaceId)
		.nodeId(payload.nodeId)
		.title(payload.title)
		.type(payload.type)
		.build()

	// 如果有初始内容，使用它；否则创建空状态
	const newEditorState = payload.initialContent
		? EditorStateBuilder.fromDefault()
				.serializedState(payload.initialContent as SerializedEditorState)
				.build()
		: EditorStateBuilder.fromDefault().build()

	// 使用原子操作同时添加 tab、设置 editorState 和激活 tab
	// 避免多次渲染导致 Lexical 初始化时 initialState 为空的问题
	store.addTabWithState(newTab as EditorTab, newEditorState)
}

/**
 * Close a tab flow
 */
export const closeTabFlow = (
	tabId: string,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	const newActiveTabId = calculateNextActiveTabId(
		store.tabs as readonly EditorTab[],
		tabId,
		store.activeTabId,
	)

	store.removeTab(tabId)
	store.setActiveTabId(newActiveTabId)
	store.removeEditorState(tabId)
}

/**
 * Close other tabs flow
 */
export const closeOtherTabsFlow = (
	tabId: string,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	const tab = store.tabs.find((t: EditorTab) => t.id === tabId)
	if (!tab) {
		return
	}

	const currentEditorState = store.editorStates[tabId]

	store.setTabs([tab as EditorTab])
	store.setActiveTabId(tabId)
	store.setEditorStates(currentEditorState ? { [tabId]: currentEditorState } : {})
}

/**
 * Set active tab flow
 */
export const setActiveTabFlow = (
	tabId: string,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	if (store.tabs.some((t: EditorTab) => t.id === tabId)) {
		store.setActiveTabId(tabId)
		if (store.editorStates[tabId]) {
			store.updateEditorState(tabId, {
				lastModified: dayjs().valueOf(),
			})
		}
	}
}

/**
 * Reorder tabs flow
 */
export const reorderTabsFlow = (
	fromIndex: number,
	toIndex: number,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	const currentTabs = [...store.tabs] as readonly EditorTab[]
	const removed = currentTabs[fromIndex]
	const withoutRemoved = [...currentTabs.slice(0, fromIndex), ...currentTabs.slice(fromIndex + 1)]
	const reordered = [...withoutRemoved.slice(0, toIndex), removed, ...withoutRemoved.slice(toIndex)]
	store.setTabs(reordered)
}

/**
 * Update editor state flow
 */
export const updateEditorStateFlow = (
	tabId: string,
	updates: Partial<EditorInstanceState>,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	const existingState = store.editorStates[tabId] || createDefaultEditorState()

	store.setEditorState(tabId, {
		...existingState,
		...updates,
		lastModified: dayjs().valueOf(),
	})
}

/**
 * Get tabs by workspace flow
 */
export const getTabsByWorkspaceFlow = (
	workspaceId: string,
	tabs: readonly EditorTab[],
): readonly EditorTab[] => {
	return getTabsByWorkspace(tabs, workspaceId)
}

/**
 * Close tabs by workspace flow
 */
export const closeTabsByWorkspaceFlow = (
	workspaceId: string,
	store: ReturnType<typeof useEditorTabsStore.getState>,
): void => {
	const tabsToClose = store.tabs.filter((t: EditorTab) => t.workspaceId === workspaceId)
	const remainingTabs = store.tabs.filter((t: EditorTab) => t.workspaceId !== workspaceId)

	// Remove editor states for closed tabs
	const tabIdsToRemove = new Set(tabsToClose.map((tab) => tab.id))
	const newEditorStates = Object.fromEntries(
		Object.entries(store.editorStates).filter(([tabId]) => !tabIdsToRemove.has(tabId)),
	)

	// Update active tab if needed
	let newActiveTabId = store.activeTabId
	if (store.activeTabId && tabsToClose.some((t: EditorTab) => t.id === store.activeTabId)) {
		newActiveTabId = remainingTabs.length > 0 ? remainingTabs[0].id : null
	}

	store.setTabs(remainingTabs as readonly EditorTab[])
	store.setActiveTabId(newActiveTabId)
	store.setEditorStates(newEditorStates)
}

/**
 * Find tab by node ID
 */
export const findTabByNodeIdFlow = (
	tabs: readonly EditorTab[],
	nodeId: string,
): EditorTab | undefined => {
	return findTabByNodeId(tabs, nodeId)
}
