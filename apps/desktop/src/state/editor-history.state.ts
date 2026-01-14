/**
 * @file stores/editor-history.store.ts
 * @description Editor History 状态管理
 *
 * Manages editor undo/redo history with per-node stacks.
 * Uses Zustand with custom Map serialization for persistence.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	EDITOR_HISTORY_STORAGE_KEY,
	type EditorHistoryEntry,
	type EditorHistoryStore,
	MAX_HISTORY_SIZE,
} from "@/types/editor-history";

// ============================================================================
// Store Implementation
// ============================================================================

export const useEditorHistoryStore = create<EditorHistoryStore>()(
	persist(
		(set, get) => ({
			// State
			undoStack: new Map(),
			redoStack: new Map(),
			currentNodeId: null,

			// Actions
			pushHistory: (nodeId, content, wordCount) => {
				set((state) => {
					const undoStack = new Map(state.undoStack);
					const redoStack = new Map(state.redoStack);

					const nodeHistory = [...(undoStack.get(nodeId) || [])];
					const entry: EditorHistoryEntry = {
						nodeId,
						content,
						timestamp: new Date().toISOString(),
						wordCount,
					};

					const newNodeHistory = [...nodeHistory, entry];

					// Limit history size
					const limitedHistory = newNodeHistory.length > MAX_HISTORY_SIZE 
						? newNodeHistory.slice(1)
						: newNodeHistory;

					const newUndoStack = new Map([...undoStack, [nodeId, limitedHistory]]);
					// Clear redo stack on new action
					const newRedoStack = new Map([...redoStack.entries()].filter(([key]) => key !== nodeId));

					return { undoStack: newUndoStack, redoStack: newRedoStack };
				});
			},

			undo: (nodeId) => {
				const state = get();
				const nodeHistory = [...(state.undoStack.get(nodeId) || [])];
				if (nodeHistory.length === 0) {
					return null;
				}

				const newNodeHistory = nodeHistory.slice(0, -1);
				const entry = nodeHistory[nodeHistory.length - 1];
				if (!entry) {
					return null;
				}

				// Push to redo stack
				const nodeRedoHistory = [...(state.redoStack.get(nodeId) || [])];
				const newNodeRedoHistory = [...nodeRedoHistory, entry];
				
				const newUndoStack = new Map([...state.undoStack, [nodeId, newNodeHistory]]);
				const newRedoStack = new Map([...state.redoStack, [nodeId, newNodeRedoHistory]]);

				set({ undoStack: newUndoStack, redoStack: newRedoStack });

				return entry;
			},

			redo: (nodeId) => {
				const state = get();
				const nodeRedoHistory = [...(state.redoStack.get(nodeId) || [])];
				if (nodeRedoHistory.length === 0) {
					return null;
				}

				const newNodeRedoHistory = nodeRedoHistory.slice(0, -1);
				const entry = nodeRedoHistory[nodeRedoHistory.length - 1];
				if (!entry) {
					return null;
				}

				// Push back to undo stack
				const nodeHistory = [...(state.undoStack.get(nodeId) || [])];
				const newNodeHistory = [...nodeHistory, entry];
				
				const newUndoStack = new Map([...state.undoStack, [nodeId, newNodeHistory]]);
				const newRedoStack = new Map([...state.redoStack, [nodeId, newNodeRedoHistory]]);

				set({ undoStack: newUndoStack, redoStack: newRedoStack });

				return entry;
			},

			clearHistory: (nodeId) => {
				set((state) => {
					const newUndoStack = new Map([...state.undoStack]);
					const newRedoStack = new Map([...state.redoStack]);

					newUndoStack.delete(nodeId);
					newRedoStack.delete(nodeId);

					return { undoStack: newUndoStack, redoStack: newRedoStack };
				});
			},

			clearAllHistory: () => {
				set({
					undoStack: new Map(),
					redoStack: new Map(),
				});
			},

			setCurrentNode: (nodeId) => {
				set({ currentNodeId: nodeId });
			},

			// Queries
			canUndo: (nodeId) => {
				const nodeHistory = get().undoStack.get(nodeId);
				return (nodeHistory?.length ?? 0) > 0;
			},

			canRedo: (nodeId) => {
				const nodeRedoHistory = get().redoStack.get(nodeId);
				return (nodeRedoHistory?.length ?? 0) > 0;
			},

			getHistoryCount: (nodeId) => {
				const state = get();
				return {
					undo: state.undoStack.get(nodeId)?.length ?? 0,
					redo: state.redoStack.get(nodeId)?.length ?? 0,
				};
			},
		}),
		{
			name: EDITOR_HISTORY_STORAGE_KEY,
			partialize: (state) => ({
				undoStack: Array.from(state.undoStack.entries()),
				redoStack: Array.from(state.redoStack.entries()),
			}),
			storage: {
				getItem: (name) => {
					const str = localStorage.getItem(name);
					if (!str) return null;
					const parsed = JSON.parse(str);
					return {
						state: {
							...parsed.state,
							undoStack: new Map(parsed.state.undoStack),
							redoStack: new Map(parsed.state.redoStack),
						},
					};
				},
				setItem: (name, value) => {
					const serialized = {
						state: {
							undoStack: Array.from(
								(value.state as EditorHistoryStore).undoStack.entries(),
							),
							redoStack: Array.from(
								(value.state as EditorHistoryStore).redoStack.entries(),
							),
						},
					};
					localStorage.setItem(name, JSON.stringify(serialized));
				},
				removeItem: (name) => localStorage.removeItem(name),
			},
		},
	),
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useCurrentNodeId = () =>
	useEditorHistoryStore((state) => state.currentNodeId);

/** @deprecated Use useEditorHistoryStore instead - kept for backward compatibility */
export const useEditorHistory = useEditorHistoryStore;
