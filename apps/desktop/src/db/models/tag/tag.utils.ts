/**
 * Tag Utils - Pure Functions
 *
 * Tag manipulation and validation functions.
 * All functions are pure - no side effects, no database access.
 *
 * @requirements 1.4, 5.1, 5.2
 */

import type { TagInterface } from "./tag.interface";

// ============================================================================
// Constants
// ============================================================================

/** Maximum tag name length */
export const MAX_TAG_NAME_LENGTH = 50;

/** Minimum tag name length */
export const MIN_TAG_NAME_LENGTH = 1;

/** Characters not allowed in tag names */
export const INVALID_TAG_CHARS = /[#\[\]@]/g;

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * Normalize a tag name (lowercase, trimmed)
 * Pure function - no side effects
 */
export const normalizeTagName = (name: string): string =>
	name.toLowerCase().trim().replace(INVALID_TAG_CHARS, "");

/**
 * Validate a tag name
 * Returns null if valid, error message if invalid
 */
export const validateTagName = (name: string): string | null => {
	const normalized = normalizeTagName(name);
	
	if (normalized.length < MIN_TAG_NAME_LENGTH) {
		return "Tag name is too short";
	}
	if (normalized.length > MAX_TAG_NAME_LENGTH) {
		return "Tag name is too long";
	}
	return null;
};

// ============================================================================
// Filtering Functions (Pure)
// ============================================================================

/**
 * Filter tags by name prefix
 */
export const filterTagsByPrefix = (
	tags: TagInterface[],
	prefix: string,
): TagInterface[] =>
	tags.filter((t) => t.name.toLowerCase().startsWith(prefix.toLowerCase()));

/**
 * Filter tags by minimum usage count
 */
export const filterTagsByMinCount = (
	tags: TagInterface[],
	minCount: number,
): TagInterface[] => tags.filter((t) => t.count >= minCount);

/**
 * Sort tags by usage count (descending)
 */
export const sortTagsByCount = (tags: TagInterface[]): TagInterface[] =>
	[...tags].sort((a, b) => b.count - a.count);

/**
 * Sort tags alphabetically
 */
export const sortTagsAlphabetically = (tags: TagInterface[]): TagInterface[] =>
	[...tags].sort((a, b) => a.name.localeCompare(b.name));

// ============================================================================
// Tag Extraction Functions
// ============================================================================

/** Regex pattern for extracting tags from content */
export const TAG_PATTERN = /#\[([^\]]+)\]/g;

/**
 * Extract tag names from content string
 * Finds all #[tagName] patterns
 */
export const extractTagsFromContent = (content: string): string[] => {
	const matches = content.matchAll(TAG_PATTERN);
	const tags = new Set<string>();
	
	for (const match of matches) {
		const normalized = normalizeTagName(match[1]);
		if (normalized) {
			tags.add(normalized);
		}
	}
	
	return Array.from(tags);
};

/**
 * Get unique tag names from an array of tags
 */
export const getUniqueTagNames = (tags: TagInterface[]): string[] =>
	[...new Set(tags.map((t) => t.name))];

// ============================================================================
// Statistics Functions
// ============================================================================

/**
 * Calculate total tag usage across all tags
 */
export const getTotalTagUsage = (tags: TagInterface[]): number =>
	tags.reduce((sum, t) => sum + t.count, 0);

/**
 * Get top N tags by usage count
 */
export const getTopTags = (tags: TagInterface[], n: number): TagInterface[] =>
	sortTagsByCount(tags).slice(0, n);
