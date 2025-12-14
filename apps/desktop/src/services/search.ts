/**
 * 全局搜索服务
 * 基于新的 Node 和 WikiEntry 结构
 */

import lunr from "lunr";
import { db } from "@/db/curd";
import type { NodeInterface, WikiEntryInterface, ProjectInterface } from "@/db/schema";
import logger from "@/log/index";

export type SearchResultType = "project" | "node" | "wiki";

export interface SearchResult {
	id: string;
	type: SearchResultType;
	title: string;
	content: string;
	excerpt: string;
	projectId?: string;
	projectTitle?: string;
	score: number;
	highlights: string[];
}

export interface SearchOptions {
	types?: SearchResultType[];
	projectId?: string;
	limit?: number;
	fuzzy?: boolean;
}

export class SearchEngine {
	private nodeIndex: lunr.Index | null = null;
	private wikiIndex: lunr.Index | null = null;
	private indexedData: Map<string, any> = new Map();
	private isIndexing = false;

	async buildIndex() {
		if (this.isIndexing) return;
		this.isIndexing = true;

		try {
			const [nodes, wikiEntries] = await Promise.all([
				db.nodes.toArray(),
				db.wikiEntries.toArray(),
			]);

			this.nodeIndex = lunr(function (this: lunr.Builder) {
				this.ref("id");
				this.field("title", { boost: 10 });
				this.field("content");
				this.pipeline.remove(lunr.stemmer);
				this.searchPipeline.remove(lunr.stemmer);

				for (const node of nodes) {
					const content = extractTextFromNode(node);
					this.add({ id: node.id, title: node.title, content });
				}
			});

			this.wikiIndex = lunr(function (this: lunr.Builder) {
				this.ref("id");
				this.field("name", { boost: 10 });
				this.field("alias", { boost: 5 });
				this.field("content");
				this.pipeline.remove(lunr.stemmer);
				this.searchPipeline.remove(lunr.stemmer);

				for (const entry of wikiEntries) {
					const content = extractTextFromWiki(entry);
					this.add({
						id: entry.id,
						name: entry.name,
						alias: entry.alias?.join(" ") || "",
						content,
					});
				}
			});

			this.indexedData.clear();
			for (const node of nodes) this.indexedData.set(node.id, node);
			for (const entry of wikiEntries) this.indexedData.set(entry.id, entry);

			logger.success(`索引构建完成: ${nodes.length} 节点, ${wikiEntries.length} Wiki条目`);
		} catch (error) {
			logger.error("索引构建失败:", error);
		} finally {
			this.isIndexing = false;
		}
	}

	async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
		if (!query.trim()) return [];
		if (!this.nodeIndex || !this.wikiIndex) await this.buildIndex();

		const { types = ["node", "wiki"], projectId, limit = 50, fuzzy = true } = options;
		const results: SearchResult[] = [];
		const searchQuery = fuzzy ? `${query}~1 ${query}*` : query;

		try {
			if (types.includes("node") && this.nodeIndex) {
				const nodeResults = this.nodeIndex.search(searchQuery);
				for (const result of nodeResults) {
					const node = this.indexedData.get(result.ref) as NodeInterface;
					if (!node) continue;
					if (projectId && node.workspace !== projectId) continue;

					const project = await db.projects.get(node.workspace);
					const content = extractTextFromNode(node);

					results.push({
						id: node.id,
						type: "node",
						title: node.title,
						content,
						excerpt: generateExcerpt(content, query),
						projectId: node.workspace,
						projectTitle: project?.title,
						score: result.score,
						highlights: extractHighlights(content, query),
					});
				}
			}

			if (types.includes("wiki") && this.wikiIndex) {
				const wikiResults = this.wikiIndex.search(searchQuery);
				for (const result of wikiResults) {
					const entry = this.indexedData.get(result.ref) as WikiEntryInterface;
					if (!entry) continue;
					if (projectId && entry.project !== projectId) continue;

					const project = await db.projects.get(entry.project);
					const content = extractTextFromWiki(entry);

					results.push({
						id: entry.id,
						type: "wiki",
						title: entry.name,
						content,
						excerpt: generateExcerpt(content, query),
						projectId: entry.project,
						projectTitle: project?.title,
						score: result.score,
						highlights: extractHighlights(content, query),
					});
				}
			}

			results.sort((a, b) => b.score - a.score);
			return results.slice(0, limit);
		} catch (error) {
			logger.error("搜索失败:", error);
			return [];
		}
	}

	async simpleSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
		if (!query.trim()) return [];

		const { types = ["node", "wiki"], projectId, limit = 50 } = options;
		const results: SearchResult[] = [];
		const lowerQuery = query.toLowerCase();

		try {
			if (types.includes("node")) {
				const nodes = projectId
					? await db.nodes.where("workspace").equals(projectId).toArray()
					: await db.nodes.toArray();

				for (const node of nodes) {
					const content = extractTextFromNode(node);
					if (node.title.toLowerCase().includes(lowerQuery) || content.toLowerCase().includes(lowerQuery)) {
						const project = await db.projects.get(node.workspace);
						results.push({
							id: node.id,
							type: "node",
							title: node.title,
							content,
							excerpt: generateExcerpt(content, query),
							projectId: node.workspace,
							projectTitle: project?.title,
							score: calculateSimpleScore(node.title, content, query),
							highlights: extractHighlights(content, query),
						});
					}
				}
			}

			if (types.includes("wiki")) {
				const wikiEntries = projectId
					? await db.wikiEntries.where("project").equals(projectId).toArray()
					: await db.wikiEntries.toArray();

				for (const entry of wikiEntries) {
					const content = extractTextFromWiki(entry);
					if (entry.name.toLowerCase().includes(lowerQuery) || content.toLowerCase().includes(lowerQuery)) {
						const project = await db.projects.get(entry.project);
						results.push({
							id: entry.id,
							type: "wiki",
							title: entry.name,
							content,
							excerpt: generateExcerpt(content, query),
							projectId: entry.project,
							projectTitle: project?.title,
							score: calculateSimpleScore(entry.name, content, query),
							highlights: extractHighlights(content, query),
						});
					}
				}
			}

			results.sort((a, b) => b.score - a.score);
			return results.slice(0, limit);
		} catch (error) {
			logger.error("简单搜索失败:", error);
			return [];
		}
	}

	clearIndex() {
		this.nodeIndex = null;
		this.wikiIndex = null;
		this.indexedData.clear();
	}
}

function extractTextFromNode(node: NodeInterface): string {
	try {
		if (!node.content) return "";
		const content = JSON.parse(node.content);
		if (!content?.root) return "";
		return extractTextFromLexical(content.root);
	} catch {
		return node.content || "";
	}
}

function extractTextFromWiki(entry: WikiEntryInterface): string {
	try {
		if (!entry.content) return entry.name;
		const content = JSON.parse(entry.content);
		if (!content?.root) return entry.name;
		return `${entry.name} ${entry.alias?.join(" ") || ""} ${extractTextFromLexical(content.root)}`;
	} catch {
		return `${entry.name} ${entry.content || ""}`;
	}
}

function extractTextFromLexical(node: any): string {
	if (!node) return "";
	if (node.type === "text") return node.text || "";
	if (node.children) return node.children.map(extractTextFromLexical).join(" ");
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
