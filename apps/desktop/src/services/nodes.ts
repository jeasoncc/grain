/**
 * Node Service Layer
 * Provides node manipulation functions for the workspace file tree structure.
 * Pure functions are now in db/models/node/node.utils.ts
 *
 * Requirements: 2.1, 1.4, 6.2
 */

import {
  NodeRepository,
  ContentRepository,
  type NodeInterface,
  type NodeType,
  type TreeNode,
  // Pure functions from node.utils.ts
  buildTree,
  getNodePath,
  wouldCreateCycle,
  // Hooks from new model location
  useNodesByWorkspace,
  useNode,
  useChildNodes,
} from "@/db/models";

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
  newIndex?: number
): Promise<void> {
  const node = await NodeRepository.getById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  // Get all nodes in the workspace to check for cycles
  const allNodes = await NodeRepository.getByWorkspace(node.workspace);

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
  await NodeRepository.update(nodeId, {
    parent: newParentId,
    order: targetIndex,
  });

  // Reorder siblings at the new location
  const reorderPromises: Promise<number>[] = [];

  for (let i = 0; i < newSiblings.length; i++) {
    const sibling = newSiblings[i];
    const newOrder = i >= targetIndex ? i + 1 : i;
    if (sibling.order !== newOrder) {
      reorderPromises.push(NodeRepository.update(sibling.id, { order: newOrder }));
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
        reorderPromises.push(NodeRepository.update(sibling.id, { order: i }));
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
  const nextOrder = await NodeRepository.getNextOrder(params.parentId, params.workspaceId);
  
  // Create the node using NodeBuilder
  const node = await NodeRepository.add(
    params.workspaceId,
    params.title,
    {
      parent: params.parentId,
      type: params.type,
      order: nextOrder,
    }
  );

  // Create content record for file-type nodes
  if (params.type === "file" || params.type === "diary" || params.type === "canvas") {
    const contentType = params.type === "canvas" ? "excalidraw" : "lexical";
    await ContentRepository.add(node.id, params.content || "", contentType);
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
  newTitle: string
): Promise<void> {
  await NodeRepository.updateTitle(nodeId, newTitle);
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
  content: string
): Promise<void> {
  await ContentRepository.updateByNodeId(nodeId, content);
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
  collapsed: boolean
): Promise<void> {
  await NodeRepository.setCollapsed(nodeId, collapsed);
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
  await NodeRepository.deleteWithChildren(nodeId);
}

/**
 * Get a single node by ID
 *
 * @param nodeId - Node ID
 * @returns The node or undefined if not found
 */
export async function getNode(
  nodeId: string
): Promise<NodeInterface | undefined> {
  return NodeRepository.getById(nodeId);
}

/**
 * Get node content by node ID
 *
 * @param nodeId - Node ID
 * @returns The content string or undefined if not found
 */
export async function getNodeContent(
  nodeId: string
): Promise<string | undefined> {
  const content = await ContentRepository.getByNodeId(nodeId);
  return content?.content;
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
  newIndex: number
): Promise<void> {
  const node = await NodeRepository.getById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  // Move to same parent but different position
  await moveNode(nodeId, node.parent, newIndex);
}
