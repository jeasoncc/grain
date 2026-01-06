/**
 * @file pipes/editor-tab/editor-tab.pipe.ts
 * @description Editor Tab 纯函数
 *
 * 编辑器标签页相关的纯函数：
 * - 无副作用
 * - 相同输入 → 相同输出
 * - 不修改输入参数
 */

import type { EditorInstanceState, EditorTab } from "@/types/editor-tab";

// ==============================
// Tab Operations (Pure Functions)
// ==============================

/**
 * 根据 nodeId 查找标签
 */
export const findTabByNodeId = (
	tabs: readonly EditorTab[],
	nodeId: string,
): EditorTab | undefined => tabs.find((t) => t.nodeId === nodeId);

/**
 * 根据 id 查找标签
 */
export const findTabById = (
	tabs: readonly EditorTab[],
	id: string,
): EditorTab | undefined => tabs.find((t) => t.id === id);

/**
 * 获取指定工作空间的标签
 */
export const getTabsByWorkspace = (
	tabs: readonly EditorTab[],
	workspaceId: string,
): readonly EditorTab[] => tabs.filter((t) => t.workspaceId === workspaceId);

/**
 * 计算关闭标签后的新活动标签 ID
 */
export const calculateNextActiveTabId = (
	tabs: readonly EditorTab[],
	closedTabId: string,
	currentActiveTabId: string | null,
): string | null => {
	if (currentActiveTabId !== closedTabId) {
		return currentActiveTabId;
	}

	const closedIndex = tabs.findIndex((t) => t.id === closedTabId);
	const remainingTabs = tabs.filter((t) => t.id !== closedTabId);

	if (remainingTabs.length === 0) {
		return null;
	}

	const newIndex = Math.min(closedIndex, remainingTabs.length - 1);
	return remainingTabs[newIndex].id;
};

// ==============================
// Immutable State Updates
// ==============================

/**
 * 添加新标签（不可变）
 */
export const addTab = (
	tabs: readonly EditorTab[],
	newTab: EditorTab,
): readonly EditorTab[] => [...tabs, newTab];

/**
 * 移除标签（不可变）
 */
export const removeTab = (
	tabs: readonly EditorTab[],
	tabId: string,
): readonly EditorTab[] => tabs.filter((t) => t.id !== tabId);

/**
 * 更新标签（不可变）
 */
export const updateTab = (
	tabs: readonly EditorTab[],
	tabId: string,
	updates: Partial<EditorTab>,
): readonly EditorTab[] =>
	tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t));

/**
 * 重新排序标签（不可变）
 */
export const reorderTabs = (
	tabs: readonly EditorTab[],
	fromIndex: number,
	toIndex: number,
): readonly EditorTab[] => {
	const result = [...tabs];
	const [removed] = result.splice(fromIndex, 1);
	result.splice(toIndex, 0, removed);
	return result;
};

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
	const entries = Object.entries(states);

	if (entries.length <= maxStates) {
		return states;
	}

	const sortedEntries = [...entries].sort(
		([, a], [, b]) => (a.lastModified ?? 0) - (b.lastModified ?? 0),
	);

	const toEvictCount = entries.length - maxStates;
	const evictedIds = new Set<string>();

	for (const [id, state] of sortedEntries) {
		if (evictedIds.size >= toEvictCount) break;

		if (id === activeTabId || openTabIds.has(id) || state.isDirty) {
			continue;
		}

		evictedIds.add(id);
	}

	if (evictedIds.size === 0) {
		return states;
	}

	return Object.fromEntries(entries.filter(([id]) => !evictedIds.has(id)));
};

// ==============================
// Validation Functions
// ==============================

/**
 * 验证标签是否有效
 */
export const isValidTab = (tab: unknown): tab is EditorTab => {
	if (typeof tab !== "object" || tab === null) return false;
	const t = tab as Record<string, unknown>;
	return (
		typeof t.id === "string" &&
		typeof t.workspaceId === "string" &&
		typeof t.nodeId === "string" &&
		typeof t.title === "string" &&
		["file", "diary", "canvas", "folder"].includes(t.type as string)
	);
};

/**
 * 验证标签索引是否有效
 */
export const isValidTabIndex = (
	tabs: readonly EditorTab[],
	index: number,
): boolean => index >= 0 && index < tabs.length;
