/**
 * Wiki Resolution Functions
 *
 * Provides wiki file management using the tag-based file system.
 * Wiki entries are regular files stored in a `wiki/` folder with a "wiki" tag.
 * This replaces the separate wikiEntries table with a unified file-based approach.
 *
 * Requirements: 1.1, 1.2, 2.1
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { getContentsByNodeIds, getNodesByWorkspace } from "@/db";
import { database } from "@/db/database";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";
import { createFileInTree, ensureRootFolder } from "@/routes/actions";
import type { NodeInterface } from "@/types/node";
import { WikiFileEntryBuilder } from "./wiki.builder";
import type {
	WikiCreationParams,
	WikiCreationResult,
	WikiFileEntry,
} from "./wiki.schema";
import {
	wikiCreationParamsSchema,
	wikiCreationResultSchema,
} from "./wiki.schema";

// ==============================
// Constants
// ==============================

/** Wiki root folder name */
export const WIKI_ROOT_FOLDER = "Wiki";

/** Wiki tag name */
export const WIKI_TAG = "wiki";

// ==============================
// Folder Management
// ==============================

/**
 * Ensure wiki folder exists at root level
 * Creates the wiki folder if it doesn't exist
 *
 * Requirements: 1.1
 *
 * @param workspaceId - The workspace ID
 * @returns TaskEither<AppError, NodeInterface>
 */
export const ensureWikiFolderAsync = (
	workspaceId: string,
): TE.TaskEither<AppError, NodeInterface> => {
	logger.start("[Wiki] 确保 Wiki 文件夹存在...");

	return pipe(
		ensureRootFolder(workspaceId, WIKI_ROOT_FOLDER, false),
		TE.tap((folder) => {
			logger.success("[Wiki] Wiki 文件夹已就绪:", folder.id);
			return TE.right(folder);
		}),
	);
};

// ==============================
// Wiki File Operations
// ==============================

/**
 * Generate default wiki template content in Lexical JSON format
 *
 * @param title - The wiki entry title
 * @returns Lexical editor state JSON string
 */
export function generateWikiTemplate(title: string): string {
	// Get current date for the date tag
	const now = new Date();
	const dateTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

	const template = {
		root: {
			children: [
				// Tags line: #[wiki] #[2024-12-16]
				{
					children: [
						{
							type: "tag",
							version: 1,
							tagName: "wiki",
							text: "#[wiki]",
							format: 0,
							style: "",
							detail: 2,
							mode: "segmented",
						},
						{
							type: "text",
							version: 1,
							text: " ",
							format: 0,
							style: "",
							detail: 0,
							mode: "normal",
						},
						{
							type: "tag",
							version: 1,
							tagName: dateTag,
							text: `#[${dateTag}]`,
							format: 0,
							style: "",
							detail: 2,
							mode: "segmented",
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				// Empty line
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				// Title heading
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: title,
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "heading",
					version: 1,
					tag: "h1",
				},
				// Empty line after title
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				{
					children: [
						{
							detail: 0,
							format: 1, // bold
							mode: "normal",
							style: "",
							text: "Overview",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "heading",
					version: 1,
					tag: "h2",
				},
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "Describe basic information here...",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				{
					children: [
						{
							detail: 0,
							format: 1, // bold
							mode: "normal",
							style: "",
							text: "Details",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "heading",
					version: 1,
					tag: "h2",
				},
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "Add more detailed content...",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				{
					children: [],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
				{
					children: [
						{
							detail: 0,
							format: 1, // bold
							mode: "normal",
							style: "",
							text: "Related Entries",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "heading",
					version: 1,
					tag: "h2",
				},
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "Use @ to link to other wiki entries...",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	};
	return JSON.stringify(template);
}

/**
 * Parse JSON content safely
 *
 * @param content - JSON string to parse
 * @returns Either<AppError, unknown>
 */
function parseJsonContent(content: string): E.Either<AppError, unknown> {
	try {
		const parsed = JSON.parse(content || "{}");
		return E.right(parsed);
	} catch (error) {
		logger.warn("[Wiki] JSON 解析失败:", error);
		return E.left({
			type: "VALIDATION_ERROR",
			message: `无效的 JSON 内容: ${error instanceof Error ? error.message : "未知错误"}`,
		});
	}
}

/**
 * Create a new wiki file in the wiki folder with "wiki" tag
 *
 * Requirements: 1.2
 *
 * @param params - Creation parameters
 * @returns TaskEither<AppError, WikiCreationResult>
 */
export const createWikiFileAsync = (
	params: WikiCreationParams,
): TE.TaskEither<AppError, WikiCreationResult> => {
	logger.start("[Wiki] 创建 Wiki 文件...");

	return TE.tryCatch(
		async () => {
			// 1. 校验参数
			const validParams = wikiCreationParamsSchema.parse(params);

			// 2. 生成内容
			let finalContent = validParams.content || "";
			if (!validParams.content && validParams.useTemplate !== false) {
				finalContent = generateWikiTemplate(validParams.name);
			}

			// 3. 解析内容
			const parsedContent = JSON.parse(finalContent || "{}");

			// 4. 创建文件
			const { node } = await createFileInTree({
				workspaceId: validParams.workspaceId,
				title: validParams.name,
				folderPath: [WIKI_ROOT_FOLDER],
				type: "file",
				tags: [WIKI_TAG],
				content: finalContent,
			});

			// 5. 校验结果
			const result = wikiCreationResultSchema.parse({
				node,
				content: finalContent,
				parsedContent,
			});

			logger.success("[Wiki] Wiki 文件创建成功:", node.id);
			return result;
		},
		(error) =>
			({
				type:
					error instanceof Error && error.message.includes("校验")
						? "VALIDATION_ERROR"
						: "DB_ERROR",
				message: `创建 Wiki 文件失败: ${error instanceof Error ? error.message : "未知错误"}`,
			}) as AppError,
	);
};

/**
 * Create a new wiki file (async wrapper)
 *
 * @param params - Creation parameters
 * @returns Promise<WikiCreationResult>
 */
export async function createWikiFile(
	params: WikiCreationParams,
): Promise<WikiCreationResult> {
	const result = await createWikiFileAsync(params)();

	if (E.isLeft(result)) {
		throw new Error(`创建 Wiki 文件失败: ${result.left.message}`);
	}

	return result.right;
}

// ==============================
// Wiki File Queries
// ==============================

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
			const nodes = await database.nodes
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
			const entries = nodes.map((node) =>
				new WikiFileEntryBuilder()
					.id(node.id)
					.name(node.title)
					.alias([])
					.content(contentMap.get(node.id) || "")
					.path(buildNodePath(node, nodeMap))
					.build(),
			);

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

/**
 * Build the path string for a node
 *
 * @param node - The node to build path for
 * @param nodeMap - Map of all nodes by ID
 * @returns Path string (e.g., "wiki/Character.md")
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

// ==============================
// Exports
// ==============================

export type { WikiFileEntry, WikiCreationParams, WikiCreationResult };
