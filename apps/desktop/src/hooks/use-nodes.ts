/**
 * Node Hooks
 * React hooks for working with workspace nodes (file tree structure)
 *
 * Requirements: 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/curd";
import type { NodeInterface } from "@/db/schema";

/**
 * Hook to get all nodes for a workspace with live updates
 * Uses Dexie's useLiveQuery for reactive updates when data changes
 *
 * @param workspaceId - Workspace ID to fetch nodes for (null returns empty array)
 * @returns Array of NodeInterface objects belonging to the workspace
 *
 * Requirements: 3.3
 */
export function useNodesByWorkspace(
  workspaceId: string | null
): NodeInterface[] {
  const data = useLiveQuery(
    () =>
      workspaceId
        ? db.getNodesByWorkspace(workspaceId)
        : Promise.resolve([] as NodeInterface[]),
    [workspaceId] as const
  );
  return (data ?? []) as NodeInterface[];
}

/**
 * Hook to get a single node by ID with live updates
 *
 * @param nodeId - Node ID to fetch (null returns undefined)
 * @returns NodeInterface or undefined if not found
 */
export function useNode(nodeId: string | null): NodeInterface | undefined {
  const data = useLiveQuery(
    () => (nodeId ? db.getNode(nodeId) : Promise.resolve(undefined)),
    [nodeId] as const
  );
  return data;
}

/**
 * Hook to get child nodes of a parent with live updates
 *
 * @param workspaceId - Workspace ID
 * @param parentId - Parent node ID (null for root nodes)
 * @returns Array of child NodeInterface objects sorted by order
 */
export function useChildNodes(
  workspaceId: string | null,
  parentId: string | null
): NodeInterface[] {
  const data = useLiveQuery(
    () =>
      workspaceId
        ? db.getNodesByWorkspaceAndParent(workspaceId, parentId)
        : Promise.resolve([] as NodeInterface[]),
    [workspaceId, parentId] as const
  );
  return (data ?? []) as NodeInterface[];
}
