/**
 * 编辑器历史记录 Store
 * 支持撤销/重做的持久化
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import logger from "@/log/index";

export interface EditorHistoryEntry {
	nodeId: string;
	content: any; // Lexical EditorState JSON
	timestamp: string;
	wordCount: number;
}

export interface EditorHistoryState {
	// 历史记录栈
	undoStack: Map<string, EditorHistoryEntry[]>;
	redoStack: Map<string, EditorHistoryEntry[]>;

	// 当前编辑的节点
	currentNodeId: string | null;

	// 操作方法
	pushHistory: (nodeId: string, content: any, wordCount: number) => void;
	undo: (nodeId: string) => EditorHistoryEntry | null;
	redo: (nodeId: string) => EditorHistoryEntry | null;
	clearHistory: (nodeId: string) => void;
	clearAllHistory: () => void;
	setCurrentNode: (nodeId: string | null) => void;

	// 查询方法
	canUndo: (nodeId: string) => boolean;
	canRedo: (nodeId: string) => boolean;
	getHistoryCount: (nodeId: string) => { undo: number; redo: number };
}

const MAX_HISTORY_SIZE = 50; // 每个节点最多保存50个历史记录

export const useEditorHistory = create<EditorHistoryState>()(
	persist(
		(set, get) => ({
			undoStack: new Map(),
			redoStack: new Map(),
			currentNodeId: null,

			pushHistory: (nodeId, content, wordCount) => {
				set((state) => {
					const undoStack = new Map(state.undoStack);
					const redoStack = new Map(state.redoStack);

					// 获取当前节点的历史栈
					const nodeHistory = undoStack.get(nodeId) || [];

					// 添加新记录
					const entry: EditorHistoryEntry = {
						nodeId,
						content,
						timestamp: new Date().toISOString(),
						wordCount,
					};

					nodeHistory.push(entry);

					// 限制历史记录数量
					if (nodeHistory.length > MAX_HISTORY_SIZE) {
						nodeHistory.shift();
					}

					undoStack.set(nodeId, nodeHistory);

					// 清空重做栈（新操作后不能重做）
					redoStack.delete(nodeId);

					logger.debug(
						`历史记录已保存: ${nodeId}, 栈大小: ${nodeHistory.length}`,
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
					logger.warn(`无法撤销: ${nodeId} 没有历史记录`);
					return null;
				}

				// 弹出最后一个记录
				const entry = nodeHistory.pop()!;

				// 保存到重做栈
				const nodeRedoHistory = redoStack.get(nodeId) || [];
				nodeRedoHistory.push(entry);
				redoStack.set(nodeId, nodeRedoHistory);

				undoStack.set(nodeId, nodeHistory);

				set({ undoStack, redoStack });

				logger.info(`撤销操作: ${nodeId}`);
				return entry;
			},

			redo: (nodeId) => {
				const state = get();
				const undoStack = new Map(state.undoStack);
				const redoStack = new Map(state.redoStack);

				const nodeRedoHistory = redoStack.get(nodeId) || [];
				if (nodeRedoHistory.length === 0) {
					logger.warn(`无法重做: ${nodeId} 没有重做记录`);
					return null;
				}

				// 弹出重做记录
				const entry = nodeRedoHistory.pop()!;

				// 保存回撤销栈
				const nodeHistory = undoStack.get(nodeId) || [];
				nodeHistory.push(entry);
				undoStack.set(nodeId, nodeHistory);

				redoStack.set(nodeId, nodeRedoHistory);

				set({ undoStack, redoStack });

				logger.info(`重做操作: ${nodeId}`);
				return entry;
			},

			clearHistory: (nodeId) => {
				set((state) => {
					const undoStack = new Map(state.undoStack);
					const redoStack = new Map(state.redoStack);

					undoStack.delete(nodeId);
					redoStack.delete(nodeId);

					logger.info(`已清除历史记录: ${nodeId}`);

					return { undoStack, redoStack };
				});
			},

			clearAllHistory: () => {
				set({
					undoStack: new Map(),
					redoStack: new Map(),
				});
				logger.info("已清除所有历史记录");
			},

			setCurrentNode: (nodeId) => {
				set({ currentNodeId: nodeId });
			},

			canUndo: (nodeId) => {
				const state = get();
				const nodeHistory = state.undoStack.get(nodeId) || [];
				return nodeHistory.length > 0;
			},

			canRedo: (nodeId) => {
				const state = get();
				const nodeRedoHistory = state.redoStack.get(nodeId) || [];
				return nodeRedoHistory.length > 0;
			},

			getHistoryCount: (nodeId) => {
				const state = get();
				const undoCount = (state.undoStack.get(nodeId) || []).length;
				const redoCount = (state.redoStack.get(nodeId) || []).length;
				return { undo: undoCount, redo: redoCount };
			},
		}),
		{
			name: "grain-history",
			// 只持久化必要的数据
			partialize: (state) => ({
				undoStack: Array.from(state.undoStack.entries()),
				redoStack: Array.from(state.redoStack.entries()),
			}),
			// 自定义存储以处理 Map
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
							undoStack: Array.from((value.state as any).undoStack.entries()),
							redoStack: Array.from((value.state as any).redoStack.entries()),
						},
					};
					localStorage.setItem(name, JSON.stringify(serialized));
				},
				removeItem: (name) => localStorage.removeItem(name),
			},
		},
	),
);
