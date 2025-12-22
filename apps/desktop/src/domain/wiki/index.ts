/**
 * Wiki Domain
 *
 * Provides wiki file management using the tag-based file system.
 */

// Wiki Service
export {
	createWikiFile,
	ensureWikiFolder,
	generateWikiTemplate,
	getWikiFiles,
	useWikiFiles,
	WIKI_ROOT_FOLDER,
	WIKI_TAG,
	type WikiCreationResult,
	type WikiFileEntry,
} from "./wiki.service";

// Wiki Migration Service
export {
	checkMigrationNeeded,
	type MigrationResult,
	migrateWikiEntriesToFiles,
	runMigrationIfNeeded,
} from "./wiki-migration.service";
