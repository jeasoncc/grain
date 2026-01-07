/**
 * @file hooks/use-writing.ts
 * @description Writing React 绑定
 *
 * 连接 state 和 flows，提供 React 组件使用的写作功能。
 *
 * 依赖规则：hooks/ 只能依赖 flows/, state/, types/
 */

import { useCallback } from "react";
import {
	addTodayWordsFlow,
	resetTodayIfNeededFlow,
	setWritingGoalFlow,
	startSessionFlow,
	updateSessionWordCountFlow,
} from "@/flows/writing";
import {
	useFocusMode,
	useHasActiveSession,
	useMinimalToolbar,
	useTodayDate,
	useTodayWordCount,
	useTypewriterMode,
	useWritingGoal,
	useWritingSession,
	useWritingStore,
} from "@/state/writing.state";
import type { WritingGoal } from "@/types/writing";

// ==============================
// Writing Hook
// ==============================

/**
 * Main writing hook providing all writing-related state and actions.
 */
export function useWriting() {
	const store = useWritingStore();
	const focusMode = useFocusMode();
	const typewriterMode = useTypewriterMode();
	const writingGoal = useWritingGoal();
	const todayWordCount = useTodayWordCount();
	const todayDate = useTodayDate();
	const session = useWritingSession();
	const minimalToolbar = useMinimalToolbar();

	// Toggle focus mode
	const toggleFocusMode = useCallback(() => {
		store.setFocusMode(!focusMode);
	}, [store, focusMode]);

	// Toggle typewriter mode
	const toggleTypewriterMode = useCallback(() => {
		store.setTypewriterMode(!typewriterMode);
	}, [store, typewriterMode]);

	// Set writing goal
	const setWritingGoal = useCallback(
		(goal: Partial<WritingGoal>) => {
			setWritingGoalFlow(writingGoal, goal, store.getState());
		},
		[store, writingGoal],
	);

	// Add today words
	const addTodayWords = useCallback(
		(count: number) => {
			addTodayWordsFlow(count, todayDate, todayWordCount, store.getState());
		},
		[store, todayDate, todayWordCount],
	);

	// Reset today if needed
	const resetTodayIfNeeded = useCallback(() => {
		resetTodayIfNeededFlow(todayDate, store.getState());
	}, [store, todayDate]);

	// Start session
	const startSession = useCallback(
		(wordCount: number) => {
			startSessionFlow(wordCount, store.getState());
		},
		[store],
	);

	// Update session word count
	const updateSessionWordCount = useCallback(
		(wordCount: number) => {
			updateSessionWordCountFlow(
				wordCount,
				session,
				todayWordCount,
				todayDate,
				store.getState(),
			);
		},
		[store, session, todayWordCount, todayDate],
	);

	// End session
	const endSession = useCallback(() => {
		store.setSession(null);
	}, [store]);

	return {
		// State
		focusMode,
		typewriterMode,
		writingGoal,
		todayWordCount,
		todayDate,
		session,
		minimalToolbar,

		// Actions
		setFocusMode: store.setFocusMode,
		toggleFocusMode,
		setTypewriterMode: store.setTypewriterMode,
		toggleTypewriterMode,
		setWritingGoal,
		addTodayWords,
		resetTodayIfNeeded,
		startSession,
		updateSessionWordCount,
		endSession,
		setMinimalToolbar: store.setMinimalToolbar,
	};
}

// Re-export state selectors for convenience
export {
	useFocusMode,
	useHasActiveSession,
	useMinimalToolbar,
	useTodayDate,
	useTodayWordCount,
	useTypewriterMode,
	useWritingGoal,
	useWritingSession,
} from "@/state/writing.state";
