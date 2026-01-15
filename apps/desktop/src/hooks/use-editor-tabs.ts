/**
 * @file hooks/use-editor-tabs.ts
 * @description Editor Tabs React 绑定
 *
 * 连接 state 和 flows，提供 React 组件使用的编辑器标签功能。
 *
 * 依赖规则：hooks/ 只能依赖 flows/, state/, types/
 */

import { useCallback } from "react"
import {
	closeOtherTabsFlow,
	closeTabFlow,
	closeTabsByWorkspaceFlow,
	getTabsByWorkspaceFlow,
	openTabFlow,
	reorderTabsFlow,
	setActiveTabFlow,
	updateEditorStateFlow,
} from "@/flows/editor-tabs"
import {
	useActiveTab,
	useActiveTabId,
	useEditorTabsStore,
	useTabs,
} from "@/state/editor-tabs.state"
import type { EditorInstanceState, EditorTab, OpenTabPayload } from "@/types/editor-tab"

// ==============================
// Editor Tabs Hook
// ==============================

/**
 * Main editor tabs hook providing all tab-related state and actions.
 */
export function useEditorTabs() {
	const tabs = useTabs()
	const activeTabId = useActiveTabId()
	const activeTab = useActiveTab()

	// Open tab
	const openTab = useCallback((payload: OpenTabPayload) => {
		openTabFlow(payload, useEditorTabsStore.getState())
	}, [])

	// Close tab
	const closeTab = useCallback((tabId: string) => {
		closeTabFlow(tabId, useEditorTabsStore.getState())
	}, [])

	// Close other tabs
	const closeOtherTabs = useCallback((tabId: string) => {
		closeOtherTabsFlow(tabId, useEditorTabsStore.getState())
	}, [])

	// Close all tabs
	const closeAllTabs = useCallback(() => {
		const state = useEditorTabsStore.getState()
		state.setTabs([])
		state.setActiveTabId(null)
		state.setEditorStates({})
	}, [])

	// Set active tab
	const setActiveTab = useCallback((tabId: string) => {
		setActiveTabFlow(tabId, useEditorTabsStore.getState())
	}, [])

	// Update tab title
	const updateTabTitle = useCallback((tabId: string, title: string) => {
		useEditorTabsStore.getState().updateTab(tabId, { title })
	}, [])

	// Set tab dirty
	const setTabDirty = useCallback((tabId: string, isDirty: boolean) => {
		useEditorTabsStore.getState().updateTab(tabId, { isDirty })
	}, [])

	// Reorder tabs
	const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
		reorderTabsFlow(fromIndex, toIndex, useEditorTabsStore.getState())
	}, [])

	// Update editor state
	const updateEditorState = useCallback((tabId: string, updates: Partial<EditorInstanceState>) => {
		updateEditorStateFlow(tabId, updates, useEditorTabsStore.getState())
	}, [])

	// Get editor state
	const getEditorState = useCallback((tabId: string): EditorInstanceState | undefined => {
		return useEditorTabsStore.getState().editorStates[tabId]
	}, [])

	// Get tabs by workspace
	const getTabsByWorkspace = useCallback((workspaceId: string): readonly EditorTab[] => {
		return getTabsByWorkspaceFlow(
			workspaceId,
			useEditorTabsStore.getState().tabs as readonly EditorTab[],
		) as readonly EditorTab[]
	}, [])

	// Close tabs by workspace
	const closeTabsByWorkspace = useCallback((workspaceId: string) => {
		closeTabsByWorkspaceFlow(workspaceId, useEditorTabsStore.getState())
	}, [])

	return {
		activeTab,
		activeTabId,
		closeAllTabs,
		closeOtherTabs,
		closeTab,
		closeTabsByWorkspace,
		getEditorState,
		getTabsByWorkspace,

		// Actions
		openTab,
		reorderTabs,
		setActiveTab,
		setTabDirty,
		// State
		tabs,
		updateEditorState,
		updateTabTitle,
	}
}

// Re-export state selectors for convenience
export {
	useActiveTab,
	useActiveTabId,
	useTabs,
} from "@/state/editor-tabs.state"
