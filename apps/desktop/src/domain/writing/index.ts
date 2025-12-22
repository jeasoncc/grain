/**
 * Writing Domain - Module Entry Point
 *
 * Unified exports for writing state management.
 */

// ==============================
// Types & Interfaces
// ==============================

export type {
	WritingActions,
	WritingConfig,
	WritingGoal,
	WritingSession,
	WritingState,
} from "./writing.interface";

export {
	DEFAULT_WRITING_CONFIG,
	DEFAULT_WRITING_GOAL,
	DEFAULT_WRITING_STATE,
} from "./writing.interface";

// ==============================
// Utility Functions
// ==============================

export {
	calculateGoalProgress,
	calculateTodayWordCountUpdate,
	calculateWordDifference,
	createSession,
	getRemainingWords,
	getSessionDuration,
	getSessionWordsWritten,
	getTodayDate,
	getWordsPerMinute,
	isGoalReached,
	isToday,
	mergeWritingGoal,
	updateSessionCount,
} from "./writing.utils";

// ==============================
// Store & Hooks
// ==============================

export {
	useFocusMode,
	useHasActiveSession,
	useMinimalToolbar,
	useTodayWordCount,
	useTypewriterMode,
	useWriting,
	useWritingGoal,
	useWritingSession,
	useWritingStore,
} from "./writing.store";
