/**
 * @file stores/editor-history.store.ts
 * @description Editor History 状态管理
 *
 * Manages editor undo/redo history with per-node stacks.
 * Uses Zustand with custom Map serialization for persistence.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import dayjs from "dayjs"
import {
	EDITOR_HISTORY_STORAGE_KEY,
	type EditorHistoryEntry,
	type EditorHistoryStore,
	MAX_HISTORY_SIZE,
} from "@/types/editor-history"

// ============================================================================
// Store Implementation
// ============================================================================

export const useEditorHistoryStore = create<EditorHistoryStore>()(
	persist(
		(set, get) => ({
			canRedo: (nodeId) => {
				const nodeRedoHistory = get().redoStack.get(nodeId)
				return (nodeRedoHistory?.length ?? 0) > 0
			},

			// Queries
			canUndo: (nodeId) => {
				const nodeHistory = get().undoStack.get(nodeId)
				return (nodeHistory?.length ?? 0) > 0
			},

			clearAllHistory: () => {
				set({
					redoStack: new Map(),
					undoStack: new Map(),
				})
			},

			clearHistory: (nodeId) => {
				set((state) => {
					// Create new maps without the specified nodeId (functional approach)
					const newUndoStack = new Map(
						[...state.undoStack.entries()].filter(([key]) => key !== nodeId)
					)
					const newRedoStack = new Map(
						[...state.redoStack.entries()].filter(([key]) => key !== nodeId)
					)

					return { redoStack: newRedoStack, undoStack: newUndoStack }
				})
			},
			currentNodeId: null,

			getHistoryCount: (nodeId) => {
				const state = get()
				return {
					redo: state.redoStack.get(nodeId)?.length ?? 0,
					undo: state.undoStack.get(nodeId)?.length ?? 0,
				}
			},

			// Actions
			pushHistory: (nodeId, content, wordCount) => {
				set((state) => {
					const undoStack = new Map(state.undoStack)
					const redoStack = new Map(state.redoStack)

					const nodeHistory = [...(undoStack.get(nodeId) || [])]
					const entry: EditorHistoryEntry = {
						content,
						nodeId,
						timestamp: dayjs().toISOString(),
						wordCount,
					}

					const newNodeHistory = [...nodeHistory, entry]

					// Limit history size
					const limitedHistory =
						newNodeHistory.length > MAX_HISTORY_SIZE ? newNodeHistory.slice(1) : newNodeHistory

					const newUndoStack = new Map([...undoStack, [nodeId, limitedHistory]])
					// Clear redo stack on new action
					const newRedoStack = new Map([...redoStack.entries()].filter(([key]) => key !== nodeId))

					return { redoStack: newRedoStack, undoStack: newUndoStack }
				})
			},

			redo: (nodeId) => {
				const state = get()
				const nodeRedoHistory = [...(state.redoStack.get(nodeId) || [])]
				if (nodeRedoHistory.length === 0) {
					return null
				}

				const newNodeRedoHistory = nodeRedoHistory.slice(0, -1)
				const entry = nodeRedoHistory[nodeRedoHistory.length - 1]
				if (!entry) {
					return null
				}

				// Push back to undo stack
				const nodeHistory = [...(state.undoStack.get(nodeId) || [])]
				const newNodeHistory = [...nodeHistory, entry]

				const newUndoStack = new Map([...state.undoStack, [nodeId, newNodeHistory]])
				const newRedoStack = new Map([...state.redoStack, [nodeId, newNodeRedoHistory]])

				set({ redoStack: newRedoStack, undoStack: newUndoStack })

				return entry
			},
			redoStack: new Map(),

			setCurrentNode: (nodeId) => {
				set({ currentNodeId: nodeId })
			},

			undo: (nodeId) => {
				const state = get()
				const nodeHistory = [...(state.undoStack.get(nodeId) || [])]
				if (nodeHistory.length === 0) {
					return null
				}

				const newNodeHistory = nodeHistory.slice(0, -1)
				const entry = nodeHistory[nodeHistory.length - 1]
				if (!entry) {
					return null
				}

				// Push to redo stack
				const nodeRedoHistory = [...(state.redoStack.get(nodeId) || [])]
				const newNodeRedoHistory = [...nodeRedoHistory, entry]

				const newUndoStack = new Map([...state.undoStack, [nodeId, newNodeHistory]])
				const newRedoStack = new Map([...state.redoStack, [nodeId, newNodeRedoHistory]])

				set({ redoStack: newRedoStack, undoStack: newUndoStack })

				return entry
			},
			// State
			undoStack: new Map(),
		}),
		{
			name: EDITOR_HISTORY_STORAGE_KEY,
			partialize: (state) => ({
				redoStack: Array.from(state.redoStack.entries()),
				undoStack: Array.from(state.undoStack.entries()),
			}),
			storage: {
				getItem: (name) => {
					const str = localStorage.getItem(name)
					if (!str) return null
					const parsed = JSON.parse(str)
					return {
						state: {
							...parsed.state,
							redoStack: new Map(parsed.state.redoStack),
							undoStack: new Map(parsed.state.undoStack),
						},
					}
				},
				removeItem: (name) => localStorage.removeItem(name),
				setItem: (name, value) => {
					const serialized = {
						state: {
							redoStack: Array.from((value.state as EditorHistoryStore).redoStack.entries()),
							undoStack: Array.from((value.state as EditorHistoryStore).undoStack.entries()),
						},
					}
					localStorage.setItem(name, JSON.stringify(serialized))
				},
			},
		},
	),
)

// ============================================================================
// Selector Hooks
// ============================================================================

export const useCurrentNodeId = () => useEditorHistoryStore((state) => state.currentNodeId)

/** @deprecated Use useEditorHistoryStore instead - kept for backward compatibility */
export const useEditorHistory = useEditorHistoryStore
