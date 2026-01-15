/**
 * @file fn/editor-tab/editor-tab.fn.ts
 * @description Editor Tab 纯函数
 *
 * 编辑器标签页相关的纯函数：
 * - 无副作用
 * - 相同输入 → 相同输出
 * - 不修改输入参数
 */

import type { EditorInstanceState, EditorTab } from "@/types/editor-tab"

// ==============================
// Tab Operations (Pure Functions)
// ==============================

/**
 * 创建默认的编辑器实例状态
 *
 * @returns 默认的编辑器实例状态
 */
export const createDefaultEditorState = (): EditorInstanceState => ({
	isDirty: false,
	lastModified: Date.now(),
	scrollLeft: 0,
	scrollTop: 0,
	selectionState: undefined,
	serializedState: undefined,
})

/**
 * 根据 nodeId 查找标签
 *
 * @param tabs - 标签数组
 * @param nodeId - 节点 ID
 * @returns 匹配的标签，未找到返回 undefined
 */
export const findTabByNodeId = (
	tabs: readonly EditorTab[],
	nodeId: string,
): EditorTab | undefined => tabs.find((t) => t.nodeId === nodeId)

/**
 * 根据 id 查找标签
 *
 * @param tabs - 标签数组
 * @param id - 标签 ID
 * @returns 匹配的标签，未找到返回 undefined
 */
export const findTabById = (tabs: readonly EditorTab[], id: string): EditorTab | undefined =>
	tabs.find((t) => t.id === id)

/**
 * 获取指定工作空间的标签
 *
 * @param tabs - 标签数组
 * @param workspaceId - 工作空间 ID
 * @returns 该工作空间的标签数组
 */
export const getTabsByWorkspace = (
	tabs: readonly EditorTab[],
	workspaceId: string,
): readonly EditorTab[] => tabs.filter((t) => t.workspaceId === workspaceId)

/**
 * 计算关闭标签后的新活动标签 ID
 *
 * @param tabs - 标签数组
 * @param closedTabId - 被关闭的标签 ID
 * @param currentActiveTabId - 当前活动标签 ID
 * @returns 新的活动标签 ID，无标签时返回 null
 */
export const calculateNextActiveTabId = (
	tabs: readonly EditorTab[],
	closedTabId: string,
	currentActiveTabId: string | null,
): string | null => {
	// 如果关闭的不是当前活动标签，保持不变
	if (currentActiveTabId !== closedTabId) {
		return currentActiveTabId
	}

	const closedIndex = tabs.findIndex((t) => t.id === closedTabId)
	const remainingTabs = tabs.filter((t) => t.id !== closedTabId)

	if (remainingTabs.length === 0) {
		return null
	}

	// 优先选择右边的标签，否则选择左边的
	const newIndex = Math.min(closedIndex, remainingTabs.length - 1)
	return remainingTabs[newIndex].id
}

// ==============================
// Immutable State Updates
// ==============================

/**
 * 添加新标签（不可变）
 *
 * @param tabs - 当前标签数组
 * @param newTab - 新标签
 * @returns 包含新标签的新数组
 */
export const addTab = (tabs: readonly EditorTab[], newTab: EditorTab): readonly EditorTab[] => [
	...tabs,
	newTab,
]

/**
 * 移除标签（不可变）
 *
 * @param tabs - 当前标签数组
 * @param tabId - 要移除的标签 ID
 * @returns 移除后的新数组
 */
export const removeTab = (tabs: readonly EditorTab[], tabId: string): readonly EditorTab[] =>
	tabs.filter((t) => t.id !== tabId)

/**
 * 更新标签（不可变）
 *
 * @param tabs - 当前标签数组
 * @param tabId - 要更新的标签 ID
 * @param updates - 部分更新
 * @returns 更新后的新数组
 */
export const updateTab = (
	tabs: readonly EditorTab[],
	tabId: string,
	updates: Partial<EditorTab>,
): readonly EditorTab[] => tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t))

/**
 * 重新排序标签（不可变）
 *
 * @param tabs - 当前标签数组
 * @param fromIndex - 源索引
 * @param toIndex - 目标索引
 * @returns 重新排序后的新数组
 */
export const reorderTabs = (
	tabs: readonly EditorTab[],
	fromIndex: number,
	toIndex: number,
): readonly EditorTab[] => {
	if (fromIndex === toIndex) return tabs

	const tabsArray = [...tabs]
	const movedTab = tabsArray[fromIndex]

	// 创建新数组，不使用 splice 变异操作
	const withoutMoved = tabsArray.filter((_, index) => index !== fromIndex)
	const result = [...withoutMoved.slice(0, toIndex), movedTab, ...withoutMoved.slice(toIndex)]

	return result
}

// ==============================
// Editor State Operations
// ==============================

/**
 * 更新编辑器状态（不可变）
 *
 * @param states - 当前状态记录
 * @param tabId - 标签 ID
 * @param updates - 部分更新
 * @returns 更新后的新状态记录
 */
export const updateEditorState = (
	states: Readonly<Record<string, EditorInstanceState>>,
	tabId: string,
	updates: Partial<EditorInstanceState>,
): Readonly<Record<string, EditorInstanceState>> => {
	const existingState = states[tabId] ?? createDefaultEditorState()
	return {
		...states,
		[tabId]: {
			...existingState,
			...updates,
			lastModified: Date.now(),
		},
	}
}

/**
 * 移除编辑器状态（不可变）
 *
 * @param states - 当前状态记录
 * @param tabId - 要移除的标签 ID
 * @returns 移除后的新状态记录
 */
export const removeEditorState = (
	states: Readonly<Record<string, EditorInstanceState>>,
	tabId: string,
): Readonly<Record<string, EditorInstanceState>> => {
	const { [tabId]: _, ...rest } = states
	return rest
}

// ==============================
// LRU Cache Operations
// ==============================

/**
 * LRU 缓存清理 - 移除最久未使用的编辑器状态
 *
 * @param states - 当前状态记录
 * @param activeTabId - 当前活动标签 ID
 * @param openTabIds - 打开的标签 ID 集合
 * @param maxStates - 最大状态数量
 * @returns 清理后的新状态记录
 */
export const evictLRUEditorStates = (
	states: Readonly<Record<string, EditorInstanceState>>,
	activeTabId: string | null,
	openTabIds: ReadonlySet<string>,
	maxStates: number,
): Readonly<Record<string, EditorInstanceState>> => {
	const entries = Object.entries(states)

	// 如果未超过限制，不需要清理
	if (entries.length <= maxStates) {
		return states
	}

	// 按 lastModified 排序（最旧的在前）
	const sortedEntries = [...entries].sort(
		([, a], [, b]) => (a.lastModified ?? 0) - (b.lastModified ?? 0),
	)

	// 计算需要清理的数量
	const toEvictCount = entries.length - maxStates

	// 使用函数式方法收集要清理的 ID
	const evictedIds = sortedEntries
		.slice(0, toEvictCount)
		.filter(([id, state]) => {
			// 不清理：活动标签、打开的标签、有未保存更改的状态
			return !(id === activeTabId || openTabIds.has(id) || state.isDirty)
		})
		.map(([id]) => id)

	// 如果无法清理任何状态，返回原状态
	if (evictedIds.length === 0) {
		return states
	}

	// 创建新对象，排除被清理的条目
	const evictedSet = new Set(evictedIds)
	return Object.fromEntries(entries.filter(([id]) => !evictedSet.has(id)))
}

// ==============================
// Validation Functions
// ==============================

/**
 * 验证标签是否有效
 *
 * @param tab - 要验证的对象
 * @returns 是否为有效的 EditorTab
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
 *
 * @param tabs - 标签数组
 * @param index - 要验证的索引
 * @returns 索引是否有效
 */
export const isValidTabIndex = (tabs: readonly EditorTab[], index: number): boolean =>
	index >= 0 && index < tabs.length
