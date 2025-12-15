/**
 * Node React Hooks
 *
 * Provides React hooks for accessing node data with live updates.
 * Uses dexie-react-hooks for reactive data subscriptions.
 *
 * @requirements 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { database } from "../../database";
import type { NodeInterface, NodeType } from "./node.interface";

/**
 * Hook to get all nodes in a workspace with live updates
 *
 * @param workspaceId - The workspace ID (can be null/undefined)
 * @returns Array of nodes or undefined while loading
 *
 * @example
 * ```tsx
 * function FileTree({ workspaceId }: { workspaceId: string }) {
 *   const nodes = useNodesByWorkspace(workspaceId);
 *
 *   if (nodes === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return <TreeView nodes={nodes} />;
 * }
 * ```
 */
export function useNodesByWorkspace(
  workspaceId: string | null | undefined
): NodeInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!workspaceId) return [];
      return database.nodes.where("workspace").equals(workspaceId).toArray();
    },
    [workspaceId],
    undefined
  );
}

/**
 * Hook to get a single node by ID with live updates
 *
 * @param nodeId - The node ID (can be null/undefined)
 * @returns The node or undefined
 */
export function useNode(
  nodeId: string | null | undefined
): NodeInterface | undefined {
  return useLiveQuery(
    async () => {
      if (!nodeId) return undefined;
      return database.nodes.get(nodeId);
    },
    [nodeId],
    undefined
  );
}

/**
 * Hook to get child nodes of a parent with live updates
 *
 * Returns children sorted by order.
 *
 * @param parentId - The parent node ID (null for root nodes)
 * @param workspaceId - The workspace ID to filter by
 * @returns Array of child nodes sorted by order
 */
export function useChildNodes(
  parentId: string | null,
  workspaceId: string | null | undefined
): NodeInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!workspaceId) return [];

      const allNodes = await database.nodes
        .where("workspace")
        .equals(workspaceId)
        .toArray();

      return allNodes
        .filter((n) => n.parent === parentId)
        .sort((a, b) => a.order - b.order);
    },
    [parentId, workspaceId],
    undefined
  );
}

/**
 * Hook to get root nodes of a workspace with live updates
 *
 * Convenience wrapper around useChildNodes with null parent.
 *
 * @param workspaceId - The workspace ID
 * @returns Array of root nodes sorted by order
 */
export function useRootNodes(
  workspaceId: string | null | undefined
): NodeInterface[] | undefined {
  return useChildNodes(null, workspaceId);
}

/**
 * Hook to get nodes by type within a workspace
 *
 * @param workspaceId - The workspace ID
 * @param type - The node type to filter by
 * @returns Array of nodes of the specified type
 */
export function useNodesByType(
  workspaceId: string | null | undefined,
  type: NodeType
): NodeInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!workspaceId) return [];
      return database.nodes
        .where("workspace")
        .equals(workspaceId)
        .and((n) => n.type === type)
        .toArray();
    },
    [workspaceId, type],
    undefined
  );
}

/**
 * Hook to count nodes in a workspace
 *
 * @param workspaceId - The workspace ID
 * @returns The count of nodes or undefined while loading
 */
export function useNodeCount(
  workspaceId: string | null | undefined
): number | undefined {
  return useLiveQuery(
    async () => {
      if (!workspaceId) return 0;
      return database.nodes.where("workspace").equals(workspaceId).count();
    },
    [workspaceId],
    undefined
  );
}

/**
 * Hook to check if a node exists
 *
 * @param nodeId - The node ID
 * @returns True if exists, false otherwise, undefined while loading
 */
export function useNodeExists(
  nodeId: string | null | undefined
): boolean | undefined {
  return useLiveQuery(
    async () => {
      if (!nodeId) return false;
      const count = await database.nodes.where("id").equals(nodeId).count();
      return count > 0;
    },
    [nodeId],
    undefined
  );
}

/**
 * Hook to get multiple nodes by IDs with live updates
 *
 * @param nodeIds - Array of node IDs
 * @returns Array of nodes
 */
export function useNodesByIds(
  nodeIds: string[]
): NodeInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!nodeIds || nodeIds.length === 0) return [];
      return database.nodes.where("id").anyOf(nodeIds).toArray();
    },
    [nodeIds],
    undefined
  );
}
