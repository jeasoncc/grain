/**
 * Export Utilities
 * Pure functions for text extraction, HTML generation, and content formatting.
 *
 * Requirements: 1.1, 3.1, 3.2, 3.3
 */

import type { NodeInterface, WorkspaceInterface } from "@/types";

/**
 * Export options for customizing output format.
 */
export interface ExportOptions {
	includeTitle?: boolean;
	includeAuthor?: boolean;
	includeChapterTitles?: boolean;
	includeSceneTitles?: boolean;
	pageBreakBetweenChapters?: boolean;
}

/**
 * Supported export formats.
 */
export type ExportFormat = "pdf" | "docx" | "txt" | "epub";

/**
 * Extract plain text from Lexical editor JSON content.
 * @param content - The JSON string content from the editor
 * @returns Plain text extracted from the content
 */
export function extractTextFromContent(content: string | null): string {
	if (!content) return "";
	try {
		const parsed = JSON.parse(content);
		return extractTextFromNode(parsed.root);
	} catch {
		return content;
	}
}

/**
 * Recursively extract text from a Lexical node tree.
 * @param node - A Lexical node object
 * @returns Plain text from the node and its children
 */
export function extractTextFromNode(node: unknown): string {
	if (!node) return "";

	const n = node as Record<string, unknown>;

	if (n.type === "text") {
		return (n.text as string) || "";
	}

	if (n.children && Array.isArray(n.children)) {
		return n.children.map(extractTextFromNode).join("");
	}

	return "";
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param text - The text to escape
 * @returns HTML-safe escaped text
 */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Generate HTML content for print/PDF export.
 * @param project - The workspace/project data
 * @param nodes - All nodes in the project
 * @param rootNodes - Top-level nodes (no parent)
 * @param contentMap - Map of node IDs to their content
 * @param opts - Export options
 * @param getNodeContents - Function to recursively get node contents
 * @returns Complete HTML document string
 */
export function generatePrintHtml(
	project: WorkspaceInterface,
	nodes: NodeInterface[],
	rootNodes: NodeInterface[],
	contentMap: Map<string, string>,
	opts: ExportOptions,
	getNodeContents: (
		node: NodeInterface,
		allNodes: NodeInterface[],
		contentMap: Map<string, string>,
		depth?: number,
	) => Array<{ node: NodeInterface; depth: number; text: string }>,
): string {
	let content = "";

	// Title page
	if (opts.includeTitle) {
		content += `<div class="title-page">
			<h1 class="book-title">${escapeHtml(project.title || "Untitled Work")}</h1>
			${opts.includeAuthor && project.author ? `<p class="author">Author: ${escapeHtml(project.author)}</p>` : ""}
		</div>`;
	}

	// Content
	for (const rootNode of rootNodes) {
		const contents = getNodeContents(rootNode, nodes, contentMap);

		for (const { node, depth, text } of contents) {
			if (opts.pageBreakBetweenChapters && depth === 0) {
				content += '<div class="chapter" style="page-break-before: always;">';
			} else {
				content += '<div class="chapter">';
			}

			if (opts.includeChapterTitles && depth === 0) {
				content += `<h2 class="chapter-title">${escapeHtml(node.title)}</h2>`;
			} else if (opts.includeSceneTitles && depth > 0) {
				content += `<h3 class="scene-title">${escapeHtml(node.title)}</h3>`;
			}

			if (text.trim()) {
				const paragraphs = text.split("\n").filter((p) => p.trim());
				for (const para of paragraphs) {
					content += `<p class="paragraph">${escapeHtml(para.trim())}</p>`;
				}
			}

			content += "</div>";
		}
	}

	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8">
	<title>${escapeHtml(project.title || "Export")}</title>
	<style>
		@page { size: A4; margin: 2.5cm 2cm; }
		body { font-family: "SimSun", serif; font-size: 12pt; line-height: 1.8; }
		.title-page { page-break-after: always; text-align: center; padding-top: 30%; }
		.book-title { font-size: 28pt; margin-bottom: 2em; }
		.author { font-size: 14pt; color: #666; }
		.chapter-title { font-size: 18pt; text-align: center; margin: 2em 0 1.5em; }
		.scene-title { font-size: 14pt; margin: 1.5em 0 1em; color: #555; }
		.paragraph { text-indent: 2em; margin-bottom: 0.5em; }
	</style>
</head>
<body>${content}</body>
</html>`;
}

/**
 * Generate XHTML content for an EPUB chapter.
 * @param title - The chapter title
 * @param content - The HTML content for the chapter body
 * @returns Complete XHTML document string for EPUB
 */
export function generateEpubChapterHtml(
	title: string,
	content: string,
): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="UTF-8"/><title>${escapeHtml(title)}</title><link rel="stylesheet" href="styles.css"/></head>
<body>${content}</body>
</html>`;
}

/**
 * Recursively get node contents for export.
 * @param node - The starting node
 * @param allNodes - All nodes in the project
 * @param contentMap - Map of node IDs to their content
 * @param depth - Current depth in the tree (default: 0)
 * @returns Array of node content objects with depth information
 */
export function getNodeContents(
	node: NodeInterface,
	allNodes: NodeInterface[],
	contentMap: Map<string, string>,
	depth: number = 0,
): Array<{ node: NodeInterface; depth: number; text: string }> {
	const results: Array<{ node: NodeInterface; depth: number; text: string }> =
		[];

	// Only process file-type nodes
	if (node.type === "file" || node.type === "diary") {
		const content = contentMap.get(node.id) ?? null;
		results.push({
			node,
			depth,
			text: extractTextFromContent(content),
		});
	}

	// Process child nodes
	const children = allNodes
		.filter((n) => n.parent === node.id)
		.sort((a, b) => a.order - b.order);

	for (const child of children) {
		results.push(...getNodeContents(child, allNodes, contentMap, depth + 1));
	}

	return results;
}
