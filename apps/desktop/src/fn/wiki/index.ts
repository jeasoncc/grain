/**
 * Wiki Functions
 *
 * Provides wiki file management using the tag-based file system.
 */

export { WikiFileEntryBuilder } from "./wiki.builder";
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

// NOTE: Wiki migration has been moved to actions/wiki/migrate-wiki.action.ts
// Use runMigrationIfNeeded from that module instead.
