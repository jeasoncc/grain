/**
 * Editor History Domain - Public API
 */

// Types
export type {
	EditorHistoryActions,
	EditorHistoryEntry,
	EditorHistoryQueries,
	EditorHistoryState,
	EditorHistoryStore,
	HistoryStack,
} from "./editor-history.interface";

// Constants
export {
	EDITOR_HISTORY_STORAGE_KEY,
	MAX_HISTORY_SIZE,
} from "./editor-history.interface";

// Store and hooks
export {
	useCurrentNodeId,
	useEditorHistory,
	useEditorHistoryStore,
} from "./editor-history.store";
