/**
 * Node Repository
 *
 * Provides CRUD operations and tree operations for the nodes table.
 * All database operations go through this repository for consistency.
 *
 * @requirements 5.2
 */

import dayjs from "dayjs";
import { database } from "../../database";
import type { NodeInterface, NodeType, NodeUpdateInput } from "./node.interface";
import { NodeBuilder } from "./node.builder";

/**
 * Node Repository
 *
 * Provides methods for:
 * - CRUD: add, update, delete, get
 * - Tree operations: getByWorkspace, getByParent, move, reorder
 */
export const NodeRepository = {
  /**
   * Add a new node
   * @param workspace - The workspace ID
   * @param title - The node title
   * @param options - Optional node properties
   * @returns The created node
   */
  async add(
    workspace: string,
    title: string,
    options: {
      parent?: string | null;
      type?: NodeType;
      order?: number;
      collapsed?: boolean;
    } = {}
  ): Promise<NodeInterface> {
    const builder = new NodeBuilder()
      .workspace(workspace)
      .title(title);

    if (options.parent !== undefined) {
      builder.parent(options.parent);
    }
    if (options.type) {
      builder.type(options.type);
    }
    if (options.order !== undefined) {
      builder.order(options.order);
    }
    if (options.collapsed !== undefined) {
      builder.collapsed(options.collapsed);
    }

    const node = builder.build();
    await database.nodes.add(node);
    return node;
  },

  /**
   * Update an existing node
   * @param id - The node ID
   * @param updates - Partial node updates
   * @returns The number of records updated (0 or 1)
   */
  async update(id: string, updates: NodeUpdateInput): Promise<number> {
    return database.nodes.update(id, {
      ...updates,
      lastEdit: dayjs().toISOString(),
    });
  },

  /**
   * Delete a node by ID
   * Note: This does not delete child nodes or associated content
   * Use deleteWithChildren for cascading delete
   * @param id - The node ID
   */
  async delete(id: string): Promise<void> {
    await database.nodes.delete(id);
  },

  /**
   * Delete a node and all its descendants
   * Also deletes associated content records
   * @param id - The node ID
   */
  async deleteWithChildren(id: string): Promise<void> {
    // Get all descendant IDs
    const descendants = await this.getDescendants(id);
    const allIds = [id, ...descendants.map((n) => n.id)];

    // Delete all nodes in a transaction
    await database.transaction("rw", [database.nodes, database.contents], async () => {
      // Delete associated content
      await database.contents.where("nodeId").anyOf(allIds).delete();
      // Delete nodes
      await database.nodes.bulkDelete(allIds);
    });
  },

  /**
   * Get a node by ID
   * @param id - The node ID
   * @returns The node or undefined if not found
   */
  async getById(id: string): Promise<NodeInterface | undefined> {
    return database.nodes.get(id);
  },

  /**
   * Get all nodes in a workspace
   * @param workspaceId - The workspace ID
   * @returns Array of nodes
   */
  async getByWorkspace(workspaceId: string): Promise<NodeInterface[]> {
    return database.nodes.where("workspace").equals(workspaceId).toArray();
  },

  /**
   * Get child nodes of a parent
   * @param parentId - The parent node ID (null for root nodes)
   * @param workspaceId - Optional workspace ID to filter
   * @returns Array of child nodes sorted by order
   */
  async getByParent(
    parentId: string | null,
    workspaceId?: string
  ): Promise<NodeInterface[]> {
    let query = database.nodes.where("parent").equals(parentId ?? "");

    // If parentId is null, we need a different approach
    if (parentId === null) {
      const allNodes = workspaceId
        ? await database.nodes.where("workspace").equals(workspaceId).toArray()
        : await database.nodes.toArray();
      return allNodes
        .filter((n) => n.parent === null)
        .sort((a, b) => a.order - b.order);
    }

    const nodes = await query.toArray();
    const filtered = workspaceId
      ? nodes.filter((n) => n.workspace === workspaceId)
      : nodes;

    return filtered.sort((a, b) => a.order - b.order);
  },

  /**
   * Get root nodes of a workspace
   * @param workspaceId - The workspace ID
   * @returns Array of root nodes sorted by order
   */
  async getRootNodes(workspaceId: string): Promise<NodeInterface[]> {
    const nodes = await database.nodes
      .where("workspace")
      .equals(workspaceId)
      .toArray();

    return nodes
      .filter((n) => n.parent === null)
      .sort((a, b) => a.order - b.order);
  },

  /**
   * Get all descendants of a node (recursive)
   * @param nodeId - The parent node ID
   * @returns Array of all descendant nodes
   */
  async getDescendants(nodeId: string): Promise<NodeInterface[]> {
    const result: NodeInterface[] = [];
    const queue = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await database.nodes
        .where("parent")
        .equals(currentId)
        .toArray();

      for (const child of children) {
        result.push(child);
        queue.push(child.id);
      }
    }

    return result;
  },

  /**
   * Move a node to a new parent
   * @param nodeId - The node ID to move
   * @param newParentId - The new parent ID (null for root)
   * @param newOrder - Optional new order position
   */
  async move(
    nodeId: string,
    newParentId: string | null,
    newOrder?: number
  ): Promise<void> {
    const updates: NodeUpdateInput = { parent: newParentId };
    if (newOrder !== undefined) {
      updates.order = newOrder;
    }
    await this.update(nodeId, updates);
  },

  /**
   * Reorder nodes within the same parent
   * @param nodeIds - Array of node IDs in the new order
   */
  async reorder(nodeIds: string[]): Promise<void> {
    await database.transaction("rw", database.nodes, async () => {
      const now = dayjs().toISOString();
      for (let i = 0; i < nodeIds.length; i++) {
        await database.nodes.update(nodeIds[i], {
          order: i,
          lastEdit: now,
        });
      }
    });
  },

  /**
   * Get the next available order number for a parent
   * @param parentId - The parent node ID (null for root)
   * @param workspaceId - The workspace ID
   * @returns The next order number
   */
  async getNextOrder(
    parentId: string | null,
    workspaceId: string
  ): Promise<number> {
    const siblings = await this.getByParent(parentId, workspaceId);
    if (siblings.length === 0) return 0;
    return Math.max(...siblings.map((n) => n.order)) + 1;
  },

  /**
   * Check if a node exists
   * @param id - The node ID
   * @returns True if the node exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await database.nodes.where("id").equals(id).count();
    return count > 0;
  },

  /**
   * Get nodes by type within a workspace
   * @param workspaceId - The workspace ID
   * @param type - The node type
   * @returns Array of nodes of the specified type
   */
  async getByType(
    workspaceId: string,
    type: NodeType
  ): Promise<NodeInterface[]> {
    return database.nodes
      .where("workspace")
      .equals(workspaceId)
      .and((n) => n.type === type)
      .toArray();
  },

  /**
   * Count nodes in a workspace
   * @param workspaceId - The workspace ID
   * @returns The number of nodes
   */
  async countByWorkspace(workspaceId: string): Promise<number> {
    return database.nodes.where("workspace").equals(workspaceId).count();
  },

  /**
   * Update node title
   * @param id - The node ID
   * @param title - The new title
   */
  async updateTitle(id: string, title: string): Promise<void> {
    await this.update(id, { title });
  },

  /**
   * Toggle collapsed state
   * @param id - The node ID
   * @param collapsed - The new collapsed state
   */
  async setCollapsed(id: string, collapsed: boolean): Promise<void> {
    await this.update(id, { collapsed });
  },
};
