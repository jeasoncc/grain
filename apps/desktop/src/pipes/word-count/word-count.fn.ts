/**
 * @file word-count.fn.ts
 * @description 字数统计纯函数
 *
 * 提供中文和英文的字数统计功能：
 * - 中文：统计汉字数量
 * - 英文：统计单词数量（以空格分隔）
 * - 混合：分别统计中文字符和英文单词
 */

// 从 types 层导入类型
export type { CountMode, WordCountResult } from "@/types/word-count"

import type { CountMode, WordCountResult } from "@/types/word-count"

/**
 * 中文字符正则表达式
 * 匹配 CJK 统一汉字、扩展区、标点符号
 */
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g

/**
 * 英文单词正则表达式
 * 匹配连续的字母和数字组合
 */
const ENGLISH_WORD_REGEX = /[a-zA-Z0-9]+(?:[''-][a-zA-Z0-9]+)*/g

/**
 * 统计中文字符数量
 *
 * @param text - 要统计的文本
 * @returns 中文字符数量
 */
export const countChineseChars = (text: string): number => {
	const matches = text.match(CHINESE_CHAR_REGEX)
	return matches ? matches.length : 0
}

/**
 * 统计英文单词数量
 *
 * @param text - 要统计的文本
 * @returns 英文单词数量
 */
export const countEnglishWords = (text: string): number => {
	// 先移除中文字符，避免干扰
	const textWithoutChinese = text.replace(CHINESE_CHAR_REGEX, " ")
	const matches = textWithoutChinese.match(ENGLISH_WORD_REGEX)
	return matches ? matches.length : 0
}

/**
 * 统计字符总数（不含空格和换行）
 *
 * @param text - 要统计的文本
 * @returns 字符总数
 */
export const countCharacters = (text: string): number => {
	return text.replace(/\s/g, "").length
}

/**
 * 完整的字数统计
 *
 * @param text - 要统计的文本
 * @param mode - 统计模式
 * @returns 字数统计结果
 */
export const countWords = (text: string, mode: CountMode = "chinese"): WordCountResult => {
	const chineseChars = countChineseChars(text)
	const englishWords = countEnglishWords(text)
	const characters = countCharacters(text)

	// 根据模式计算总数
	let total: number
	switch (mode) {
		case "chinese":
			// 中文模式：中文字符 + 英文单词
			total = chineseChars + englishWords
			break
		case "english":
			// 英文模式：只统计英文单词
			total = englishWords
			break
		case "mixed":
			// 混合模式：中文字符 + 英文单词
			total = chineseChars + englishWords
			break
		default:
			total = chineseChars + englishWords
	}

	return {
		chineseChars,
		englishWords,
		total,
		characters,
	}
}

/**
 * 从 Lexical 编辑器状态提取纯文本
 *
 * @param editorState - Lexical 编辑器状态 JSON
 * @returns 提取的纯文本
 */
export const extractTextFromLexicalState = (editorState: unknown): string => {
	if (!editorState || typeof editorState !== "object") {
		return ""
	}

	const state = editorState as { readonly root?: { readonly children?: ReadonlyArray<unknown> } }
	if (!state.root?.children) {
		return ""
	}

	return extractTextFromNodes(state.root.children)
}

/**
 * 递归提取节点中的文本
 *
 * @param nodes - Lexical 节点数组
 * @returns 提取的文本
 */
const extractTextFromNodes = (nodes: ReadonlyArray<unknown>): string => {
	// Use functional approach instead of mutation
	const extractedTexts = nodes
		.filter(
			(
				node,
			): node is {
				readonly type?: string
				readonly text?: string
				readonly children?: ReadonlyArray<unknown>
			} => node !== null && typeof node === "object",
		)
		.flatMap((n) => {
			// 文本节点
			if (n.type === "text" && typeof n.text === "string") {
				return [n.text]
			}

			// 递归处理子节点
			if (Array.isArray(n.children)) {
				const childText = extractTextFromNodes(n.children)
				return childText ? [childText] : []
			}

			return []
		})

	return extractedTexts.join(" ")
}

/**
 * 从 Lexical 编辑器状态统计字数
 *
 * @param editorState - Lexical 编辑器状态 JSON
 * @param mode - 统计模式
 * @returns 字数统计结果
 */
export const countWordsFromLexicalState = (
	editorState: unknown,
	mode: CountMode = "chinese",
): WordCountResult => {
	const text = extractTextFromLexicalState(editorState)
	return countWords(text, mode)
}

/**
 * 格式化字数显示
 *
 * @param count - 字数
 * @param mode - 统计模式
 * @returns 格式化的字符串
 */
export const formatWordCount = (count: number, mode: CountMode): string => {
	const formattedCount = count.toLocaleString()

	switch (mode) {
		case "chinese":
			return `${formattedCount} 字`
		case "english":
			return `${formattedCount} words`
		case "mixed":
			return `${formattedCount}`
		default:
			return `${formattedCount}`
	}
}

/**
 * 格式化详细字数显示
 *
 * @param result - 字数统计结果
 * @param mode - 统计模式
 * @returns 格式化的详细字符串
 */
export const formatWordCountDetail = (result: WordCountResult, mode: CountMode): string => {
	switch (mode) {
		case "chinese":
			if (result.englishWords > 0) {
				return `${result.chineseChars.toLocaleString()} 字 + ${result.englishWords.toLocaleString()} 词`
			}
			return `${result.chineseChars.toLocaleString()} 字`
		case "english":
			return `${result.englishWords.toLocaleString()} words`
		case "mixed":
			return `${result.chineseChars.toLocaleString()} 字 / ${result.englishWords.toLocaleString()} words`
		default:
			return `${result.total.toLocaleString()}`
	}
}
