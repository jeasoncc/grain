/**
 * @file fn/content/content.extract.fn.ts
 * @description 内容提取纯函数
 *
 * 功能说明：
 * - 从 Lexical 节点中提取纯文本
 * - 递归遍历节点树
 *
 * 这些函数无副作用，可组合，可测试。
 */

// ==============================
// Types
// ==============================

/**
 * Lexical 节点类型
 */
export interface LexicalNode {
	readonly type?: string;
	readonly text?: string;
	readonly children?: readonly LexicalNode[];
}

// ==============================
// Pure Functions
// ==============================

/**
 * 从 Lexical 节点中提取纯文本
 * 递归遍历节点树，提取所有文本内容
 *
 * @param node - Lexical 节点对象
 * @returns 提取的纯文本
 */
export function extractText(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const n = node as Record<string, unknown>;
	if (n.type === "text") return (n.text as string) || "";
	if (Array.isArray(n.children)) return n.children.map(extractText).join("");
	return "";
}

/**
 * 从 Lexical 节点中提取纯文本（带换行）
 * 在段落之间添加换行符
 *
 * @param node - Lexical 节点对象
 * @returns 提取的纯文本（带换行）
 */
export function extractTextWithNewlines(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const n = node as Record<string, unknown>;

	if (n.type === "text") return (n.text as string) || "";

	if (n.type === "paragraph" || n.type === "heading") {
		const text = Array.isArray(n.children)
			? n.children.map(extractText).join("")
			: "";
		return `${text}\n`;
	}

	if (Array.isArray(n.children)) {
		return n.children.map(extractTextWithNewlines).join("");
	}

	return "";
}

/**
 * 从 Lexical JSON 字符串中提取纯文本
 *
 * @param content - Lexical JSON 字符串
 * @returns 提取的纯文本
 */
export function extractTextFromJson(content: string): string {
	try {
		const parsed = JSON.parse(content);
		return extractText(parsed.root);
	} catch {
		return "";
	}
}
