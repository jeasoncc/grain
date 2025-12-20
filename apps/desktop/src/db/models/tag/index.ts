/**
 * Tag Model - Unified Export (Simplified)
 *
 * Tags are stored in nodes.tags array (source of truth).
 * The tags table is an aggregation cache for statistics and graph visualization.
 *
 * @requirements 2.1
 */

// Interfaces
export type { TagInterface, TagCreateInput } from "./tag.interface";

// Repository
export { TagRepository } from "./tag.repository";

// Hooks
export {
	useTagsByWorkspace,
	useNodesByTag,
	useTagGraph,
	useTagSearch,
} from "./tag.hooks";

// Utils (pure functions)
export {
	// Constants
	MAX_TAG_NAME_LENGTH,
	MIN_TAG_NAME_LENGTH,
	INVALID_TAG_CHARS,
	TAG_PATTERN,
	// Normalization
	normalizeTagName,
	validateTagName,
	// Filtering
	filterTagsByPrefix,
	filterTagsByMinCount,
	sortTagsByCount,
	sortTagsAlphabetically,
	// Extraction
	extractTagsFromContent,
	getUniqueTagNames,
	// Statistics
	getTotalTagUsage,
	getTopTags,
} from "./tag.utils";
