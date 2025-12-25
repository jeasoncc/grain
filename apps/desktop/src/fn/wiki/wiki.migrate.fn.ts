/**
 * Wiki Migration Functions
 *
 * Provides one-time migration from the wikiEntries table to file nodes.
 * Wiki entries are migrated to regular files in the wiki/ folder with a "wiki" tag.
 *
 * Note: This service accesses the legacy wikiEntries table directly since the
 * WikiRepository has been removed. The table will be deleted in database v11
 * after migration is complete.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.5
 */

import * as E from "fp-ts/Either";
import { addContent, addNode, getNextOrder, updateNode } from "@/db";
import { ensureRootFolderAsync } from "@/actions/node";
import { database } from "@/db/database";
import logger from "@/log/index";
import { WIKI_ROOT_FOLDER, WIKI_TAG } from "./wiki.resolve.fn";

/**
 * Legacy WikiInterface for migration purposes
 * This matches the old wikiEntries table structure
 */
interface LegacyWikiEntry {
	id: string;
	project: string;
	name: string;
	alias: string[];
	tags: string[];
	content: string;
	createDate: string;
	updatedAt: string;
}

// ==============================
// Types
// ==============================

/**
 * Migration result interface
 */
export interface MigrationResult {
	/** Number of successfully migrated entries */
	migrated: number;
	/** Array of error messages for failed migrations */
	errors: string[];
}

// ==============================
// Migration Functions
// ==============================

/**
 * Check if migration is needed for a workspace
 * Returns true if there are existing wiki entries in the wikiEntries table
 *
 * Requirements: 4.1
 *
 * @param workspaceId - The workspace ID to check
 * @returns True if migration is needed
 */
export async function checkMigrationNeeded(
	workspaceId: string,
): Promise<boolean> {
	try {
		// Access the legacy wikiEntries table directly
		// The table may not exist if already migrated to v11
		const table = database.table("wikiEntries");
		if (!table) {
			return false;
		}
		const count = await table.where("project").equals(workspaceId).count();
		return count > 0;
	} catch (error) {
		// Table may not exist anymore after migration
		logger.debug(
			`Wiki entries table not found or empty for workspace ${workspaceId}:`,
			error,
		);
		return false;
	}
}

/**
 * Migrate wiki entries from wikiEntries table to file nodes
 * Creates files in the wiki/ folder with "wiki" tag
 *
 * Requirements: 4.1, 4.2, 4.3, 4.5
 *
 * @param workspaceId - The workspace ID to migrate
 * @returns Migration result with count and errors
 */
export async function migrateWikiEntriesToFiles(
	workspaceId: string,
): Promise<MigrationResult> {
	const result: MigrationResult = {
		migrated: 0,
		errors: [],
	};

	try {
		// Get all wiki entries for this workspace from the legacy table
		const table = database.table("wikiEntries");
		if (!table) {
			logger.info(`Wiki entries table not found for workspace ${workspaceId}`);
			return result;
		}
		const wikiEntries = (await table
			.where("project")
			.equals(workspaceId)
			.toArray()) as LegacyWikiEntry[];

		if (wikiEntries.length === 0) {
			logger.info(`No wiki entries to migrate for workspace ${workspaceId}`);
			return result;
		}

		logger.info(
			`Starting migration of ${wikiEntries.length} wiki entries for workspace ${workspaceId}`,
		);

		// Ensure wiki folder exists
		const wikiFolder = await ensureRootFolderAsync(workspaceId, WIKI_ROOT_FOLDER);

		// Migrate each entry
		for (const entry of wikiEntries) {
			try {
				await migrateWikiEntry(entry, wikiFolder.id, workspaceId);
				result.migrated++;
			} catch (error) {
				const errorMessage = `Failed to migrate wiki entry "${entry.name}" (${entry.id}): ${error instanceof Error ? error.message : String(error)}`;
				result.errors.push(errorMessage);
				logger.error(errorMessage);
				// Continue with remaining entries (Requirements: 4.5)
			}
		}

		logger.success(
			`Migration complete for workspace ${workspaceId}: ${result.migrated} migrated, ${result.errors.length} errors`,
		);

		return result;
	} catch (error) {
		const errorMessage = `Migration failed for workspace ${workspaceId}: ${error instanceof Error ? error.message : String(error)}`;
		result.errors.push(errorMessage);
		logger.error(errorMessage);
		return result;
	}
}

/**
 * Migrate a single wiki entry to a file node
 *
 * @param entry - The wiki entry to migrate
 * @param wikiFolderId - The wiki folder node ID
 * @param workspaceId - The workspace ID
 */
async function migrateWikiEntry(
	entry: LegacyWikiEntry,
	wikiFolderId: string,
	workspaceId: string,
): Promise<void> {
	// Get next order for the new file
	const nextOrderResult = await getNextOrder(wikiFolderId, workspaceId)();
	const nextOrder = E.isRight(nextOrderResult) ? nextOrderResult.right : 0;

	// Create the file node
	// Requirements: 4.2 - Preserve title (name)
	const nodeResult = await addNode(workspaceId, entry.name, {
		parent: wikiFolderId,
		type: "file",
		order: nextOrder,
	})();

	if (E.isLeft(nodeResult)) {
		throw new Error(`Failed to create node: ${nodeResult.left.message}`);
	}

	const node = nodeResult.right;

	// Apply the "wiki" tag and preserve original tags
	// Requirements: 4.3 - Apply "wiki" tag
	const tags =
		entry.tags?.length > 0
			? [...new Set([WIKI_TAG, ...entry.tags])] // Combine wiki tag with existing tags, dedupe
			: [WIKI_TAG];

	await updateNode(node.id, { tags })();

	// Create content record
	// Requirements: 4.2 - Preserve content
	await addContent(node.id, entry.content || "", "lexical")();

	// Delete the original wiki entry after successful migration
	// Requirements: 4.4 - Remove migrated entries
	const table = database.table("wikiEntries");
	if (table) {
		await table.delete(entry.id);
	}

	logger.debug(`Migrated wiki entry "${entry.name}" to node ${node.id}`);
}

/**
 * Run migration for a workspace if needed
 * This is the main entry point for migration during workspace initialization
 *
 * Requirements: 4.1
 *
 * @param workspaceId - The workspace ID
 * @returns Migration result or null if no migration was needed
 */
export async function runMigrationIfNeeded(
	workspaceId: string,
): Promise<MigrationResult | null> {
	const needsMigration = await checkMigrationNeeded(workspaceId);

	if (!needsMigration) {
		return null;
	}

	logger.info(`Wiki migration needed for workspace ${workspaceId}`);
	return migrateWikiEntriesToFiles(workspaceId);
}
