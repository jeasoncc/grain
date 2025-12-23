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
	createWikiFile,
	createWikiFileAsync,
	ensureWikiFolderAsync,
	generateWikiTemplate,
	getWikiFiles,
	getWikiFilesAsync,
	WIKI_ROOT_FOLDER,
	WIKI_TAG,
	type WikiCreationParams,
	type WikiCreationResult,
	type WikiFileEntry,
} from "./wiki.resolve.fn";
export {
	type WikiCreationParams as WikiCreationParamsType,
	type WikiCreationResult as WikiCreationResultType,
	type WikiFileEntry as WikiFileEntryType,
	wikiCreationParamsSchema,
	wikiCreationResultSchema,
	wikiFileEntrySchema,
} from "./wiki.schema";
