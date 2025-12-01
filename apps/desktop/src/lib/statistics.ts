/**
 * Counts the number of words/characters in a text string.
 * Supports mixed CJK (Chinese/Japanese/Korean) and Latin text.
 *
 * Logic:
 * 1. CJK characters are counted individually.
 * 2. Non-CJK "words" (sequences of non-whitespace, non-CJK characters) are counted as 1.
 */
export function countWords(text: string): number {
	if (!text) return 0;

	// Remove generic whitespace and normalize
	const normalized = text.trim();
	if (!normalized) return 0;

	// Match CJK characters
	// Range covers:
	// \u4E00-\u9FFF : CJK Unified Ideographs (Common)
	// \u3400-\u4DBF : CJK Unified Ideographs Extension A
	// \uF900-\uFAFF : CJK Compatibility Ideographs
	// \u3000-\u303F : CJK Symbols and Punctuation
	const cjkRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;
	const cjkMatches = normalized.match(cjkRegex);
	const cjkCount = cjkMatches ? cjkMatches.length : 0;

	// Remove CJK characters to count remaining "words" (Latin, Cyrillic, Numbers, etc.)
	// Replace CJK with space to ensure separation
	const nonCjkText = normalized.replace(cjkRegex, " ");

	// Split by whitespace and filter empty strings
	const nonCjkWords = nonCjkText.split(/\s+/).filter((w) => w.length > 0);
	const nonCjkCount = nonCjkWords.length;

	return cjkCount + nonCjkCount;
}

/**
 * Estimates reading time in minutes.
 * Assumes:
 * - 275 words per minute for English
 * - 500 characters per minute for Chinese
 *
 * A blended rate of ~300 is a reasonable default for mixed content
 * if we treat CJK char = 1 word.
 */
export function estimateReadingTime(wordCount: number): number {
	return Math.ceil(wordCount / 300);
}

// Helper to extract text from Lexical serialized state
export function extractTextFromSerialized(state: any): string {
	if (!state?.root) return "";

	const collect = (node: any): string => {
		if (!node) return "";
		// Text node
		if (typeof node.text === "string") {
			return node.text;
		}
		// Element node with children
		if (Array.isArray(node.children)) {
			// Add newline for block elements to separate text visually/logically
			const separator =
				node.type === "paragraph" ||
				node.type === "heading" ||
				node.type === "quote"
					? "\n"
					: "";
			return node.children.map(collect).join("") + separator;
		}
		return "";
	};

	return collect(state.root);
}
