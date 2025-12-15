/**
 * Workspace React Hooks
 *
 * Provides React hooks for accessing workspace data with live updates.
 * Uses dexie-react-hooks for reactive data subscriptions.
 *
 * @requirements 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { database } from "../../database";
import type { WorkspaceInterface } from "./workspace.interface";

/**
 * Hook to get all workspaces with live updates
 *
 * Returns workspaces sorted by lastOpen (most recent first).
 *
 * @returns Array of workspaces or undefined while loading
 *
 * @example
 * ```tsx
 * function WorkspaceList() {
 *   const workspaces = useAllWorkspaces();
 *
 *   if (workspaces === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return (
 *     <ul>
 *       {workspaces.map(ws => (
 *         <li key={ws.id}>{ws.title}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useAllWorkspaces(): WorkspaceInterface[] | undefined {
  return useLiveQuery(
    async () => {
      const workspaces = await database.workspaces.toArray();
      return workspaces.sort(
        (a, b) =>
          new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime()
      );
    },
    [],
    undefined
  );
}

/**
 * Hook to get a single workspace by ID with live updates
 *
 * @param workspaceId - The workspace ID (can be null/undefined)
 * @returns The workspace or undefined
 *
 * @example
 * ```tsx
 * function WorkspaceHeader({ workspaceId }: { workspaceId: string }) {
 *   const workspace = useWorkspace(workspaceId);
 *
 *   if (!workspace) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <h1>{workspace.title}</h1>;
 * }
 * ```
 */
export function useWorkspace(
  workspaceId: string | null | undefined
): WorkspaceInterface | undefined {
  return useLiveQuery(
    async () => {
      if (!workspaceId) return undefined;
      return database.workspaces.get(workspaceId);
    },
    [workspaceId],
    undefined
  );
}

/**
 * Hook to get workspaces by owner with live updates
 *
 * @param ownerId - The owner user ID (can be null/undefined)
 * @returns Array of workspaces owned by the user
 */
export function useWorkspacesByOwner(
  ownerId: string | null | undefined
): WorkspaceInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!ownerId) return [];
      return database.workspaces.where("owner").equals(ownerId).toArray();
    },
    [ownerId],
    undefined
  );
}

/**
 * Hook to get recently opened workspaces with live updates
 *
 * @param limit - Maximum number of workspaces to return (default: 5)
 * @returns Array of recently opened workspaces
 */
export function useRecentWorkspaces(
  limit: number = 5
): WorkspaceInterface[] | undefined {
  return useLiveQuery(
    async () => {
      const workspaces = await database.workspaces.toArray();
      return workspaces
        .sort(
          (a, b) =>
            new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime()
        )
        .slice(0, limit);
    },
    [limit],
    undefined
  );
}

/**
 * Hook to count all workspaces
 *
 * @returns The count of workspaces or undefined while loading
 */
export function useWorkspaceCount(): number | undefined {
  return useLiveQuery(
    async () => {
      return database.workspaces.count();
    },
    [],
    undefined
  );
}

/**
 * Hook to check if a workspace exists
 *
 * @param workspaceId - The workspace ID
 * @returns True if exists, false otherwise, undefined while loading
 */
export function useWorkspaceExists(
  workspaceId: string | null | undefined
): boolean | undefined {
  return useLiveQuery(
    async () => {
      if (!workspaceId) return false;
      const count = await database.workspaces
        .where("id")
        .equals(workspaceId)
        .count();
      return count > 0;
    },
    [workspaceId],
    undefined
  );
}

/**
 * Hook to search workspaces by title with live updates
 *
 * @param query - Search query string
 * @returns Array of matching workspaces
 */
export function useWorkspaceSearch(
  query: string | null | undefined
): WorkspaceInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!query || query.trim() === "") {
        const workspaces = await database.workspaces.toArray();
        return workspaces.sort(
          (a, b) =>
            new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime()
        );
      }

      const lowerQuery = query.toLowerCase();
      const workspaces = await database.workspaces.toArray();
      return workspaces
        .filter((w) => w.title.toLowerCase().includes(lowerQuery))
        .sort(
          (a, b) =>
            new Date(b.lastOpen).getTime() - new Date(a.lastOpen).getTime()
        );
    },
    [query],
    undefined
  );
}
