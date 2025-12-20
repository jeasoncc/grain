/**
 * Search Domain
 * 
 * Provides full-text search functionality using Lunr.js.
 */

// Utils (pure functions)
export {
	extractTextFromContent,
	extractTextFromLexical,
	generateExcerpt,
	extractHighlights,
	calculateSimpleScore,
} from "./search.utils";

// Service
export {
	SearchEngine,
	searchEngine,
	type SearchResult,
	type SearchResultType,
	type SearchOptions,
} from "./search.service";
