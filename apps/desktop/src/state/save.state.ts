/**
 * @file stores/save.store.ts
 * @description Save 状态管理
 *
 * Manages document save status (runtime state, no persistence needed)
 * Uses Zustand + Immer for immutable state management.
 */

import { create } from "zustand"
import type { SaveStatus, SaveStore } from "@/types/save"

// Re-export types for convenience
export type {
	SaveActions,
	SaveState,
	SaveStatus,
	SaveStore,
} from "@/types/save"

// ============================================================================
// Store
// ============================================================================

export const useSaveStore = create<SaveStore>()((set) => ({
	errorMessage: null as string | null,
	hasUnsavedChanges: false,
	isManualSaving: false,
	lastSaveTime: null as number | null,

	markAsError: (message) =>
		set((state) => ({
			...state,
			errorMessage: message,
			isManualSaving: false,
			status: "error" as SaveStatus,
		})),

	markAsSaved: () =>
		set((state) => ({
			...state,
			errorMessage: null,
			hasUnsavedChanges: false,
			isManualSaving: false,
			lastSaveTime: Date.now(),
			status: "saved" as SaveStatus,
		})),

	markAsSaving: () =>
		set((state) => ({
			...state,
			errorMessage: null,
			status: "saving" as SaveStatus,
		})),

	markAsUnsaved: () =>
		set((state) => ({
			...state,
			hasUnsavedChanges: true,
			status: "unsaved" as SaveStatus,
		})),

	setErrorMessage: (message) =>
		set((state) => ({
			...state,
			errorMessage: message,
		})),

	setHasUnsavedChanges: (hasChanges) =>
		set((state) => ({
			...state,
			hasUnsavedChanges: hasChanges,
		})),

	setIsManualSaving: (isSaving) =>
		set((state) => ({
			...state,
			isManualSaving: isSaving,
		})),

	setLastSaveTime: (time) =>
		set((state) => ({
			...state,
			lastSaveTime: time.getTime(),
		})),

	// Actions
	setStatus: (status) =>
		set((state) => ({
			...state,
			status,
		})),
	// State
	status: "saved" as SaveStatus,
}))

// ============================================================================
// Selector Hooks
// ============================================================================

export const useSaveStatus = () => useSaveStore((s) => s.status)
export const useHasUnsavedChanges = () => useSaveStore((s) => s.hasUnsavedChanges)
export const useIsManualSaving = () => useSaveStore((s) => s.isManualSaving)
