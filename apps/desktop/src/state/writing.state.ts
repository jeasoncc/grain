/**
 * @file state/writing.state.ts
 * @description Writing 状态管理
 *
 * 只存储写作状态数据，不包含业务逻辑。
 * 业务逻辑在 hooks/use-writing.ts 中。
 *
 * 依赖规则：state/ 只能依赖 types/
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
	WritingGoal,
	WritingSession,
	WritingState,
} from "@/types/writing";
import { DEFAULT_WRITING_CONFIG, DEFAULT_WRITING_STATE } from "@/types/writing";

// ==============================
// Store Actions Interface
// ==============================

interface WritingStoreActions {
	// Focus Mode
	setFocusMode: (enabled: boolean) => void;

	// Typewriter Mode
	setTypewriterMode: (enabled: boolean) => void;

	// Writing Goal
	setWritingGoal: (goal: WritingGoal) => void;

	// Today Word Count
	setTodayWordCount: (count: number) => void;
	setTodayDate: (date: string) => void;

	// Session
	setSession: (session: WritingSession | null) => void;

	// Toolbar
	setMinimalToolbar: (enabled: boolean) => void;
}

// ==============================
// Store Type
// ==============================

type WritingStore = WritingState & WritingStoreActions;

// ==============================
// Store Implementation
// ==============================

export const useWritingStore = create<WritingStore>()(
	persist(
		immer((set) => ({
			// Initial State
			...DEFAULT_WRITING_STATE,
			todayDate: "",

			// ==============================
			// Pure State Setters (no business logic)
			// ==============================

			setFocusMode: (enabled) => {
				set((state) => {
					state.focusMode = enabled;
				});
			},

			setTypewriterMode: (enabled) => {
				set((state) => {
					state.typewriterMode = enabled;
				});
			},

			setWritingGoal: (goal) => {
				set((state) => {
					state.writingGoal = goal;
				});
			},

			setTodayWordCount: (count) => {
				set((state) => {
					state.todayWordCount = count;
				});
			},

			setTodayDate: (date) => {
				set((state) => {
					state.todayDate = date;
				});
			},

			setSession: (session) => {
				set((state) => {
					state.session = session;
				});
			},

			setMinimalToolbar: (enabled) => {
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
 * Get today's date.
 */
export const useTodayDate = (): string => {
	return useWritingStore((state) => state.todayDate);
};

/**
 * Get current writing session.
 */
export const useWritingSession = (): WritingSession | null => {
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
