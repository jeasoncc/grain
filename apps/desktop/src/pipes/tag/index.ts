/**
 * @file fn/tag/index.ts
 * @description Tag 纯函数模块统一导出
 *
 * 导出所有标签相关的纯函数。
 * 这些函数无副作用，可组合，可测试。
 *
 * @requirements 1.4, 5.1, 5.2
 */

// 标签提取和处理函数
export {
	// Extraction Functions
	extractTagsFromContent,
	// Filtering Functions
	filterTagsByMinCount,
	filterTagsByPrefix,
	filterTagsByWorkspace,
	findTag,
	// Statistics Functions
	getTopTags,
	getTotalTagUsage,
	getUniqueTagNames,
	// Constants
	INVALID_TAG_CHARS,
	MAX_TAG_NAME_LENGTH,
	MIN_TAG_NAME_LENGTH,
	// Normalization Functions
	normalizeTagName,
	// Sorting Functions
	sortTagsAlphabetically,
	sortTagsByCount,
	TAG_PATTERN,
	validateTagName,
} from "./tag.extract.fn"
