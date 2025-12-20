/**
 * Node Utils - Pure Functions
 *
 * Tree building, path navigation, and validation functions.
 * All functions are pure - no side effects, no database access.
 *
 * @requirements 2.1, 1.4
 */

import type { NodeInterface, NodeType } from "./node.interface";

// ============================================================================
// Types for UI Consumption
// ============================================================================

/**
 * TreeNode interface for UI rendering
 * Represents a node in the hierarchical tree structure
 */
export interface TreeNode {
	id: string;
	title: string;
	type: NodeType;
	collapsed: boolean;
	children: TreeNode[];
	depth: number;
}

// ============================================================================
// Tree Building Functions
// ============================================================================

/**
 * Build a hierarchical tree structure from a flat list of nodes
 * Recursively constructs the tree based on parent references
 *
 * @param nodes - Flat array of NodeInterface objects
 * @param parentId - Parent ID to filter by (null for root nodes)
 * @param depth - Current depth level in the tree
 * @returns Array of TreeNode objects representing the tree structure
 */
export function buildTree(
	nodes: NodeInterface[],
	parentId: string | null = null,
	depth = 0,
): TreeNode[] {
	return nodes
		.filter((n) => n.parent === parentId)
		.sort((a, b) => a.order - b.order)
		.map((node) => ({
			id: node.id,
			title: node.title,
			type: node.type,
			collapsed: node.collapsed ?? true,
			depth,
			children:
				node.type === "folder" ? buildTree(nodes, node.id, depth + 1) : [],
		}));
}

/**
 * Get the path from root to a specific node (for breadcrumb navigation)
 *
 * @param nodes - Flat array of all nodes
 * @param nodeId - Target node ID
 * @returns Array of NodeInterface objects from root to target node
 */
export function getNodePath(
	nodes: NodeInterface[],
	nodeId: string,
): NodeInterface[] {
	const path: NodeInterface[] = [];
	let current = nodes.find((n) => n.id === nodeId);

	while (current) {
		path.unshift(current);
		current = current.parent
			? nodes.find((n) => n.id === current!.parent)
			: undefined;
	}

	return path;
}

/**
 * Check if moving a node would create a circular reference
 * A node cannot be moved to one of its descendants
 *
 * @param nodes - Flat array of all nodes
 * @param nodeId - Node being moved
 * @param newParentId - Proposed new parent ID
 * @returns true if the move would create a cycle
 */
export function wouldCreateCycle(
	nodes: NodeInterface[],
	nodeId: string,
	newParentId: string | null,
): boolean {
	if (newParentId === null) return false;
	if (nodeId === newParentId) return true;

	// Walk up from newParentId to check if we encounter nodeId
	let current = nodes.find((n) => n.id === newParentId);
	while (current) {
		if (current.id === nodeId) return true;
		current = current.parent
			? nodes.find((n) => n.id === current!.parent)
			: undefined;
	}

	return false;
}

// ============================================================================
// Node Filtering and Sorting
// ============================================================================

/**
 * Get root nodes from a flat list
 *
 * @param nodes - Flat array of nodes
 * @returns Array of root nodes (parent === null) sorted by order
 */
export function getRootNodes(nodes: NodeInterface[]): NodeInterface[] {
	return nodes.filter((n) => n.parent === null).sort((a, b) => a.order - b.order);
}

/**
 * Get child nodes of a parent
 *
 * @param nodes - Flat array of nodes
 * @param parentId - Parent node ID
 * @returns Array of child nodes sorted by order
 */
export function getChildNodes(
	nodes: NodeInterface[],
	parentId: string | null,
): NodeInterface[] {
	return nodes
		.filter((n) => n.parent === parentId)
		.sort((a, b) => a.order - b.order);
}

/**
 * Get all descendants of a node (recursive)
 *
 * @param nodes - Flat array of all nodes
 * @param nodeId - Parent node ID
 * @returns Array of all descendant nodes
 */
export function getDescendants(
	nodes: NodeInterface[],
	nodeId: string,
): NodeInterface[] {
	const result: NodeInterface[] = [];
	const queue = [nodeId];

	while (queue.length > 0) {
		const currentId = queue.shift()!;
		const children = nodes.filter((n) => n.parent === currentId);

		for (const child of children) {
			result.push(child);
			queue.push(child.id);
		}
	}

	return result;
}

/**
 * Filter nodes by type
 *
 * @param nodes - Flat array of nodes
 * @param type - Node type to filter by
 * @returns Array of nodes matching the type
 */
export function filterByType(
	nodes: NodeInterface[],
	type: NodeType,
): NodeInterface[] {
	return nodes.filter((n) => n.type === type);
}

/**
 * Filter nodes by tag
 *
 * @param nodes - Flat array of nodes
 * @param tag - Tag to filter by
 * @returns Array of nodes containing the tag
 */
export function filterByTag(
	nodes: NodeInterface[],
	tag: string,
): NodeInterface[] {
	return nodes.filter((n) => n.tags?.includes(tag));
}

// ============================================================================
// Order Calculation
// ============================================================================

/**
 * Calculate the next order number for a new sibling
 *
 * @param siblings - Array of sibling nodes
 * @returns The next order number
 */
export function getNextOrder(siblings: NodeInterface[]): number {
	if (siblings.length === 0) return 0;
	return Math.max(...siblings.map((n) => n.order)) + 1;
}

/**
 * Calculate new orders after inserting a node at a specific index
 *
 * @param siblings - Current sibling nodes (sorted by order)
 * @param insertIndex - Index to insert at
 * @returns Map of nodeId to new order
 */
export function calculateReorderAfterInsert(
	siblings: NodeInterface[],
	insertIndex: number,
): Map<string, number> {
	const result = new Map<string, number>();
	const sorted = [...siblings].sort((a, b) => a.order - b.order);

	for (let i = 0; i < sorted.length; i++) {
		const newOrder = i >= insertIndex ? i + 1 : i;
		if (sorted[i].order !== newOrder) {
			result.set(sorted[i].id, newOrder);
		}
	}

	return result;
}
