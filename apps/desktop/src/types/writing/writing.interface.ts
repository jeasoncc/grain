/**
 * Writing Domain - Interface Definitions
 *
 * Type definitions for writing state management.
 * Handles focus mode, typewriter mode, writing goals, and session tracking.
 */

// ==============================
// Types
// ==============================

/**
 * Writing goal configuration.
 * Tracks daily word count targets.
 */
export interface WritingGoal {
	/** Daily target word count */
	readonly dailyTarget: number
	/** Whether the goal tracking is enabled */
	readonly enabled: boolean
}

/**
 * Writing session tracking.
 * Tracks word count progress during an active writing session.
 */
export interface WritingSession {
	/** Session start timestamp (milliseconds since epoch) */
	readonly startTime: number
	/** Word count at session start */
	readonly startWordCount: number
	/** Current word count in session */
	readonly currentWordCount: number
}

// ==============================
// State Interface
// ==============================

/**
 * Writing state representing current writing configuration and progress.
 * All properties are readonly to enforce immutability.
 */
export interface WritingState {
	/** Whether focus mode is enabled (hides distractions) */
	readonly focusMode: boolean
	/** Whether typewriter mode is enabled (keeps cursor centered) */
	readonly typewriterMode: boolean
	/** Writing goal configuration */
	readonly writingGoal: WritingGoal
	/** Total words written today */
	readonly todayWordCount: number
	/** Current date in YYYY-MM-DD format */
	readonly todayDate: string
	/** Current active writing session, null if no session */
	readonly session: WritingSession | null
	/** Whether minimal toolbar mode is enabled */
	readonly minimalToolbar: boolean
}

// ==============================
// Actions Interface
// ==============================

/**
 * Actions available for mutating writing state.
 */
export interface WritingActions {
	/**
	 * Set focus mode enabled state.
	 */
	readonly setFocusMode: (enabled: boolean) => void

	/**
	 * Toggle focus mode on/off.
	 */
	readonly toggleFocusMode: () => void

	/**
	 * Set typewriter mode enabled state.
	 */
	readonly setTypewriterMode: (enabled: boolean) => void

	/**
	 * Toggle typewriter mode on/off.
	 */
	readonly toggleTypewriterMode: () => void

	/**
	 * Update writing goal configuration.
	 * Accepts partial updates to merge with existing goal.
	 */
	readonly setWritingGoal: (goal: Partial<WritingGoal>) => void

	/**
	 * Add words to today's word count.
	 * Resets count if date has changed.
	 */
	readonly addTodayWords: (count: number) => void

	/**
	 * Reset today's word count if the date has changed.
	 */
	readonly resetTodayIfNeeded: () => void

	/**
	 * Start a new writing session.
	 * @param wordCount - Initial word count at session start
	 */
	readonly startSession: (wordCount: number) => void

	/**
	 * Update the current session's word count.
	 * Also updates today's word count if words increased.
	 * @param wordCount - Current word count
	 */
	readonly updateSessionWordCount: (wordCount: number) => void

	/**
	 * End the current writing session.
	 */
	readonly endSession: () => void

	/**
	 * Set minimal toolbar mode.
	 */
	readonly setMinimalToolbar: (enabled: boolean) => void
}

// ==============================
// Configuration
// ==============================

/**
 * Configuration for writing state persistence.
 */
export interface WritingConfig {
	/** Storage key for persistence */
	readonly storageKey: string
}

export const DEFAULT_WRITING_CONFIG: WritingConfig = {
	storageKey: "grain-writing",
} as const

// ==============================
// Default Values
// ==============================

export const DEFAULT_WRITING_GOAL: WritingGoal = {
	dailyTarget: 1000,
	enabled: true,
} as const

export const DEFAULT_WRITING_STATE: WritingState = {
	focusMode: false,
	minimalToolbar: true,
	session: null,
	todayDate: "",
	todayWordCount: 0,
	typewriterMode: false,
	writingGoal: DEFAULT_WRITING_GOAL,
} as const
