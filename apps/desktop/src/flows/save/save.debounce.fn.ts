/**
 * @file fn/save/save.debounce.fn.ts
 * @description Save 纯函数
 *
 * 保存相关的纯函数，包括从 Lexical 编辑器内容中提取标签：
 * - 无副作用
 * - 相同输入 → 相同输出
 * - 不修改输入参数
 *
 * Requirements: 1.1, 3.1, 3.2, 3.3
 */

import type { SerializedEditorState } from "lexical";

// ============================================================================
// Types
// ============================================================================

/**
 * Lexical 节点结构用于遍历
 */
interface LexicalNode {
	readonly type?: string;
	readonly key?: string;
	readonly value?: string;
	readonly children?: ReadonlyArray<LexicalNode>;
}

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * 从逗号分隔的字符串解析标签
 * 纯函数 - 无副作用
 *
 * @param value - 逗号分隔的标签字符串
 * @returns 标签数组
 */
export const parseTagString = (value: string): ReadonlyArray<string> =>
	value
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean);

/**
 * 检查节点是否为 TAGS front-matter 节点
 *
 * @param node - Lexical 节点
 * @returns 是否为 TAGS front-matter 节点
 */
const isTagsFrontMatter = (node: LexicalNode): boolean =>
	node.type === "front-matter" && node.key?.toUpperCase() === "TAGS";

/**
 * 从单个节点提取标签（非递归）
 *
 * @param node - Lexical 节点
 * @returns 标签数组
 */
const extractNodeTags = (node: LexicalNode): ReadonlyArray<string> =>
	isTagsFrontMatter(node) ? parseTagString(node.value || "") : [];

/**
 * 递归收集节点树中的标签
 * 使用 flatMap 进行不可变遍历的纯函数
 *
 * @param node - Lexical 节点
 * @returns 标签数组
 */
const collectTags = (node: LexicalNode): ReadonlyArray<string> => [
	...extractNodeTags(node),
	...(node.children ?? []).flatMap(collectTags),
];

/**
 * 使用 Set 去重数组
 *
 * @param arr - 输入数组
 * @returns 去重后的数组
 */
const deduplicate = <T>(arr: ReadonlyArray<T>): ReadonlyArray<T> => [...new Set(arr)];

// ============================================================================
// Main Export
// ============================================================================

/**
 * 从 Lexical 编辑器状态中的 #+TAGS: front-matter 提取标签
 * 支持从 FrontMatterNode 提取 org-mode 风格的标签
 *
 * 使用递归 flatMap 进行不可变遍历的纯函数
 *
 * @param content - 序列化的 Lexical 编辑器状态
 * @returns 唯一标签字符串数组
 */
export const extractTagsFromContent = (
	content: SerializedEditorState,
): ReadonlyArray<string> =>
	content.root
		? deduplicate(collectTags(content.root as unknown as LexicalNode))
		: [];
