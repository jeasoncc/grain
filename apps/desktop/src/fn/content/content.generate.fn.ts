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

import type { TemplateType } from "./content.template.fn";
import { getTemplateConfig } from "./content.template.fn";

// ==============================
// Types - Lexical Nodes
// ==============================

/**
 * Lexical 文本节点
 */
export interface LexicalTextNode {
	type: "text";
	version: number;
	text: string;
	format: number;
	style: string;
	detail: number;
	mode: string;
}

/**
 * Lexical 标签节点
 */
export interface LexicalTagNode {
	type: "tag";
	version: number;
	tagName: string;
	text: string;
	format: number;
	style: string;
	detail: number;
	mode: string;
}

/**
 * Lexical 段落节点
 */
export interface LexicalParagraphNode {
	children: (LexicalTextNode | LexicalTagNode)[];
	direction: string;
	format: string;
	indent: number;
	type: "paragraph";
	version: number;
}

/**
 * Lexical 标题节点
 */
export interface LexicalHeadingNode {
	children: LexicalTextNode[];
	direction: string;
	format: string;
	indent: number;
	type: "heading";
	version: number;
	tag: string;
}

/**
 * Lexical 列表项节点
 */
export interface LexicalListItemNode {
	children: (LexicalTextNode | LexicalTagNode)[];
	direction: string;
	format: string;
	indent: number;
	type: "listitem";
	version: number;
	value: number;
	checked?: boolean;
}

/**
 * Lexical 列表节点
 */
export interface LexicalListNode {
	children: LexicalListItemNode[];
	direction: string;
	format: string;
	indent: number;
	type: "list";
	version: number;
	listType: "bullet" | "number" | "check";
	start: number;
	tag: string;
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
	children: LexicalRootChild[];
	direction: string;
	format: string;
	indent: number;
	type: "root";
	version: number;
}

/**
 * Lexical 文档结构
 */
export interface LexicalDocument {
	root: LexicalRootNode;
}

/**
 * 内容生成选项
 */
export interface ContentGenerationOptions {
	/** 标签列表 */
	tags?: string[];
	/** 标题级别 */
	headingLevel?: "h1" | "h2" | "h3";
	/** 是否包含空行 */
	includeEmptyLines?: boolean;
	/** 自定义标题文本 */
	customTitle?: string;
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
	children: (LexicalTextNode | LexicalTagNode)[] = [],
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
	const node: LexicalListItemNode = {
		children: text ? [createTextNode(text)] : [],
		direction: "ltr",
		format: "",
		indent: 0,
		type: "listitem",
		version: 1,
		value,
	};

	if (checked !== undefined) {
		node.checked = checked;
	}

	return node;
}

/**
 * 创建 Lexical 列表节点
 *
 * @param items - 列表项文本数组
 * @param listType - 列表类型
 * @returns Lexical 列表节点
 */
export function createListNode(
	items: string[],
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
export function createTagsLine(tags: string[]): LexicalParagraphNode {
	const children: (LexicalTextNode | LexicalTagNode)[] = [];

	tags.forEach((tag, index) => {
		children.push(createTagNode(tag));
		if (index < tags.length - 1) {
			children.push(createTextNode(" "));
		}
	});

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
export function createDocument(children: LexicalRootChild[]): LexicalDocument {
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
	date: Date = new Date(),
	options: ContentGenerationOptions = {},
): string {
	const {
		tags = ["diary", "notes"],
		headingLevel = "h2",
		includeEmptyLines = true,
	} = options;

	const fullDateTime = formatFullDateTime(date);
	const children: LexicalRootChild[] = [];

	// 添加标签行
	if (tags.length > 0) {
		children.push(createTagsLine(tags));
	}

	// 添加空行
	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	// 添加日期时间标题
	children.push(createHeadingNode(fullDateTime, headingLevel));

	// 添加空行
	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

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
	date: Date = new Date(),
	options: ContentGenerationOptions = {},
): string {
	const {
		tags = ["todo", "tasks"],
		headingLevel = "h2",
		includeEmptyLines = true,
		customTitle,
	} = options;

	const title = customTitle || `Tasks for ${formatShortDate(date)}`;
	const children: LexicalRootChild[] = [];

	// 添加标签行
	if (tags.length > 0) {
		children.push(createTagsLine(tags));
	}

	// 添加空行
	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	// 添加标题
	children.push(createHeadingNode(title, headingLevel));

	// 添加空行
	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	// 添加空的待办列表
	children.push(createListNode([""], "check"));

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
	date: Date = new Date(),
	options: ContentGenerationOptions = {},
): string {
	const {
		tags = ["ledger", "finance"],
		headingLevel = "h2",
		includeEmptyLines = true,
		customTitle,
	} = options;

	const title = customTitle || `Expenses for ${formatShortDate(date)}`;
	const children: LexicalRootChild[] = [];

	// 添加标签行
	if (tags.length > 0) {
		children.push(createTagsLine(tags));
	}

	// 添加空行
	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	// 添加标题
	children.push(createHeadingNode(title, headingLevel));

	// 添加空行
	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	// 添加收入部分
	children.push(createHeadingNode("Income", "h3"));
	children.push(createListNode([""], "bullet"));

	// 添加空行
	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	// 添加支出部分
	children.push(createHeadingNode("Expenses", "h3"));
	children.push(createListNode([""], "bullet"));

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
	_date: Date = new Date(),
	options: ContentGenerationOptions = {},
): string {
	const {
		tags = ["wiki", "knowledge"],
		headingLevel = "h2",
		includeEmptyLines = true,
		customTitle,
	} = options;

	const title = customTitle || "New Article";
	const children: LexicalRootChild[] = [];

	// 添加标签行
	if (tags.length > 0) {
		children.push(createTagsLine(tags));
	}

	// 添加空行
	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	// 添加标题
	children.push(createHeadingNode(title, headingLevel));

	// 添加空行
	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	// 添加简介段落提示
	children.push(
		createParagraphNode([createTextNode("Write a brief introduction here...")]),
	);

	// 添加空行
	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	// 添加 Overview 小节
	children.push(createHeadingNode("Overview", "h3"));

	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	children.push(createParagraphNode([createTextNode("")]));

	// 添加空行
	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	// 添加 Details 小节
	children.push(createHeadingNode("Details", "h3"));

	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	children.push(createParagraphNode([createTextNode("")]));

	// 添加空行
	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	// 添加 References 小节
	children.push(createHeadingNode("References", "h3"));

	if (includeEmptyLines) {
		children.push(createParagraphNode());
	}

	// 添加空的列表用于参考链接
	children.push(createListNode([""], "bullet"));

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
	date: Date = new Date(),
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
 * @returns 解析后的 Lexical 文档对象，解析失败返回 null
 */
export function parseContent(content: string): LexicalDocument | null {
	try {
		return JSON.parse(content) as LexicalDocument;
	} catch {
		return null;
	}
}

/**
 * 从 Lexical 文档中提取标签
 *
 * @param document - Lexical 文档对象
 * @returns 标签名称数组
 */
export function extractTagsFromDocument(document: LexicalDocument): string[] {
	const tags: string[] = [];

	const extractFromChildren = (
		children: (LexicalTextNode | LexicalTagNode)[],
	) => {
		for (const child of children) {
			if (child.type === "tag") {
				tags.push(child.tagName);
			}
		}
	};

	for (const child of document.root.children) {
		if (child.type === "paragraph") {
			extractFromChildren(child.children);
		} else if (child.type === "list") {
			for (const item of child.children) {
				extractFromChildren(item.children);
			}
		}
	}

	return tags;
}

/**
 * 从 Lexical 文档中提取纯文本
 *
 * @param document - Lexical 文档对象
 * @returns 纯文本字符串
 */
export function extractTextFromDocument(document: LexicalDocument): string {
	const texts: string[] = [];

	const extractFromChildren = (
		children: (LexicalTextNode | LexicalTagNode)[],
	) => {
		for (const child of children) {
			if (child.type === "text") {
				texts.push(child.text);
			} else if (child.type === "tag") {
				texts.push(child.text);
			}
		}
	};

	for (const child of document.root.children) {
		if (child.type === "paragraph") {
			extractFromChildren(child.children);
			texts.push("\n");
		} else if (child.type === "heading") {
			for (const textNode of child.children) {
				texts.push(textNode.text);
			}
			texts.push("\n");
		} else if (child.type === "list") {
			for (const item of child.children) {
				extractFromChildren(item.children);
				texts.push("\n");
			}
		}
	}

	return texts.join("").trim();
}
