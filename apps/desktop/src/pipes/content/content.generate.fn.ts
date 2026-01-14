/**
 * @file fn/content/content.generate.fn.ts
 * @description Lexical JSON 内容生成的纯函数
 *
 * 功能说明：
 * - 生成四种模板的 Lexical JSON 内容：diary、todo、ledger、wiki
 * - 创建 Lexical 节点（文本、标签、段落、标题、列表等）
 * - 内容解析和提取
 *
 * 这些函数无副作用，可组合，可测试。
 */

import * as E from "fp-ts/Either";
import dayjs from "dayjs";
import type { TemplateType } from "./content.template.fn";
import { getTemplateConfig } from "./content.template.fn";

// ==============================
// Types - Lexical Nodes
// ==============================

/**
 * Lexical 文本节点
 */
export interface LexicalTextNode {
	readonly type: "text";
	readonly version: number;
	readonly text: string;
	readonly format: number;
	readonly style: string;
	readonly detail: number;
	readonly mode: string;
}

/**
 * Lexical 标签节点
 */
export interface LexicalTagNode {
	readonly type: "tag";
	readonly version: number;
	readonly tagName: string;
	readonly text: string;
	readonly format: number;
	readonly style: string;
	readonly detail: number;
	readonly mode: string;
}

/**
 * Lexical 段落节点
 */
export interface LexicalParagraphNode {
	readonly children: readonly (LexicalTextNode | LexicalTagNode)[];
	readonly direction: string;
	readonly format: string;
	readonly indent: number;
	readonly type: "paragraph";
	readonly version: number;
}

/**
 * Lexical 标题节点
 */
export interface LexicalHeadingNode {
	readonly children: readonly LexicalTextNode[];
	readonly direction: string;
	readonly format: string;
	readonly indent: number;
	readonly type: "heading";
	readonly version: number;
	readonly tag: string;
}

/**
 * Lexical 列表项节点
 */
export interface LexicalListItemNode {
	readonly children: readonly (LexicalTextNode | LexicalTagNode)[];
	readonly direction: string;
	readonly format: string;
	readonly indent: number;
	readonly type: "listitem";
	readonly version: number;
	readonly value: number;
	readonly checked?: boolean;
}

/**
 * Lexical 列表节点
 */
export interface LexicalListNode {
	readonly children: readonly LexicalListItemNode[];
	readonly direction: string;
	readonly format: string;
	readonly indent: number;
	readonly type: "list";
	readonly version: number;
	readonly listType: "bullet" | "number" | "check";
	readonly start: number;
	readonly tag: string;
}

/**
 * Lexical 根节点子元素类型
 */
export type LexicalRootChild =
	| LexicalParagraphNode
	| LexicalHeadingNode
	| LexicalListNode;

/**
 * Lexical 根节点
 */
export interface LexicalRootNode {
	readonly children: readonly LexicalRootChild[];
	readonly direction: string;
	readonly format: string;
	readonly indent: number;
	readonly type: "root";
	readonly version: number;
}

/**
 * Lexical 文档结构
 */
export interface LexicalDocument {
	readonly root: LexicalRootNode;
}

/**
 * 内容生成选项
 */
export interface ContentGenerationOptions {
	/** 标签列表 */
	readonly tags?: readonly string[];
	/** 标题级别 */
	readonly headingLevel?: "h1" | "h2" | "h3";
	/** 是否包含空行 */
	readonly includeEmptyLines?: boolean;
	/** 自定义标题文本 */
	readonly customTitle?: string;
}

// ==============================
// Node Creation Functions
// ==============================

/**
 * 创建 Lexical 文本节点
 *
 * @param text - 文本内容
 * @returns Lexical 文本节点
 */
export function createTextNode(text: string): LexicalTextNode {
	return {
		type: "text",
		version: 1,
		text,
		format: 0,
		style: "",
		detail: 0,
		mode: "normal",
	};
}

/**
 * 创建 Lexical 标签节点
 *
 * @param tagName - 标签名称
 * @returns Lexical 标签节点
 */
export function createTagNode(tagName: string): LexicalTagNode {
	return {
		type: "tag",
		version: 1,
		tagName,
		text: `#[${tagName}]`,
		format: 0,
		style: "",
		detail: 2,
		mode: "segmented",
	};
}

/**
 * 创建 Lexical 段落节点
 *
 * @param children - 子节点数组
 * @returns Lexical 段落节点
 */
export function createParagraphNode(
	children: readonly (LexicalTextNode | LexicalTagNode)[] = [],
): LexicalParagraphNode {
	return {
		children,
		direction: "ltr",
		format: "",
		indent: 0,
		type: "paragraph",
		version: 1,
	};
}

/**
 * 创建 Lexical 标题节点
 *
 * @param text - 标题文本
 * @param tag - 标题级别
 * @returns Lexical 标题节点
 */
export function createHeadingNode(
	text: string,
	tag: "h1" | "h2" | "h3" = "h2",
): LexicalHeadingNode {
	return {
		children: [createTextNode(text)],
		direction: "ltr",
		format: "",
		indent: 0,
		type: "heading",
		version: 1,
		tag,
	};
}

/**
 * 创建 Lexical 列表项节点
 *
 * @param text - 列表项文本
 * @param value - 列表项序号
 * @param checked - 是否选中（仅用于 check 列表）
 * @returns Lexical 列表项节点
 */
export function createListItemNode(
	text: string,
	value: number = 1,
	checked?: boolean,
): LexicalListItemNode {
	const baseNode: LexicalListItemNode = {
		children: text ? [createTextNode(text)] : [],
		direction: "ltr",
		format: "",
		indent: 0,
		type: "listitem",
		version: 1,
		value,
	};

	return checked !== undefined 
		? { ...baseNode, checked }
		: baseNode;
}

/**
 * 创建 Lexical 列表节点
 *
 * @param items - 列表项文本数组
 * @param listType - 列表类型
 * @returns Lexical 列表节点
 */
export function createListNode(
	items: readonly string[],
	listType: "bullet" | "number" | "check" = "bullet",
): LexicalListNode {
	return {
		children: items.map((text, index) =>
			createListItemNode(
				text,
				index + 1,
				listType === "check" ? false : undefined,
			),
		),
		direction: "ltr",
		format: "",
		indent: 0,
		type: "list",
		version: 1,
		listType,
		start: 1,
		tag: listType === "number" ? "ol" : "ul",
	};
}

/**
 * 创建标签行（多个标签用空格分隔）
 *
 * @param tags - 标签名称数组
 * @returns Lexical 段落节点
 */
export function createTagsLine(tags: readonly string[]): LexicalParagraphNode {
	const children: readonly (LexicalTextNode | LexicalTagNode)[] = tags.flatMap((tag, index) =>
		index < tags.length - 1
			? [createTagNode(tag), createTextNode(" ")]
			: [createTagNode(tag)],
	);

	return createParagraphNode(children);
}

// ==============================
// Date Formatting Functions
// ==============================

/**
 * 格式化日期为完整的英文日期时间字符串
 *
 * @param date - 日期对象
 * @returns 格式化的日期时间字符串，如 "Monday, December 16, 2024 at 2:30:00 PM"
 */
export function formatFullDateTime(date: Date): string {
	const dateStr = date.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const timeStr = date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
	});

	return `${dateStr} at ${timeStr}`;
}

/**
 * 格式化日期为简短格式
 *
 * @param date - 日期对象
 * @returns 格式化的日期字符串，如 "Dec 16, 2024"
 */
export function formatShortDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

// ==============================
// Content Generation Functions
// ==============================

/**
 * 创建 Lexical 文档
 *
 * @param children - 根节点子元素
 * @returns Lexical 文档
 */
export function createDocument(children: readonly LexicalRootChild[]): LexicalDocument {
	return {
		root: {
			children,
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	};
}

/**
 * 生成日记内容
 *
 * @param date - 日期
 * @param options - 生成选项
 * @returns Lexical JSON 字符串
 */
export function generateDiaryContent(
	date: Date = dayjs().toDate(),
	options: ContentGenerationOptions = {},
): string {
	const {
		tags = ["diary", "notes"],
		headingLevel = "h2",
		includeEmptyLines = true,
	} = options;

	const fullDateTime = formatFullDateTime(date);
	const children: readonly LexicalRootChild[] = [
		// Add tags line
		...(tags.length > 0 ? [createTagsLine(tags)] : []),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add date time heading
		createHeadingNode(fullDateTime, headingLevel),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
	];

	return JSON.stringify(createDocument(children));
}

/**
 * 生成待办内容
 *
 * @param date - 日期
 * @param options - 生成选项
 * @returns Lexical JSON 字符串
 */
export function generateTodoContent(
	date: Date = dayjs().toDate(),
	options: ContentGenerationOptions = {},
): string {
	const {
		tags = ["todo", "tasks"],
		headingLevel = "h2",
		includeEmptyLines = true,
		customTitle,
	} = options;

	const title = customTitle || `Tasks for ${formatShortDate(date)}`;
	const children: readonly LexicalRootChild[] = [
		// Add tags line
		...(tags.length > 0 ? [createTagsLine(tags)] : []),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add title
		createHeadingNode(title, headingLevel),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add empty todo list
		createListNode([""], "check"),
	];

	return JSON.stringify(createDocument(children));
}

/**
 * 生成账本内容
 *
 * @param date - 日期
 * @param options - 生成选项
 * @returns Lexical JSON 字符串
 */
export function generateLedgerContent(
	date: Date = dayjs().toDate(),
	options: ContentGenerationOptions = {},
): string {
	const {
		tags = ["ledger", "finance"],
		headingLevel = "h2",
		includeEmptyLines = true,
		customTitle,
	} = options;

	const title = customTitle || `Expenses for ${formatShortDate(date)}`;
	const children: readonly LexicalRootChild[] = [
		// Add tags line
		...(tags.length > 0 ? [createTagsLine(tags)] : []),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add title
		createHeadingNode(title, headingLevel),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add income section
		createHeadingNode("Income", "h3"),
		createListNode([""], "bullet"),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add expenses section
		createHeadingNode("Expenses", "h3"),
		createListNode([""], "bullet"),
	];

	return JSON.stringify(createDocument(children));
}

/**
 * 生成笔记内容
 *
 * @param date - 日期
 * @param options - 生成选项
 * @returns Lexical JSON 字符串
 */
export function generateNoteContent(
	date: Date = dayjs().toDate(),
	options: ContentGenerationOptions = {},
): string {
	const {
		tags = ["note"],
		headingLevel = "h2",
		includeEmptyLines = true,
		customTitle,
	} = options;

	const title = customTitle || `Note - ${formatShortDate(date)}`;
	const children: readonly LexicalRootChild[] = [
		// Add tags line
		...(tags.length > 0 ? [createTagsLine(tags)] : []),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add title
		createHeadingNode(title, headingLevel),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add empty paragraph for user input
		createParagraphNode([createTextNode("")]),
	];

	return JSON.stringify(createDocument(children));
}

/**
 * 生成 Wiki 内容
 *
 * @param date - 日期
 * @param options - 生成选项
 * @returns Lexical JSON 字符串
 */
export function generateWikiContent(
	_date: Date = dayjs().toDate(),
	options: ContentGenerationOptions = {},
): string {
	const {
		tags = ["wiki", "knowledge"],
		headingLevel = "h2",
		includeEmptyLines = true,
		customTitle,
	} = options;

	const title = customTitle || "New Article";
	const children: readonly LexicalRootChild[] = [
		// Add tags line
		...(tags.length > 0 ? [createTagsLine(tags)] : []),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add title
		createHeadingNode(title, headingLevel),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add introduction paragraph hint
		createParagraphNode([createTextNode("Write a brief introduction here...")]),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add Overview section
		createHeadingNode("Overview", "h3"),
		...(includeEmptyLines ? [createParagraphNode()] : []),
		createParagraphNode([createTextNode("")]),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add Details section
		createHeadingNode("Details", "h3"),
		...(includeEmptyLines ? [createParagraphNode()] : []),
		createParagraphNode([createTextNode("")]),
		// Add empty line
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add References section
		createHeadingNode("References", "h3"),
		...(includeEmptyLines ? [createParagraphNode()] : []),
		// Add empty list for reference links
		createListNode([""], "bullet"),
	];

	return JSON.stringify(createDocument(children));
}

/**
 * 根据模板类型生成内容
 *
 * @param type - 模板类型
 * @param date - 日期
 * @param options - 生成选项
 * @returns Lexical JSON 字符串
 */
export function generateContentByType(
	type: TemplateType,
	date: Date = dayjs().toDate(),
	options: ContentGenerationOptions = {},
): string {
	const config = getTemplateConfig(type);
	const mergedOptions: ContentGenerationOptions = {
		tags: options.tags ?? config.defaultTags,
		headingLevel: options.headingLevel ?? config.headingLevel,
		includeEmptyLines: options.includeEmptyLines ?? config.includeEmptyLines,
		customTitle: options.customTitle,
	};

	switch (type) {
		case "diary":
			return generateDiaryContent(date, mergedOptions);
		case "todo":
			return generateTodoContent(date, mergedOptions);
		case "ledger":
			return generateLedgerContent(date, mergedOptions);
		case "wiki":
			return generateWikiContent(date, mergedOptions);
		default:
			return generateDiaryContent(date, mergedOptions);
	}
}

// ==============================
// Content Parsing Functions
// ==============================

/**
 * 解析 Lexical JSON 内容
 *
 * @param content - Lexical JSON 字符串
 * @returns Either<Error, LexicalDocument>
 */
export function parseContent(content: string): E.Either<Error, LexicalDocument> {
	return E.tryCatch(
		() => JSON.parse(content) as LexicalDocument,
		(err) => new Error(`JSON 解析失败: ${String(err)}`),
	);
}

/**
 * 从 Lexical 文档中提取标签
 *
 * @param document - Lexical 文档对象
 * @returns 标签名称数组
 */
export function extractTagsFromDocument(document: LexicalDocument): readonly string[] {
	const extractFromChildren = (
		children: readonly (LexicalTextNode | LexicalTagNode)[],
	): readonly string[] => {
		return children
			.filter((child): child is LexicalTagNode => child.type === "tag")
			.map(child => child.tagName);
	};

	const allTags = document.root.children.flatMap(child => {
		if (child.type === "paragraph") {
			return extractFromChildren(child.children);
		} else if (child.type === "list") {
			return child.children.flatMap(item => extractFromChildren(item.children));
		}
		return [];
	});

	return allTags;
}

/**
 * 从 Lexical 文档中提取纯文本
 *
 * @param document - Lexical 文档对象
 * @returns 纯文本字符串
 */
export function extractTextFromDocument(document: LexicalDocument): string {
	const extractFromChildren = (
		children: readonly (LexicalTextNode | LexicalTagNode)[],
	): readonly string[] => {
		return children.map(child => {
			if (child.type === "text") {
				return child.text;
			} else if (child.type === "tag") {
				return child.text;
			}
			return "";
		});
	};

	const allTexts = document.root.children.flatMap(child => {
		if (child.type === "paragraph") {
			return [...extractFromChildren(child.children), "\n"];
		} else if (child.type === "heading") {
			return [...child.children.map(textNode => textNode.text), "\n"];
		} else if (child.type === "list") {
			return child.children.flatMap(item => 
				[...extractFromChildren(item.children), "\n"]
			);
		}
		return [];
	});

	return allTexts.join("").trim();
}
