/**
 * Wiki Domain
 * 
 * Provides wiki file management using the tag-based file system.
 */

// Wiki Service
export {
	WIKI_ROOT_FOLDER,
	WIKI_TAG,
	ensureWikiFolder,
	generateWikiTemplate,
	createWikiFile,
	getWikiFiles,
	useWikiFiles,
	type WikiFileEntry,
	type WikiCreationResult,
} from "./wiki.service";

// Wiki Migration Service
export {
	checkMigrationNeeded,
	migrateWikiEntriesToFiles,
	runMigrationIfNeeded,
	type MigrationResult,
} from "./wiki-migration.service";
