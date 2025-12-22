/**
 * Search Utilities
 * Pure functions for text extraction, excerpt generation, and search scoring.
 *
 * Requirements: 1.1, 3.1, 3.2, 3.3
 */

/**
 * Extract plain text from Lexical editor JSON content.
 * @param content - The JSON string content from the editor
 * @returns Plain text extracted from the content
 */
export function extractTextFromContent(content: string): string {
	try {
		if (!content) return "";
		const parsed = JSON.parse(content);
		if (!parsed?.root) return "";
		return extractTextFromLexical(parsed.root);
	} catch {
		return content || "";
	}
}

/**
 * Recursively extract text from a Lexical node tree.
 * @param node - A Lexical node object
 * @returns Plain text from the node and its children
 */
export function extractTextFromLexical(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const n = node as Record<string, unknown>;
	if (n.type === "text") return (n.text as string) || "";
	if (Array.isArray(n.children))
		return n.children.map(extractTextFromLexical).join(" ");
	return "";
}

/**
 * Generate an excerpt from content around a search query match.
 * @param content - The full text content
 * @param query - The search query to find
 * @param contextLength - Number of characters of context around the match
 * @returns An excerpt with the query highlighted in context
 */
export function generateExcerpt(
	content: string,
	query: string,
	contextLength = 100,
): string {
	const lowerContent = content.toLowerCase();
	const lowerQuery = query.toLowerCase();
	const index = lowerContent.indexOf(lowerQuery);

	if (index === -1) {
		return (
			content.slice(0, contextLength) +
			(content.length > contextLength ? "..." : "")
		);
	}

	const start = Math.max(0, index - contextLength / 2);
	const end = Math.min(
		content.length,
		index + query.length + contextLength / 2,
	);
	let excerpt = content.slice(start, end);
	if (start > 0) excerpt = "..." + excerpt;
	if (end < content.length) excerpt = excerpt + "...";
	return excerpt;
}

/**
 * Extract highlighted snippets containing the search query.
 * @param content - The full text content
 * @param query - The search query to find
 * @param maxHighlights - Maximum number of highlights to return
 * @returns Array of text snippets containing the query
 */
export function extractHighlights(
	content: string,
	query: string,
	maxHighlights = 3,
): string[] {
	const highlights: string[] = [];
	const lowerContent = content.toLowerCase();
	const lowerQuery = query.toLowerCase();
	let index = 0;

	while (highlights.length < maxHighlights) {
		index = lowerContent.indexOf(lowerQuery, index);
		if (index === -1) break;
		const start = Math.max(0, index - 20);
		const end = Math.min(content.length, index + query.length + 20);
		highlights.push(content.slice(start, end));
		index += query.length;
	}

	return highlights;
}

/**
 * Calculate a simple relevance score for search results.
 * @param title - The item title
 * @param content - The item content
 * @param query - The search query
 * @returns A numeric score (higher is more relevant)
 */
export function calculateSimpleScore(
	title: string,
	content: string,
	query: string,
): number {
	const lowerTitle = title.toLowerCase();
	const lowerContent = content.toLowerCase();
	const lowerQuery = query.toLowerCase();

	let score = 0;
	if (lowerTitle === lowerQuery) score += 100;
	else if (lowerTitle.includes(lowerQuery)) score += 50;

	const matches = (lowerContent.match(new RegExp(lowerQuery, "g")) || [])
		.length;
	score += matches * 10;

	return score;
}
