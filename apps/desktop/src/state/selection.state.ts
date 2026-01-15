/**
 * @file selection.store.ts
 * @description Selection 状态管理
 *
 * 管理工作区和节点的选择状态，支持持久化。
 * 使用 Zustand + Immer 实现不可变状态管理。
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { SelectionActions, SelectionState } from "@/types/selection"
import { DEFAULT_SELECTION_CONFIG } from "@/types/selection"

// ==============================
// Store Type
// ==============================

type SelectionStore = SelectionState & SelectionActions

// ==============================
// Store Implementation
// ==============================

export const useSelectionStore = create<SelectionStore>()(
	persist(
		(set) => ({
			clearSelection: () => {
				set((state) => ({
					...state,
					selectedNodeId: null,
					selectedWorkspaceId: null,
				}))
			},
			selectedNodeId: null,
			// Initial State
			selectedWorkspaceId: null,

			setSelectedNodeId: (id) => {
				set((state) => ({
					...state,
					selectedNodeId: id,
				}))
			},

			// ==============================
			// Actions
			// ==============================

			setSelectedWorkspaceId: (id) => {
				set((state) => ({
					...state,
					// 切换工作区时清除节点选择
					selectedNodeId: null,
					selectedWorkspaceId: id,
				}))
			},
		}),
		{
			name: DEFAULT_SELECTION_CONFIG.storageKey,
			partialize: (state) => ({
				// 只持久化工作区选择，不持久化节点选择
				selectedWorkspaceId: state.selectedWorkspaceId,
			}),
		},
	),
)

// ==============================
// Selector Hooks
// ==============================

/**
 * 获取当前选中的工作区 ID
 * 优化：仅在工作区变化时重新渲染
 */
export const useSelectedWorkspaceId = (): string | null => {
	return useSelectionStore((state) => state.selectedWorkspaceId)
}

/**
 * 获取当前选中的节点 ID
 * 优化：仅在节点选择变化时重新渲染
 */
export const useSelectedNodeId = (): string | null => {
	return useSelectionStore((state) => state.selectedNodeId)
}

/**
 * 检查指定工作区是否被选中
 */
export const useIsWorkspaceSelected = (workspaceId: string): boolean => {
	return useSelectionStore((state) => state.selectedWorkspaceId === workspaceId)
}

/**
 * 检查指定节点是否被选中
 */
export const useIsNodeSelected = (nodeId: string): boolean => {
	return useSelectionStore((state) => state.selectedNodeId === nodeId)
}

/**
 * 检查是否存在任何选择
 */
export const useHasSelection = (): boolean => {
	return useSelectionStore(
		(state) => state.selectedWorkspaceId !== null || state.selectedNodeId !== null,
	)
}
