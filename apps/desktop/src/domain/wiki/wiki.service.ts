/**
 * Wiki Files Service
 *
 * Provides wiki file management using the tag-based file system.
 * Wiki entries are regular files stored in a `wiki/` folder with a "wiki" tag.
 * This replaces the separate wikiEntries table with a unified file-based approach.
 *
 * Requirements: 1.1, 1.2, 2.1
 */

import { useLiveQuery } from "dexie-react-hooks";
import * as E from "fp-ts/Either";
import { getContentsByNodeIds, getNodesByWorkspace } from "@/db";
import { database } from "@/db/database";
import { createFileInTree, ensureRootFolderAsync } from "@/routes/actions";
import type { NodeInterface } from "@/types/node";

// ==============================
// Constants
// ==============================

/** Wiki root folder name */
export const WIKI_ROOT_FOLDER = "Wiki";

/** Wiki tag name */
export const WIKI_TAG = "wiki";

// ==============================
// Types
// ==============================

/**
 * WikiFileEntry interface for @ mentions autocomplete
 * Maps wiki-tagged files to a format compatible with the mentions plugin
 */
export interface WikiFileEntry {
	/** Node ID */
	id: string;
	/** File title (maps to WikiEntryInterface.name) */
	name: string;
	/** Aliases from node metadata or empty array */
	alias: string[];
	/** File content for preview */
	content: string;
	/** File path in tree (e.g., "wiki/Character.md") */
	path: string;
}

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
 * @returns The wiki folder node
 */
export async function ensureWikiFolder(
	workspaceId: string,
): Promise<NodeInterface> {
	return ensureRootFolderAsync(workspaceId, WIKI_ROOT_FOLDER, false);
}

// ==============================
// Wiki File Operations
// ==============================

/**
 * Generate default wiki template content in Lexical JSON format
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

export interface WikiCreationResult {
	/** The created wiki node */
	node: NodeInterface;
	/** The generated content (Lexical JSON string) */
	content: string;
	/** The parsed content (Lexical JSON object) */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	parsedContent: any;
}

/**
 * Create a new wiki file in the wiki folder with "wiki" tag
 *
 * Requirements: 1.2
 *
 * @param params - Creation parameters
 * @returns The created wiki file node and its content
 */
export async function createWikiFile(params: {
	workspaceId: string;
	name: string;
	content?: string;
	useTemplate?: boolean;
}): Promise<WikiCreationResult> {
	// Determine content: use provided content, template, or empty
	let finalContent = params.content || "";
	if (!params.content && params.useTemplate !== false) {
		finalContent = generateWikiTemplate(params.name);
	}
	const parsedContent = JSON.parse(finalContent || "{}");

	// Create wiki file using the unified file creator
	const { node } = await createFileInTree({
		workspaceId: params.workspaceId,
		title: params.name,
		folderPath: [WIKI_ROOT_FOLDER],
		type: "file",
		tags: [WIKI_TAG],
		content: finalContent,
	});

	return { node, content: finalContent, parsedContent };
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
 * @returns Array of WikiFileEntry objects
 */
export async function getWikiFiles(
	workspaceId: string,
): Promise<WikiFileEntry[]> {
	// Query nodes with "wiki" tag using multi-entry index
	const nodes = await database.nodes
		.where("tags")
		.equals(WIKI_TAG)
		.and((node) => node.workspace === workspaceId)
		.toArray();

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
	return nodes.map((node) => ({
		id: node.id,
		name: node.title,
		alias: [], // Could be extended to support aliases in node metadata
		content: contentMap.get(node.id) || "",
		path: buildNodePath(node, nodeMap),
	}));
}

/**
 * Build the path string for a node
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
// React Hooks
// ==============================

/**
 * Hook to get all wiki files for a workspace
 * Returns WikiFileEntry array for @ mentions autocomplete
 *
 * Requirements: 2.1
 *
 * @param workspaceId - The workspace ID (null returns empty array)
 * @returns Array of WikiFileEntry objects
 */
export function useWikiFiles(workspaceId: string | null): WikiFileEntry[] {
	return useLiveQuery(
		async () => {
			if (!workspaceId) return [];
			return getWikiFiles(workspaceId);
		},
		[workspaceId],
		[],
	);
}
