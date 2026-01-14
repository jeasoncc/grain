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
import { getContentsByNodeIds, getNodesByWorkspace } from "@/io/api";
import { legacyDatabase } from "@/io/db/legacy-database";
import { info, error, success } from "@/io/log/logger.api";
import { WikiFileEntryBuilder } from "@/pipes/wiki/wiki.builder";
import { WIKI_TAG } from "@/pipes/wiki/wiki.resolve.fn";
import type { WikiFileEntry } from "@/pipes/wiki/wiki.schema";
import type { NodeInterface } from "@/types/node";
import type { AppError } from "@/types/error";

/**
 * Build the path string for a node
 */
function buildNodePath(
	node: NodeInterface,
	nodeMap: ReadonlyMap<string, NodeInterface>,
): string {
	const buildPathRecursive = (currentNode: NodeInterface, acc: ReadonlyArray<string> = []): ReadonlyArray<string> => {
		const newAcc = [currentNode.title, ...acc];
		if (!currentNode.parent) {
			return newAcc;
		}
		const parent = nodeMap.get(currentNode.parent);
		return parent ? buildPathRecursive(parent, newAcc) : newAcc;
	};

	return buildPathRecursive(node).join("/");
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
): TE.TaskEither<AppError, ReadonlyArray<WikiFileEntry>> => {
	info("[Wiki] 获取 Wiki 文件列表...");

	return TE.tryCatch(
		async () => {
			// Query nodes with "wiki" tag using multi-entry index
			const nodes = await legacyDatabase.nodes
				.where("tags")
				.equals(WIKI_TAG)
				.and((node) => node.workspace === workspaceId)
				.toArray();

			info("[Wiki] 找到 Wiki 文件", { count: nodes.length }, "get-wiki-files.flow");

			// Get content for all wiki files
			const nodeIds = nodes.map((n) => n.id);
			const contentsResult = await getContentsByNodeIds(nodeIds)();
			const contents = E.isRight(contentsResult) ? contentsResult.right : [];
			const contentMap = new Map(contents.map((c) => [c.nodeId, c.content])) as ReadonlyMap<string, string>;

			// Get all nodes for path building
			const allNodesResult = await getNodesByWorkspace(workspaceId)();
			const allNodes = E.isRight(allNodesResult) ? allNodesResult.right : [];
			const nodeMap = new Map(allNodes.map((n) => [n.id, n])) as ReadonlyMap<string, NodeInterface>;

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

			success("[Wiki] Wiki 文件列表获取成功", {
				count: entries.length,
			}, "get-wiki-files");
			return entries as ReadonlyArray<WikiFileEntry>;
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
): Promise<ReadonlyArray<WikiFileEntry>> {
	const result = await getWikiFilesAsync(workspaceId)();

	if (E.isLeft(result)) {
		error("[Wiki] 获取 Wiki 文件列表失败", { error: result.left }, "get-wiki-files.flow");
		return [];
	}

	return result.right;
}
