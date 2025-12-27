/**
 * useWikiFiles Hook
 *
 * Hook to get all wiki files for a workspace
 * Returns WikiFileEntry array for @ mentions autocomplete
 *
 * Requirements: 2.1
 */

import { useLiveQuery } from "dexie-react-hooks";
import { database } from "@/db/database";
import { WikiFileEntryBuilder, type WikiFileEntryType } from "@/fn/wiki";
import type { NodeInterface } from "@/types/node";

/** Wiki tag name */
const WIKI_TAG = "wiki";

/**
 * Build the path string for a node
 */
function buildNodePath(
	node: NodeInterface,
	nodeMap: Map<string, NodeInterface>,
): string {
	const parts: string[] = [node.title];
	let current = node.parent ? nodeMap.get(node.parent) : undefined;

	while (current) {
		parts.unshift(current.title);
		current = current.parent ? nodeMap.get(current.parent) : undefined;
	}

	return parts.join("/");
}

/**
 * Hook to get all wiki files for a workspace
 * Returns WikiFileEntry array for @ mentions autocomplete
 *
 * Requirements: 2.1
 *
 * @param workspaceId - The workspace ID (null returns empty array)
 * @returns Array of WikiFileEntry objects
 */
export function useWikiFiles(workspaceId: string | null): WikiFileEntryType[] {
	return useLiveQuery(
		async () => {
			if (!workspaceId) return [];

			// 使用单一事务获取所有数据，避免 ReadOnlyError
			// Query nodes with "wiki" tag
			const wikiNodes = await database.nodes
				.where("tags")
				.equals(WIKI_TAG)
				.and((node) => node.workspace === workspaceId)
				.toArray();

			if (wikiNodes.length === 0) return [];

			// Get all nodes for path building
			const allNodes = await database.nodes
				.where("workspace")
				.equals(workspaceId)
				.toArray();
			const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

			// Get content for wiki files
			const nodeIds = wikiNodes.map((n) => n.id);
			const contents = await database.contents
				.where("nodeId")
				.anyOf(nodeIds)
				.toArray();
			const contentMap = new Map(contents.map((c) => [c.nodeId, c.content]));

			// Build WikiFileEntry array
			return wikiNodes.map((node) =>
				new WikiFileEntryBuilder()
					.id(node.id)
					.name(node.title)
					.alias([])
					.content(contentMap.get(node.id) || "")
					.path(buildNodePath(node, nodeMap))
					.build(),
			);
		},
		[workspaceId],
		[],
	);
}
