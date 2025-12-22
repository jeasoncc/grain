/**
 * @file hooks/use-tag.ts
 * @description Tag React Hooks
 *
 * Provides React hooks for accessing tag data with live updates.
 * Uses dexie-react-hooks for reactive data subscriptions.
 *
 * @requirements 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { database } from "@/db/database";
import type { TagInterface } from "@/types/tag";

/**
 * Hook to get all tags for a workspace
 *
 * @param workspaceId - The workspace ID
 * @returns Array of tags for the workspace
 */
export function useTagsByWorkspace(
	workspaceId: string | undefined,
): TagInterface[] {
	return (
		useLiveQuery(
			async () => {
				if (!workspaceId) return [];
				return database.tags.where("workspace").equals(workspaceId).toArray();
			},
			[workspaceId],
			[],
		) ?? []
	);
}

/**
 * Hook to get nodes by tag
 *
 * @param workspaceId - The workspace ID
 * @param tagName - The tag name to filter by
 * @returns Array of nodes with the specified tag
 */
export function useNodesByTag(
	workspaceId: string | undefined,
	tagName: string | undefined,
) {
	return useLiveQuery(
		async () => {
			if (!workspaceId || !tagName) return [];
			return database.nodes
				.where("tags")
				.equals(tagName)
				.and((node) => node.workspace === workspaceId)
				.toArray();
		},
		[workspaceId, tagName],
		[],
	);
}

/**
 * Hook to get tag graph data for visualization
 *
 * @param workspaceId - The workspace ID
 * @returns Graph data with nodes and edges
 */
export function useTagGraph(workspaceId: string | undefined) {
	return useLiveQuery(
		async () => {
			if (!workspaceId) return { nodes: [], edges: [] };

			const tags = await database.tags
				.where("workspace")
				.equals(workspaceId)
				.toArray();
			const nodes = await database.nodes
				.where("workspace")
				.equals(workspaceId)
				.toArray();

			// Build co-occurrence matrix
			const coOccurrence = new Map<string, Map<string, number>>();

			for (const node of nodes) {
				if (!node.tags || node.tags.length < 2) continue;

				for (let i = 0; i < node.tags.length; i++) {
					for (let j = i + 1; j < node.tags.length; j++) {
						const tag1 = node.tags[i];
						const tag2 = node.tags[j];

						if (!coOccurrence.has(tag1)) {
							coOccurrence.set(tag1, new Map());
						}
						if (!coOccurrence.has(tag2)) {
							coOccurrence.set(tag2, new Map());
						}

						const map1 = coOccurrence.get(tag1);
						const map2 = coOccurrence.get(tag2);

						if (map1 && map2) {
							map1.set(tag2, (map1.get(tag2) || 0) + 1);
							map2.set(tag1, (map2.get(tag1) || 0) + 1);
						}
					}
				}
			}

			// Build graph nodes and edges
			const graphNodes = tags.map((tag) => ({
				id: tag.id,
				name: tag.name,
				count: tag.count,
			}));

			const edges: Array<{ source: string; target: string; weight: number }> =
				[];
			const addedEdges = new Set<string>();

			for (const [tag1, connections] of coOccurrence) {
				for (const [tag2, weight] of connections) {
					const edgeKey = [tag1, tag2].sort().join(":");
					if (!addedEdges.has(edgeKey)) {
						edges.push({
							source: `${workspaceId}:${tag1}`,
							target: `${workspaceId}:${tag2}`,
							weight,
						});
						addedEdges.add(edgeKey);
					}
				}
			}

			return { nodes: graphNodes, edges };
		},
		[workspaceId],
		{ nodes: [], edges: [] },
	);
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
): TagInterface[] {
	return (
		useLiveQuery(
			async () => {
				if (!workspaceId || !query) return [];
				const lowerQuery = query.toLowerCase();
				return database.tags
					.where("workspace")
					.equals(workspaceId)
					.filter((tag) => tag.name.toLowerCase().includes(lowerQuery))
					.toArray();
			},
			[workspaceId, query],
			[],
		) ?? []
	);
}

/**
 * Hook to get a single tag by ID
 *
 * @param tagId - The tag ID
 * @returns The tag or undefined
 */
export function useTag(tagId: string | undefined): TagInterface | undefined {
	return useLiveQuery(
		async () => {
			if (!tagId) return undefined;
			return database.tags.get(tagId);
		},
		[tagId],
		undefined,
	);
}

/**
 * Hook to count tags in a workspace
 *
 * @param workspaceId - The workspace ID
 * @returns The count of tags
 */
export function useTagCount(workspaceId: string | undefined): number {
	return (
		useLiveQuery(
			async () => {
				if (!workspaceId) return 0;
				return database.tags.where("workspace").equals(workspaceId).count();
			},
			[workspaceId],
			0,
		) ?? 0
	);
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
): TagInterface[] {
	return (
		useLiveQuery(
			async () => {
				if (!workspaceId) return [];
				const tags = await database.tags
					.where("workspace")
					.equals(workspaceId)
					.toArray();
				return tags.sort((a, b) => b.count - a.count).slice(0, limit);
			},
			[workspaceId, limit],
			[],
		) ?? []
	);
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
): TagInterface[] {
	return (
		useLiveQuery(
			async () => {
				if (!workspaceId) return [];
				const tags = await database.tags
					.where("workspace")
					.equals(workspaceId)
					.toArray();
				return tags
					.sort(
						(a, b) =>
							new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime(),
					)
					.slice(0, limit);
			},
			[workspaceId, limit],
			[],
		) ?? []
	);
}
