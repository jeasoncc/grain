/**
 * File Creator Service
 *
 * Provides a unified way to create files in the file tree with:
 * - Automatic folder creation
 * - Tag support
 * - Content templates
 *
 * Used by diary, wiki, and other file creation features.
 */

import * as E from "fp-ts/Either";
import { addContent, addNode, getNextOrder, getNodesByWorkspace } from "@/db";
import type { NodeInterface } from "@/types/node";

// ==============================
// Types
// ==============================

export interface FileCreationOptions {
	/** Workspace ID */
	workspaceId: string;
	/** File title/name */
	title: string;
	/** Parent folder path (array of folder names from root) */
	folderPath: string[];
	/** Node type (file, diary, etc.) */
	type?: "file" | "diary" | "canvas";
	/** Tags to apply to the file */
	tags?: string[];
	/** Content to store (Lexical JSON string) */
	content?: string;
	/** Whether folders should be collapsed */
	foldersCollapsed?: boolean;
}

export interface FileCreationResult {
	/** The created file node */
	node: NodeInterface;
	/** The parent folder node */
	parentFolder: NodeInterface;
}

// ==============================
// Folder Management
// ==============================

/**
 * Get or create a folder node by title under a parent
 */
async function getOrCreateFolder(
	workspaceId: string,
	parentId: string | null,
	title: string,
	collapsed: boolean = false,
): Promise<NodeInterface> {
	const nodesResult = await getNodesByWorkspace(workspaceId)();
	const nodes = E.isRight(nodesResult) ? nodesResult.right : [];
	const existing = nodes.find(
		(n) => n.parent === parentId && n.title === title && n.type === "folder",
	);

	if (existing) {
		return existing;
	}

	const nodeResult = await addNode(workspaceId, title, {
		parent: parentId,
		type: "folder",
		collapsed,
	})();

	if (E.isLeft(nodeResult)) {
		throw new Error(`Failed to create folder: ${nodeResult.left.message}`);
	}

	return nodeResult.right;
}

/**
 * Ensure a folder path exists, creating folders as needed
 * @param workspaceId - The workspace ID
 * @param folderPath - Array of folder names from root
 * @param collapsed - Whether new folders should be collapsed
 * @returns The deepest folder node
 */
async function ensureFolderPath(
	workspaceId: string,
	folderPath: string[],
	collapsed: boolean = false,
): Promise<NodeInterface> {
	let parentId: string | null = null;
	let currentFolder: NodeInterface | null = null;

	for (const folderName of folderPath) {
		currentFolder = await getOrCreateFolder(
			workspaceId,
			parentId,
			folderName,
			collapsed,
		);
		parentId = currentFolder.id;
	}

	if (!currentFolder) {
		throw new Error("Folder path cannot be empty");
	}

	return currentFolder;
}

// ==============================
// File Creation
// ==============================

/**
 * Create a file in the file tree with full support for:
 * - Automatic folder hierarchy creation
 * - Tags
 * - Content
 *
 * @param options - File creation options
 * @returns The created file node and parent folder
 */
export async function createFileInTree(
	options: FileCreationOptions,
): Promise<FileCreationResult> {
	const {
		workspaceId,
		title,
		folderPath,
		type = "file",
		tags,
		content,
		foldersCollapsed = false,
	} = options;

	// Ensure folder hierarchy exists
	const parentFolder = await ensureFolderPath(
		workspaceId,
		folderPath,
		foldersCollapsed,
	);

	// Get next order for the new file
	const nextOrderResult = await getNextOrder(parentFolder.id, workspaceId)();
	const nextOrder = E.isRight(nextOrderResult) ? nextOrderResult.right : 0;

	// Create the file node with tags
	const nodeResult = await addNode(workspaceId, title, {
		parent: parentFolder.id,
		type,
		order: nextOrder,
		tags,
	})();

	if (E.isLeft(nodeResult)) {
		throw new Error(`Failed to create file: ${nodeResult.left.message}`);
	}

	const node = nodeResult.right;

	// Create content record if provided
	if (content) {
		await addContent(node.id, content, "lexical")();
	}

	return { node, parentFolder };
}

/**
 * Ensure a root folder exists
 * Convenience function for simple folder structures
 */
export async function ensureRootFolder(
	workspaceId: string,
	folderName: string,
	collapsed: boolean = false,
): Promise<NodeInterface> {
	return getOrCreateFolder(workspaceId, null, folderName, collapsed);
}
