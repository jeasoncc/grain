/**
 * 编辑器历史记录 Store
 * 支持撤销/重做的持久化
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import logger from "@/log/index";

export interface EditorHistoryEntry {
	sceneId: string;
	content: any; // Lexical EditorState JSON
	timestamp: string;
	wordCount: number;
}

export interface EditorHistoryState {
	// 历史记录栈
	undoStack: Map<string, EditorHistoryEntry[]>;
	redoStack: Map<string, EditorHistoryEntry[]>;

	// 当前编辑的场景
	currentSceneId: string | null;

	// 操作方法
	pushHistory: (sceneId: string, content: any, wordCount: number) => void;
	undo: (sceneId: string) => EditorHistoryEntry | null;
	redo: (sceneId: string) => EditorHistoryEntry | null;
	clearHistory: (sceneId: string) => void;
	clearAllHistory: () => void;
	setCurrentScene: (sceneId: string | null) => void;

	// 查询方法
	canUndo: (sceneId: string) => boolean;
	canRedo: (sceneId: string) => boolean;
	getHistoryCount: (sceneId: string) => { undo: number; redo: number };
}

const MAX_HISTORY_SIZE = 50; // 每个场景最多保存50个历史记录

export const useEditorHistory = create<EditorHistoryState>()(
	persist(
		(set, get) => ({
			undoStack: new Map(),
			redoStack: new Map(),
			currentSceneId: null,

			pushHistory: (sceneId, content, wordCount) => {
				set((state) => {
					const undoStack = new Map(state.undoStack);
					const redoStack = new Map(state.redoStack);

					// 获取当前场景的历史栈
					const sceneHistory = undoStack.get(sceneId) || [];

					// 添加新记录
					const entry: EditorHistoryEntry = {
						sceneId,
						content,
						timestamp: new Date().toISOString(),
						wordCount,
					};

					sceneHistory.push(entry);

					// 限制历史记录数量
					if (sceneHistory.length > MAX_HISTORY_SIZE) {
						sceneHistory.shift();
					}

					undoStack.set(sceneId, sceneHistory);

					// 清空重做栈（新操作后不能重做）
					redoStack.delete(sceneId);

					logger.debug(
						`历史记录已保存: ${sceneId}, 栈大小: ${sceneHistory.length}`,
					);

					return { undoStack, redoStack };
				});
			},

			undo: (sceneId) => {
				const state = get();
				const undoStack = new Map(state.undoStack);
				const redoStack = new Map(state.redoStack);

				const sceneHistory = undoStack.get(sceneId) || [];
				if (sceneHistory.length === 0) {
					logger.warn(`无法撤销: ${sceneId} 没有历史记录`);
					return null;
				}

				// 弹出最后一个记录
				const entry = sceneHistory.pop()!;

				// 保存到重做栈
				const sceneRedoHistory = redoStack.get(sceneId) || [];
				sceneRedoHistory.push(entry);
				redoStack.set(sceneId, sceneRedoHistory);

				undoStack.set(sceneId, sceneHistory);

				set({ undoStack, redoStack });

				logger.info(`撤销操作: ${sceneId}`);
				return entry;
			},

			redo: (sceneId) => {
				const state = get();
				const undoStack = new Map(state.undoStack);
				const redoStack = new Map(state.redoStack);

				const sceneRedoHistory = redoStack.get(sceneId) || [];
				if (sceneRedoHistory.length === 0) {
					logger.warn(`无法重做: ${sceneId} 没有重做记录`);
					return null;
				}

				// 弹出重做记录
				const entry = sceneRedoHistory.pop()!;

				// 保存回撤销栈
				const sceneHistory = undoStack.get(sceneId) || [];
				sceneHistory.push(entry);
				undoStack.set(sceneId, sceneHistory);

				redoStack.set(sceneId, sceneRedoHistory);

				set({ undoStack, redoStack });

				logger.info(`重做操作: ${sceneId}`);
				return entry;
			},

			clearHistory: (sceneId) => {
				set((state) => {
					const undoStack = new Map(state.undoStack);
					const redoStack = new Map(state.redoStack);

					undoStack.delete(sceneId);
					redoStack.delete(sceneId);

					logger.info(`已清除历史记录: ${sceneId}`);

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

			setCurrentScene: (sceneId) => {
				set({ currentSceneId: sceneId });
			},

			canUndo: (sceneId) => {
				const state = get();
				const sceneHistory = state.undoStack.get(sceneId) || [];
				return sceneHistory.length > 0;
			},

			canRedo: (sceneId) => {
				const state = get();
				const sceneRedoHistory = state.redoStack.get(sceneId) || [];
				return sceneRedoHistory.length > 0;
			},

			getHistoryCount: (sceneId) => {
				const state = get();
				const undoCount = (state.undoStack.get(sceneId) || []).length;
				const redoCount = (state.redoStack.get(sceneId) || []).length;
				return { undo: undoCount, redo: redoCount };
			},
		}),
		{
			name: "novel-editor-history",
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
