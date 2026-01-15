/**
 * @file types/wiki/wiki.schema.ts
 * @description Wiki 数据类型定义和校验
 */

import { z } from "zod"

/**
 * Wiki 文件条目 Schema
 * 用于 @ 提及自动完成
 */
export const wikiFileEntrySchema = z.object({
	alias: z.array(z.string()).default([]),
	content: z.string(),
	id: z.string().uuid(),
	name: z.string().min(1).max(200),
	path: z.string(),
})

export type WikiFileEntry = z.infer<typeof wikiFileEntrySchema>

/**
 * Wiki 创建参数 Schema
 */
export const wikiCreationParamsSchema = z.object({
	content: z.string().optional(),
	name: z.string().min(1).max(200),
	useTemplate: z.boolean().optional(),
	workspaceId: z.string().uuid(),
})

export type WikiCreationParams = z.infer<typeof wikiCreationParamsSchema>

/**
 * Wiki 创建结果 Schema
 */
export const wikiCreationResultSchema = z.object({
	content: z.string(),
	node: z.object({
		collapsed: z.boolean(),
		createDate: z.string(),
		id: z.string(),
		lastEdit: z.string(),
		order: z.number(),
		parent: z.string().nullable(),
		tags: z.array(z.string()).optional(),
		title: z.string(),
		type: z.enum(["file", "folder", "diary", "canvas"]),
		workspace: z.string(),
	}),
	parsedContent: z.unknown(),
})

export type WikiCreationResult = z.infer<typeof wikiCreationResultSchema>
