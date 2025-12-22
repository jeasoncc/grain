/**
 * Node Service Layer
 * Provides node manipulation functions for the workspace file tree structure.
 * Pure functions are now in fn/node/node.tree.fn.ts
 *
 * Requirements: 2.1, 1.4, 6.2
 */

import * as E from "fp-ts/Either";
import {
	addContent,
	addNode,
	deleteNodeWithChildren,
	getContentByNodeId,
	getNextOrder,
	getNodeById,
	getNodesByWorkspace,
	setNodeCollapsed,
	updateContentByNodeId,
	updateNode,
	updateNodeTitle,
} from "@/db";
import {
	buildTree,
	getNodePath,
	type TreeNode,
	wouldCreateCycle,
} from "@/fn/node";
import { useChildNodes, useNode, useNodesByWorkspace } from "@/hooks";
import type { NodeInterface, NodeType } from "@/types/node";

// Re-export hooks for backward compatibility
export { useNodesByWorkspace, useNode, useChildNodes };

// Re-export types for convenience
export type { NodeInterface, NodeType, TreeNode };

// Re-export pure functions for backward compatibility
export { buildTree, getNodePath, wouldCreateCycle };

/**
 * Move a node to a new parent and/or position
 * Updates parent reference and reorders siblings at both old and new locations
 *
 * @param nodeId - Node to move
 * @param newParentId - New parent ID (null for root)
 * @param newIndex - Position among new siblings (optional, defaults to end)
 * @returns Promise that resolves when move is complete
 * @throws Error if move would create a circular reference
 *
 * Requirements: 1.4
 */
export async function moveNode(
	nodeId: string,
	newParentId: string | null,
	newIndex?: number,
): Promise<void> {
	const nodeResult = await getNodeById(nodeId)();
	if (E.isLeft(nodeResult) || !nodeResult.right) {
		throw new Error(`Node not found: ${nodeId}`);
	}
	const node = nodeResult.right;

	// Get all nodes in the workspace to check for cycles
	const allNodesResult = await getNodesByWorkspace(node.workspace)();
	const allNodes = E.isRight(allNodesResult) ? allNodesResult.right : [];

	// Check for circular reference
	if (wouldCreateCycle(allNodes, nodeId, newParentId)) {
		throw new Error("Cannot move a node to one of its descendants");
	}

	const oldParentId = node.parent;
	const isParentChange = oldParentId !== newParentId;

	// Get siblings at the new location
	const newSiblings = allNodes
		.filter((n) => n.parent === newParentId && n.id !== nodeId)
		.sort((a, b) => a.order - b.order);

	// Calculate the new order
	const targetIndex =
		newIndex !== undefined
			? Math.max(0, Math.min(newIndex, newSiblings.length))
			: newSiblings.length;

	// Update the moved node
	await updateNode(nodeId, {
		parent: newParentId,
		order: targetIndex,
	})();

	// Reorder siblings at the new location
	const reorderPromises: Promise<unknown>[] = [];

	for (let i = 0; i < newSiblings.length; i++) {
		const sibling = newSiblings[i];
		const newOrder = i >= targetIndex ? i + 1 : i;
		if (sibling.order !== newOrder) {
			reorderPromises.push(updateNode(sibling.id, { order: newOrder })());
		}
	}

	// If parent changed, reorder siblings at the old location
	if (isParentChange && oldParentId !== null) {
		const oldSiblings = allNodes
			.filter((n) => n.parent === oldParentId && n.id !== nodeId)
			.sort((a, b) => a.order - b.order);

		for (let i = 0; i < oldSiblings.length; i++) {
			const sibling = oldSiblings[i];
			if (sibling.order !== i) {
				reorderPromises.push(updateNode(sibling.id, { order: i })());
			}
		}
	}

	await Promise.all(reorderPromises);
}

// ==============================
// Node CRUD Wrapper Functions
// ==============================

/**
 * Create a new node (folder or file)
 * Also creates an empty content record for file-type nodes
 *
 * @param params - Node creation parameters
 * @returns The created node
 *
 * Requirements: 1.1, 1.2
 */
export async function createNode(params: {
	workspaceId: string;
	parentId: string | null;
	type: NodeType;
	title: string;
	content?: string;
}): Promise<NodeInterface> {
	// Get next order for the new node
	const nextOrderResult = await getNextOrder(
		params.parentId,
		params.workspaceId,
	)();
	const nextOrder = E.isRight(nextOrderResult) ? nextOrderResult.right : 0;

	// Create the node using NodeBuilder
	const nodeResult = await addNode(params.workspaceId, params.title, {
		parent: params.parentId,
		type: params.type,
		order: nextOrder,
	})();

	if (E.isLeft(nodeResult)) {
		throw new Error(`Failed to create node: ${nodeResult.left.message}`);
	}

	const node = nodeResult.right;

	// Create content record for file-type nodes
	if (
		params.type === "file" ||
		params.type === "diary" ||
		params.type === "canvas"
	) {
		const contentType = params.type === "canvas" ? "excalidraw" : "lexical";
		await addContent(node.id, params.content || "", contentType)();
	}

	return node;
}

/**
 * Rename a node
 *
 * @param nodeId - Node ID to rename
 * @param newTitle - New title for the node
 *
 * Requirements: 1.5
 */
export async function renameNode(
	nodeId: string,
	newTitle: string,
): Promise<void> {
	await updateNodeTitle(nodeId, newTitle)();
}

/**
 * Update node content
 * Uses ContentRepository to store content separately from node metadata
 *
 * @param nodeId - Node ID to update
 * @param content - New content (Lexical JSON or Excalidraw JSON)
 */
export async function updateNodeContent(
	nodeId: string,
	content: string,
): Promise<void> {
	await updateContentByNodeId(nodeId, content)();
}

/**
 * Toggle folder collapsed state
 *
 * @param nodeId - Folder node ID
 * @param collapsed - New collapsed state
 *
 * Requirements: 2.2
 */
export async function toggleNodeCollapsed(
	nodeId: string,
	collapsed: boolean,
): Promise<void> {
	await setNodeCollapsed(nodeId, collapsed)();
}

/**
 * Delete a node and all its children
 * Also deletes associated content records
 *
 * @param nodeId - Node ID to delete
 *
 * Requirements: 1.3
 */
export async function deleteNode(nodeId: string): Promise<void> {
	await deleteNodeWithChildren(nodeId)();
}

/**
 * Get a single node by ID
 *
 * @param nodeId - Node ID
 * @returns The node or undefined if not found
 */
export async function getNode(
	nodeId: string,
): Promise<NodeInterface | undefined> {
	const result = await getNodeById(nodeId)();
	return E.isRight(result) ? result.right : undefined;
}

/**
 * Get node content by node ID
 *
 * @param nodeId - Node ID
 * @returns The content string or undefined if not found
 */
export async function getNodeContent(
	nodeId: string,
): Promise<string | undefined> {
	const result = await getContentByNodeId(nodeId)();
	if (E.isRight(result) && result.right) {
		return result.right.content;
	}
	return undefined;
}

/**
 * Reorder a node within its siblings
 *
 * @param nodeId - Node to reorder
 * @param newIndex - New position among siblings
 *
 * Requirements: 2.5
 */
export async function reorderNode(
	nodeId: string,
	newIndex: number,
): Promise<void> {
	const nodeResult = await getNodeById(nodeId)();
	if (E.isLeft(nodeResult) || !nodeResult.right) {
		throw new Error(`Node not found: ${nodeId}`);
	}
	const node = nodeResult.right;

	// Move to same parent but different position
	await moveNode(nodeId, node.parent, newIndex);
}
