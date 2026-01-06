/**
 * @file fn/search/search.engine.fn.ts
 * @description 全局搜索引擎
 *
 * 使用 Lunr.js 提供全文搜索功能。
 * 支持索引构建、模糊搜索和简单搜索。
 *
 * @requirements 1.2, 4.1, 6.2
 */

import * as E from "fp-ts/Either";
import lunr from "lunr";
import logger from "@/log/index";
import {
	getAllNodes,
	getContentsByNodeIds,
	getNodesByWorkspace,
	getWorkspaceById,
} from "@/io/api";
import type { NodeInterface } from "@/types/node";
import type { WorkspaceInterface } from "@/types/workspace";
import {
	calculateSimpleScore,
	extractHighlights,
	extractTextFromContent,
	generateExcerpt,
} from "./search.highlight.fn";

// ============================================================================
// Types
// ============================================================================

/**
 * 搜索结果类型
 */
export type SearchResultType = "project" | "node";

/**
 * 搜索结果
 */
export interface SearchResult {
	readonly id: string;
	readonly type: SearchResultType;
	readonly title: string;
	readonly content: string;
	readonly excerpt: string;
	readonly workspaceId?: string;
	readonly workspaceTitle?: string;
	readonly score: number;
	readonly highlights: string[];
}

/**
 * 搜索选项
 */
export interface SearchOptions {
	readonly types?: SearchResultType[];
	readonly workspaceId?: string;
	readonly limit?: number;
	readonly fuzzy?: boolean;
}

// ============================================================================
// Search Engine Class
// ============================================================================

/**
 * 搜索引擎类
 *
 * 提供全文搜索功能，支持 Lunr.js 索引和简单搜索。
 */
export class SearchEngine {
	private nodeIndex: lunr.Index | null = null;
	private indexedData: Map<string, NodeInterface> = new Map();
	private nodeContents: Map<string, string> = new Map();
	private workspaceCache: Map<string, WorkspaceInterface> = new Map();
	private isIndexing = false;

	/**
	 * 构建搜索索引
	 */
	async buildIndex(): Promise<void> {
		if (this.isIndexing) return;
		this.isIndexing = true;

		try {
			// 获取所有节点
			const nodesResult = await getAllNodes()();
			const nodes: NodeInterface[] = E.isRight(nodesResult)
				? nodesResult.right
				: [];

			// 加载节点内容
			const nodeIds = nodes.map((n: NodeInterface) => n.id);
			const contentsResult = await getContentsByNodeIds(nodeIds)();
			const contents = E.isRight(contentsResult) ? contentsResult.right : [];

			// 构建内容映射
			this.nodeContents.clear();
			for (const content of contents) {
				this.nodeContents.set(content.nodeId, content.content);
			}

			// 批量获取所有相关的 workspace 信息
			const workspaceIds = [...new Set(nodes.map((n) => n.workspace))];
			await this.loadWorkspaces(workspaceIds);

			// 构建 Lunr 索引
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

			// 构建索引数据映射
			this.indexedData.clear();
			for (const node of nodes) {
				this.indexedData.set(node.id, node);
			}

			logger.success(`[Search] 索引构建完成: ${nodes.length} 个节点`);
		} catch (error) {
			logger.error("[Search] 索引构建失败:", error);
		} finally {
			this.isIndexing = false;
		}
	}

	/**
	 * 批量加载 workspace 信息到缓存
	 */
	private async loadWorkspaces(workspaceIds: string[]): Promise<void> {
		// 过滤出未缓存的 workspace
		const uncachedIds = workspaceIds.filter(
			(id) => !this.workspaceCache.has(id),
		);
		if (uncachedIds.length === 0) return;

		// 并行获取所有未缓存的 workspace
		const results = await Promise.all(
			uncachedIds.map((id) => getWorkspaceById(id)()),
		);

		for (const result of results) {
			if (E.isRight(result) && result.right) {
				this.workspaceCache.set(result.right.id, result.right);
			}
		}
	}

	/**
	 * 从缓存获取 workspace
	 */
	private getWorkspaceFromCache(
		workspaceId: string,
	): WorkspaceInterface | null {
		return this.workspaceCache.get(workspaceId) ?? null;
	}

	/**
	 * 执行搜索
	 *
	 * @param query - 搜索查询
	 * @param options - 搜索选项
	 * @returns 搜索结果数组
	 */
	async search(
		query: string,
		options: SearchOptions = {},
	): Promise<SearchResult[]> {
		if (!query.trim()) return [];
		if (!this.nodeIndex) await this.buildIndex();

		const { types = ["node"], workspaceId, limit = 50, fuzzy = true } = options;
		const results: SearchResult[] = [];
		const searchQuery = fuzzy ? `${query}~1 ${query}*` : query;

		try {
			if (types.includes("node") && this.nodeIndex) {
				const nodeResults = this.nodeIndex.search(searchQuery);

				// 收集需要加载的 workspace IDs
				const workspaceIdsToLoad = new Set<string>();
				for (const result of nodeResults) {
					const node = this.indexedData.get(result.ref);
					if (node && !this.workspaceCache.has(node.workspace)) {
						workspaceIdsToLoad.add(node.workspace);
					}
				}

				// 批量加载 workspace
				if (workspaceIdsToLoad.size > 0) {
					await this.loadWorkspaces([...workspaceIdsToLoad]);
				}

				for (const result of nodeResults) {
					const node = this.indexedData.get(result.ref);
					if (!node) continue;
					if (workspaceId && node.workspace !== workspaceId) continue;

					const workspace = this.getWorkspaceFromCache(node.workspace);
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
			logger.error("[Search] 搜索失败:", error);
			return [];
		}
	}

	/**
	 * 执行简单搜索（不使用 Lunr 索引）
	 *
	 * @param query - 搜索查询
	 * @param options - 搜索选项
	 * @returns 搜索结果数组
	 */
	async simpleSearch(
		query: string,
		options: SearchOptions = {},
	): Promise<SearchResult[]> {
		if (!query.trim()) return [];

		const { types = ["node"], workspaceId, limit = 50 } = options;
		const results: SearchResult[] = [];
		const lowerQuery = query.toLowerCase();

		try {
			if (types.includes("node")) {
				// 获取节点
				let nodes: NodeInterface[];
				if (workspaceId) {
					const nodesResult = await getNodesByWorkspace(workspaceId)();
					nodes = E.isRight(nodesResult) ? nodesResult.right : [];
				} else {
					const nodesResult = await getAllNodes()();
					nodes = E.isRight(nodesResult) ? nodesResult.right : [];
				}

				// 获取所有节点的内容
				const nodeIds = nodes.map((n: NodeInterface) => n.id);
				const contentsResult = await getContentsByNodeIds(nodeIds)();
				const contents = E.isRight(contentsResult) ? contentsResult.right : [];
				const contentMap = new Map(contents.map((c) => [c.nodeId, c.content]));

				// 批量加载所有相关的 workspace
				const workspaceIds = [...new Set(nodes.map((n) => n.workspace))];
				await this.loadWorkspaces(workspaceIds);

				for (const node of nodes) {
					const contentStr = contentMap.get(node.id) || "";
					const content = extractTextFromContent(contentStr);
					const tagsStr = node.tags?.join(" ") || "";

					// 检查是否匹配
					if (
						node.title.toLowerCase().includes(lowerQuery) ||
						content.toLowerCase().includes(lowerQuery) ||
						tagsStr.toLowerCase().includes(lowerQuery)
					) {
						const workspace = this.getWorkspaceFromCache(node.workspace);

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
			logger.error("[Search] 简单搜索失败:", error);
			return [];
		}
	}

	/**
	 * 清除索引
	 */
	clearIndex(): void {
		this.nodeIndex = null;
		this.indexedData.clear();
		this.nodeContents.clear();
		this.workspaceCache.clear();
	}
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * 搜索引擎单例实例
 */
export const searchEngine = new SearchEngine();
