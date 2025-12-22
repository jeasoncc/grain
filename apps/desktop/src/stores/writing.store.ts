/**
 * @file stores/writing.store.ts
 * @description Writing 状态管理
 *
 * Manages writing state including focus mode, typewriter mode,
 * writing goals, and session tracking.
 * Uses Zustand + Immer for immutable state management.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
	calculateTodayWordCountUpdate,
	createSession,
	getTodayDate,
	mergeWritingGoal,
} from "@/fn/writing";
import type {
	WritingActions,
	WritingGoal,
	WritingState,
} from "@/types/writing";
import { DEFAULT_WRITING_CONFIG, DEFAULT_WRITING_STATE } from "@/types/writing";

// ==============================
// Store Type
// ==============================

type WritingStore = WritingState & WritingActions;

// ==============================
// Store Implementation
// ==============================

export const useWritingStore = create<WritingStore>()(
	persist(
		immer((set, get) => ({
			// Initial State
			...DEFAULT_WRITING_STATE,
			todayDate: getTodayDate(),

			// ==============================
			// Focus Mode Actions
			// ==============================

			setFocusMode: (enabled: boolean) => {
				set((state) => {
					state.focusMode = enabled;
				});
			},

			toggleFocusMode: () => {
				set((state) => {
					state.focusMode = !state.focusMode;
				});
			},

			// ==============================
			// Typewriter Mode Actions
			// ==============================

			setTypewriterMode: (enabled: boolean) => {
				set((state) => {
					state.typewriterMode = enabled;
				});
			},

			toggleTypewriterMode: () => {
				set((state) => {
					state.typewriterMode = !state.typewriterMode;
				});
			},

			// ==============================
			// Writing Goal Actions
			// ==============================

			setWritingGoal: (goal: Partial<WritingGoal>) => {
				set((state) => {
					state.writingGoal = mergeWritingGoal(state.writingGoal, goal);
				});
			},

			// ==============================
			// Today Word Count Actions
			// ==============================

			addTodayWords: (count: number) => {
				set((state) => {
					const today = getTodayDate();
					if (state.todayDate !== today) {
						// New day, reset count
						state.todayWordCount = count;
						state.todayDate = today;
					} else {
						state.todayWordCount += count;
					}
				});
			},

			resetTodayIfNeeded: () => {
				const today = getTodayDate();
				const { todayDate } = get();
				if (todayDate !== today) {
					set((state) => {
						state.todayWordCount = 0;
						state.todayDate = today;
					});
				}
			},

			// ==============================
			// Session Actions
			// ==============================

			startSession: (wordCount: number) => {
				set((state) => {
					state.session = createSession(wordCount);
				});
			},

			updateSessionWordCount: (wordCount: number) => {
				const currentState = get();
				if (!currentState.session) return;

				// Avoid redundant updates
				if (currentState.session.currentWordCount === wordCount) return;

				const today = getTodayDate();
				const { todayWordCount, todayDate } = calculateTodayWordCountUpdate(
					currentState,
					wordCount,
					today,
				);

				set((state) => {
					if (state.session) {
						state.session.currentWordCount = wordCount;
					}
					state.todayWordCount = todayWordCount;
					state.todayDate = todayDate;
				});
			},

			endSession: () => {
				set((state) => {
					state.session = null;
				});
			},

			// ==============================
			// Toolbar Actions
			// ==============================

			setMinimalToolbar: (enabled: boolean) => {
				set((state) => {
					state.minimalToolbar = enabled;
				});
			},
		})),
		{
			name: DEFAULT_WRITING_CONFIG.storageKey,
			partialize: (state) => ({
				typewriterMode: state.typewriterMode,
				writingGoal: state.writingGoal,
				todayWordCount: state.todayWordCount,
				todayDate: state.todayDate,
				minimalToolbar: state.minimalToolbar,
			}),
		},
	),
);

// ==============================
// Selector Hooks
// ==============================

/**
 * Get focus mode state.
 */
export const useFocusMode = (): boolean => {
	return useWritingStore((state) => state.focusMode);
};

/**
 * Get typewriter mode state.
 */
export const useTypewriterMode = (): boolean => {
	return useWritingStore((state) => state.typewriterMode);
};

/**
 * Get writing goal configuration.
 */
export const useWritingGoal = (): WritingGoal => {
	return useWritingStore((state) => state.writingGoal);
};

/**
 * Get today's word count.
 */
export const useTodayWordCount = (): number => {
	return useWritingStore((state) => state.todayWordCount);
};

/**
 * Get current writing session.
 */
export const useWritingSession = () => {
	return useWritingStore((state) => state.session);
};

/**
 * Get minimal toolbar state.
 */
export const useMinimalToolbar = (): boolean => {
	return useWritingStore((state) => state.minimalToolbar);
};

/**
 * Check if there's an active writing session.
 */
export const useHasActiveSession = (): boolean => {
	return useWritingStore((state) => state.session !== null);
};

// ==============================
// Convenience Hook
// ==============================

/**
 * Convenience hook providing all writing-related state and actions.
 */
export function useWriting() {
	const store = useWritingStore();

	return {
		// State
		focusMode: store.focusMode,
		typewriterMode: store.typewriterMode,
		writingGoal: store.writingGoal,
		todayWordCount: store.todayWordCount,
		todayDate: store.todayDate,
		session: store.session,
		minimalToolbar: store.minimalToolbar,

		// Actions
		setFocusMode: store.setFocusMode,
		toggleFocusMode: store.toggleFocusMode,
		setTypewriterMode: store.setTypewriterMode,
		toggleTypewriterMode: store.toggleTypewriterMode,
		setWritingGoal: store.setWritingGoal,
		addTodayWords: store.addTodayWords,
		resetTodayIfNeeded: store.resetTodayIfNeeded,
		startSession: store.startSession,
		updateSessionWordCount: store.updateSessionWordCount,
		endSession: store.endSession,
		setMinimalToolbar: store.setMinimalToolbar,
	};
}
