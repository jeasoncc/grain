/**
 * @file stores/editor-history.store.ts
 * @description Editor History 状态管理
 *
 * Manages editor undo/redo history with per-node stacks.
 * Uses Zustand with custom Map serialization for persistence.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import logger from "@/log/index";
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

					const nodeHistory = undoStack.get(nodeId) || [];
					const entry: EditorHistoryEntry = {
						nodeId,
						content,
						timestamp: new Date().toISOString(),
						wordCount,
					};

					nodeHistory.push(entry);

					// Limit history size
					if (nodeHistory.length > MAX_HISTORY_SIZE) {
						nodeHistory.shift();
					}

					undoStack.set(nodeId, nodeHistory);
					// Clear redo stack on new action
					redoStack.delete(nodeId);

					logger.debug(
						`[Store] History saved: ${nodeId}, stack size: ${nodeHistory.length}`,
					);

					return { undoStack, redoStack };
				});
			},

			undo: (nodeId) => {
				const state = get();
				const undoStack = new Map(state.undoStack);
				const redoStack = new Map(state.redoStack);

				const nodeHistory = undoStack.get(nodeId) || [];
				if (nodeHistory.length === 0) {
					logger.warn(`[Store] Cannot undo: ${nodeId} has no history`);
					return null;
				}

				const entry = nodeHistory.pop();
				if (!entry) {
					return null;
				}

				// Push to redo stack
				const nodeRedoHistory = redoStack.get(nodeId) || [];
				nodeRedoHistory.push(entry);
				redoStack.set(nodeId, nodeRedoHistory);
				undoStack.set(nodeId, nodeHistory);

				set({ undoStack, redoStack });

				logger.info(`[Store] Undo: ${nodeId}`);
				return entry;
			},

			redo: (nodeId) => {
				const state = get();
				const undoStack = new Map(state.undoStack);
				const redoStack = new Map(state.redoStack);

				const nodeRedoHistory = redoStack.get(nodeId) || [];
				if (nodeRedoHistory.length === 0) {
					logger.warn(`[Store] Cannot redo: ${nodeId} has no redo history`);
					return null;
				}

				const entry = nodeRedoHistory.pop();
				if (!entry) {
					return null;
				}

				// Push back to undo stack
				const nodeHistory = undoStack.get(nodeId) || [];
				nodeHistory.push(entry);
				undoStack.set(nodeId, nodeHistory);
				redoStack.set(nodeId, nodeRedoHistory);

				set({ undoStack, redoStack });

				logger.info(`[Store] Redo: ${nodeId}`);
				return entry;
			},

			clearHistory: (nodeId) => {
				set((state) => {
					const undoStack = new Map(state.undoStack);
					const redoStack = new Map(state.redoStack);

					undoStack.delete(nodeId);
					redoStack.delete(nodeId);

					logger.info(`[Store] Cleared history: ${nodeId}`);

					return { undoStack, redoStack };
				});
			},

			clearAllHistory: () => {
				set({
					undoStack: new Map(),
					redoStack: new Map(),
				});
				logger.info("[Store] Cleared all history");
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
