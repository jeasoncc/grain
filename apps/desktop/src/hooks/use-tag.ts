/**
 * @file hooks/use-tag.ts
 * @description Tag React Hooks
 *
 * Provides React hooks for accessing tag data.
 * Uses TanStack Query for data fetching from Rust backend.
 *
 * @requirements 8.2
 */

import {
	useNodesByTag as useNodesByTagQuery,
	useTagByName as useTagByNameQuery,
	useTagGraph as useTagGraphQuery,
	useTag as useTagQuery,
	useTagSearch as useTagSearchQuery,
	useTagsByWorkspace as useTagsByWorkspaceQuery,
	useTopTags as useTopTagsQuery,
} from "@/hooks/queries"
import type { TagGraphData } from "@/types/codec"
import type { TagInterface } from "@/types/tag"

/**
 * Hook to get all tags for a workspace
 *
 * @param workspaceId - The workspace ID
 * @returns Array of tags for the workspace
 */
export function useTagsByWorkspace(workspaceId: string | undefined): readonly TagInterface[] {
	const { data } = useTagsByWorkspaceQuery(workspaceId)
	return data ?? []
}

/**
 * Hook to get node IDs by tag
 *
 * @param workspaceId - The workspace ID
 * @param tagName - The tag name to filter by
 * @returns Array of node IDs with the specified tag
 */
export function useNodesByTag(
	workspaceId: string | undefined,
	tagName: string | undefined,
): readonly string[] {
	const { data } = useNodesByTagQuery(workspaceId, tagName)
	return data ?? []
}

/**
 * Hook to get tag graph data for visualization
 *
 * @param workspaceId - The workspace ID
 * @returns Graph data with nodes and edges
 */
export function useTagGraph(workspaceId: string | undefined): TagGraphData {
	const { data } = useTagGraphQuery(workspaceId)
	return data ?? { edges: [], nodes: [] }
}

/**
 * Hook to search tags by name
 *
 * @param workspaceId - The workspace ID
 * @param query - The search query
 * @returns Array of matching tags
 */
export function useTagSearch(
	workspaceId: string | undefined,
	query: string,
): readonly TagInterface[] {
	const { data } = useTagSearchQuery(workspaceId, query || undefined)
	return data ?? []
}

/**
 * Hook to get a single tag by ID
 *
 * @param tagId - The tag ID
 * @returns The tag or undefined
 */
export function useTag(tagId: string | undefined): TagInterface | undefined {
	const { data } = useTagQuery(tagId)
	return data ?? undefined
}

/**
 * Hook to get a tag by name
 *
 * @param workspaceId - The workspace ID
 * @param name - The tag name
 * @returns The tag or undefined
 */
export function useTagByName(
	workspaceId: string | undefined,
	name: string | undefined,
): TagInterface | undefined {
	const { data } = useTagByNameQuery(workspaceId, name)
	return data ?? undefined
}

/**
 * Hook to count tags in a workspace
 *
 * @param workspaceId - The workspace ID
 * @returns The count of tags
 */
export function useTagCount(workspaceId: string | undefined): number {
	const { data } = useTagsByWorkspaceQuery(workspaceId)
	return data?.length ?? 0
}

/**
 * Hook to get popular tags (sorted by count)
 *
 * @param workspaceId - The workspace ID
 * @param limit - Maximum number of tags to return
 * @returns Array of popular tags
 */
export function usePopularTags(
	workspaceId: string | undefined,
	limit = 10,
): readonly TagInterface[] {
	const { data } = useTopTagsQuery(workspaceId, limit)
	return data ?? []
}

/**
 * Hook to get recently used tags
 *
 * @param workspaceId - The workspace ID
 * @param limit - Maximum number of tags to return
 * @returns Array of recently used tags
 */
export function useRecentTags(
	workspaceId: string | undefined,
	limit = 10,
): readonly TagInterface[] {
	const { data } = useTagsByWorkspaceQuery(workspaceId)
	if (!data) return []
	// Sort by lastUsed and take top N
	return [...data]
		.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
		.slice(0, limit)
}
