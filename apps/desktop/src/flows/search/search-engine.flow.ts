/**
 * @file flows/search/search-engine.flow.ts
 * @description 全局搜索引擎 Flow
 *
 * 使用 Lunr.js 提供全文搜索功能。
 * 支持索引构建、模糊搜索和简单搜索。
 *
 * @requirements 1.2, 4.1, 6.2
 */

import * as E from "fp-ts/Either"
import { orderBy } from "es-toolkit"
import lunr from "lunr"
import { getAllNodes, getContentsByNodeIds, getNodesByWorkspace, getWorkspaceById } from "@/io/api"
import { success } from "@/io/log/logger.api"
import {
	calculateSimpleScore,
	extractHighlights,
	extractTextFromContent,
	generateExcerpt,
} from "@/pipes/search/search.highlight.fn"
import type { NodeInterface } from "@/types/node"
import type { WorkspaceInterface } from "@/types/workspace"

// ============================================================================
// Types
// ============================================================================

/**
 * 搜索结果类型
 */
export type SearchResultType = "project" | "node"

/**
 * 搜索结果
 */
export interface SearchResult {
	readonly id: string
	readonly type: SearchResultType
	readonly title: string
	readonly content: string
	readonly excerpt: string
	readonly workspaceId?: string
	readonly workspaceTitle?: string
	readonly score: number
	readonly highlights: readonly string[]
}

/**
 * 搜索选项
 */
export interface SearchOptions {
	readonly types?: readonly SearchResultType[]
	readonly workspaceId?: string
	readonly limit?: number
	readonly fuzzy?: boolean
}

/**
 * 搜索引擎状态接口
 */
export interface SearchEngineState {
	readonly nodeIndex: lunr.Index | null
	readonly indexedData: ReadonlyMap<string, NodeInterface>
	readonly nodeContents: ReadonlyMap<string, string>
	readonly workspaceCache: ReadonlyMap<string, WorkspaceInterface>
	readonly isIndexing: boolean
}

// ============================================================================
// Search Engine State Management
// ============================================================================

/**
 * 初始搜索引擎状态
 */
const createInitialState = (): SearchEngineState => ({
	indexedData: new Map(),
	isIndexing: false,
	nodeContents: new Map(),
	nodeIndex: null,
	workspaceCache: new Map(),
})

/**
 * 全局搜索引擎状态
 */
let searchEngineState: SearchEngineState = createInitialState()

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 批量加载 workspace 信息到缓存
 */
const loadWorkspaces = async (
	workspaceIds: readonly string[],
	currentCache: ReadonlyMap<string, WorkspaceInterface>,
): Promise<ReadonlyMap<string, WorkspaceInterface>> => {
	// 过滤出未缓存的 workspace
	const uncachedIds = workspaceIds.filter((id) => !currentCache.has(id))

	if (uncachedIds.length === 0) {
		return currentCache
	}

	// 并行获取所有未缓存的 workspace
	const results = await Promise.all(uncachedIds.map((id) => getWorkspaceById(id)()))

	// 创建新的缓存映射
	const newEntries: readonly (readonly [string, WorkspaceInterface])[] = results
		.filter((result): result is E.Right<WorkspaceInterface> => E.isRight(result) && !!result.right)
		.map((result) => [result.right.id, result.right] as const)

	return new Map([...currentCache, ...newEntries])
}

/**
 * 从缓存获取 workspace
 */
const getWorkspaceFromCache = (
	workspaceId: string,
	cache: ReadonlyMap<string, WorkspaceInterface>,
): WorkspaceInterface | null => {
	return cache.get(workspaceId) ?? null
}

// ============================================================================
// Search Engine Functions
// ============================================================================

/**
 * 构建搜索索引
 */
export const buildSearchIndex = async (): Promise<void> => {
	if (searchEngineState.isIndexing) return
	searchEngineState = { ...searchEngineState, isIndexing: true }

	try {
		// 获取所有节点
		const nodesResult = await getAllNodes()()
		const nodes: readonly NodeInterface[] = E.isRight(nodesResult) ? nodesResult.right : []

		// 加载节点内容
		const nodeIds = nodes.map((n: NodeInterface) => n.id)
		const contentsResult = await getContentsByNodeIds(nodeIds)()
		const contents = E.isRight(contentsResult) ? contentsResult.right : []

		// 构建内容映射
		const nodeContents = new Map<string, string>(
			contents.map((content) => [content.nodeId, content.content]),
		)

		// 批量获取所有相关的 workspace 信息
		const workspaceIds = [...new Set(nodes.map((n) => n.workspace))]
		const workspaceCache = await loadWorkspaces(workspaceIds, searchEngineState.workspaceCache)

		// 构建 Lunr 索引
		const nodeIndex = lunr(function (this: lunr.Builder) {
			this.ref("id")
			this.field("title", { boost: 10 })
			this.field("tags", { boost: 5 })
			this.field("content")
			this.pipeline.remove(lunr.stemmer)
			this.searchPipeline.remove(lunr.stemmer)

			for (const node of nodes) {
				const contentStr = contents.find((c) => c.nodeId === node.id)?.content || ""
				const textContent = extractTextFromContent(contentStr)
				this.add({
					content: textContent,
					id: node.id,
					tags: node.tags?.join(" ") || "",
					title: node.title,
				})
			}
		})

		// 构建索引数据映射
		const indexedData = new Map<string, NodeInterface>(nodes.map((node) => [node.id, node]))

		// 更新状态
		searchEngineState = {
			indexedData,
			isIndexing: false,
			nodeContents,
			nodeIndex,
			workspaceCache,
		}

		success(`[Search] 索引构建完成: ${nodes.length} 个节点`)
	} catch (error) {
		console.error("[Search] 索引构建失败", { error })
		searchEngineState = { ...searchEngineState, isIndexing: false }
	}
}

/**
 * 执行搜索
 *
 * @param query - 搜索查询
 * @param options - 搜索选项
 * @returns 搜索结果数组
 */
export const search = async (
	query: string,
	options: SearchOptions = {},
): Promise<readonly SearchResult[]> => {
	if (!query.trim()) return []
	if (!searchEngineState.nodeIndex) await buildSearchIndex()

	const { types = ["node"], workspaceId, limit = 50, fuzzy = true } = options
	const searchQuery = fuzzy ? `${query}~1 ${query}*` : query

	try {
		if (types.includes("node") && searchEngineState.nodeIndex) {
			const nodeResults = searchEngineState.nodeIndex.search(searchQuery)

			// 收集需要加载的 workspace IDs
			const workspaceIdsToLoad: readonly string[] = nodeResults
				.map((result) => {
					const node = searchEngineState.indexedData.get(result.ref)
					return node && !searchEngineState.workspaceCache.has(node.workspace)
						? node.workspace
						: null
				})
				.filter((id): id is string => id !== null)

			const uniqueWorkspaceIds = [...new Set(workspaceIdsToLoad)]

			// 批量加载 workspace
			if (uniqueWorkspaceIds.length > 0) {
				searchEngineState = {
					...searchEngineState,
					workspaceCache: await loadWorkspaces(
						uniqueWorkspaceIds,
						searchEngineState.workspaceCache,
					),
				}
			}

			// Build results array
			const results: readonly SearchResult[] = nodeResults.flatMap((result) => {
				const node = searchEngineState.indexedData.get(result.ref)
				if (!node) return []
				if (workspaceId && node.workspace !== workspaceId) return []

				const workspace = getWorkspaceFromCache(node.workspace, searchEngineState.workspaceCache)
				const contentStr = searchEngineState.nodeContents.get(node.id) || ""
				const content = extractTextFromContent(contentStr)

				return [
					{
						content,
						excerpt: generateExcerpt(content, query),
						highlights: extractHighlights(content, query),
						id: node.id,
						score: result.score,
						title: node.title,
						type: "node" as SearchResultType,
						workspaceId: node.workspace,
						workspaceTitle: workspace?.title,
					} satisfies SearchResult,
				]
			})

			return orderBy(results, [(item) => item.score], ['desc'])
				.slice(0, limit)
		}

		return []
	} catch (error) {
		console.error("[Search] 搜索失败", { error })
		return []
	}
}

/**
 * 执行简单搜索（不使用 Lunr 索引）
 *
 * @param query - 搜索查询
 * @param options - 搜索选项
 * @returns 搜索结果数组
 */
export const simpleSearch = async (
	query: string,
	options: SearchOptions = {},
): Promise<readonly SearchResult[]> => {
	if (!query.trim()) return []

	const { types = ["node"], workspaceId, limit = 50 } = options
	const lowerQuery = query.toLowerCase()

	try {
		if (types.includes("node")) {
			// 获取节点
			let nodes: readonly NodeInterface[]
			if (workspaceId) {
				const nodesResult = await getNodesByWorkspace(workspaceId)()
				nodes = E.isRight(nodesResult) ? nodesResult.right : []
			} else {
				const nodesResult = await getAllNodes()()
				nodes = E.isRight(nodesResult) ? nodesResult.right : []
			}

			// 获取所有节点的内容
			const nodeIds = nodes.map((n: NodeInterface) => n.id)
			const contentsResult = await getContentsByNodeIds(nodeIds)()
			const contents = E.isRight(contentsResult) ? contentsResult.right : []
			const contentMap = new Map(contents.map((c) => [c.nodeId, c.content]))

			// 批量加载所有相关的 workspace
			const workspaceIds = [...new Set(nodes.map((n) => n.workspace))]
			searchEngineState = {
				...searchEngineState,
				workspaceCache: await loadWorkspaces(workspaceIds, searchEngineState.workspaceCache),
			}

			// Build results
			const results: readonly SearchResult[] = nodes.flatMap((node) => {
				const contentStr = contentMap.get(node.id) || ""
				const content = extractTextFromContent(contentStr)
				const tagsStr = node.tags?.join(" ") || ""

				// 检查是否匹配
				if (
					node.title.toLowerCase().includes(lowerQuery) ||
					content.toLowerCase().includes(lowerQuery) ||
					tagsStr.toLowerCase().includes(lowerQuery)
				) {
					const workspace = getWorkspaceFromCache(node.workspace, searchEngineState.workspaceCache)

					return [
						{
							content,
							excerpt: generateExcerpt(content, query),
							highlights: extractHighlights(content, query),
							id: node.id,
							score: calculateSimpleScore(node.title, content, query),
							title: node.title,
							type: "node" as SearchResultType,
							workspaceId: node.workspace,
							workspaceTitle: workspace?.title,
						} satisfies SearchResult,
					]
				}
				return []
			})

			return orderBy(results, [(item) => item.score], ['desc'])
				.slice(0, limit)
		}

		return []
	} catch (error) {
		console.error("[Search] 简单搜索失败", { error })
		return []
	}
}

/**
 * 清除索引
 */
export const clearSearchIndex = (): void => {
	searchEngineState = createInitialState()
}

// ============================================================================
// Legacy Compatibility
// ============================================================================

/**
 * 搜索引擎兼容性对象
 * 保持与原有 API 的兼容性
 */
export const searchEngine = {
	buildIndex: buildSearchIndex,
	clearIndex: clearSearchIndex,
	search,
	simpleSearch,
}
