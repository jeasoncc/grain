/**
 * @file fn/export/export.json.fn.ts
 * @description JSON 导出纯函数
 *
 * 功能说明：
 * - 将 Lexical JSON 内容导出为原始 JSON 格式
 * - 支持格式化输出
 * - 支持元数据包装
 *
 * 这些函数无副作用，可组合，可测试。
 */

import dayjs from "dayjs"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import type { LexicalDocument } from "../content/content.generate.fn"

// ==============================
// Types
// ==============================

/**
 * JSON 导出选项
 */
export interface JsonExportOptions {
	/** 是否格式化输出（美化 JSON） */
	readonly pretty?: boolean
	/** 缩进空格数（仅在 pretty 为 true 时有效） */
	readonly indent?: number
	/** 是否包含元数据 */
	readonly includeMetadata?: boolean
	/** 元数据信息 */
	readonly metadata?: JsonExportMetadata
}

/**
 * JSON 导出元数据
 */
export interface JsonExportMetadata {
	/** 文档标题 */
	readonly title?: string
	/** 作者 */
	readonly author?: string
	/** 导出时间 */
	readonly exportedAt?: string
	/** 应用版本 */
	readonly version?: string
}

/**
 * 带元数据的 JSON 导出结构
 */
export interface JsonExportDocument {
	/** 元数据 */
	readonly metadata: JsonExportMetadata
	/** Lexical 文档内容 */
	readonly content: LexicalDocument
}

/**
 * 导出错误类型
 */
export type ExportError =
	| { readonly type: "PARSE_ERROR"; readonly message: string }
	| { readonly type: "INVALID_CONTENT"; readonly message: string }

// ==============================
// Default Options
// ==============================

const defaultOptions: Required<JsonExportOptions> = {
	includeMetadata: false,
	indent: 2,
	metadata: {},
	pretty: true,
}

// ==============================
// Pure Functions
// ==============================

/**
 * 解析 Lexical JSON 字符串
 *
 * @param content - Lexical JSON 字符串
 * @returns Either<ExportError, LexicalDocument>
 */
export function parseLexicalContent(content: string): E.Either<ExportError, LexicalDocument> {
	if (!content || content.trim() === "") {
		return E.left({
			message: "内容为空",
			type: "INVALID_CONTENT",
		})
	}

	return E.tryCatch(
		() => {
			const parsed = JSON.parse(content) as LexicalDocument

			if (!parsed.root) {
				throw new Error("无效的 Lexical 文档结构：缺少 root 节点")
			}

			return parsed
		},
		(error) => ({
			message: `JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`,
			type: "PARSE_ERROR" as const,
		}),
	)
}

/**
 * 创建带元数据的导出文档
 *
 * @param document - Lexical 文档
 * @param metadata - 元数据
 * @returns 带元数据的导出文档
 */
export function createExportDocument(
	document: LexicalDocument,
	metadata: JsonExportMetadata = {},
): JsonExportDocument {
	return {
		content: document,
		metadata: {
			...metadata,
			exportedAt: metadata.exportedAt || dayjs().toISOString(),
		},
	}
}

/**
 * 将文档序列化为 JSON 字符串
 *
 * @param document - 要序列化的文档
 * @param options - 序列化选项
 * @returns JSON 字符串
 */
export function serializeToJson<T>(
	document: T,
	options: Pick<JsonExportOptions, "pretty" | "indent"> = {},
): string {
	const { pretty = true, indent = 2 } = options

	if (pretty) {
		return JSON.stringify(document, null, indent)
	}

	return JSON.stringify(document)
}

/**
 * 导出 Lexical 内容为 JSON 字符串
 *
 * @param content - Lexical JSON 字符串
 * @param options - 导出选项
 * @returns Either<ExportError, string>
 */
export function exportToJson(
	content: string,
	options: JsonExportOptions = {},
): E.Either<ExportError, string> {
	const opts = { ...defaultOptions, ...options }

	return pipe(
		parseLexicalContent(content),
		E.map((document) => {
			if (opts.includeMetadata) {
				const exportDoc = createExportDocument(document, opts.metadata)
				return serializeToJson(exportDoc, opts)
			}
			return serializeToJson(document, opts)
		}),
	)
}

/**
 * 导出原始 Lexical 内容（不解析，仅格式化）
 *
 * @param content - Lexical JSON 字符串
 * @param options - 导出选项
 * @returns Either<ExportError, string>
 */
export function exportRawJson(
	content: string,
	options: Pick<JsonExportOptions, "pretty" | "indent"> = {},
): E.Either<ExportError, string> {
	return pipe(
		parseLexicalContent(content),
		E.map((document) => serializeToJson(document, options)),
	)
}

/**
 * 批量导出多个内容为 JSON
 *
 * @param contents - 内容数组，每项包含 id 和 content
 * @param options - 导出选项
 * @returns Either<ExportError, string>
 */
export function exportMultipleToJson(
	contents: ReadonlyArray<{ readonly id: string; readonly content: string }>,
	options: JsonExportOptions = {},
): E.Either<ExportError, string> {
	const opts = { ...defaultOptions, ...options }

	// Use functional approach instead of mutation
	const parsedResults = contents.map((item) => {
		const parsed = parseLexicalContent(item.content)
		if (E.isLeft(parsed)) {
			return E.left(parsed.left)
		}
		return E.right({ document: parsed.right, id: item.id })
	})

	// Check for any parsing errors
	const firstError = parsedResults.find(E.isLeft)
	if (firstError && E.isLeft(firstError)) {
		return firstError
	}

	// Extract successful results
	const successfulResults = parsedResults.filter(E.isRight).map((result) => result.right)

	const exportData = {
		documents: successfulResults,
		metadata: opts.includeMetadata
			? {
					...opts.metadata,
					count: successfulResults.length,
					exportedAt: dayjs().toISOString(),
				}
			: undefined,
	}

	return E.right(serializeToJson(exportData, opts))
}
