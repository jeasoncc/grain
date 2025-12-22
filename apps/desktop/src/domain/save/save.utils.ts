/**
 * Save Utilities
 * Pure functions for tag extraction from Lexical editor content.
 *
 * Requirements: 1.1, 3.1, 3.2, 3.3
 */

import type { SerializedEditorState } from "lexical";

// ============================================================================
// Types
// ============================================================================

/**
 * Lexical node structure for traversal
 */
interface LexicalNode {
	type?: string;
	key?: string;
	value?: string;
	children?: LexicalNode[];
}

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Parse tags from a comma-separated string
 * Pure function - no side effects
 */
export const parseTagString = (value: string): string[] =>
	value
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean);

/**
 * Check if a node is a TAGS front-matter node
 */
const isTagsFrontMatter = (node: LexicalNode): boolean =>
	node.type === "front-matter" && node.key?.toUpperCase() === "TAGS";

/**
 * Extract tags from a single node (not recursive)
 */
const extractNodeTags = (node: LexicalNode): string[] =>
	isTagsFrontMatter(node) ? parseTagString(node.value || "") : [];

/**
 * Recursively collect tags from a node tree
 * Pure function using flatMap for immutable traversal
 */
const collectTags = (node: LexicalNode): string[] => [
	...extractNodeTags(node),
	...(node.children ?? []).flatMap(collectTags),
];

/**
 * Deduplicate an array using Set
 */
const deduplicate = <T>(arr: T[]): T[] => [...new Set(arr)];

// ============================================================================
// Main Export
// ============================================================================

/**
 * Extract tags from #+TAGS: front-matter in Lexical editor state.
 * Supports org-mode style tag extraction from FrontMatterNode.
 *
 * Pure function using recursive flatMap for immutable traversal.
 *
 * @param content - The serialized Lexical editor state
 * @returns Array of unique tag strings
 */
export const extractTagsFromContent = (
	content: SerializedEditorState,
): string[] =>
	content.root
		? deduplicate(collectTags(content.root as unknown as LexicalNode))
		: [];
