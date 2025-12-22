/**
 * Writing Domain - Pure Utility Functions
 *
 * All pure functions for writing state management.
 * - No side effects
 * - Same input → Same output
 * - Does not modify input parameters
 */

import type {
	WritingGoal,
	WritingSession,
	WritingState,
} from "./writing.interface";

// ==============================
// Date Utilities
// ==============================

/**
 * Get today's date in YYYY-MM-DD format.
 * Uses the provided date or current date if not specified.
 *
 * @param date - Optional date to format (defaults to current date)
 * @returns Date string in YYYY-MM-DD format
 */
export const getTodayDate = (date: Date = new Date()): string => {
	return date.toISOString().slice(0, 10);
};

/**
 * Check if a date string matches today's date.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @param today - Optional current date for comparison
 * @returns Whether the date string matches today
 */
export const isToday = (
	dateString: string,
	today: Date = new Date(),
): boolean => {
	return dateString === getTodayDate(today);
};

// ==============================
// Word Count Utilities
// ==============================

/**
 * Calculate words written in a session.
 *
 * @param session - The writing session
 * @returns Number of words written (always >= 0)
 */
export const getSessionWordsWritten = (session: WritingSession): number => {
	return Math.max(0, session.currentWordCount - session.startWordCount);
};

/**
 * Calculate the difference between two word counts.
 *
 * @param currentCount - Current word count
 * @param previousCount - Previous word count
 * @returns The difference (can be negative if words were deleted)
 */
export const calculateWordDifference = (
	currentCount: number,
	previousCount: number,
): number => {
	return currentCount - previousCount;
};

/**
 * Calculate progress towards daily goal as a percentage.
 *
 * @param todayWordCount - Words written today
 * @param goal - Writing goal configuration
 * @returns Progress percentage (0-100, capped at 100)
 */
export const calculateGoalProgress = (
	todayWordCount: number,
	goal: WritingGoal,
): number => {
	if (!goal.enabled || goal.dailyTarget <= 0) {
		return 0;
	}
	return Math.min(100, (todayWordCount / goal.dailyTarget) * 100);
};

/**
 * Check if daily goal has been reached.
 *
 * @param todayWordCount - Words written today
 * @param goal - Writing goal configuration
 * @returns Whether the goal has been reached
 */
export const isGoalReached = (
	todayWordCount: number,
	goal: WritingGoal,
): boolean => {
	if (!goal.enabled) {
		return false;
	}
	return todayWordCount >= goal.dailyTarget;
};

/**
 * Calculate remaining words to reach daily goal.
 *
 * @param todayWordCount - Words written today
 * @param goal - Writing goal configuration
 * @returns Remaining words (0 if goal reached or disabled)
 */
export const getRemainingWords = (
	todayWordCount: number,
	goal: WritingGoal,
): number => {
	if (!goal.enabled) {
		return 0;
	}
	return Math.max(0, goal.dailyTarget - todayWordCount);
};

// ==============================
// Session Utilities
// ==============================

/**
 * Create a new writing session.
 *
 * @param wordCount - Initial word count
 * @param startTime - Optional start time (defaults to current time)
 * @returns New writing session object
 */
export const createSession = (
	wordCount: number,
	startTime: number = Date.now(),
): WritingSession => {
	return {
		startTime,
		startWordCount: wordCount,
		currentWordCount: wordCount,
	};
};

/**
 * Update a session's current word count.
 * Returns a new session object without mutating the original.
 *
 * @param session - The current session
 * @param wordCount - New word count
 * @returns New session object with updated word count
 */
export const updateSessionCount = (
	session: WritingSession,
	wordCount: number,
): WritingSession => {
	return {
		...session,
		currentWordCount: wordCount,
	};
};

/**
 * Calculate session duration in minutes.
 *
 * @param session - The writing session
 * @param currentTime - Optional current time (defaults to Date.now())
 * @returns Duration in minutes
 */
export const getSessionDuration = (
	session: WritingSession,
	currentTime: number = Date.now(),
): number => {
	return Math.floor((currentTime - session.startTime) / 60000);
};

/**
 * Calculate words per minute for a session.
 *
 * @param session - The writing session
 * @param currentTime - Optional current time (defaults to Date.now())
 * @returns Words per minute (0 if duration is 0)
 */
export const getWordsPerMinute = (
	session: WritingSession,
	currentTime: number = Date.now(),
): number => {
	const duration = getSessionDuration(session, currentTime);
	if (duration <= 0) {
		return 0;
	}
	const wordsWritten = getSessionWordsWritten(session);
	return Math.round(wordsWritten / duration);
};

// ==============================
// State Update Utilities
// ==============================

/**
 * Merge partial writing goal with existing goal.
 * Returns a new goal object without mutating the original.
 *
 * @param currentGoal - Current writing goal
 * @param updates - Partial updates to apply
 * @returns New writing goal with updates applied
 */
export const mergeWritingGoal = (
	currentGoal: WritingGoal,
	updates: Partial<WritingGoal>,
): WritingGoal => {
	return {
		...currentGoal,
		...updates,
	};
};

/**
 * Calculate updated today word count after session update.
 * Handles date changes and only counts positive word differences.
 *
 * @param state - Current writing state
 * @param newWordCount - New word count from session
 * @param today - Current date string
 * @returns Object with updated todayWordCount and todayDate
 */
export const calculateTodayWordCountUpdate = (
	state: Pick<WritingState, "todayWordCount" | "todayDate" | "session">,
	newWordCount: number,
	today: string,
): { todayWordCount: number; todayDate: string } => {
	if (!state.session) {
		return { todayWordCount: state.todayWordCount, todayDate: state.todayDate };
	}

	const wordsWritten = newWordCount - state.session.currentWordCount;

	// Only count positive word differences
	if (wordsWritten <= 0) {
		return { todayWordCount: state.todayWordCount, todayDate: state.todayDate };
	}

	// If date changed, start fresh with just the new words
	if (state.todayDate !== today) {
		return { todayWordCount: wordsWritten, todayDate: today };
	}

	// Same day, add to existing count
	return {
		todayWordCount: state.todayWordCount + wordsWritten,
		todayDate: today,
	};
};
