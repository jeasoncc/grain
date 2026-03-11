import { z } from "zod"

/**
 * 访客数据验证 schema
 * Visitor data validation schema
 */
export const createVisitorSchema = z.object({
	ip: z
		.string()
		.ip({ version: "v4" })
		.or(z.string().ip({ version: "v6" }))
		.or(z.literal("unknown")),

	path: z
		.string()
		.min(1, "路径不能为空")
		.max(500, "路径长度不能超过 500 字符")
		.regex(/^\/[a-zA-Z0-9\-_\/]*$/, "路径格式无效"),

	userAgent: z.string().max(1000, "User-Agent 长度不能超过 1000 字符").optional(),

	referer: z
		.string()
		.url("Referer 必须是有效的 URL")
		.max(500, "Referer 长度不能超过 500 字符")
		.optional()
		.or(z.literal("")),

	query: z.string().max(1000).optional(),

	metadata: z.record(z.unknown()).optional(),
})

/**
 * 创建访客输入类型
 * Create visitor input type
 */
export type CreateVisitorInput = z.infer<typeof createVisitorSchema>
