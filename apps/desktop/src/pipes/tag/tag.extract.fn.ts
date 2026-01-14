/**
 * @file fn/tag/tag.extract.fn.ts
 * @description 标签提取和处理相关纯函数
 *
 * 包含标签名称规范化、验证、过滤、排序和提取等纯函数。
 * 所有函数无副作用，相同输入产生相同输出。
 *
 * @requirements 1.4, 5.1, 5.2
 */

import { pipe } from "fp-ts/function";
import * as N from "fp-ts/number";
import * as O from "fp-ts/Option";
import * as Ord from "fp-ts/Ord";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import type { TagInterface } from "@/types/tag";

// ============================================================================
// Constants
// ============================================================================

/** 标签名称最大长度 */
export const MAX_TAG_NAME_LENGTH = 50;

/** 标签名称最小长度 */
export const MIN_TAG_NAME_LENGTH = 1;

/** 标签名称中不允许的字符 */
export const INVALID_TAG_CHARS = /[#[\]@]/g;

/** 从内容中提取标签的正则表达式 */
export const TAG_PATTERN = /#\[([^\]]+)\]/g;

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * 规范化标签名称（小写、去空格、移除非法字符）
 *
 * @param name - 原始标签名称
 * @returns 规范化后的标签名称
 */
export const normalizeTagName = (name: string): string =>
	name.toLowerCase().trim().replace(INVALID_TAG_CHARS, "");

/**
 * 验证标签名称
 *
 * @param name - 要验证的标签名称
 * @returns 如果有效返回 null，否则返回错误信息
 */
export const validateTagName = (name: string): string | null => {
	const normalized = normalizeTagName(name);

	if (normalized.length < MIN_TAG_NAME_LENGTH) {
		return "标签名称太短";
	}
	if (normalized.length > MAX_TAG_NAME_LENGTH) {
		return "标签名称太长";
	}
	return null;
};

// ============================================================================
// Filtering Functions
// ============================================================================

/**
 * 按名称前缀过滤标签
 *
 * @param tags - 标签数组
 * @param prefix - 前缀字符串
 * @returns 匹配前缀的标签数组
 */
export const filterTagsByPrefix = (
	tags: ReadonlyArray<TagInterface>,
	prefix: string,
): ReadonlyArray<TagInterface> =>
	pipe(
		tags,
		RA.filter((t) => t.name.toLowerCase().startsWith(prefix.toLowerCase())),
	);

/**
 * 按最小使用次数过滤标签
 *
 * @param tags - 标签数组
 * @param minCount - 最小使用次数
 * @returns 使用次数达标的标签数组
 */
export const filterTagsByMinCount = (
	tags: ReadonlyArray<TagInterface>,
	minCount: number,
): ReadonlyArray<TagInterface> =>
	pipe(
		tags,
		RA.filter((t) => t.count >= minCount),
	);

// ============================================================================
// Sorting Functions
// ============================================================================

/**
 * 按使用次数降序排序标签
 *
 * @param tags - 标签数组
 * @returns 排序后的标签数组（不修改原数组）
 */
export const sortTagsByCount = (tags: ReadonlyArray<TagInterface>): ReadonlyArray<TagInterface> =>
	pipe(
		tags,
		RA.sortBy([
			pipe(
				N.Ord,
				Ord.contramap((tag: TagInterface) => -tag.count)
			)
		])
	);

/**
 * 按名称字母顺序排序标签
 *
 * @param tags - 标签数组
 * @returns 排序后的标签数组（不修改原数组）
 */
export const sortTagsAlphabetically = (tags: ReadonlyArray<TagInterface>): ReadonlyArray<TagInterface> =>
	pipe(
		tags,
		RA.sortBy([
			pipe(
				S.Ord,
				Ord.contramap((tag: TagInterface) => tag.name)
			)
		])
	);

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * 从内容字符串中提取标签名称
 * 查找所有 #[tagName] 模式
 *
 * @param content - 内容字符串
 * @returns 提取的标签名称数组（已去重和规范化）
 */
export const extractTagsFromContent = (content: string): readonly string[] => {
	const matches = content.matchAll(TAG_PATTERN);
	const tagNames: string[] = [];

	for (const match of matches) {
		const normalized = normalizeTagName(match[1]);
		if (normalized) {
			tagNames.push(normalized);
		}
	}

	// Remove duplicates using functional approach
	return [...new Set(tagNames)];
};

/**
 * 获取标签数组中的唯一名称
 *
 * @param tags - 标签数组
 * @returns 唯一的标签名称数组
 */
export const getUniqueTagNames = (tags: ReadonlyArray<TagInterface>): ReadonlyArray<string> =>
	pipe(
		tags,
		RA.map((t) => t.name),
		(names) => [...new Set(names)] as ReadonlyArray<string>,
	);

// ============================================================================
// Statistics Functions
// ============================================================================

/**
 * 计算所有标签的总使用次数
 *
 * @param tags - 标签数组
 * @returns 总使用次数
 */
export const getTotalTagUsage = (tags: ReadonlyArray<TagInterface>): number =>
	pipe(
		tags,
		RA.reduce(0, (sum, t) => sum + t.count),
	);

/**
 * 获取使用次数最多的前 N 个标签
 *
 * @param tags - 标签数组
 * @param n - 要获取的数量
 * @returns 前 N 个标签
 */
export const getTopTags = (tags: ReadonlyArray<TagInterface>, n: number): ReadonlyArray<TagInterface> =>
	pipe(tags, sortTagsByCount, RA.takeLeft(n));

/**
 * 按工作区过滤标签
 *
 * @param tags - 标签数组
 * @param workspaceId - 工作区 ID
 * @returns 属于指定工作区的标签数组
 */
export const filterTagsByWorkspace = (
	tags: ReadonlyArray<TagInterface>,
	workspaceId: string,
): ReadonlyArray<TagInterface> =>
	pipe(
		tags,
		RA.filter((t) => t.workspace === workspaceId),
	);

/**
 * 查找标签（按名称和工作区）
 *
 * @param tags - 标签数组
 * @param name - 标签名称
 * @param workspaceId - 工作区 ID
 * @returns 找到的标签或 undefined
 */
export const findTag = (
	tags: ReadonlyArray<TagInterface>,
	name: string,
	workspaceId: string,
): TagInterface | undefined =>
	pipe(
		tags,
		RA.findFirst(
			(t) =>
				t.name.toLowerCase() === name.toLowerCase() &&
				t.workspace === workspaceId,
		),
		O.toUndefined,
	);
