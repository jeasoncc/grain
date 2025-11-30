/**
 * 写作状态管理 - 专注模式、写作目标、统计
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WritingGoal {
	dailyTarget: number; // 每日目标字数
	enabled: boolean;
}

export interface WritingSession {
	startTime: number; // 开始时间戳
	startWordCount: number; // 开始时的字数
	currentWordCount: number; // 当前字数
}

interface WritingState {
	// 专注模式
	focusMode: boolean;
	setFocusMode: (enabled: boolean) => void;
	toggleFocusMode: () => void;

	// 打字机模式
	typewriterMode: boolean;
	setTypewriterMode: (enabled: boolean) => void;
	toggleTypewriterMode: () => void;

	// 写作目标
	writingGoal: WritingGoal;
	setWritingGoal: (goal: Partial<WritingGoal>) => void;

	// 今日字数
	todayWordCount: number;
	todayDate: string; // YYYY-MM-DD
	addTodayWords: (count: number) => void;
	resetTodayIfNeeded: () => void;

	// 写作会话
	session: WritingSession | null;
	startSession: (wordCount: number) => void;
	updateSessionWordCount: (wordCount: number) => void;
	endSession: () => void;

	// 简洁工具栏
	minimalToolbar: boolean;
	setMinimalToolbar: (enabled: boolean) => void;
}

const getTodayDate = () => new Date().toISOString().slice(0, 10);

export const useWritingStore = create<WritingState>()(
	persist(
		(set, get) => ({
			// 专注模式
			focusMode: false,
			setFocusMode: (focusMode) => set({ focusMode }),
			toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

			// 打字机模式
			typewriterMode: false,
			setTypewriterMode: (typewriterMode) => set({ typewriterMode }),
			toggleTypewriterMode: () => set((s) => ({ typewriterMode: !s.typewriterMode })),

			// 写作目标
			writingGoal: {
				dailyTarget: 1000,
				enabled: true,
			},
			setWritingGoal: (goal) =>
				set((s) => ({ writingGoal: { ...s.writingGoal, ...goal } })),

			// 今日字数
			todayWordCount: 0,
			todayDate: getTodayDate(),
			addTodayWords: (count) =>
				set((s) => {
					const today = getTodayDate();
					if (s.todayDate !== today) {
						return { todayWordCount: count, todayDate: today };
					}
					return { todayWordCount: s.todayWordCount + count };
				}),
			resetTodayIfNeeded: () => {
				const today = getTodayDate();
				const state = get();
				if (state.todayDate !== today) {
					set({ todayWordCount: 0, todayDate: today });
				}
			},

			// 写作会话
			session: null,
			startSession: (wordCount) =>
				set({
					session: {
						startTime: Date.now(),
						startWordCount: wordCount,
						currentWordCount: wordCount,
					},
				}),
			updateSessionWordCount: (wordCount) => {
				const state = get();
				if (!state.session) return;
				
				// 避免重复更新相同的字数
				if (state.session.currentWordCount === wordCount) return;
				
				const wordsWritten = wordCount - state.session.currentWordCount;
				const today = getTodayDate();
				
				set({
					session: { ...state.session, currentWordCount: wordCount },
					// 只有字数增加时才更新今日字数
					...(wordsWritten > 0 ? {
						todayWordCount: state.todayDate === today 
							? state.todayWordCount + wordsWritten 
							: wordsWritten,
						todayDate: today,
					} : {}),
				});
			},
			endSession: () => set({ session: null }),

			// 简洁工具栏
			minimalToolbar: true,
			setMinimalToolbar: (minimalToolbar) => set({ minimalToolbar }),
		}),
		{
			name: "novel-editor-writing",
			partialize: (state) => ({
				typewriterMode: state.typewriterMode,
				writingGoal: state.writingGoal,
				todayWordCount: state.todayWordCount,
				todayDate: state.todayDate,
				minimalToolbar: state.minimalToolbar,
			}),
		}
	)
);
