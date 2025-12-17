/**
 * Global Search服务
 * 基于新的 Node 和 WikiEntry 结构，使用 contents 表进行全文搜索
 *
 * Requirements: 6.2
 */

import lunr from "lunr";
import { database } from "@/db/database";
import { ContentRepository } from "@/db/models";
import type { NodeInterface, WorkspaceInterface } from "@/db/models";
import logger from "@/log/index";

export type SearchResultType = "project" | "node";

export interface SearchResult {
	id: string;
	type: SearchResultType;
	title: string;
	content: string;
	excerpt: string;
	workspaceId?: string;
	workspaceTitle?: string;
	score: number;
	highlights: string[];
}

export interface SearchOptions {
	types?: SearchResultType[];
	workspaceId?: string;
	limit?: number;
	fuzzy?: boolean;
}

export class SearchEngine {
	private nodeIndex: lunr.Index | null = null;
	private indexedData: Map<string, NodeInterface> = new Map();
	private nodeContents: Map<string, string> = new Map();
	private isIndexing = false;

	async buildIndex() {
		if (this.isIndexing) return;
		this.isIndexing = true;

		try {
			// Wiki entries are now stored as file nodes with "wiki" tag
			const nodes = await database.nodes.toArray();

			// Load content from contents table for nodes
			const nodeIds = nodes.map(n => n.id);
			const contents = await ContentRepository.getByNodeIds(nodeIds);
			
			// Build content map
			this.nodeContents.clear();
			for (const content of contents) {
				this.nodeContents.set(content.nodeId, content.content);
			}

			this.nodeIndex = lunr(function (this: lunr.Builder) {
				this.ref("id");
				this.field("title", { boost: 10 });
				this.field("tags", { boost: 5 });
				this.field("content");
				this.pipeline.remove(lunr.stemmer);
				this.searchPipeline.remove(lunr.stemmer);

				for (const node of nodes) {
					const contentStr = contents.find(c => c.nodeId === node.id)?.content || "";
					const textContent = extractTextFromContent(contentStr);
					this.add({ 
						id: node.id, 
						title: node.title, 
						tags: node.tags?.join(" ") || "",
						content: textContent 
					});
				}
			});

			this.indexedData.clear();
			for (const node of nodes) this.indexedData.set(node.id, node);

			logger.success(`Index built: ${nodes.length} nodes`);
		} catch (error) {
			logger.error("Index build failed:", error);
		} finally {
			this.isIndexing = false;
		}
	}

	async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
		if (!query.trim()) return [];
		if (!this.nodeIndex) await this.buildIndex();

		const { types = ["node"], workspaceId, limit = 50, fuzzy = true } = options;
		const results: SearchResult[] = [];
		const searchQuery = fuzzy ? `${query}~1 ${query}*` : query;

		try {
			if (types.includes("node") && this.nodeIndex) {
				const nodeResults = this.nodeIndex.search(searchQuery);
				for (const result of nodeResults) {
					const node = this.indexedData.get(result.ref);
					if (!node) continue;
					if (workspaceId && node.workspace !== workspaceId) continue;

					const workspace = await database.workspaces.get(node.workspace);
					const contentStr = this.nodeContents.get(node.id) || "";
					const content = extractTextFromContent(contentStr);

					results.push({
						id: node.id,
						type: "node",
						title: node.title,
						content,
						excerpt: generateExcerpt(content, query),
						workspaceId: node.workspace,
						workspaceTitle: workspace?.title,
						score: result.score,
						highlights: extractHighlights(content, query),
					});
				}
			}

			results.sort((a, b) => b.score - a.score);
			return results.slice(0, limit);
		} catch (error) {
			logger.error("Search failed:", error);
			return [];
		}
	}

	async simpleSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
		if (!query.trim()) return [];

		const { types = ["node"], workspaceId, limit = 50 } = options;
		const results: SearchResult[] = [];
		const lowerQuery = query.toLowerCase();

		try {
			if (types.includes("node")) {
				const nodes = workspaceId
					? await database.nodes.where("workspace").equals(workspaceId).toArray()
					: await database.nodes.toArray();

				// Get content for all nodes
				const nodeIds = nodes.map(n => n.id);
				const contents = await ContentRepository.getByNodeIds(nodeIds);
				const contentMap = new Map(contents.map(c => [c.nodeId, c.content]));

				for (const node of nodes) {
					const contentStr = contentMap.get(node.id) || "";
					const content = extractTextFromContent(contentStr);
					const tagsStr = node.tags?.join(" ") || "";
					if (node.title.toLowerCase().includes(lowerQuery) || 
					    content.toLowerCase().includes(lowerQuery) ||
					    tagsStr.toLowerCase().includes(lowerQuery)) {
						const workspace = await database.workspaces.get(node.workspace);
						results.push({
							id: node.id,
							type: "node",
							title: node.title,
							content,
							excerpt: generateExcerpt(content, query),
							workspaceId: node.workspace,
							workspaceTitle: workspace?.title,
							score: calculateSimpleScore(node.title, content, query),
							highlights: extractHighlights(content, query),
						});
					}
				}
			}

			results.sort((a, b) => b.score - a.score);
			return results.slice(0, limit);
		} catch (error) {
			logger.error("Simple search failed:", error);
			return [];
		}
	}

	clearIndex() {
		this.nodeIndex = null;
		this.indexedData.clear();
		this.nodeContents.clear();
	}
}

function extractTextFromContent(content: string): string {
	try {
		if (!content) return "";
		const parsed = JSON.parse(content);
		if (!parsed?.root) return "";
		return extractTextFromLexical(parsed.root);
	} catch {
		return content || "";
	}
}

function extractTextFromLexical(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const n = node as Record<string, unknown>;
	if (n.type === "text") return (n.text as string) || "";
	if (Array.isArray(n.children)) return n.children.map(extractTextFromLexical).join(" ");
	return "";
}

function generateExcerpt(content: string, query: string, contextLength = 100): string {
	const lowerContent = content.toLowerCase();
	const lowerQuery = query.toLowerCase();
	const index = lowerContent.indexOf(lowerQuery);

	if (index === -1) {
		return content.slice(0, contextLength) + (content.length > contextLength ? "..." : "");
	}

	const start = Math.max(0, index - contextLength / 2);
	const end = Math.min(content.length, index + query.length + contextLength / 2);
	let excerpt = content.slice(start, end);
	if (start > 0) excerpt = "..." + excerpt;
	if (end < content.length) excerpt = excerpt + "...";
	return excerpt;
}

function extractHighlights(content: string, query: string, maxHighlights = 3): string[] {
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

function calculateSimpleScore(title: string, content: string, query: string): number {
	const lowerTitle = title.toLowerCase();
	const lowerContent = content.toLowerCase();
	const lowerQuery = query.toLowerCase();

	let score = 0;
	if (lowerTitle === lowerQuery) score += 100;
	else if (lowerTitle.includes(lowerQuery)) score += 50;

	const matches = (lowerContent.match(new RegExp(lowerQuery, "g")) || []).length;
	score += matches * 10;

	return score;
}

export const searchEngine = new SearchEngine();
