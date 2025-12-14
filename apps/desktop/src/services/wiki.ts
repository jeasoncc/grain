import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/curd";
import type { WikiEntryInterface } from "@/db/schema";

/**
 * Hook to get all wiki entries for a project
 */
export function useWikiEntriesByProject(projectId: string | null): WikiEntryInterface[] {
	const data = useLiveQuery(
		() =>
			projectId
				? db.getWikiEntriesByProject(projectId)
				: Promise.resolve([] as WikiEntryInterface[]),
		[projectId] as const,
	);

	return (data ?? []) as WikiEntryInterface[];
}

/**
 * Create a new wiki entry
 */
export async function createWikiEntry(params: {
	projectId: string;
	name: string;
	content?: string;
	tags?: string[];
	alias?: string[];
}): Promise<WikiEntryInterface> {
	const entry = await db.addWikiEntry({
		project: params.projectId,
		name: params.name,
		content: params.content || "",
		tags: params.tags || [],
		alias: params.alias || [],
	});
	return entry as WikiEntryInterface;
}

/**
 * Update an existing wiki entry
 */
export async function updateWikiEntry(
	id: string,
	updates: Partial<WikiEntryInterface>,
): Promise<void> {
	await db.updateWikiEntry(id, updates);
}

/**
 * Delete a wiki entry
 */
export async function deleteWikiEntry(id: string): Promise<void> {
	await db.deleteWikiEntry(id);
}

/**
 * Search wiki entries
 */
export async function searchWikiEntries(
	projectId: string,
	query: string
): Promise<WikiEntryInterface[]> {
	return db.searchWikiEntries(projectId, query);
}

/**
 * Get a single wiki entry by ID
 */
export async function getWikiEntry(id: string): Promise<WikiEntryInterface | undefined> {
	return db.getWikiEntry(id);
}

/**
 * Migrate roles to wiki entries for a project
 * @deprecated - No longer needed as roles table has been removed
 */
export async function migrateRolesToWiki(_projectId: string): Promise<WikiEntryInterface[]> {
	// Migration no longer needed - roles table has been removed
	return [];
}