/**
 * Save Domain - Type Definitions
 */

// ============================================================================
// Constants
// ============================================================================

export const SaveActionTypes = {
	SET_STATUS: "save/SET_STATUS",
	MARK_SAVED: "save/MARK_SAVED",
	MARK_SAVING: "save/MARK_SAVING",
	MARK_ERROR: "save/MARK_ERROR",
	MARK_UNSAVED: "save/MARK_UNSAVED",
} as const;

// ============================================================================
// Types
// ============================================================================

export type SaveStatus = "saved" | "saving" | "error" | "unsaved";

// ============================================================================
// State Interface
// ============================================================================

export interface SaveState {
	readonly status: SaveStatus;
	readonly lastSaveTime: number | null; // Unix timestamp for serialization safety
	readonly errorMessage: string | null;
	readonly hasUnsavedChanges: boolean;
	readonly isManualSaving: boolean;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface SaveActions {
	setStatus: (status: SaveStatus) => void;
	setLastSaveTime: (time: Date) => void;
	setErrorMessage: (message: string | null) => void;
	setHasUnsavedChanges: (hasChanges: boolean) => void;
	setIsManualSaving: (isSaving: boolean) => void;
	markAsSaved: () => void;
	markAsError: (message: string) => void;
	markAsSaving: () => void;
	markAsUnsaved: () => void;
}

// ============================================================================
// Combined Store Type
// ============================================================================

export type SaveStore = SaveState & SaveActions;
