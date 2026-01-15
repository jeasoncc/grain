/**
 * @file types/wiki/index.ts
 * @description Wiki 类型定义导出
 */

export { WikiFileEntryBuilder } from "./wiki.builder"
export {
	type WikiCreationParams,
	type WikiCreationResult,
	type WikiFileEntry,
	wikiCreationParamsSchema,
	wikiCreationResultSchema,
	wikiFileEntrySchema,
} from "./wiki.schema"
