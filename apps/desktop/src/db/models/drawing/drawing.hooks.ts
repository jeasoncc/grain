/**
 * Drawing React Hooks
 *
 * Provides React hooks for accessing drawing data with live updates.
 * Uses dexie-react-hooks for reactive data subscriptions.
 *
 * @requirements 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { database } from "../../database";
import type { DrawingInterface } from "./drawing.interface";

/**
 * Hook to get all drawings for a project with live updates
 *
 * Returns drawings sorted by name.
 *
 * @param projectId - The project/workspace ID (can be null/undefined)
 * @returns Array of drawings or undefined while loading
 *
 * @example
 * ```tsx
 * function DrawingList({ projectId }: { projectId: string }) {
 *   const drawings = useDrawingsByProject(projectId);
 *
 *   if (drawings === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return (
 *     <ul>
 *       {drawings.map(drawing => (
 *         <li key={drawing.id}>{drawing.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useDrawingsByProject(
  projectId: string | null | undefined
): DrawingInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId) return [];
      const drawings = await database.drawings
        .where("project")
        .equals(projectId)
        .toArray();
      return drawings.sort((a, b) => a.name.localeCompare(b.name));
    },
    [projectId],
    undefined
  );
}

/**
 * Hook to get a single drawing by ID with live updates
 *
 * @param drawingId - The drawing ID (can be null/undefined)
 * @returns The drawing or undefined
 *
 * @example
 * ```tsx
 * function DrawingDetail({ drawingId }: { drawingId: string }) {
 *   const drawing = useDrawing(drawingId);
 *
 *   if (!drawing) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <h1>{drawing.name}</h1>;
 * }
 * ```
 */
export function useDrawing(
  drawingId: string | null | undefined
): DrawingInterface | undefined {
  return useLiveQuery(
    async () => {
      if (!drawingId) return undefined;
      return database.drawings.get(drawingId);
    },
    [drawingId],
    undefined
  );
}

/**
 * Hook to search drawings by name with live updates
 *
 * @param projectId - The project/workspace ID
 * @param query - Search query string
 * @returns Array of matching drawings
 */
export function useDrawingSearch(
  projectId: string | null | undefined,
  query: string | null | undefined
): DrawingInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId) return [];

      const drawings = await database.drawings
        .where("project")
        .equals(projectId)
        .toArray();

      if (!query || query.trim() === "") {
        return drawings.sort((a, b) => a.name.localeCompare(b.name));
      }

      const lowerQuery = query.toLowerCase();
      return drawings
        .filter((drawing) => drawing.name.toLowerCase().includes(lowerQuery))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [projectId, query],
    undefined
  );
}

/**
 * Hook to count drawings for a project
 *
 * @param projectId - The project/workspace ID
 * @returns The count of drawings or undefined while loading
 */
export function useDrawingCount(
  projectId: string | null | undefined
): number | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId) return 0;
      return database.drawings.where("project").equals(projectId).count();
    },
    [projectId],
    undefined
  );
}

/**
 * Hook to check if a drawing exists
 *
 * @param drawingId - The drawing ID
 * @returns True if exists, false otherwise, undefined while loading
 */
export function useDrawingExists(
  drawingId: string | null | undefined
): boolean | undefined {
  return useLiveQuery(
    async () => {
      if (!drawingId) return false;
      const count = await database.drawings
        .where("id")
        .equals(drawingId)
        .count();
      return count > 0;
    },
    [drawingId],
    undefined
  );
}

/**
 * Hook to get recently updated drawings with live updates
 *
 * @param projectId - The project/workspace ID
 * @param limit - Maximum number of drawings to return (default: 10)
 * @returns Array of recently updated drawings
 */
export function useRecentDrawings(
  projectId: string | null | undefined,
  limit: number = 10
): DrawingInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId) return [];

      const drawings = await database.drawings
        .where("project")
        .equals(projectId)
        .toArray();

      return drawings
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, limit);
    },
    [projectId, limit],
    undefined
  );
}

/**
 * Hook to get all drawings (across all projects) with live updates
 *
 * @returns Array of all drawings or undefined while loading
 */
export function useAllDrawings(): DrawingInterface[] | undefined {
  return useLiveQuery(
    async () => {
      return database.drawings.toArray();
    },
    [],
    undefined
  );
}
