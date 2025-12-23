/**
 * useWikiFiles Hook
 *
 * Hook to get all wiki files for a workspace
 * Returns WikiFileEntry array for @ mentions autocomplete
 *
 * Requirements: 2.1
 */

import { useLiveQuery } from "dexie-react-hooks";
import { getWikiFiles, type WikiFileEntry } from "@/fn/wiki";

/**
 * Hook to get all wiki files for a workspace
 * Returns WikiFileEntry array for @ mentions autocomplete
 *
 * Requirements: 2.1
 *
 * @param workspaceId - The workspace ID (null returns empty array)
 * @returns Array of WikiFileEntry objects
 */
export function useWikiFiles(workspaceId: string | null): WikiFileEntry[] {
	return useLiveQuery(
		async () => {
			if (!workspaceId) return [];
			return getWikiFiles(workspaceId);
		},
		[workspaceId],
		[],
	);
}
