/**
 * Editor History Domain - Public API
 */

// Types
export type {
	EditorHistoryEntry,
	EditorHistoryState,
	EditorHistoryActions,
	EditorHistoryQueries,
	EditorHistoryStore,
	HistoryStack,
} from "./editor-history.interface";

// Constants
export {
	MAX_HISTORY_SIZE,
	EDITOR_HISTORY_STORAGE_KEY,
} from "./editor-history.interface";

// Store and hooks
export {
	useEditorHistoryStore,
	useCurrentNodeId,
	useEditorHistory,
} from "./editor-history.store";
