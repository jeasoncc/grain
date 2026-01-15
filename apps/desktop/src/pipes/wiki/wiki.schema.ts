/**
 * @file pipes/wiki/wiki.schema.ts
 * @description Wiki 数据类型定义和校验 - 兼容层
 *
 * @deprecated 请直接从 @/types/wiki 导入
 */

export {
	type WikiCreationParams,
	type WikiCreationResult,
	type WikiFileEntry,
	wikiCreationParamsSchema,
	wikiCreationResultSchema,
	wikiFileEntrySchema,
} from "@/types/wiki"
