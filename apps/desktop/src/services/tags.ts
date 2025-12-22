/**
 * Tag Service (Simplified)
 *
 * Tags are stored in nodes.tags array (source of truth).
 * This service re-exports from db functions and hooks for backward compatibility.
 *
 * @requirements 6.2
 */

import * as E from "fp-ts/Either";
import {
	getNodesByTag as getNodesByTagDb,
	getTagGraphData as getTagGraphDataDb,
	getTagsByWorkspace as getTagsByWorkspaceDb,
	rebuildTagCache as rebuildTagCacheDb,
	recalculateTagCounts as recalculateTagCountsDb,
	searchTags as searchTagsDb,
	syncTagCache as syncTagCacheDb,
} from "@/db";
import {
	useNodesByTag,
	useTagGraph,
	useTagSearch,
	useTagsByWorkspace,
} from "@/hooks";
import type { TagInterface } from "@/types/tag";

// Re-export types
export type { TagInterface };

// Re-export hooks for backward compatibility
export { useTagsByWorkspace, useNodesByTag, useTagGraph, useTagSearch };

// ============================================
// Service Functions (delegate to db functions)
// ============================================

/**
 * Sync tags to the aggregation cache
 * @deprecated Use syncTagCache from @/db instead
 */
export const syncTagsCache = async (workspaceId: string, tags: string[]) => {
	const result = await syncTagCacheDb(workspaceId, tags)();
	if (E.isLeft(result)) {
		throw new Error(`Failed to sync tag cache: ${result.left.message}`);
	}
};

/**
 * Recalculate tag usage counts
 * @deprecated Use recalculateTagCounts from @/db instead
 */
export const recalculateTagCounts = async (
	workspaceId: string,
	tags: string[] = [],
) => {
	const result = await recalculateTagCountsDb(workspaceId, tags)();
	if (E.isLeft(result)) {
		throw new Error(`Failed to recalculate tag counts: ${result.left.message}`);
	}
};

/**
 * Rebuild entire tag cache for a workspace
 * @deprecated Use rebuildTagCache from @/db instead
 */
export const rebuildTagCache = async (workspaceId: string) => {
	const result = await rebuildTagCacheDb(workspaceId)();
	if (E.isLeft(result)) {
		throw new Error(`Failed to rebuild tag cache: ${result.left.message}`);
	}
};

/**
 * Get all tags for a workspace
 * @deprecated Use getTagsByWorkspace from @/db instead
 */
export const getTagsByWorkspace = async (workspaceId: string) => {
	const result = await getTagsByWorkspaceDb(workspaceId)();
	return E.isRight(result) ? result.right : [];
};

/**
 * Search tags by name prefix
 * @deprecated Use searchTags from @/db instead
 */
export const searchTags = async (workspaceId: string, query: string) => {
	const result = await searchTagsDb(workspaceId, query)();
	return E.isRight(result) ? result.right : [];
};

/**
 * Get nodes by tag
 * @deprecated Use getNodesByTag from @/db instead
 */
export const getNodesByTag = async (workspaceId: string, tagName: string) => {
	const result = await getNodesByTagDb(workspaceId, tagName)();
	return E.isRight(result) ? result.right : [];
};

/**
 * Get tag graph data for visualization
 * @deprecated Use getTagGraphData from @/db instead
 */
export const getTagGraphData = async (workspaceId: string) => {
	const result = await getTagGraphDataDb(workspaceId)();
	return E.isRight(result) ? result.right : { nodes: [], edges: [] };
};
