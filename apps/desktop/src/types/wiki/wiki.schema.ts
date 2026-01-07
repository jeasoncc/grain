/**
 * @file types/wiki/wiki.schema.ts
 * @description Wiki 数据类型定义和校验
 */

import { z } from "zod";

/**
 * Wiki 文件条目 Schema
 * 用于 @ 提及自动完成
 */
export const wikiFileEntrySchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(200),
	alias: z.array(z.string()).default([]),
	content: z.string(),
	path: z.string(),
});

export type WikiFileEntry = z.infer<typeof wikiFileEntrySchema>;

/**
 * Wiki 创建参数 Schema
 */
export const wikiCreationParamsSchema = z.object({
	workspaceId: z.string().uuid(),
	name: z.string().min(1).max(200),
	content: z.string().optional(),
	useTemplate: z.boolean().optional(),
});

export type WikiCreationParams = z.infer<typeof wikiCreationParamsSchema>;

/**
 * Wiki 创建结果 Schema
 */
export const wikiCreationResultSchema = z.object({
	node: z.object({
		id: z.string(),
		title: z.string(),
		type: z.enum(["file", "folder", "diary", "canvas"]),
		workspace: z.string(),
		parent: z.string().nullable(),
		order: z.number(),
		collapsed: z.boolean(),
		tags: z.array(z.string()).optional(),
		createDate: z.string(),
		lastEdit: z.string(),
	}),
	content: z.string(),
	parsedContent: z.unknown(),
});

export type WikiCreationResult = z.infer<typeof wikiCreationResultSchema>;
