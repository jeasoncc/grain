/**
 * Wiki File Query Flow
 *
 * Provides wiki file query operations with IO.
 * Pure functions are in @/pipes/wiki.
 *
 * Requirements: 2.1
 */

import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { legacyDatabase } from "@/io/db/legacy-database";
import type { AppError } from "@/utils/error.util";
import logger from "@/io/log";
import { getContentsByNodeIds, getNodesByWorkspace } from "@/io/api";
import type { NodeInterface } from "@/types/node";
import { WikiFileEntryBuilder } from "@/pipes/wiki/wiki.builder";
import { WIKI_TAG } from "@/pipes/wiki/wiki.resolve.fn";
import type { WikiFileEntry } from "@/pipes/wiki/wiki.schema";

/**
 * Build the path string for a node
 */
function buildNodePath(
	node: NodeInterface,
	nodeMap: Map<string, NodeInterface>,
): string {
	const parts: string[] = [node.title];
	let current = node.parentId ? nodeMap.get(node.parentId) : undefined;

	while (current) {
		parts.unshift(current.title);
		current = current.parentId ? nodeMap.get(current.parentId) : undefined;
	}

	return parts.join("/");
}

/**
 * Get all files with "wiki" tag for a workspace
 * Used for @ operator autocomplete
 *
 * Requirements: 2.1
 *
 * @param workspaceId - The workspace ID
 * @returns TaskEither<AppError, WikiFileEntry[]>
 */
export const getWikiFilesAsync = (
	workspaceId: string,
): TE.TaskEither<AppError, WikiFileEntry[]> => {
	logger.info("[Wiki] 获取 Wiki 文件列表...");

	return TE.tryCatch(
		async () => {
			// Query nodes with "wiki" tag using multi-entry index
			const nodes = await legacyDatabase.nodes
				.where("tags")
				.equals(WIKI_TAG)
				.and((node) => node.workspace === workspaceId)
				.toArray();

			logger.info("[Wiki] 找到 Wiki 文件:", { count: nodes.length });

			// Get content for all wiki files
			const nodeIds = nodes.map((n) => n.id);
			const contentsResult = await getContentsByNodeIds(nodeIds)();
			const contents = E.isRight(contentsResult) ? contentsResult.right : [];
			const contentMap = new Map(contents.map((c) => [c.nodeId, c.content]));

			// Get all nodes for path building
			const allNodesResult = await getNodesByWorkspace(workspaceId)();
			const allNodes = E.isRight(allNodesResult) ? allNodesResult.right : [];
			const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

			// Build WikiFileEntry array
			const entries = nodes.map((node) => {
				const path = buildNodePath(node, nodeMap);
				const content = contentMap.get(node.id) || "";
				return new WikiFileEntryBuilder()
					.id(node.id)
					.name(node.title)
					.alias([])
					.content(content)
					.path(path)
					.build();
			});

			logger.success("[Wiki] Wiki 文件列表获取成功:", {
				count: entries.length,
			});
			return entries;
		},
		(error) => ({
			type: "DB_ERROR" as const,
			message: `获取 Wiki 文件列表失败: ${error instanceof Error ? error.message : "未知错误"}`,
		}),
	);
};

/**
 * Get all files with "wiki" tag for a workspace (async wrapper)
 *
 * @param workspaceId - The workspace ID
 * @returns Promise<WikiFileEntry[]>
 */
export async function getWikiFiles(
	workspaceId: string,
): Promise<WikiFileEntry[]> {
	const result = await getWikiFilesAsync(workspaceId)();

	if (E.isLeft(result)) {
		logger.error("[Wiki] 获取 Wiki 文件列表失败:", result.left);
		return [];
	}

	return result.right;
}
