/**
 * Editor History Domain - Type Definitions
 */

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of history entries per node */
export const MAX_HISTORY_SIZE = 50;

/** Storage key for persistence */
export const EDITOR_HISTORY_STORAGE_KEY = "grain-history";

// ============================================================================
// Types
// ============================================================================

/** A single history entry representing an editor state snapshot */
export interface EditorHistoryEntry {
	readonly nodeId: string;
	readonly content: unknown; // Lexical EditorState JSON
	readonly timestamp: string;
	readonly wordCount: number;
}

/** History stack type - maps nodeId to array of entries */
export type HistoryStack = Map<string, EditorHistoryEntry[]>;

// ============================================================================
// State Interface
// ============================================================================

export interface EditorHistoryState {
	/** Undo history stack per node */
	readonly undoStack: HistoryStack;
	/** Redo history stack per node */
	readonly redoStack: HistoryStack;
	/** Currently active node ID */
	readonly currentNodeId: string | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface EditorHistoryActions {
	/** Push a new history entry for a node */
	pushHistory: (nodeId: string, content: unknown, wordCount: number) => void;
	/** Undo the last change for a node, returns the entry or null */
	undo: (nodeId: string) => EditorHistoryEntry | null;
	/** Redo the last undone change for a node, returns the entry or null */
	redo: (nodeId: string) => EditorHistoryEntry | null;
	/** Clear history for a specific node */
	clearHistory: (nodeId: string) => void;
	/** Clear all history for all nodes */
	clearAllHistory: () => void;
	/** Set the current active node */
	setCurrentNode: (nodeId: string | null) => void;
}

// ============================================================================
// Query Interface
// ============================================================================

export interface EditorHistoryQueries {
	/** Check if undo is available for a node */
	canUndo: (nodeId: string) => boolean;
	/** Check if redo is available for a node */
	canRedo: (nodeId: string) => boolean;
	/** Get the count of undo/redo entries for a node */
	getHistoryCount: (nodeId: string) => { undo: number; redo: number };
}

// ============================================================================
// Combined Store Type
// ============================================================================

export type EditorHistoryStore = EditorHistoryState &
	EditorHistoryActions &
	EditorHistoryQueries;
