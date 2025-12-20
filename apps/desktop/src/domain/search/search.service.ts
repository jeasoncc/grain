/**
 * Global Search Service
 * Full-text search using Node and Content repositories with Lunr.js indexing.
 *
 * Requirements: 1.2, 4.1, 6.2
 */

import lunr from "lunr";
import {
	ContentRepository,
	NodeRepository,
	WorkspaceRepository,
	type NodeInterface,
} from "@/db/models";
import logger from "@/log/index";
import {
	extractTextFromContent,
	generateExcerpt,
	extractHighlights,
	calculateSimpleScore,
} from "./search.utils";

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
			// Get all nodes using Repository pattern
			const nodes = await NodeRepository.getAll();

			// Load content from contents table for nodes
			const nodeIds = nodes.map((n: NodeInterface) => n.id);
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
					const contentStr =
						contents.find((c) => c.nodeId === node.id)?.content || "";
					const textContent = extractTextFromContent(contentStr);
					this.add({
						id: node.id,
						title: node.title,
						tags: node.tags?.join(" ") || "",
						content: textContent,
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

	async search(
		query: string,
		options: SearchOptions = {}
	): Promise<SearchResult[]> {
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

					const workspace = await WorkspaceRepository.getById(node.workspace);
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

	async simpleSearch(
		query: string,
		options: SearchOptions = {}
	): Promise<SearchResult[]> {
		if (!query.trim()) return [];

		const { types = ["node"], workspaceId, limit = 50 } = options;
		const results: SearchResult[] = [];
		const lowerQuery = query.toLowerCase();

		try {
			if (types.includes("node")) {
				// Use Repository pattern for node access
				const nodes = workspaceId
					? await NodeRepository.getByWorkspace(workspaceId)
					: await NodeRepository.getAll();

				// Get content for all nodes
				const nodeIds = nodes.map((n: NodeInterface) => n.id);
				const contents = await ContentRepository.getByNodeIds(nodeIds);
				const contentMap = new Map(contents.map((c) => [c.nodeId, c.content]));

				for (const node of nodes) {
					const contentStr = contentMap.get(node.id) || "";
					const content = extractTextFromContent(contentStr);
					const tagsStr = node.tags?.join(" ") || "";
					if (
						node.title.toLowerCase().includes(lowerQuery) ||
						content.toLowerCase().includes(lowerQuery) ||
						tagsStr.toLowerCase().includes(lowerQuery)
					) {
						const workspace = await WorkspaceRepository.getById(node.workspace);
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

export const searchEngine = new SearchEngine();
