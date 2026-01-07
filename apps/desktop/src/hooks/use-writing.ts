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
	const focusMode = useFocusMode();
	const typewriterMode = useTypewriterMode();
	const writingGoal = useWritingGoal();
	const todayWordCount = useTodayWordCount();
	const todayDate = useTodayDate();
	const session = useWritingSession();
	const minimalToolbar = useMinimalToolbar();

	// Toggle focus mode
	const toggleFocusMode = useCallback(() => {
		useWritingStore.getState().setFocusMode(!focusMode);
	}, [focusMode]);

	// Toggle typewriter mode
	const toggleTypewriterMode = useCallback(() => {
		useWritingStore.getState().setTypewriterMode(!typewriterMode);
	}, [typewriterMode]);

	// Set writing goal
	const setWritingGoal = useCallback(
		(goal: Partial<WritingGoal>) => {
			setWritingGoalFlow(writingGoal, goal, useWritingStore.getState());
		},
		[writingGoal],
	);

	// Add today words
	const addTodayWords = useCallback(
		(count: number) => {
			addTodayWordsFlow(count, todayDate, todayWordCount, useWritingStore.getState());
		},
		[todayDate, todayWordCount],
	);

	// Reset today if needed
	const resetTodayIfNeeded = useCallback(() => {
		resetTodayIfNeededFlow(todayDate, useWritingStore.getState());
	}, [todayDate]);

	// Start session
	const startSession = useCallback(
		(wordCount: number) => {
			startSessionFlow(wordCount, useWritingStore.getState());
		},
		[],
	);

	// Update session word count
	const updateSessionWordCount = useCallback(
		(wordCount: number) => {
			updateSessionWordCountFlow(
				wordCount,
				session,
				todayWordCount,
				todayDate,
				useWritingStore.getState(),
			);
		},
		[session, todayWordCount, todayDate],
	);

	// End session
	const endSession = useCallback(() => {
		useWritingStore.getState().setSession(null);
	}, []);

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
		setFocusMode: useWritingStore.getState().setFocusMode,
		toggleFocusMode,
		setTypewriterMode: useWritingStore.getState().setTypewriterMode,
		toggleTypewriterMode,
		setWritingGoal,
		addTodayWords,
		resetTodayIfNeeded,
		startSession,
		updateSessionWordCount,
		endSession,
		setMinimalToolbar: useWritingStore.getState().setMinimalToolbar,
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
