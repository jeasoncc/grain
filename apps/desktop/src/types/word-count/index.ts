/**
 * @file types/word-count/index.ts
 * @description 字数统计相关类型定义
 */

/**
 * 统计模式
 */
export type CountMode = "chinese" | "english" | "mixed";

/**
 * 字数统计结果
 */
export interface WordCountResult {
	/** 中文字符数 */
	readonly chineseChars: number;
	/** 英文单词数 */
	readonly englishWords: number;
	/** 总计（根据模式返回不同值） */
	readonly total: number;
	/** 字符总数（不含空格） */
	readonly characters: number;
}
