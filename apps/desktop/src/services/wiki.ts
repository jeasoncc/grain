/**
 * Wiki Service
 * Provides wiki entry management using WikiBuilder and WikiRepository
 *
 * Requirements: 6.2
 */
import { useLiveQuery } from "dexie-react-hooks";
import { database } from "@/db/database";
import { WikiRepository, WikiBuilder, type WikiInterface } from "@/db/models";

/**
 * Hook to get all wiki entries for a project
 */
export function useWikiEntriesByProject(projectId: string | null): WikiInterface[] {
	const data = useLiveQuery(
		() =>
			projectId
				? database.wikiEntries.where("project").equals(projectId).toArray()
				: Promise.resolve([] as WikiInterface[]),
		[projectId] as const,
	);

	return (data ?? []) as WikiInterface[];
}

/**
 * Create a new wiki entry using WikiBuilder
 */
export async function createWikiEntry(params: {
	projectId: string;
	name: string;
	content?: string;
	tags?: string[];
	alias?: string[];
}): Promise<WikiInterface> {
	return WikiRepository.add(params.projectId, params.name, {
		content: params.content,
		tags: params.tags,
		alias: params.alias,
	});
}

/**
 * Update an existing wiki entry
 */
export async function updateWikiEntry(
	id: string,
	updates: Partial<WikiInterface>,
): Promise<void> {
	await WikiRepository.update(id, updates);
}

/**
 * Delete a wiki entry
 */
export async function deleteWikiEntry(id: string): Promise<void> {
	await WikiRepository.delete(id);
}

/**
 * Search wiki entries
 */
export async function searchWikiEntries(
	projectId: string,
	query: string
): Promise<WikiInterface[]> {
	return WikiRepository.search(projectId, query);
}

/**
 * Get a single wiki entry by ID
 */
export async function getWikiEntry(id: string): Promise<WikiInterface | undefined> {
	return WikiRepository.getById(id);
}

/**
 * Migrate roles to wiki entries for a project
 * @deprecated - No longer needed as roles table has been removed
 */
export async function migrateRolesToWiki(_projectId: string): Promise<WikiInterface[]> {
	// Migration no longer needed - roles table has been removed
	return [];
}
