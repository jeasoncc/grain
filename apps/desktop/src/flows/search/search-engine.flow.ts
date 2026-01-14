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
	readonly highlights: readonly string[];
}

/**
 * 搜索选项
 */
export interface SearchOptions {
	readonly types?: readonly SearchResultType[];
	readonly workspaceId?: string;
	readonly limit?: number;
	readonly fuzzy?: boolean;
}

/**
 * 搜索引擎状态接口
 */
export interface SearchEngineState {
	readonly nodeIndex: lunr.Index | null;
	readonly indexedData: ReadonlyMap<string, NodeInterface>;
	readonly nodeContents: ReadonlyMap<string, string>;
	readonly workspaceCache: ReadonlyMap<string, WorkspaceInterface>;
	readonly isIndexing: boolean;
}

// ============================================================================
// Search Engine Class
// ============================================================================

/**
 * 搜索引擎类
 * 提供全文搜索功能，支持 Lunr.js 索引和简单搜索。
 */
export class SearchEngine {
	private state: SearchEngineState = {
		nodeIndex: null,
		indexedData: new Map(),
		nodeContents: new Map(),
		workspaceCache: new Map(),
		isIndexing: false,
	};

	/**
	 * 构建搜索索引
	 */
	async buildIndex(): Promise<void> {
		if (this.state.isIndexing) return;
		this.state = { ...this.state, isIndexing: true };

		try {
			// 获取所有节点
			const nodesResult = await getAllNodes()();
			const nodes: readonly NodeInterface[] = E.isRight(nodesResult)
				? nodesResult.right
				: [];

			// 加载节点内容
			const nodeIds = nodes.map((n: NodeInterface) => n.id);
			const contentsResult = await getContentsByNodeIds(nodeIds)();
			const contents = E.isRight(contentsResult) ? contentsResult.right : [];

			// 构建内容映射
			const nodeContents = new Map<string, string>();
			for (const content of contents) {
				nodeContents.set(content.nodeId, content.content);
			}

			// 批量获取所有相关的 workspace 信息
			const workspaceIds = [...new Set(nodes.map((n) => n.workspace))];
			const workspaceCache = await this.loadWorkspaces(workspaceIds);

			// 构建 Lunr 索引
			const nodeIndex = lunr(function (this: lunr.Builder) {
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
			const indexedData = new Map<string, NodeInterface>();
			for (const node of nodes) {
				indexedData.set(node.id, node);
			}

			// 更新状态
			this.state = {
				nodeIndex,
				indexedData,
				nodeContents,
				workspaceCache,
				isIndexing: false,
			};

			success(`[Search] 索引构建完成: ${nodes.length} 个节点`);
		} catch (error) {
			console.error("[Search] 索引构建失败", { error });
			this.state = { ...this.state, isIndexing: false };
		}
	}

	/**
	 * 批量加载 workspace 信息到缓存
	 */
	private async loadWorkspaces(workspaceIds: readonly string[]): Promise<ReadonlyMap<string, WorkspaceInterface>> {
		// 过滤出未缓存的 workspace
		const uncachedIds = workspaceIds.filter(
			(id) => !this.state.workspaceCache.has(id),
		);
		
		if (uncachedIds.length === 0) {
			return this.state.workspaceCache;
		}

		// 并行获取所有未缓存的 workspace
		const results = await Promise.all(
			uncachedIds.map((id) => getWorkspaceById(id)()),
		);

		// 创建新的缓存映射
		const newEntries: readonly [string, WorkspaceInterface][] = results
			.filter((result): result is E.Right<WorkspaceInterface> => E.isRight(result) && !!result.right)
			.map((result) => [result.right.id, result.right]);

		return new Map([...this.state.workspaceCache, ...newEntries]);
	}

	/**
	 * 从缓存获取 workspace
	 */
	private getWorkspaceFromCache(
		workspaceId: string,
	): WorkspaceInterface | null {
		return this.state.workspaceCache.get(workspaceId) ?? null;
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
	): Promise<readonly SearchResult[]> {
		if (!query.trim()) return [];
		if (!this.state.nodeIndex) await this.buildIndex();

		const { types = ["node"], workspaceId, limit = 50, fuzzy = true } = options;
		const searchQuery = fuzzy ? `${query}~1 ${query}*` : query;

		try {
			if (types.includes("node") && this.state.nodeIndex) {
				const nodeResults = this.state.nodeIndex.search(searchQuery);

				// 收集需要加载的 workspace IDs
				const workspaceIdsToLoad: string[] = [];
				for (const result of nodeResults) {
					const node = this.state.indexedData.get(result.ref);
					if (node && !this.state.workspaceCache.has(node.workspace)) {
						workspaceIdsToLoad.push(node.workspace);
					}
				}
				const uniqueWorkspaceIds = [...new Set(workspaceIdsToLoad)];

				// 批量加载 workspace
				if (uniqueWorkspaceIds.length > 0) {
					this.state = {
						...this.state,
						workspaceCache: await this.loadWorkspaces(uniqueWorkspaceIds),
					};
				}

				// Build results array
				const results: SearchResult[] = [];
				for (const result of nodeResults) {
					const node = this.state.indexedData.get(result.ref);
					if (!node) continue;
					if (workspaceId && node.workspace !== workspaceId) continue;

					const workspace = this.getWorkspaceFromCache(node.workspace);
					const contentStr = this.state.nodeContents.get(node.id) || "";
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
					results.push(searchResult);
				}

				return [...results].sort((a, b) => b.score - a.score).slice(0, limit);
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
	): Promise<readonly SearchResult[]> {
		if (!query.trim()) return [];

		const { types = ["node"], workspaceId, limit = 50 } = options;
		const lowerQuery = query.toLowerCase();

		try {
			if (types.includes("node")) {
				// 获取节点
				let nodes: readonly NodeInterface[];
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
				this.state = {
					...this.state,
					workspaceCache: await this.loadWorkspaces(workspaceIds),
				};

				// Build results
				const results: SearchResult[] = [];
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
						results.push(searchResult);
					}
				}

				return [...results].sort((a, b) => b.score - a.score).slice(0, limit);
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
		this.state = {
			nodeIndex: null,
			indexedData: new Map(),
			nodeContents: new Map(),
			workspaceCache: new Map(),
			isIndexing: false,
		};
	}
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * 搜索引擎单例实例
 */
export const searchEngine = new SearchEngine();