/**
 * Save Domain Module
 *
 * Manages document save status (runtime state only)
 */

// Types
export type { SaveStatus, SaveState, SaveActions, SaveStore } from "./save.interface";

// Constants
export { SaveActionTypes } from "./save.interface";

// Store and hooks
export {
	useSaveStore,
	useSaveStatus,
	useHasUnsavedChanges,
	useIsManualSaving,
} from "./save.store";

// Utils (pure functions)
export {
	parseTagString,
	extractTagsFromContent,
} from "./save.utils";

// Service
export {
	saveService,
	type SaveResult,
	type SaveService,
} from "./save.service";
