/**
 * Tag Service (Simplified)
 *
 * Tags are stored in nodes.tags array (source of truth).
 * This service re-exports from TagRepository and hooks for backward compatibility.
 *
 * @requirements 6.2
 */

import {
	TagRepository,
	type TagInterface,
	useTagsByWorkspace,
	useNodesByTag,
	useTagGraph,
	useTagSearch,
} from "@/db/models";

// Re-export types
export type { TagInterface };

// Re-export hooks for backward compatibility
export { useTagsByWorkspace, useNodesByTag, useTagGraph, useTagSearch };

// ============================================
// Service Functions (delegate to TagRepository)
// ============================================

/**
 * Sync tags to the aggregation cache
 * @deprecated Use TagRepository.syncCache instead
 */
export const syncTagsCache = TagRepository.syncCache.bind(TagRepository);

/**
 * Recalculate tag usage counts
 * @deprecated Use TagRepository.recalculateCounts instead
 */
export const recalculateTagCounts = TagRepository.recalculateCounts.bind(TagRepository);

/**
 * Rebuild entire tag cache for a workspace
 * @deprecated Use TagRepository.rebuildCache instead
 */
export const rebuildTagCache = TagRepository.rebuildCache.bind(TagRepository);

/**
 * Get all tags for a workspace
 * @deprecated Use TagRepository.getByWorkspace instead
 */
export const getTagsByWorkspace = TagRepository.getByWorkspace.bind(TagRepository);

/**
 * Search tags by name prefix
 * @deprecated Use TagRepository.search instead
 */
export const searchTags = TagRepository.search.bind(TagRepository);

/**
 * Get nodes by tag
 * @deprecated Use TagRepository.getNodesByTag instead
 */
export const getNodesByTag = TagRepository.getNodesByTag.bind(TagRepository);

/**
 * Get tag graph data for visualization
 * @deprecated Use TagRepository.getGraphData instead
 */
export const getTagGraphData = TagRepository.getGraphData.bind(TagRepository);
