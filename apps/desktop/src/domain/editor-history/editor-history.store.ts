/**
 * Editor History Domain - Store Implementation
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import logger from "@/log/index";
import {
	type EditorHistoryStore,
	type EditorHistoryEntry,
	MAX_HISTORY_SIZE,
	EDITOR_HISTORY_STORAGE_KEY,
} from "./editor-history.interface";

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
						`History saved: ${nodeId}, stack size: ${nodeHistory.length}`,
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
					logger.warn(`Cannot undo: ${nodeId} has no history`);
					return null;
				}

				const entry = nodeHistory.pop()!;

				// Push to redo stack
				const nodeRedoHistory = redoStack.get(nodeId) || [];
				nodeRedoHistory.push(entry);
				redoStack.set(nodeId, nodeRedoHistory);
				undoStack.set(nodeId, nodeHistory);

				set({ undoStack, redoStack });

				logger.info(`Undo: ${nodeId}`);
				return entry;
			},

			redo: (nodeId) => {
				const state = get();
				const undoStack = new Map(state.undoStack);
				const redoStack = new Map(state.redoStack);

				const nodeRedoHistory = redoStack.get(nodeId) || [];
				if (nodeRedoHistory.length === 0) {
					logger.warn(`Cannot redo: ${nodeId} has no redo history`);
					return null;
				}

				const entry = nodeRedoHistory.pop()!;

				// Push back to undo stack
				const nodeHistory = undoStack.get(nodeId) || [];
				nodeHistory.push(entry);
				undoStack.set(nodeId, nodeHistory);
				redoStack.set(nodeId, nodeRedoHistory);

				set({ undoStack, redoStack });

				logger.info(`Redo: ${nodeId}`);
				return entry;
			},

			clearHistory: (nodeId) => {
				set((state) => {
					const undoStack = new Map(state.undoStack);
					const redoStack = new Map(state.redoStack);

					undoStack.delete(nodeId);
					redoStack.delete(nodeId);

					logger.info(`Cleared history: ${nodeId}`);

					return { undoStack, redoStack };
				});
			},

			clearAllHistory: () => {
				set({
					undoStack: new Map(),
					redoStack: new Map(),
				});
				logger.info("Cleared all history");
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
