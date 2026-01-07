/**
 * @file flows/writing/writing.flow.ts
 * @description Writing 业务流程
 *
 * 组合 pipes + state 形成完整的写作流程
 *
 * 依赖规则：flows/ 只能依赖 pipes/, io/, state/, types/
 */

import {
	calculateTodayWordCountUpdate,
	createSession,
	getTodayDate,
	mergeWritingGoal,
} from "@/pipes/writing";
import { useWritingStore } from "@/state/writing.state";
import type { WritingGoal, WritingSession } from "@/types/writing";

// ==============================
// Writing Goal Flow
// ==============================

/**
 * Set writing goal flow
 */
export const setWritingGoalFlow = (
	currentGoal: WritingGoal,
	updates: Partial<WritingGoal>,
	store: ReturnType<typeof useWritingStore.getState>,
): void => {
	const newGoal = mergeWritingGoal(currentGoal, updates);
	store.setWritingGoal(newGoal);
};

// ==============================
// Today Word Count Flow
// ==============================

/**
 * Add today words flow
 */
export const addTodayWordsFlow = (
	count: number,
	todayDate: string,
	todayWordCount: number,
	store: ReturnType<typeof useWritingStore.getState>,
): void => {
	const today = getTodayDate();
	if (todayDate !== today) {
		store.setTodayWordCount(count);
		store.setTodayDate(today);
	} else {
		store.setTodayWordCount(todayWordCount + count);
	}
};

/**
 * Reset today if needed flow
 */
export const resetTodayIfNeededFlow = (
	todayDate: string,
	store: ReturnType<typeof useWritingStore.getState>,
): void => {
	const today = getTodayDate();
	if (todayDate !== today) {
		store.setTodayWordCount(0);
		store.setTodayDate(today);
	}
};

// ==============================
// Session Flow
// ==============================

/**
 * Start session flow
 */
export const startSessionFlow = (
	wordCount: number,
	store: ReturnType<typeof useWritingStore.getState>,
): void => {
	const newSession = createSession(wordCount);
	store.setSession(newSession);
};

/**
 * Update session word count flow
 */
export const updateSessionWordCountFlow = (
	wordCount: number,
	session: WritingSession | null,
	todayWordCount: number,
	todayDate: string,
	store: ReturnType<typeof useWritingStore.getState>,
): void => {
	if (!session) return;
	if (session.currentWordCount === wordCount) return;

	const today = getTodayDate();
	const { todayWordCount: newTodayWordCount, todayDate: newTodayDate } =
		calculateTodayWordCountUpdate(
			{ todayWordCount, todayDate, session },
			wordCount,
			today,
		);

	store.setSession({
		...session,
		currentWordCount: wordCount,
	});
	store.setTodayWordCount(newTodayWordCount);
	store.setTodayDate(newTodayDate);
};

// ==============================
// Re-export pure functions for convenience
// ==============================

export { getTodayDate } from "@/pipes/writing";
