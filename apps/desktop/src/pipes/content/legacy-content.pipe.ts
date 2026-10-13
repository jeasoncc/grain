/**
 * Historical serialized Lexical JSON shapes used by read-only migration conversion.
 * The small node constructors support inert converter fixtures, not an editor runtime.
 * No editor instance, persistence service or template-creation workflow lives here.
 */

// ==============================
// Types - Lexical Nodes
// ==============================

/**
 * Lexical 文本节点
 */
export interface LexicalTextNode {
	readonly type: "text"
	readonly version: number
	readonly text: string
	readonly format: number
	readonly style: string
	readonly detail: number
	readonly mode: string
}

/**
 * Lexical 标签节点
 */
export interface LexicalTagNode {
	readonly type: "tag"
	readonly version: number
	readonly tagName: string
	readonly text: string
	readonly format: number
	readonly style: string
	readonly detail: number
	readonly mode: string
}

/**
 * Lexical 段落节点
 */
export interface LexicalParagraphNode {
	readonly children: readonly (LexicalTextNode | LexicalTagNode)[]
	readonly direction: string
	readonly format: string
	readonly indent: number
	readonly type: "paragraph"
	readonly version: number
}

/**
 * Lexical 标题节点
 */
export interface LexicalHeadingNode {
	readonly children: readonly LexicalTextNode[]
	readonly direction: string
	readonly format: string
	readonly indent: number
	readonly type: "heading"
	readonly version: number
	readonly tag: string
}

/**
 * Lexical 列表项节点
 */
export interface LexicalListItemNode {
	readonly children: readonly (LexicalTextNode | LexicalTagNode)[]
	readonly direction: string
	readonly format: string
	readonly indent: number
	readonly type: "listitem"
	readonly version: number
	readonly value: number
	readonly checked?: boolean
}

/**
 * Lexical 列表节点
 */
export interface LexicalListNode {
	readonly children: readonly LexicalListItemNode[]
	readonly direction: string
	readonly format: string
	readonly indent: number
	readonly type: "list"
	readonly version: number
	readonly listType: "bullet" | "number" | "check"
	readonly start: number
	readonly tag: string
}

/**
 * Lexical 根节点子元素类型
 */
export type LexicalRootChild = LexicalParagraphNode | LexicalHeadingNode | LexicalListNode

/**
 * Lexical 根节点
 */
export interface LexicalRootNode {
	readonly children: readonly LexicalRootChild[]
	readonly direction: string
	readonly format: string
	readonly indent: number
	readonly type: "root"
	readonly version: number
}

/**
 * Lexical 文档结构
 */
export interface LexicalDocument {
	readonly root: LexicalRootNode
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
		detail: 0,
		format: 0,
		mode: "normal",
		style: "",
		text,
		type: "text",
		version: 1,
	}
}

/**
 * 创建 Lexical 标签节点
 *
 * @param tagName - 标签名称
 * @returns Lexical 标签节点
 */
export function createTagNode(tagName: string): LexicalTagNode {
	return {
		detail: 2,
		format: 0,
		mode: "segmented",
		style: "",
		tagName,
		text: `#[${tagName}]`,
		type: "tag",
		version: 1,
	}
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
	}
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
		tag,
		type: "heading",
		version: 1,
	}
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
		value,
		version: 1,
	}

	return checked !== undefined ? { ...baseNode, checked } : baseNode
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
			createListItemNode(text, index + 1, listType === "check" ? false : undefined),
		),
		direction: "ltr",
		format: "",
		indent: 0,
		listType,
		start: 1,
		tag: listType === "number" ? "ol" : "ul",
		type: "list",
		version: 1,
	}
}

/**
 * 创建标签行（多个标签用空格分隔）
 *
 * @param tags - 标签名称数组
 * @returns Lexical 段落节点
 */
export function createTagsLine(tags: readonly string[]): LexicalParagraphNode {
	const children: readonly (LexicalTextNode | LexicalTagNode)[] = tags.flatMap((tag, index) =>
		index < tags.length - 1 ? [createTagNode(tag), createTextNode(" ")] : [createTagNode(tag)],
	)

	return createParagraphNode(children)
}

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
	}
}

