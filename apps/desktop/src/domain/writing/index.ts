/**
 * Writing Domain - Module Entry Point
 *
 * Unified exports for writing state management.
 */

// ==============================
// Types & Interfaces
// ==============================

export type {
	WritingGoal,
	WritingSession,
	WritingState,
	WritingActions,
	WritingConfig,
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
	getTodayDate,
	isToday,
	getSessionWordsWritten,
	calculateWordDifference,
	calculateGoalProgress,
	isGoalReached,
	getRemainingWords,
	createSession,
	updateSessionCount,
	getSessionDuration,
	getWordsPerMinute,
	mergeWritingGoal,
	calculateTodayWordCountUpdate,
} from "./writing.utils";

// ==============================
// Store & Hooks
// ==============================

export {
	useWritingStore,
	useFocusMode,
	useTypewriterMode,
	useWritingGoal,
	useTodayWordCount,
	useWritingSession,
	useMinimalToolbar,
	useHasActiveSession,
	useWriting,
} from "./writing.store";
