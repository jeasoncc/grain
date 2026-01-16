/**
 * @file fn/export/export.markdown.fn.ts
 * @description Markdown 导出纯函数
 *
 * 功能说明：
 * - 将 Lexical JSON 内容转换为 Markdown 格式
 * - 支持标题、段落、列表、代码块、引用等
 * - 支持自定义格式选项
 *
 * 这些函数无副作用，可组合，可测试。
 */

import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import type {
	LexicalDocument,
	LexicalHeadingNode,
	LexicalListItemNode,
	LexicalListNode,
	LexicalParagraphNode,
	LexicalRootChild,
	LexicalTagNode,
	LexicalTextNode,
} from "../content/content.generate.fn"
import { type ExportError, parseLexicalContent } from "./export.json.fn"

// ==============================
// Types
// ==============================

/**
 * Markdown 导出选项
 */
export interface MarkdownExportOptions {
	/** 是否在标题前添加空行 */
	readonly blankLineBeforeHeading?: boolean
	/** 是否在标题后添加空行 */
	readonly blankLineAfterHeading?: boolean
	/** 是否在列表前添加空行 */
	readonly blankLineBeforeList?: boolean
	/** 是否在列表后添加空行 */
	readonly blankLineAfterList?: boolean
	/** 标签格式：'hash' (#tag) 或 'bracket' (#[tag]) */
	readonly tagFormat?: "hash" | "bracket"
	/** 是否包含文档标题 */
	readonly includeTitle?: boolean
	/** 文档标题 */
	readonly title?: string
	/** 是否包含 YAML front matter */
	readonly includeFrontMatter?: boolean
	/** Front matter 数据 */
	readonly frontMatter?: Record<string, unknown>
}

/**
 * 文本格式标志
 */
const TEXT_FORMAT = {
	BOLD: 1,
	CODE: 16,
	ITALIC: 2,
	STRIKETHROUGH: 4,
	SUBSCRIPT: 32,
	SUPERSCRIPT: 64,
	UNDERLINE: 8,
} as const

// ==============================
// Default Options
// ==============================

const defaultOptions: Required<MarkdownExportOptions> = {
	blankLineAfterHeading: false,
	blankLineAfterList: true,
	blankLineBeforeHeading: true,
	blankLineBeforeList: true,
	frontMatter: {},
	includeFrontMatter: false,
	includeTitle: false,
	tagFormat: "hash",
	title: "",
}

// ==============================
// Text Formatting Functions
// ==============================

/**
 * 应用文本格式
 *
 * @param text - 原始文本
 * @param format - 格式标志
 * @returns 格式化后的文本
 */
export function applyTextFormat(text: string, format: number): string {
	if (!text) {
		return text
	}

	let result = text

	// 按优先级应用格式（内层到外层）
	if (format & TEXT_FORMAT.CODE) {
		result = `\`${result}\``
	}
	if (format & TEXT_FORMAT.STRIKETHROUGH) {
		result = `~~${result}~~`
	}
	if (format & TEXT_FORMAT.ITALIC) {
		result = `*${result}*`
	}
	if (format & TEXT_FORMAT.BOLD) {
		result = `**${result}**`
	}

	return result
}

/**
 * 转换标签节点为 Markdown
 *
 * @param node - 标签节点
 * @param options - 导出选项
 * @returns Markdown 字符串
 */
export function convertTagNode(node: LexicalTagNode, options: MarkdownExportOptions = {}): string {
	const { tagFormat = "hash" } = options

	if (tagFormat === "bracket") {
		return `#[${node.tagName}]`
	}

	return `#${node.tagName}`
}

/**
 * 转换文本节点为 Markdown
 *
 * @param node - 文本节点
 * @returns Markdown 字符串
 */
export function convertTextNode(node: LexicalTextNode): string {
	return applyTextFormat(node.text, node.format)
}

/**
 * 转换内联节点数组为 Markdown
 *
 * @param children - 子节点数组
 * @param options - 导出选项
 * @returns Markdown 字符串
 */
export function convertInlineNodes(
	children: ReadonlyArray<LexicalTextNode | LexicalTagNode>,
	options: MarkdownExportOptions = {},
): string {
	return children
		.map((child) => {
			if (child.type === "tag") {
				return convertTagNode(child, options)
			}
			return convertTextNode(child)
		})
		.join("")
}

// ==============================
// Block Conversion Functions
// ==============================

/**
 * 转换段落节点为 Markdown
 *
 * @param node - 段落节点
 * @param options - 导出选项
 * @returns Markdown 字符串
 */
export function convertParagraphNode(
	node: LexicalParagraphNode,
	options: MarkdownExportOptions = {},
): string {
	const content = convertInlineNodes(node.children, options)
	return content
}

/**
 * 转换标题节点为 Markdown
 *
 * @param node - 标题节点
 * @param options - 导出选项
 * @returns Markdown 字符串
 */
export function convertHeadingNode(
	node: LexicalHeadingNode,
	_options: MarkdownExportOptions = {},
): string {
	const level = parseInt(node.tag.replace("h", ""), 10)
	const prefix = "#".repeat(level)
	const content = node.children.map((child) => convertTextNode(child)).join("")

	return `${prefix} ${content}`
}

/**
 * 转换列表项节点为 Markdown
 *
 * @param node - 列表项节点
 * @param listType - 列表类型
 * @param index - 列表项索引
 * @param options - 导出选项
 * @returns Markdown 字符串
 */
export function convertListItemNode(
	node: LexicalListItemNode,
	listType: "bullet" | "number" | "check",
	index: number,
	options: MarkdownExportOptions = {},
): string {
	const content = convertInlineNodes(node.children, options)

	switch (listType) {
		case "number":
			return `${index + 1}. ${content}`
		case "check": {
			const checkbox = node.checked ? "[x]" : "[ ]"
			return `- ${checkbox} ${content}`
		}
		default:
			return `- ${content}`
	}
}

/**
 * 转换列表节点为 Markdown
 *
 * @param node - 列表节点
 * @param options - 导出选项
 * @returns Markdown 字符串
 */
export function convertListNode(
	node: LexicalListNode,
	options: MarkdownExportOptions = {},
): string {
	return node.children
		.map((item, index) => convertListItemNode(item, node.listType, index, options))
		.join("\n")
}

/**
 * 转换根节点子元素为 Markdown
 *
 * @param node - 根节点子元素
 * @param options - 导出选项
 * @param prevNodeType - 前一个节点类型
 * @returns Markdown 字符串
 */
export function convertRootChild(
	node: LexicalRootChild,
	options: MarkdownExportOptions = {},
	prevNodeType?: string,
): string {
	const opts = { ...defaultOptions, ...options }
	let lines: readonly string[] = []

	switch (node.type) {
		case "paragraph": {
			const content = convertParagraphNode(node, opts)
			lines = [...lines, content]
			break
		}
		case "heading": {
			if (opts.blankLineBeforeHeading && prevNodeType) {
				lines = [...lines, ""]
			}
			lines = [...lines, convertHeadingNode(node, opts)]
			if (opts.blankLineAfterHeading) {
				lines = [...lines, ""]
			}
			break
		}
		case "list": {
			if (opts.blankLineBeforeList && prevNodeType && prevNodeType !== "list") {
				lines = [...lines, ""]
			}
			lines = [...lines, convertListNode(node, opts)]
			if (opts.blankLineAfterList) {
				lines = [...lines, ""]
			}
			break
		}
		default:
			// 处理未知节点类型
			break
	}

	return lines.join("\n")
}

// ==============================
// Document Conversion Functions
// ==============================

/**
 * 生成 YAML front matter
 *
 * @param data - Front matter 数据
 * @returns YAML front matter 字符串
 */
export function generateFrontMatter(data: Record<string, unknown>): string {
	if (Object.keys(data).length === 0) {
		return ""
	}

	let lines: readonly string[] = ["---"]

	for (const [key, value] of Object.entries(data)) {
		if (value === undefined || value === null) {
			continue
		}

		if (Array.isArray(value)) {
			lines = [...lines, `${key}:`]
			for (const item of value) {
				lines = [...lines, `  - ${String(item)}`]
			}
		} else if (typeof value === "object") {
			lines = [...lines, `${key}:`]
			for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
				lines = [...lines, `  ${subKey}: ${String(subValue)}`]
			}
		} else {
			lines = [...lines, `${key}: ${String(value)}`]
		}
	}

	lines = [...lines, "---", ""]

	return lines.join("\n")
}

/**
 * 转换 Lexical 文档为 Markdown
 *
 * @param document - Lexical 文档
 * @param options - 导出选项
 * @returns Markdown 字符串
 */
export function convertDocumentToMarkdown(
	document: LexicalDocument,
	options: MarkdownExportOptions = {},
): string {
	const opts = { ...defaultOptions, ...options }
	let lines: readonly string[] = []

	// 添加 front matter
	if (opts.includeFrontMatter && Object.keys(opts.frontMatter).length > 0) {
		lines = [...lines, generateFrontMatter(opts.frontMatter)]
	}

	// 添加标题
	if (opts.includeTitle && opts.title) {
		lines = [...lines, `# ${opts.title}`, ""]
	}

	// 转换内容
	let prevNodeType: string | undefined
	for (const child of document.root.children) {
		const converted = convertRootChild(child, opts, prevNodeType)
		if (converted) {
			lines = [...lines, converted]
		}
		prevNodeType = child.type
	}

	return lines.join("\n").trim()
}

// ==============================
// Export Functions
// ==============================

/**
 * 导出 Lexical 内容为 Markdown
 *
 * @param content - Lexical JSON 字符串
 * @param options - 导出选项
 * @returns Either<ExportError, string>
 */
export function exportToMarkdown(
	content: string,
	options: MarkdownExportOptions = {},
): E.Either<ExportError, string> {
	return pipe(
		parseLexicalContent(content),
		E.map((document) => convertDocumentToMarkdown(document, options)),
	)
}

/**
 * 批量导出多个内容为 Markdown
 *
 * @param contents - 内容数组
 * @param options - 导出选项
 * @param separator - 文档分隔符
 * @returns Either<ExportError, string>
 */
export function exportMultipleToMarkdown(
	contents: ReadonlyArray<{
		readonly id: string
		readonly content: string
		readonly title?: string
	}>,
	options: MarkdownExportOptions = {},
	separator: string = "\n\n---\n\n",
): E.Either<ExportError, string> {
	let results: readonly string[] = []

	for (const item of contents) {
		const itemOptions = {
			...options,
			includeTitle: !!item.title,
			title: item.title,
		}

		const result = exportToMarkdown(item.content, itemOptions)
		if (E.isLeft(result)) {
			return result
		}
		results = [...results, result.right]
	}

	return E.right(results.join(separator))
}
