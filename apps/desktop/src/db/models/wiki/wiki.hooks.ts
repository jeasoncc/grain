/**
 * Wiki React Hooks
 *
 * Provides React hooks for accessing wiki entry data with live updates.
 * Uses dexie-react-hooks for reactive data subscriptions.
 *
 * @requirements 3.3
 */

import { useLiveQuery } from "dexie-react-hooks";
import { database } from "../../database";
import type { WikiInterface } from "./wiki.interface";

/**
 * Hook to get all wiki entries for a project with live updates
 *
 * Returns wiki entries sorted by name.
 *
 * @param projectId - The project/workspace ID (can be null/undefined)
 * @returns Array of wiki entries or undefined while loading
 *
 * @example
 * ```tsx
 * function WikiList({ projectId }: { projectId: string }) {
 *   const entries = useWikiByProject(projectId);
 *
 *   if (entries === undefined) {
 *     return <Loading />;
 *   }
 *
 *   return (
 *     <ul>
 *       {entries.map(entry => (
 *         <li key={entry.id}>{entry.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useWikiByProject(
  projectId: string | null | undefined
): WikiInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId) return [];
      const entries = await database.wikiEntries
        .where("project")
        .equals(projectId)
        .toArray();
      return entries.sort((a, b) => a.name.localeCompare(b.name));
    },
    [projectId],
    undefined
  );
}

/**
 * Hook to get a single wiki entry by ID with live updates
 *
 * @param wikiId - The wiki entry ID (can be null/undefined)
 * @returns The wiki entry or undefined
 *
 * @example
 * ```tsx
 * function WikiDetail({ wikiId }: { wikiId: string }) {
 *   const entry = useWiki(wikiId);
 *
 *   if (!entry) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <h1>{entry.name}</h1>;
 * }
 * ```
 */
export function useWiki(
  wikiId: string | null | undefined
): WikiInterface | undefined {
  return useLiveQuery(
    async () => {
      if (!wikiId) return undefined;
      return database.wikiEntries.get(wikiId);
    },
    [wikiId],
    undefined
  );
}

/**
 * Hook to search wiki entries by name or alias with live updates
 *
 * @param projectId - The project/workspace ID
 * @param query - Search query string
 * @returns Array of matching wiki entries
 */
export function useWikiSearch(
  projectId: string | null | undefined,
  query: string | null | undefined
): WikiInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId) return [];

      const entries = await database.wikiEntries
        .where("project")
        .equals(projectId)
        .toArray();

      if (!query || query.trim() === "") {
        return entries.sort((a, b) => a.name.localeCompare(b.name));
      }

      const lowerQuery = query.toLowerCase();
      return entries
        .filter(
          (entry) =>
            entry.name.toLowerCase().includes(lowerQuery) ||
            entry.alias.some((a) => a.toLowerCase().includes(lowerQuery))
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [projectId, query],
    undefined
  );
}

/**
 * Hook to get wiki entries by tag with live updates
 *
 * @param projectId - The project/workspace ID
 * @param tag - Tag to filter by
 * @returns Array of wiki entries with the specified tag
 */
export function useWikiByTag(
  projectId: string | null | undefined,
  tag: string | null | undefined
): WikiInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId || !tag) return [];

      const entries = await database.wikiEntries
        .where("project")
        .equals(projectId)
        .toArray();

      return entries
        .filter((entry) => entry.tags.includes(tag))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [projectId, tag],
    undefined
  );
}

/**
 * Hook to get all unique tags for a project with live updates
 *
 * @param projectId - The project/workspace ID
 * @returns Array of unique tags
 */
export function useWikiTags(
  projectId: string | null | undefined
): string[] | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId) return [];

      const entries = await database.wikiEntries
        .where("project")
        .equals(projectId)
        .toArray();

      const tagSet = new Set<string>();
      for (const entry of entries) {
        for (const tag of entry.tags) {
          tagSet.add(tag);
        }
      }
      return Array.from(tagSet).sort();
    },
    [projectId],
    undefined
  );
}

/**
 * Hook to count wiki entries for a project
 *
 * @param projectId - The project/workspace ID
 * @returns The count of wiki entries or undefined while loading
 */
export function useWikiCount(
  projectId: string | null | undefined
): number | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId) return 0;
      return database.wikiEntries.where("project").equals(projectId).count();
    },
    [projectId],
    undefined
  );
}

/**
 * Hook to check if a wiki entry exists
 *
 * @param wikiId - The wiki entry ID
 * @returns True if exists, false otherwise, undefined while loading
 */
export function useWikiExists(
  wikiId: string | null | undefined
): boolean | undefined {
  return useLiveQuery(
    async () => {
      if (!wikiId) return false;
      const count = await database.wikiEntries
        .where("id")
        .equals(wikiId)
        .count();
      return count > 0;
    },
    [wikiId],
    undefined
  );
}

/**
 * Hook to find wiki entry by name or alias with live updates
 *
 * @param projectId - The project/workspace ID
 * @param nameOrAlias - Name or alias to find
 * @returns The wiki entry or undefined
 */
export function useWikiByNameOrAlias(
  projectId: string | null | undefined,
  nameOrAlias: string | null | undefined
): WikiInterface | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId || !nameOrAlias) return undefined;

      const lowerName = nameOrAlias.toLowerCase();
      const entries = await database.wikiEntries
        .where("project")
        .equals(projectId)
        .toArray();

      return entries.find(
        (entry) =>
          entry.name.toLowerCase() === lowerName ||
          entry.alias.some((a) => a.toLowerCase() === lowerName)
      );
    },
    [projectId, nameOrAlias],
    undefined
  );
}

/**
 * Hook to get recently updated wiki entries with live updates
 *
 * @param projectId - The project/workspace ID
 * @param limit - Maximum number of entries to return (default: 10)
 * @returns Array of recently updated wiki entries
 */
export function useRecentWiki(
  projectId: string | null | undefined,
  limit: number = 10
): WikiInterface[] | undefined {
  return useLiveQuery(
    async () => {
      if (!projectId) return [];

      const entries = await database.wikiEntries
        .where("project")
        .equals(projectId)
        .toArray();

      return entries
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
