/**
 * @file flows/search/search-engine.flow.ts
 * @description 全局搜索引擎 Flow
 *
 * 使用 Lunr.js 提供全文搜索功能。
 * 支持索引构建、模糊搜索和简单搜索。
 *
 * @requirements 1.2, 4.1, 6.2
 */

import * as E from "fp-ts/Either";
import lunr from "lunr";
import {
	getAllNodes,
	getContentsByNodeIds,
	getNodesByWorkspace,
	getWorkspaceById,
} from "@/io/api";
import { success } from "@/io/log/logger.api";
import {
	calculateSimpleScore,
	extractHighlights,
	extractTextFromContent,
	generateExcerpt,
} from "@/pipes/search/search.highlight.fn";
import type { NodeInterface } from "@/types/node";
import type { WorkspaceInterface } from "@/types/workspace";

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
	readonly highlights: ReadonlyArray<string>;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
	readonly types?: ReadonlyArray<SearchResultType>;
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
	private readonly indexedData: ReadonlyMap<string, NodeInterface> = new Map();
	private readonly nodeContents: ReadonlyMap<string, string> = new Map();
	private readonly workspaceCache: ReadonlyMap<string, WorkspaceInterface> = new Map();
	private readonly isIndexing = false;

	/**
	 * 构建搜索索引
	 */
	async buildIndex(): Promise<void> {
		if (this.isIndexing) return;
		// Create new instance with isIndexing = true
		(this as any).isIndexing = true;

		try {
			// 获取所有节点
			const nodesResult = await getAllNodes()();
			const nodes: ReadonlyArray<NodeInterface> = E.isRight(nodesResult)
				? nodesResult.right
				: [];

			// 加载节点内容
			const nodeIds = nodes.map((n: NodeInterface) => n.id);
			const contentsResult = await getContentsByNodeIds(nodeIds)();
			const contents = E.isRight(contentsResult) ? contentsResult.right : [];

			// 构建内容映射 - create new Map instead of clearing
			const newNodeContents = new Map<string, string>();
			for (const content of contents) {
				newNodeContents.set(content.nodeId, content.content);
			}
			// Replace the entire map
			(this as any).nodeContents = newNodeContents;

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

			// 构建索引数据映射 - create new Map instead of clearing
			const newIndexedData = new Map<string, NodeInterface>();
			for (const node of nodes) {
				newIndexedData.set(node.id, node);
			}
			// Replace the entire map
			(this as any).indexedData = newIndexedData;

			success(`[Search] 索引构建完成: ${nodes.length} 个节点`);
		} catch (error) {
			console.error("[Search] 索引构建失败", { error });
		} finally {
			(this as any).isIndexing = false;
		}
	}

	/**
	 * 批量加载 workspace 信息到缓存
	 */
	private async loadWorkspaces(workspaceIds: ReadonlyArray<string>): Promise<void> {
		// 过滤出未缓存的 workspace
		const uncachedIds = workspaceIds.filter(
			(id) => !this.workspaceCache.has(id),
		);
		if (uncachedIds.length === 0) return;

		// 并行获取所有未缓存的 workspace
		const results = await Promise.all(
			uncachedIds.map((id) => getWorkspaceById(id)()),
		);

		// Create new entries instead of modifying existing map
		const newEntries: ReadonlyArray<readonly [string, WorkspaceInterface]> = results
			.map(result => E.isRight(result) && result.right ? result.right : null)
			.filter((workspace): workspace is WorkspaceInterface => workspace !== null)
			.map(workspace => [workspace.id, workspace] as const);
		
		// Create new map with existing entries plus new ones
		const existingEntries = Array.from(this.workspaceCache.entries());
		(this as any).workspaceCache = new Map([...existingEntries, ...newEntries]);
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
	): Promise<ReadonlyArray<SearchResult>> {
		if (!query.trim()) return [];
		if (!this.nodeIndex) await this.buildIndex();

		const { types = ["node"], workspaceId, limit = 50, fuzzy = true } = options;
		const searchQuery = fuzzy ? `${query}~1 ${query}*` : query;

		try {
			if (types.includes("node") && this.nodeIndex) {
				const nodeResults = this.nodeIndex.search(searchQuery);

				// 收集需要加载的 workspace IDs - use functional approach
				const workspaceIdsToLoad = nodeResults
					.map(result => this.indexedData.get(result.ref))
					.filter((node): node is NodeInterface => node !== undefined)
					.filter(node => !this.workspaceCache.has(node.workspace))
					.map(node => node.workspace);
				
				const uniqueWorkspaceIds = [...new Set(workspaceIdsToLoad)];

				// 批量加载 workspace
				if (uniqueWorkspaceIds.length > 0) {
					await this.loadWorkspaces(uniqueWorkspaceIds);
				}

				// Build results array functionally
				const results = nodeResults
					.map(result => {
						const node = this.indexedData.get(result.ref);
						if (!node) return null;
						if (workspaceId && node.workspace !== workspaceId) return null;

						const workspace = this.getWorkspaceFromCache(node.workspace);
						const contentStr = this.nodeContents.get(node.id) || "";
						const content = extractTextFromContent(contentStr);

						const searchResult: SearchResult = {
							id: node.id,
							type: "node" as SearchResultType,
							title: node.title,
							content,
							excerpt: generateExcerpt(content, query),
							workspaceId: node.workspace,
							workspaceTitle: workspace?.title,
							score: result.score,
							highlights: extractHighlights(content, query),
						};
						return searchResult;
					})
					.filter((result): result is SearchResult => result !== null)
					.toSorted((a, b) => b.score - a.score)
					.slice(0, limit);

				return results;
			}

			return [];
		} catch (error) {
			console.error("[Search] 搜索失败", { error });
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
	): Promise<ReadonlyArray<SearchResult>> {
		if (!query.trim()) return [];

		const { types = ["node"], workspaceId, limit = 50 } = options;
		const lowerQuery = query.toLowerCase();

		try {
			if (types.includes("node")) {
				// 获取节点
				let nodes: ReadonlyArray<NodeInterface>;
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

				// Build results functionally
				const results = nodes
					.map(node => {
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

							const searchResult: SearchResult = {
								id: node.id,
								type: "node" as SearchResultType,
								title: node.title,
								content,
								excerpt: generateExcerpt(content, query),
								workspaceId: node.workspace,
								workspaceTitle: workspace?.title,
								score: calculateSimpleScore(node.title, content, query),
								highlights: extractHighlights(content, query),
							};
							return searchResult;
						}
						return null;
					})
					.filter((result): result is SearchResult => result !== null)
					.toSorted((a, b) => b.score - a.score)
					.slice(0, limit);

				return results;
			}

			return [];
		} catch (error) {
			console.error("[Search] 简单搜索失败", { error });
			return [];
		}
	}

	/**
	 * 清除索引
	 */
	clearIndex(): void {
		this.nodeIndex = null;
		// Replace maps with new empty ones instead of clearing
		(this as any).indexedData = new Map<string, NodeInterface>();
		(this as any).nodeContents = new Map<string, string>();
		(this as any).workspaceCache = new Map<string, WorkspaceInterface>();
	}
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * 搜索引擎单例实例
 */
export const searchEngine = new SearchEngine();
