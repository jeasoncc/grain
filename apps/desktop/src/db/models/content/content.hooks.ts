/**
 * Content React Hooks
 *
 * Provides React hooks for accessing content data with live updates.
 * Uses dexie-react-hooks for reactive data subscriptions.
 *
 * @requirements 3.3, 5.2
 */

import { useLiveQuery } from "dexie-react-hooks";
import { database } from "../../database";
import type { ContentInterface } from "./content.interface";

/**
 * Hook to get content by node ID with live updates
 *
 * Supports lazy loading pattern - content is only loaded when needed.
 * Returns undefined while loading or if content doesn't exist.
 *
 * @param nodeId - The parent node ID (can be null/undefined for lazy loading)
 * @returns The content record or undefined
 *
 * @example
 * ```tsx
 * function Editor({ nodeId }: { nodeId: string }) {
 *   const content = useContentByNodeId(nodeId);
 *
 *   if (content === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return <EditorComponent initialContent={content.content} />;
 * }
 * ```
 */
export function useContentByNodeId(
  nodeId: string | null | undefined
): ContentInterface | undefined {
  return useLiveQuery(
    async () => {
      if (!nodeId) return undefined;
      return database.contents.where("nodeId").equals(nodeId).first();
    },
    [nodeId],
    undefined
  );
}

/**
 * Hook to get content by its own ID with live updates
 *
 * @param id - The content record ID (can be null/undefined)
 * @returns The content record or undefined
 */
export function useContentById(
  id: string | null | undefined
): ContentInterface | undefined {
  return useLiveQuery(
    async () => {
      if (!id) return undefined;
      return database.contents.get(id);
    },
    [id],
    undefined
  );
}

/**
 * Hook to get content for multiple nodes with live updates
 *
 * Useful for batch operations or displaying multiple documents.
 *
 * @param nodeIds - Array of node IDs
 * @returns Array of content records
 */
export function useContentsByNodeIds(
  nodeIds: string[]
): ContentInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!nodeIds || nodeIds.length === 0) return [];
      return database.contents.where("nodeId").anyOf(nodeIds).toArray();
    },
    [nodeIds],
    undefined
  );
}

/**
 * Hook to check if content exists for a node
 *
 * Useful for conditional rendering or lazy loading decisions.
 *
 * @param nodeId - The parent node ID
 * @returns True if content exists, false otherwise, undefined while loading
 */
export function useContentExists(
  nodeId: string | null | undefined
): boolean | undefined {
  return useLiveQuery(
    async () => {
      if (!nodeId) return false;
      const count = await database.contents
        .where("nodeId")
        .equals(nodeId)
        .count();
      return count > 0;
    },
    [nodeId],
    undefined
  );
}
