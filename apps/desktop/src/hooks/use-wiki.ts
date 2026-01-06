/**
 * useWikiFiles Hook
 *
 * Hook to get all wiki files for a workspace
 * Returns WikiFileEntry array for @ mentions autocomplete
 *
 * 迁移说明：
 * - 从 dexie-react-hooks 迁移到 TanStack Query
 * - 底层使用 Repository 层访问 SQLite 数据
 *
 * Requirements: 2.1
 */

import { useMemo } from "react";
import { WikiFileEntryBuilder, type WikiFileEntryType } from "@/pipes/wiki";
import { useNodesByWorkspace } from "@/queries/node.queries";
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
	const { data: allNodes, isLoading } = useNodesByWorkspace(workspaceId);

	return useMemo(() => {
		if (isLoading || !allNodes || !workspaceId) return [];

		// Filter wiki nodes (nodes with "wiki" tag)
		const wikiNodes = allNodes.filter(
			(node) => node.tags?.includes(WIKI_TAG) && node.workspace === workspaceId,
		);

		if (wikiNodes.length === 0) return [];

		// Build node map for path building
		const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

		// Build WikiFileEntry array
		// 注意：内容需要单独查询，这里暂时使用空字符串
		// 如果需要内容，可以使用 useQueries 批量查询
		return wikiNodes.map((node) =>
			new WikiFileEntryBuilder()
				.id(node.id)
				.name(node.title)
				.alias([])
				.content("") // 内容需要单独查询
				.path(buildNodePath(node, nodeMap))
				.build(),
		);
	}, [allNodes, workspaceId, isLoading]);
}
