/**
 * Wiki Functions
 *
 * Provides wiki file management using the tag-based file system.
 */

export { WikiFileEntryBuilder } from "./wiki.builder";
export {
	checkMigrationNeeded,
	type MigrationResult,
	migrateWikiEntriesToFiles,
	runMigrationIfNeeded,
} from "./wiki.migrate.fn";
export {
	generateWikiTemplate,
	getWikiFiles,
	getWikiFilesAsync,
	WIKI_ROOT_FOLDER,
	WIKI_TAG,
} from "./wiki.resolve.fn";
export {
	type WikiCreationParams as WikiCreationParamsType,
	type WikiCreationResult as WikiCreationResultType,
	type WikiFileEntry as WikiFileEntryType,
	wikiCreationParamsSchema,
	wikiCreationResultSchema,
	wikiFileEntrySchema,
} from "./wiki.schema";

// NOTE: Wiki file creation has been moved to actions/templated/create-wiki.action.ts
// Use createWiki or createWikiAsync from that module instead.
