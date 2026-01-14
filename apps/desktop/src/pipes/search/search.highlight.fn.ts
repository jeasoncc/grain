/**
 * @file fn/search/search.highlight.fn.ts
 * @description 搜索高亮相关纯函数
 *
 * 包含文本提取、摘要生成、高亮提取等纯函数。
 * 所有函数无副作用，相同输入产生相同输出。
 *
 * @requirements 1.1, 3.1, 3.2, 3.3
 */

import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";

// ============================================================================
// Types
// ============================================================================

/**
 * Lexical 节点类型
 */
interface LexicalNode {
	readonly type?: string;
	readonly text?: string;
	readonly children?: ReadonlyArray<LexicalNode>;
}

/**
 * 摘要选项
 */
export interface ExcerptOptions {
	readonly contextLength?: number;
}

/**
 * 高亮选项
 */
export interface HighlightOptions {
	readonly maxHighlights?: number;
	readonly contextLength?: number;
}

// ============================================================================
// Text Extraction Functions
// ============================================================================

/**
 * 从 Lexical 节点树递归提取纯文本
 *
 * @param node - Lexical 节点对象
 * @returns 从节点及其子节点提取的纯文本
 */
export const extractTextFromLexical = (node: unknown): string => {
	if (!node || typeof node !== "object") return "";

	const n = node as LexicalNode;

	// 文本节点直接返回文本
	if (n.type === "text") {
		return n.text ?? "";
	}

	// 递归处理子节点
	if (Array.isArray(n.children)) {
		return pipe(n.children, A.map(extractTextFromLexical), (texts) =>
			texts.join(" "),
		);
	}

	return "";
};

/**
 * 从 Lexical 编辑器 JSON 内容提取纯文本
 *
 * @param content - 编辑器的 JSON 字符串内容
 * @returns 从内容中提取的纯文本
 */
export const extractTextFromContent = (content: string): string => {
	if (!content) return "";

	return pipe(
		O.tryCatch(() => JSON.parse(content) as { root?: unknown }),
		O.chain((parsed) => O.fromNullable(parsed?.root)),
		O.map(extractTextFromLexical),
		O.getOrElse(() => content),
	);
};

// ============================================================================
// Excerpt Generation Functions
// ============================================================================

/**
 * 在内容中查找查询字符串的位置（不区分大小写）
 *
 * @param content - 要搜索的内容
 * @param query - 搜索查询
 * @returns 匹配位置的 Option，未找到返回 None
 */
const findQueryIndex = (content: string, query: string): O.Option<number> => {
	const index = content.toLowerCase().indexOf(query.toLowerCase());
	return index === -1 ? O.none : O.some(index);
};

/**
 * 生成搜索查询匹配周围的摘要
 *
 * @param content - 完整文本内容
 * @param query - 要查找的搜索查询
 * @param options - 摘要选项
 * @returns 带有上下文的查询高亮摘要
 */
export const generateExcerpt = (
	content: string,
	query: string,
	options: ExcerptOptions = {},
): string => {
	const { contextLength = 100 } = options;

	return pipe(
		findQueryIndex(content, query),
		O.match(
			// 未找到匹配，返回内容开头
			() => {
				const truncated = content.slice(0, contextLength);
				return content.length > contextLength ? `${truncated}...` : truncated;
			},
			// 找到匹配，生成带上下文的摘要
			(index) => {
				const halfContext = Math.floor(contextLength / 2);
				const start = Math.max(0, index - halfContext);
				const end = Math.min(
					content.length,
					index + query.length + halfContext,
				);

				const baseExcerpt = content.slice(start, end);
				const prefixed = start > 0 ? `...${baseExcerpt}` : baseExcerpt;
				const suffixed = end < content.length ? `${prefixed}...` : prefixed;

				return suffixed;
			},
		),
	);
};

// ============================================================================
// Highlight Extraction Functions
// ============================================================================

/**
 * 提取包含搜索查询的高亮片段
 *
 * @param content - 完整文本内容
 * @param query - 要查找的搜索查询
 * @param options - 高亮选项
 * @returns 包含查询的文本片段数组
 */
export const extractHighlights = (
	content: string,
	query: string,
	options: HighlightOptions = {},
): ReadonlyArray<string> => {
	const { maxHighlights = 3, contextLength = 20 } = options;

	if (!query || !content) return [];

	const lowerContent = content.toLowerCase();
	const lowerQuery = query.toLowerCase();
	
	// Use functional approach to find all matches
	const findMatches = (startIndex: number, accumulator: ReadonlyArray<string>): ReadonlyArray<string> => {
		if (accumulator.length >= maxHighlights) return accumulator;
		
		const index = lowerContent.indexOf(lowerQuery, startIndex);
		if (index === -1) return accumulator;

		const start = Math.max(0, index - contextLength);
		const end = Math.min(content.length, index + query.length + contextLength);
		const highlight = content.slice(start, end);
		
		return findMatches(index + query.length, [...accumulator, highlight]);
	};

	return findMatches(0, []);
};

// ============================================================================
// Score Calculation Functions
// ============================================================================

/**
 * 计算搜索结果的简单相关性分数
 *
 * @param title - 项目标题
 * @param content - 项目内容
 * @param query - 搜索查询
 * @returns 数值分数（越高越相关）
 */
export const calculateSimpleScore = (
	title: string,
	content: string,
	query: string,
): number => {
	const lowerTitle = title.toLowerCase();
	const lowerContent = content.toLowerCase();
	const lowerQuery = query.toLowerCase();

	let score = 0;

	// 标题完全匹配得分最高
	if (lowerTitle === lowerQuery) {
		score += 100;
	} else if (lowerTitle.includes(lowerQuery)) {
		// 标题包含查询
		score += 50;
	}

	// 内容中的匹配次数
	const matches = pipe(
		O.tryCatch(() => new RegExp(escapeRegExp(lowerQuery), "g")),
		O.map((regex) => (lowerContent.match(regex) ?? []).length),
		O.getOrElse(() => 0),
	);

	score += matches * 10;

	return score;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 转义正则表达式特殊字符
 *
 * @param str - 要转义的字符串
 * @returns 转义后的字符串
 */
const escapeRegExp = (str: string): string => {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
