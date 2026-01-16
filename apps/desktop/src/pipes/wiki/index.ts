/**
 * Wiki Functions - Pure Functions
 *
 * Provides wiki-related pure functions for data transformation.
 * IO operations are in @/flows/wiki.
 */

export {
	buildNodePath,
	buildWikiFileEntry,
	generateWikiTemplate,
	WIKI_ROOT_FOLDER,
	WIKI_TAG,
} from "./wiki.resolve.fn"

// Re-export types from @/types/wiki for convenience
export {
	WikiFileEntryBuilder,
	type WikiCreationParams,
	type WikiCreationResult,
	type WikiFileEntry,
	wikiCreationParamsSchema,
	wikiCreationResultSchema,
	wikiFileEntrySchema,
} from "@/types/wiki"

// NOTE: IO functions (getWikiFiles, getWikiFilesAsync) are in @/flows/wiki
// Import them from there directly to avoid circular dependencies.

// NOTE: Wiki file creation has been moved to actions/templated/create-wiki.action.ts
// Use createWiki or createWikiAsync from that module instead.
