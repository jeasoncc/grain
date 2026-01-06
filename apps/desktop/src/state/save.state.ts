/**
 * @file stores/save.store.ts
 * @description Save 状态管理
 *
 * Manages document save status (runtime state, no persistence needed)
 * Uses Zustand + Immer for immutable state management.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { SaveStatus, SaveStore } from "@/types/save";

// Re-export types for convenience
export type {
	SaveActions,
	SaveState,
	SaveStatus,
	SaveStore,
} from "@/types/save";

// ============================================================================
// Store
// ============================================================================

export const useSaveStore = create<SaveStore>()(
	immer((set) => ({
		// State
		status: "saved" as SaveStatus,
		lastSaveTime: null as number | null,
		errorMessage: null as string | null,
		hasUnsavedChanges: false,
		isManualSaving: false,

		// Actions
		setStatus: (status) =>
			set((state) => {
				state.status = status;
			}),

		setLastSaveTime: (time) =>
			set((state) => {
				state.lastSaveTime = time.getTime();
			}),

		setErrorMessage: (message) =>
			set((state) => {
				state.errorMessage = message;
			}),

		setHasUnsavedChanges: (hasChanges) =>
			set((state) => {
				state.hasUnsavedChanges = hasChanges;
			}),

		setIsManualSaving: (isSaving) =>
			set((state) => {
				state.isManualSaving = isSaving;
			}),

		markAsSaved: () =>
			set((state) => {
				state.status = "saved";
				state.lastSaveTime = Date.now();
				state.errorMessage = null;
				state.hasUnsavedChanges = false;
				state.isManualSaving = false;
			}),

		markAsError: (message) =>
			set((state) => {
				state.status = "error";
				state.errorMessage = message;
				state.isManualSaving = false;
			}),

		markAsSaving: () =>
			set((state) => {
				state.status = "saving";
				state.errorMessage = null;
			}),

		markAsUnsaved: () =>
			set((state) => {
				state.status = "unsaved";
				state.hasUnsavedChanges = true;
			}),
	})),
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useSaveStatus = () => useSaveStore((s) => s.status);
export const useHasUnsavedChanges = () =>
	useSaveStore((s) => s.hasUnsavedChanges);
export const useIsManualSaving = () => useSaveStore((s) => s.isManualSaving);
