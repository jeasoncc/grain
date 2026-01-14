/**
 * @file fn/export/export.orgmode.fn.ts
 * @description Org-mode 导出纯函数
 *
 * 功能说明：
 * - 将 Lexical JSON 内容转换为 Org-mode 格式
 * - 支持标题、段落、列表、代码块等
 * - 支持 Org-mode 特有的标签和属性语法
 *
 * 这些函数无副作用，可组合，可测试。
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import type {
	LexicalDocument,
	LexicalHeadingNode,
	LexicalListItemNode,
	LexicalListNode,
	LexicalParagraphNode,
	LexicalRootChild,
	LexicalTagNode,
	LexicalTextNode,
} from "../content/content.generate.fn";
import { type ExportError, parseLexicalContent } from "./export.json.fn";

// ==============================
// Types
// ==============================

/**
 * Org-mode 导出选项
 */
export interface OrgmodeExportOptions {
	/** 是否在标题前添加空行 */
	readonly blankLineBeforeHeading?: boolean;
	/** 是否在标题后添加空行 */
	readonly blankLineAfterHeading?: boolean;
	/** 是否在列表前添加空行 */
	readonly blankLineBeforeList?: boolean;
	/** 是否在列表后添加空行 */
	readonly blankLineAfterList?: boolean;
	/** 标签格式：'org' (:tag:) 或 'hash' (#tag) */
	readonly tagFormat?: "org" | "hash";
	/** 是否包含文档标题 */
	readonly includeTitle?: boolean;
	/** 文档标题 */
	readonly title?: string;
	/** 是否包含文档属性 */
	readonly includeProperties?: boolean;
	/** 文档属性 */
	readonly properties?: Record<string, string>;
	/** 作者 */
	readonly author?: string;
	/** 日期 */
	readonly date?: string;
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
	SUBSCRIPT: 32,
	SUPERSCRIPT: 64,
} as const;

// ==============================
// Default Options
// ==============================

const defaultOptions: Required<OrgmodeExportOptions> = {
	blankLineBeforeHeading: true,
	blankLineAfterHeading: false,
	blankLineBeforeList: true,
	blankLineAfterList: true,
	tagFormat: "org",
	includeTitle: false,
	title: "",
	includeProperties: false,
	properties: {},
	author: "",
	date: "",
};

// ==============================
// Text Formatting Functions
// ==============================

/**
 * 应用 Org-mode 文本格式
 *
 * @param text - 原始文本
 * @param format - 格式标志
 * @returns 格式化后的文本
 */
export function applyOrgTextFormat(text: string, format: number): string {
	if (!text) return text;

	let result = text;

	// Org-mode 格式语法
	if (format & TEXT_FORMAT.CODE) {
		result = `~${result}~`;
	}
	if (format & TEXT_FORMAT.STRIKETHROUGH) {
		result = `+${result}+`;
	}
	if (format & TEXT_FORMAT.UNDERLINE) {
		result = `_${result}_`;
	}
	if (format & TEXT_FORMAT.ITALIC) {
		result = `/${result}/`;
	}
	if (format & TEXT_FORMAT.BOLD) {
		result = `*${result}*`;
	}

	return result;
}

/**
 * 转换标签节点为 Org-mode 格式
 *
 * @param node - 标签节点
 * @param options - 导出选项
 * @returns Org-mode 字符串
 */
export function convertTagNode(
	node: LexicalTagNode,
	options: OrgmodeExportOptions = {},
): string {
	const { tagFormat = "org" } = options;

	if (tagFormat === "org") {
		return `:${node.tagName}:`;
	}

	return `#${node.tagName}`;
}

/**
 * 转换文本节点为 Org-mode 格式
 *
 * @param node - 文本节点
 * @returns Org-mode 字符串
 */
export function convertTextNode(node: LexicalTextNode): string {
	return applyOrgTextFormat(node.text, node.format);
}

/**
 * 转换内联节点数组为 Org-mode 格式
 *
 * @param children - 子节点数组
 * @param options - 导出选项
 * @returns Org-mode 字符串
 */
export function convertInlineNodes(
	children: ReadonlyArray<LexicalTextNode | LexicalTagNode>,
	options: OrgmodeExportOptions = {},
): string {
	return children
		.map((child) => {
			if (child.type === "tag") {
				return convertTagNode(child, options);
			}
			return convertTextNode(child);
		})
		.join("");
}

// ==============================
// Block Conversion Functions
// ==============================

/**
 * 转换段落节点为 Org-mode 格式
 *
 * @param node - 段落节点
 * @param options - 导出选项
 * @returns Org-mode 字符串
 */
export function convertParagraphNode(
	node: LexicalParagraphNode,
	options: OrgmodeExportOptions = {},
): string {
	const content = convertInlineNodes(node.children, options);
	return content;
}

/**
 * 转换标题节点为 Org-mode 格式
 *
 * @param node - 标题节点
 * @param options - 导出选项
 * @returns Org-mode 字符串
 */
export function convertHeadingNode(
	node: LexicalHeadingNode,
	_options: OrgmodeExportOptions = {},
): string {
	const level = parseInt(node.tag.replace("h", ""), 10);
	const prefix = "*".repeat(level);
	const content = node.children.map((child) => convertTextNode(child)).join("");

	return `${prefix} ${content}`;
}

/**
 * 转换列表项节点为 Org-mode 格式
 *
 * @param node - 列表项节点
 * @param listType - 列表类型
 * @param index - 列表项索引
 * @param options - 导出选项
 * @returns Org-mode 字符串
 */
export function convertListItemNode(
	node: LexicalListItemNode,
	listType: "bullet" | "number" | "check",
	index: number,
	options: OrgmodeExportOptions = {},
): string {
	const content = convertInlineNodes(node.children, options);

	switch (listType) {
		case "number":
			return `${index + 1}. ${content}`;
		case "check": {
			// Org-mode checkbox 语法
			const checkbox = node.checked ? "[X]" : "[ ]";
			return `- ${checkbox} ${content}`;
		}
		default:
			return `- ${content}`;
	}
}

/**
 * 转换列表节点为 Org-mode 格式
 *
 * @param node - 列表节点
 * @param options - 导出选项
 * @returns Org-mode 字符串
 */
export function convertListNode(
	node: LexicalListNode,
	options: OrgmodeExportOptions = {},
): string {
	return node.children
		.map((item, index) =>
			convertListItemNode(item, node.listType, index, options),
		)
		.join("\n");
}

/**
 * 转换根节点子元素为 Org-mode 格式
 *
 * @param node - 根节点子元素
 * @param options - 导出选项
 * @param prevNodeType - 前一个节点类型
 * @returns Org-mode 字符串
 */
export function convertRootChild(
	node: LexicalRootChild,
	options: OrgmodeExportOptions = {},
	prevNodeType?: string,
): string {
	const opts = { ...defaultOptions, ...options };
	const lines: ReadonlyArray<string> = [];

	switch (node.type) {
		case "paragraph": {
			const content = convertParagraphNode(node, opts);
			return [...lines, content].join("\n");
		}
		case "heading": {
			const linesWithBlankBefore = opts.blankLineBeforeHeading && prevNodeType
				? [...lines, ""]
				: lines;
			const linesWithHeading = [...linesWithBlankBefore, convertHeadingNode(node, opts)];
			const finalLines = opts.blankLineAfterHeading
				? [...linesWithHeading, ""]
				: linesWithHeading;
			return finalLines.join("\n");
		}
		case "list": {
			const linesWithBlankBefore = opts.blankLineBeforeList && prevNodeType && prevNodeType !== "list"
				? [...lines, ""]
				: lines;
			const linesWithList = [...linesWithBlankBefore, convertListNode(node, opts)];
			const finalLines = opts.blankLineAfterList
				? [...linesWithList, ""]
				: linesWithList;
			return finalLines.join("\n");
		}
		default:
			// 处理未知节点类型
			return lines.join("\n");
	}
}

// ==============================
// Document Conversion Functions
// ==============================

/**
 * 生成 Org-mode 文档属性
 *
 * @param options - 导出选项
 * @returns Org-mode 属性字符串
 */
export function generateOrgProperties(options: OrgmodeExportOptions): string {
	const lines: ReadonlyArray<string> = [];

	const linesWithTitle = options.title 
		? [...lines, `#+TITLE: ${options.title}`]
		: lines;

	const linesWithAuthor = options.author
		? [...linesWithTitle, `#+AUTHOR: ${options.author}`]
		: linesWithTitle;

	const linesWithDate = options.date
		? [...linesWithAuthor, `#+DATE: ${options.date}`]
		: linesWithAuthor;

	// 添加自定义属性
	const finalLines = options.properties
		? Object.entries(options.properties).reduce(
			(acc, [key, value]) => [...acc, `#+${key.toUpperCase()}: ${value}`],
			linesWithDate
		)
		: linesWithDate;

	const result = finalLines.length > 0 
		? [...finalLines, ""]
		: finalLines;

	return result.join("\n");
}

/**
 * 转换 Lexical 文档为 Org-mode 格式
 *
 * @param document - Lexical 文档
 * @param options - 导出选项
 * @returns Org-mode 字符串
 */
export function convertDocumentToOrgmode(
	document: LexicalDocument,
	options: OrgmodeExportOptions = {},
): string {
	const opts = { ...defaultOptions, ...options };
	const lines: ReadonlyArray<string> = [];

	// 添加文档属性
	const linesWithProperties = (opts.includeProperties || opts.includeTitle)
		? (() => {
			const properties = generateOrgProperties(opts);
			return properties ? [...lines, properties] : lines;
		})()
		: lines;

	// 转换内容
	const { finalLines } = document.root.children.reduce(
		(acc, child) => {
			const converted = convertRootChild(child, opts, acc.prevNodeType);
			return {
				finalLines: converted ? [...acc.finalLines, converted] : acc.finalLines,
				prevNodeType: child.type,
			};
		},
		{
			finalLines: linesWithProperties,
			prevNodeType: undefined as string | undefined,
		}
	);

	return finalLines.join("\n").trim();
}

// ==============================
// Export Functions
// ==============================

/**
 * 导出 Lexical 内容为 Org-mode 格式
 *
 * @param content - Lexical JSON 字符串
 * @param options - 导出选项
 * @returns Either<ExportError, string>
 */
export function exportToOrgmode(
	content: string,
	options: OrgmodeExportOptions = {},
): E.Either<ExportError, string> {
	return pipe(
		parseLexicalContent(content),
		E.map((document) => convertDocumentToOrgmode(document, options)),
	);
}

/**
 * 批量导出多个内容为 Org-mode 格式
 *
 * @param contents - 内容数组
 * @param options - 导出选项
 * @param separator - 文档分隔符
 * @returns Either<ExportError, string>
 */
export function exportMultipleToOrgmode(
	contents: ReadonlyArray<{
		readonly id: string;
		readonly content: string;
		readonly title?: string;
	}>,
	options: OrgmodeExportOptions = {},
	separator: string = "\n\n",
): E.Either<ExportError, string> {
	const results = contents.reduce<E.Either<ExportError, ReadonlyArray<string>>>(
		(acc, item) => {
			if (E.isLeft(acc)) return acc;
			
			const itemOptions = {
				...options,
				includeTitle: !!item.title,
				title: item.title,
			};

			const result = exportToOrgmode(item.content, itemOptions);
			if (E.isLeft(result)) {
				return result;
			}
			
			return E.right([...acc.right, result.right]);
		},
		E.right([])
	);

	return pipe(
		results,
		E.map(resultArray => resultArray.join(separator))
	);
}
