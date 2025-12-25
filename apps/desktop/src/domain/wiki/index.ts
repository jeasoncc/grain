/**
 * Wiki Domain
 *
 * Provides wiki file management using the tag-based file system.
 *
 * @deprecated Use @/actions/templated for wiki creation and @/fn/wiki for other functions
 */

// Wiki folder creation (from actions/node)
export { ensureRootFolder as ensureWikiFolder } from "@/actions/node";

// Wiki creation (from new templated actions)
export {
	createWikiAsync as createWikiFile,
	type TemplatedFileResult as WikiCreationResult,
	type WikiTemplateParams as WikiCreationParams,
} from "@/actions/templated";
// Wiki Service (updated to use new architecture)
export {
	generateWikiTemplate,
	getWikiFiles,
	WIKI_ROOT_FOLDER,
	WIKI_TAG,
	type WikiFileEntry,
} from "@/fn/wiki";

// Wiki hooks (from existing service)
export { useWikiFiles } from "./wiki.service";

// Wiki Migration Service
export {
	checkMigrationNeeded,
	type MigrationResult,
	migrateWikiEntriesToFiles,
	runMigrationIfNeeded,
} from "./wiki-migration.service";
