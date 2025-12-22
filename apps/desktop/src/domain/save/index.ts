/**
 * Save Domain Module
 *
 * Manages document save status (runtime state only)
 */

// Types
export type {
	SaveActions,
	SaveState,
	SaveStatus,
	SaveStore,
} from "./save.interface";

// Constants
export { SaveActionTypes } from "./save.interface";
// Service
export {
	type SaveResult,
	type SaveService,
	saveService,
} from "./save.service";
// Store and hooks
export {
	useHasUnsavedChanges,
	useIsManualSaving,
	useSaveStatus,
	useSaveStore,
} from "./save.store";
// Utils (pure functions)
export {
	extractTagsFromContent,
	parseTagString,
} from "./save.utils";
