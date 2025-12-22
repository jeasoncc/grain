/**
 * Search Domain
 *
 * Provides full-text search functionality using Lunr.js.
 */

// Service
export {
	SearchEngine,
	type SearchOptions,
	type SearchResult,
	type SearchResultType,
	searchEngine,
} from "./search.service";
// Utils (pure functions)
export {
	calculateSimpleScore,
	extractHighlights,
	extractTextFromContent,
	extractTextFromLexical,
	generateExcerpt,
} from "./search.utils";
