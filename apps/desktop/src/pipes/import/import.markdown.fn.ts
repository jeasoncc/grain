/**
 * @file fn/import/import.markdown.fn.ts
 * @description Markdown 导入纯函数
 *
 * 功能说明：
 * - 将 Markdown 格式转换为 Lexical JSON 内容
 * - 支持标题、段落、列表、代码块、引用等
 * - 支持 YAML front matter 解析
 *
 * 这些函数无副作用，可组合，可测试。
 */

import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import {
	createDocument,
	createHeadingNode,
	createListNode,
	createParagraphNode,
	createTagNode,
	createTextNode,
	type LexicalDocument,
	type LexicalHeadingNode,
	type LexicalParagraphNode,
	type LexicalRootChild,
	type LexicalTagNode,
	type LexicalTextNode,
} from "../content/content.generate.fn"

// ==============================
// Types
// ==============================

/**
 * Markdown 导入选项
 */
export interface MarkdownImportOptions {
	/** 是否解析 YAML front matter */
	readonly parseFrontMatter?: boolean
	/** 标签格式：'hash' (#tag) 或 'bracket' (#[tag]) */
	readonly tagFormat?: "hash" | "bracket"
	/** 是否将第一个 h1 标题作为文档标题 */
	readonly extractTitle?: boolean
}

/**
 * 导入错误类型
 */
export type ImportError =
	| { readonly type: "PARSE_ERROR"; readonly message: string }
	| { readonly type: "INVALID_CONTENT"; readonly message: string }

/**
 * 导入结果
 */
export interface ImportResult {
	/** Lexical 文档 */
	readonly document: LexicalDocument
	/** 解析的 front matter（如果有） */
	readonly frontMatter?: Record<string, unknown>
	/** 提取的标题（如果有） */
	readonly title?: string
}

/**
 * 文本格式标志
 */
const TEXT_FORMAT = {
	BOLD: 1,
	ITALIC: 2,
	STRIKETHROUGH: 4,
	UNDERLINE: 8,
	CODE: 16,
} as const

// ==============================
// Default Options
// ==============================

const defaultOptions: Required<MarkdownImportOptions> = {
	parseFrontMatter: true,
	tagFormat: "hash",
	extractTitle: false,
}

// ==============================
// Front Matter Parsing
// ==============================

/**
 * 解析 YAML front matter
 *
 * @param content - Markdown 内容
 * @returns Either<Error, [front matter 对象 | undefined, 剩余内容]>
 */
export function parseFrontMatter(
	content: string,
): E.Either<Error, readonly [Record<string, unknown> | undefined, string]> {
	const trimmed = content.trim()

	if (!trimmed.startsWith("---")) {
		return E.right([undefined, content])
	}

	const endIndex = trimmed.indexOf("---", 3)
	if (endIndex === -1) {
		return E.right([undefined, content])
	}

	const frontMatterStr = trimmed.slice(3, endIndex).trim()
	const remainingContent = trimmed.slice(endIndex + 3).trim()

	return E.tryCatch(
		() => {
			let frontMatter: Record<string, unknown> = {}
			const lines = frontMatterStr.split("\n")
			let currentKey: string | null = null
			let currentArray: readonly string[] | null = null

			for (const line of lines) {
				const trimmedLine = line.trim()

				// 数组项
				if (trimmedLine.startsWith("- ") && currentKey && currentArray) {
					currentArray = [...currentArray, trimmedLine.slice(2).trim()]
					continue
				}

				// 保存之前的数组
				if (currentKey && currentArray) {
					frontMatter = { ...frontMatter, [currentKey]: currentArray }
					currentKey = null
					currentArray = null
				}

				// 键值对
				const colonIndex = trimmedLine.indexOf(":")
				if (colonIndex > 0) {
					const key = trimmedLine.slice(0, colonIndex).trim()
					const value = trimmedLine.slice(colonIndex + 1).trim()

					if (value === "") {
						// 可能是数组的开始
						currentKey = key
						currentArray = []
					} else {
						frontMatter = { ...frontMatter, [key]: value }
					}
				}
			}

			// 保存最后的数组
			if (currentKey && currentArray) {
				frontMatter = { ...frontMatter, [currentKey]: currentArray }
			}

			return [frontMatter, remainingContent] as const
		},
		() => new Error("Front matter 解析失败"),
	)
}

// ==============================
// Inline Parsing Functions
// ==============================

/**
 * 解析内联格式（粗体、斜体、删除线、代码）
 *
 * @param text - 文本内容
 * @param options - 导入选项
 * @returns 内联节点数组
 */
export function parseInlineContent(
	text: string,
	options: MarkdownImportOptions = {},
): readonly (LexicalTextNode | LexicalTagNode)[] {
	let nodes: readonly (LexicalTextNode | LexicalTagNode)[] = []
	const { tagFormat = "hash" } = options

	// 正则表达式匹配各种格式
	// 匹配顺序：代码 > 粗斜体 > 粗体 > 斜体 > 删除线 > 标签
	const patterns: readonly {
		readonly regex: RegExp
		readonly format: number
	}[] = [
		// 行内代码
		{ regex: /`([^`]+)`/g, format: TEXT_FORMAT.CODE },
		// 粗斜体 (***text*** 或 ___text___)
		{
			regex: /\*\*\*([^*]+)\*\*\*|___([^_]+)___/g,
			format: TEXT_FORMAT.BOLD | TEXT_FORMAT.ITALIC,
		},
		// 粗体 (**text** 或 __text__)
		{ regex: /\*\*([^*]+)\*\*|__([^_]+)__/g, format: TEXT_FORMAT.BOLD },
		// 斜体 (*text* 或 _text_)
		{ regex: /\*([^*]+)\*|_([^_]+)_/g, format: TEXT_FORMAT.ITALIC },
		// 删除线
		{ regex: /~~([^~]+)~~/g, format: TEXT_FORMAT.STRIKETHROUGH },
	]

	// 标签正则
	const tagRegex = tagFormat === "bracket" ? /#\[([^\]]+)\]/g : /#([a-zA-Z0-9_\u4e00-\u9fa5]+)/g

	// 简化处理：先处理标签，再处理格式
	let lastIndex = 0
	let segments: readonly {
		readonly start: number
		readonly end: number
		readonly node: LexicalTextNode | LexicalTagNode
	}[] = []

	// 查找所有标签
	const tagMatches = Array.from(text.matchAll(tagRegex))
	for (const tagMatch of tagMatches) {
		if (tagMatch.index !== undefined) {
			segments = [
				...segments,
				{
					start: tagMatch.index,
					end: tagMatch.index + tagMatch[0].length,
					node: createTagNode(tagMatch[1]),
				},
			]
		}
	}

	// 查找所有格式化文本
	for (const { regex, format } of patterns) {
		regex.lastIndex = 0
		const matches = Array.from(text.matchAll(regex))
		for (const match of matches) {
			if (match.index === undefined) continue
			const content = match[1] || match[2]
			const matchStart = match.index
			const matchEnd = match.index + match[0].length
			// 检查是否与已有段落重叠
			const overlaps = segments.some(
				(s) =>
					(matchStart >= s.start && matchStart < s.end) ||
					(matchEnd > s.start && matchEnd <= s.end),
			)
			if (!overlaps) {
				const textNode = {
					...createTextNode(content),
					format,
				}
				segments = [
					...segments,
					{
						start: matchStart,
						end: matchEnd,
						node: textNode,
					},
				]
			}
		}
	}

	// 按位置排序
	segments = [...segments].sort((a, b) => a.start - b.start)

	// 构建最终节点数组
	lastIndex = 0
	for (const segment of segments) {
		// 添加普通文本
		if (segment.start > lastIndex) {
			const plainText = text.slice(lastIndex, segment.start)
			if (plainText) {
				nodes = [...nodes, createTextNode(plainText)]
			}
		}
		nodes = [...nodes, segment.node]
		lastIndex = segment.end
	}

	// 添加剩余文本
	if (lastIndex < text.length) {
		const plainText = text.slice(lastIndex)
		if (plainText) {
			nodes = [...nodes, createTextNode(plainText)]
		}
	}

	// 如果没有任何特殊格式，返回纯文本
	if (nodes.length === 0 && text) {
		nodes = [createTextNode(text)]
	}

	return nodes
}

// ==============================
// Block Parsing Functions
// ==============================

/**
 * 解析标题行
 *
 * @param line - Markdown 行
 * @returns 标题节点或 null
 */
export function parseHeadingLine(line: string): LexicalHeadingNode | null {
	const match = line.match(/^(#{1,6})\s+(.+)$/)
	if (!match) return null

	const level = match[1].length
	const text = match[2].trim()

	// 只支持 h1-h3
	if (level > 3) {
		return createHeadingNode(text, "h3")
	}

	return createHeadingNode(text, `h${level}` as "h1" | "h2" | "h3")
}

/**
 * 解析列表项
 *
 * @param line - Markdown 行
 * @returns [列表类型, 文本, 是否选中] 或 null
 */
export function parseListItemLine(
	line: string,
): readonly ["bullet" | "number" | "check", string, boolean | undefined] | null {
	// 检查复选框列表
	const checkMatch = line.match(/^[-*]\s+\[([ xX])\]\s*(.*)$/)
	if (checkMatch) {
		const checked = checkMatch[1].toLowerCase() === "x"
		return ["check", checkMatch[2].trim(), checked]
	}

	// 检查无序列表
	const bulletMatch = line.match(/^[-*+]\s+(.*)$/)
	if (bulletMatch) {
		return ["bullet", bulletMatch[1].trim(), undefined]
	}

	// 检查有序列表
	const numberMatch = line.match(/^\d+\.\s+(.*)$/)
	if (numberMatch) {
		return ["number", numberMatch[1].trim(), undefined]
	}

	return null
}

/**
 * 解析段落
 *
 * @param text - 段落文本
 * @param options - 导入选项
 * @returns 段落节点
 */
export function parseParagraph(
	text: string,
	options: MarkdownImportOptions = {},
): LexicalParagraphNode {
	const children = parseInlineContent(text, options)
	return createParagraphNode(children)
}

// ==============================
// Document Parsing Functions
// ==============================

/**
 * 将 Markdown 内容解析为 Lexical 文档
 *
 * @param content - Markdown 内容
 * @param options - 导入选项
 * @returns Lexical 文档
 */
export function parseMarkdownToDocument(
	content: string,
	options: MarkdownImportOptions = {},
): LexicalDocument {
	const opts = { ...defaultOptions, ...options }
	const lines = content.split("\n")

	const parseLines = (
		lineIndex: number,
		acc: readonly LexicalRootChild[],
	): readonly LexicalRootChild[] => {
		if (lineIndex >= lines.length) {
			return acc
		}

		const line = lines[lineIndex].trimEnd()

		// 空行 -> 空段落
		if (line.trim() === "") {
			return parseLines(lineIndex + 1, [...acc, createParagraphNode([])])
		}

		// 标题
		const heading = parseHeadingLine(line)
		if (heading) {
			return parseLines(lineIndex + 1, [...acc, heading])
		}

		// 列表
		const listItem = parseListItemLine(line)
		if (listItem) {
			const [listType] = listItem
			let items: ReadonlyArray<{ readonly text: string; readonly checked?: boolean }> = []
			let currentIndex = lineIndex

			// 收集连续的列表项
			while (currentIndex < lines.length) {
				const currentLine = lines[currentIndex].trimEnd()
				const item = parseListItemLine(currentLine)
				if (!item || item[0] !== listType) break

				items = [...items, { text: item[1], checked: item[2] }]
				currentIndex++
			}

			// 创建列表节点
			const listNode = createListNode(
				items.map((item) => item.text),
				listType,
			)

			// 设置 checked 状态（使用 map 创建新的 children 数组）
			const updatedListNode =
				listType === "check"
					? {
							...listNode,
							children: listNode.children.map((child, index) => ({
								...child,
								checked: items[index].checked,
							})),
						}
					: listNode

			return parseLines(currentIndex, [...acc, updatedListNode])
		}

		// 普通段落
		// 收集连续的非空行作为一个段落
		let paragraphLines: ReadonlyArray<string> = []
		let currentIndex = lineIndex

		while (currentIndex < lines.length) {
			const currentLine = lines[currentIndex].trimEnd()
			if (
				currentLine.trim() === "" ||
				parseHeadingLine(currentLine) ||
				parseListItemLine(currentLine)
			) {
				break
			}
			paragraphLines = [...paragraphLines, currentLine]
			currentIndex++
		}

		if (paragraphLines.length > 0) {
			const paragraphText = paragraphLines.join(" ")
			return parseLines(currentIndex, [...acc, parseParagraph(paragraphText, opts)])
		}

		return parseLines(currentIndex, acc)
	}

	const children = parseLines(0, [])
	return createDocument(children)
}

// ==============================
// Import Functions
// ==============================

/**
 * 导入 Markdown 内容为 Lexical JSON
 *
 * @param content - Markdown 字符串
 * @param options - 导入选项
 * @returns Either<ImportError, ImportResult>
 */
export function importFromMarkdown(
	content: string,
	options: MarkdownImportOptions = {},
): E.Either<ImportError, ImportResult> {
	if (!content || content.trim() === "") {
		return E.left({
			type: "INVALID_CONTENT",
			message: "内容为空",
		})
	}

	return E.tryCatch(
		() => {
			const opts = { ...defaultOptions, ...options }
			let markdownContent = content
			let frontMatter: Record<string, unknown> | undefined
			let title: string | undefined

			// 解析 front matter
			if (opts.parseFrontMatter) {
				const fmResult = parseFrontMatter(content)
				if (E.isRight(fmResult)) {
					const [fm, remaining] = fmResult.right
					frontMatter = fm
					markdownContent = remaining

					// 从 front matter 提取标题
					if (frontMatter?.title && typeof frontMatter.title === "string") {
						title = frontMatter.title
					}
				}
			}

			// 解析 Markdown 内容
			const document = parseMarkdownToDocument(markdownContent, opts)

			// 从第一个 h1 提取标题
			if (opts.extractTitle && !title) {
				const firstHeading = document.root.children.find(
					(child): child is LexicalHeadingNode => child.type === "heading" && child.tag === "h1",
				)
				if (firstHeading && firstHeading.children.length > 0) {
					title = firstHeading.children.map((c) => c.text).join("")
				}
			}

			return {
				document,
				frontMatter,
				title,
			}
		},
		(error) => ({
			type: "PARSE_ERROR" as const,
			message: `Markdown 解析失败: ${error instanceof Error ? error.message : String(error)}`,
		}),
	)
}

/**
 * 导入 Markdown 内容为 Lexical JSON 字符串
 *
 * @param content - Markdown 字符串
 * @param options - 导入选项
 * @returns Either<ImportError, string>
 */
export function importMarkdownToJson(
	content: string,
	options: MarkdownImportOptions = {},
): E.Either<ImportError, string> {
	return pipe(
		importFromMarkdown(content, options),
		E.map((result) => JSON.stringify(result.document)),
	)
}

/**
 * 批量导入多个 Markdown 内容
 *
 * @param contents - Markdown 内容数组
 * @param options - 导入选项
 * @returns Either<ImportError, ImportResult[]>
 */
export function importMultipleFromMarkdown(
	contents: ReadonlyArray<{
		readonly id: string
		readonly content: string
	}>,
	options: MarkdownImportOptions = {},
): E.Either<ImportError, ReadonlyArray<{ readonly id: string; readonly result: ImportResult }>> {
	let results: ReadonlyArray<{ readonly id: string; readonly result: ImportResult }> = []

	for (const item of contents) {
		const result = importFromMarkdown(item.content, options)
		if (E.isLeft(result)) {
			return E.left({
				type: "PARSE_ERROR",
				message: `导入 ${item.id} 失败: ${result.left.message}`,
			})
		}
		results = [...results, { id: item.id, result: result.right }]
	}

	return E.right(results)
}
