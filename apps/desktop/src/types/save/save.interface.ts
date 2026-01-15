/**
 * Save Domain - Type Definitions
 */

// ============================================================================
// Constants
// ============================================================================

export const SaveActionTypes = {
	MARK_ERROR: "save/MARK_ERROR",
	MARK_SAVED: "save/MARK_SAVED",
	MARK_SAVING: "save/MARK_SAVING",
	MARK_UNSAVED: "save/MARK_UNSAVED",
	SET_STATUS: "save/SET_STATUS",
} as const

// ============================================================================
// Types
// ============================================================================

export type SaveStatus = "saved" | "saving" | "error" | "unsaved"

// ============================================================================
// State Interface
// ============================================================================

export interface SaveState {
	readonly status: SaveStatus
	readonly lastSaveTime: number | null // Unix timestamp for serialization safety
	readonly errorMessage: string | null
	readonly hasUnsavedChanges: boolean
	readonly isManualSaving: boolean
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface SaveActions {
	readonly setStatus: (status: SaveStatus) => void
	readonly setLastSaveTime: (time: Date) => void
	readonly setErrorMessage: (message: string | null) => void
	readonly setHasUnsavedChanges: (hasChanges: boolean) => void
	readonly setIsManualSaving: (isSaving: boolean) => void
	readonly markAsSaved: () => void
	readonly markAsError: (message: string) => void
	readonly markAsSaving: () => void
	readonly markAsUnsaved: () => void
}

// ============================================================================
// Combined Store Type
// ============================================================================

export type SaveStore = SaveState & SaveActions
