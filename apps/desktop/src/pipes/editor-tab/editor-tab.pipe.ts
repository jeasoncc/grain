/**
 * @file pipes/editor-tab/editor-tab.pipe.ts
 * @description Editor Tab 纯函数
 *
 * 编辑器标签页相关的纯函数：
 * - 无副作用
 * - 相同输入 → 相同输出
 * - 不修改输入参数
 */

import { orderBy } from "es-toolkit"
import type { EditorInstanceState, EditorTab } from "@/types/editor-tab"

// ==============================
// Tab Operations (Pure Functions)
// ==============================

/**
 * 根据 nodeId 查找标签
 */
export const findTabByNodeId = (
	tabs: readonly EditorTab[],
	nodeId: string,
): EditorTab | undefined => tabs.find((t) => t.nodeId === nodeId)

/**
 * 根据 id 查找标签
 */
export const findTabById = (tabs: readonly EditorTab[], id: string): EditorTab | undefined =>
	tabs.find((t) => t.id === id)

/**
 * 获取指定工作空间的标签
 */
export const getTabsByWorkspace = (
	tabs: readonly EditorTab[],
	workspaceId: string,
): readonly EditorTab[] => tabs.filter((t) => t.workspaceId === workspaceId)

/**
 * 计算关闭标签后的新活动标签 ID
 */
export const calculateNextActiveTabId = (
	tabs: readonly EditorTab[],
	closedTabId: string,
	currentActiveTabId: string | null,
): string | null => {
	if (currentActiveTabId !== closedTabId) {
		return currentActiveTabId
	}

	const closedIndex = tabs.findIndex((t) => t.id === closedTabId)
	const remainingTabs = tabs.filter((t) => t.id !== closedTabId)

	if (remainingTabs.length === 0) {
		return null
	}

	const newIndex = Math.min(closedIndex, remainingTabs.length - 1)
	return remainingTabs[newIndex].id
}

// ==============================
// Immutable State Updates
// ==============================

/**
 * 添加新标签（不可变）
 */
export const addTab = (tabs: readonly EditorTab[], newTab: EditorTab): readonly EditorTab[] => [
	...tabs,
	newTab,
]

/**
 * 移除标签（不可变）
 */
export const removeTab = (tabs: readonly EditorTab[], tabId: string): readonly EditorTab[] =>
	tabs.filter((t) => t.id !== tabId)

/**
 * 更新标签（不可变）
 */
export const updateTab = (
	tabs: readonly EditorTab[],
	tabId: string,
	updates: Partial<EditorTab>,
): readonly EditorTab[] => tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t))

/**
 * 重新排序标签（不可变）
 */
export const reorderTabs = (
	tabs: readonly EditorTab[],
	fromIndex: number,
	toIndex: number,
): readonly EditorTab[] => {
	const itemToMove = tabs[fromIndex]

	// Create new array without the item at fromIndex
	const withoutItem = tabs.filter((_, index) => index !== fromIndex)

	// Insert the item at the new position
	return [...withoutItem.slice(0, toIndex), itemToMove, ...withoutItem.slice(toIndex)]
}

// ==============================
// LRU Cache Operations
// ==============================

/**
 * LRU 缓存清理 - 移除最久未使用的编辑器状态
 */
export const evictLRUEditorStates = (
	states: Readonly<Record<string, EditorInstanceState>>,
	activeTabId: string | null,
	openTabIds: ReadonlySet<string>,
	maxStates: number,
): Readonly<Record<string, EditorInstanceState>> => {
	const entries = Object.entries(states)

	if (entries.length <= maxStates) {
		return states
	}

	const sortedEntries = orderBy(entries, [([, state]) => state.lastModified ?? 0], ["asc"])

	const toEvictCount = entries.length - maxStates

	// Use functional approach to collect IDs to evict
	const evictedIds = sortedEntries
		.filter(([id, state]) => {
			return id !== activeTabId && !openTabIds.has(id) && !state.isDirty
		})
		.slice(0, toEvictCount)
		.map(([id]) => id)

	if (evictedIds.length === 0) {
		return states
	}

	const evictedSet = new Set(evictedIds)
	return Object.fromEntries(entries.filter(([id]) => !evictedSet.has(id)))
}

// ==============================
// Validation Functions
// ==============================

/**
 * 验证标签是否有效
 */
export const isValidTab = (tab: unknown): tab is EditorTab => {
	if (typeof tab !== "object" || tab === null) return false
	const t = tab as Record<string, unknown>
	return (
		typeof t.id === "string" &&
		typeof t.workspaceId === "string" &&
		typeof t.nodeId === "string" &&
		typeof t.title === "string" &&
		["file", "diary", "canvas", "folder"].includes(t.type as string)
	)
}

/**
 * 验证标签索引是否有效
 */
export const isValidTabIndex = (tabs: readonly EditorTab[], index: number): boolean =>
	index >= 0 && index < tabs.length
