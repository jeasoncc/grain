/**
 * Tag React Hooks
 *
 * Provides React hooks for accessing tag data with live updates.
 *
 * @requirements 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { TagRepository } from "./tag.repository";
import type { TagInterface } from "./tag.interface";

/**
 * Hook to get all tags for a workspace
 */
export function useTagsByWorkspace(
	workspaceId: string | undefined,
): TagInterface[] {
	return (
		useLiveQuery(
			() => (workspaceId ? TagRepository.getByWorkspace(workspaceId) : []),
			[workspaceId],
			[],
		) ?? []
	);
}

/**
 * Hook to get nodes by tag
 */
export function useNodesByTag(
	workspaceId: string | undefined,
	tagName: string | undefined,
) {
	return useLiveQuery(
		() =>
			workspaceId && tagName
				? TagRepository.getNodesByTag(workspaceId, tagName)
				: [],
		[workspaceId, tagName],
		[],
	);
}

/**
 * Hook to get tag graph data
 */
export function useTagGraph(workspaceId: string | undefined) {
	return useLiveQuery(
		() =>
			workspaceId
				? TagRepository.getGraphData(workspaceId)
				: { nodes: [], edges: [] },
		[workspaceId],
		{ nodes: [], edges: [] },
	);
}

/**
 * Hook to search tags
 */
export function useTagSearch(
	workspaceId: string | undefined,
	query: string,
): TagInterface[] {
	return (
		useLiveQuery(
			() => (workspaceId && query ? TagRepository.search(workspaceId, query) : []),
			[workspaceId, query],
			[],
		) ?? []
	);
}
