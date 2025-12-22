/**
 * Editor History Domain - Pure Utility Functions
 */

import type {
	EditorHistoryEntry,
	HistoryStack,
} from "./editor-history.interface";
import { MAX_HISTORY_SIZE } from "./editor-history.interface";

// ============================================================================
// Entry Creation
// ============================================================================

/**
 * Creates a new history entry with current timestamp
 * Pure function - no side effects
 */
export const createHistoryEntry = (
	nodeId: string,
	content: unknown,
	wordCount: number,
): EditorHistoryEntry => ({
	nodeId,
	content,
	timestamp: new Date().toISOString(),
	wordCount,
});

// ============================================================================
// Stack Operations (Pure Functions)
// ============================================================================

/**
 * Pushes an entry to a node's history stack, enforcing max size
 * Returns a new Map (immutable)
 */
export const pushToStack = (
	stack: HistoryStack,
	nodeId: string,
	entry: EditorHistoryEntry,
): HistoryStack => {
	const newStack = new Map(stack);
	const nodeHistory = [...(stack.get(nodeId) || []), entry];

	// Enforce max history size
	if (nodeHistory.length > MAX_HISTORY_SIZE) {
		nodeHistory.shift();
	}

	newStack.set(nodeId, nodeHistory);
	return newStack;
};

/**
 * Pops the last entry from a node's history stack
 * Returns [newStack, poppedEntry] or [stack, null] if empty
 */
export const popFromStack = (
	stack: HistoryStack,
	nodeId: string,
): [HistoryStack, EditorHistoryEntry | null] => {
	const nodeHistory = stack.get(nodeId);

	if (!nodeHistory || nodeHistory.length === 0) {
		return [stack, null];
	}

	const newStack = new Map(stack);
	const newHistory = [...nodeHistory];
	const entry = newHistory.pop()!;

	newStack.set(nodeId, newHistory);
	return [newStack, entry];
};

/**
 * Clears history for a specific node
 * Returns a new Map (immutable)
 */
export const clearNodeFromStack = (
	stack: HistoryStack,
	nodeId: string,
): HistoryStack => {
	const newStack = new Map(stack);
	newStack.delete(nodeId);
	return newStack;
};

/**
 * Creates an empty history stack
 */
export const createEmptyStack = (): HistoryStack => new Map();

// ============================================================================
// Query Functions (Pure)
// ============================================================================

/**
 * Gets the history count for a node
 */
export const getNodeHistoryCount = (
	stack: HistoryStack,
	nodeId: string,
): number => {
	return stack.get(nodeId)?.length ?? 0;
};

/**
 * Checks if a node has history entries
 */
export const hasHistory = (stack: HistoryStack, nodeId: string): boolean => {
	return getNodeHistoryCount(stack, nodeId) > 0;
};

// ============================================================================
// Serialization (for persistence)
// ============================================================================

/**
 * Serializes a HistoryStack to an array format for JSON storage
 */
export const serializeStack = (
	stack: HistoryStack,
): Array<[string, EditorHistoryEntry[]]> => {
	return Array.from(stack.entries());
};

/**
 * Deserializes an array format back to a HistoryStack
 */
export const deserializeStack = (
	data: Array<[string, EditorHistoryEntry[]]> | undefined,
): HistoryStack => {
	if (!data) return new Map();
	return new Map(data);
};
