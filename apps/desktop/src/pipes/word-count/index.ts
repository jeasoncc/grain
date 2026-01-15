/**
 * @file fn/word-count/index.ts
 * @description 字数统计纯函数导出
 */

export {
	type CountMode,
	countCharacters,
	countChineseChars,
	countEnglishWords,
	countWords,
	countWordsFromLexicalState,
	extractTextFromLexicalState,
	formatWordCount,
	formatWordCountDetail,
	type WordCountResult,
} from "./word-count.fn"
