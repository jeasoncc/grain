/**
 * Wiki Functions - Pure Functions
 *
 * Provides wiki-related pure functions for data transformation.
 * IO operations are in @/flows/wiki.
 */

export { WikiFileEntryBuilder } from "./wiki.builder";
export {
	buildNodePath,
	buildWikiFileEntry,
	generateWikiTemplate,
	WIKI_ROOT_FOLDER,
	WIKI_TAG,
} from "./wiki.resolve.fn";
export {
	type WikiCreationParams as WikiCreationParamsType,
	type WikiCreationResult as WikiCreationResultType,
	type WikiFileEntry as WikiFileEntryType,
	type WikiFileEntry,
	wikiCreationParamsSchema,
	wikiCreationResultSchema,
	wikiFileEntrySchema,
} from "./wiki.schema";

// NOTE: IO functions (getWikiFiles, getWikiFilesAsync) are in @/flows/wiki
// Import them from there directly to avoid circular dependencies.

// NOTE: Wiki file creation has been moved to actions/templated/create-wiki.action.ts
// Use createWiki or createWikiAsync from that module instead.

// NOTE: Wiki migration has been moved to actions/wiki/migrate-wiki.action.ts
// Use runMigrationIfNeeded from that module instead.
