/**
 * @file fn/search/search.engine.fn.test.ts
 * @description 搜索引擎测试
 *
 * 测试 SearchEngine 类的核心功能：
 * - 索引构建
 * - 模糊搜索
 * - 简单搜索
 * - 索引清除
 * - 边界情况处理
 */

import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SearchEngine } from "./search.engine.fn"

// ============================================================================
// Mocks
// ============================================================================

// Mock @/io/api 模块
vi.mock("@/io/api", () => ({
	getAllNodes: vi.fn(),
	getNodesByWorkspace: vi.fn(),
	getContentsByNodeIds: vi.fn(),
	getWorkspaceById: vi.fn(),
}))

// Mock @/log/index 模块
vi.mock("@/log/index", () => ({
	default: {
		info: vi.fn(),
		success: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		start: vi.fn(),
	},
}))

// 导入 mock 后的模块
import { getAllNodes, getContentsByNodeIds, getNodesByWorkspace, getWorkspaceById } from "@/io/api"

// ============================================================================
// Test Data
// ============================================================================

const mockNodes = [
	{
		id: "node-1",
		title: "测试文档",
		type: "file" as const,
		workspace: "ws-1",
		parent: null,
		order: 0,
		collapsed: false,
		tags: ["测试", "文档"],
		createDate: "2024-01-01T00:00:00.000Z",
		lastEdit: "2024-01-01T00:00:00.000Z",
	},
	{
		id: "node-2",
		title: "另一个文件",
		type: "file" as const,
		workspace: "ws-1",
		parent: null,
		order: 1,
		collapsed: false,
		tags: ["示例"],
		createDate: "2024-01-02T00:00:00.000Z",
		lastEdit: "2024-01-02T00:00:00.000Z",
	},
	{
		id: "node-3",
		title: "工作区2的文件",
		type: "file" as const,
		workspace: "ws-2",
		parent: null,
		order: 0,
		collapsed: false,
		tags: [],
		createDate: "2024-01-03T00:00:00.000Z",
		lastEdit: "2024-01-03T00:00:00.000Z",
	},
]

const mockContents = [
	{
		id: "content-1",
		nodeId: "node-1",
		content: JSON.stringify({
			root: {
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", text: "这是测试内容，包含关键词搜索" }],
					},
				],
			},
		}),
		contentType: "lexical" as const,
		lastEdit: "2024-01-01T00:00:00.000Z",
	},
	{
		id: "content-2",
		nodeId: "node-2",
		content: JSON.stringify({
			root: {
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", text: "另一个文件的内容" }],
					},
				],
			},
		}),
		contentType: "lexical" as const,
		lastEdit: "2024-01-02T00:00:00.000Z",
	},
	{
		id: "content-3",
		nodeId: "node-3",
		content: JSON.stringify({
			root: {
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", text: "工作区2的内容" }],
					},
				],
			},
		}),
		contentType: "lexical" as const,
		lastEdit: "2024-01-03T00:00:00.000Z",
	},
]

const mockWorkspaces = {
	"ws-1": {
		id: "ws-1",
		title: "工作区1",
		description: "",
		author: "",
		publisher: "",
		language: "zh-CN",
		members: [],
		owner: "user-1",
		createDate: "2024-01-01T00:00:00.000Z",
		lastOpen: "2024-01-01T00:00:00.000Z",
	},
	"ws-2": {
		id: "ws-2",
		title: "工作区2",
		description: "",
		author: "",
		publisher: "",
		language: "zh-CN",
		members: [],
		owner: "user-1",
		createDate: "2024-01-02T00:00:00.000Z",
		lastOpen: "2024-01-02T00:00:00.000Z",
	},
}

// ============================================================================
// Test Setup
// ============================================================================

describe("SearchEngine", () => {
	let searchEngine: SearchEngine

	beforeEach(() => {
		// 重置所有 mock
		vi.clearAllMocks()

		// 创建新的搜索引擎实例
		searchEngine = new SearchEngine()

		// 设置默认 mock 返回值
		vi.mocked(getAllNodes).mockReturnValue(() => Promise.resolve(E.right(mockNodes)))
		vi.mocked(getNodesByWorkspace).mockImplementation((workspaceId: string) => {
			return () => Promise.resolve(E.right(mockNodes.filter((n) => n.workspace === workspaceId)))
		})
		vi.mocked(getContentsByNodeIds).mockReturnValue(() => Promise.resolve(E.right(mockContents)))
		vi.mocked(getWorkspaceById).mockImplementation((id: string) => {
			return () => Promise.resolve(E.right(mockWorkspaces[id as keyof typeof mockWorkspaces]))
		})
	})

	afterEach(() => {
		searchEngine.clearIndex()
	})

	// ==========================================================================
	// buildIndex 测试
	// ==========================================================================

	describe("buildIndex", () => {
		it("应该成功构建索引", async () => {
			await searchEngine.buildIndex()

			// 验证调用了正确的数据库函数
			expect(getAllNodes).toHaveBeenCalled()
			expect(getContentsByNodeIds).toHaveBeenCalledWith(["node-1", "node-2", "node-3"])
		})

		it("应该在索引构建中时跳过重复构建", async () => {
			// 同时调用两次 buildIndex
			const promise1 = searchEngine.buildIndex()
			const promise2 = searchEngine.buildIndex()

			await Promise.all([promise1, promise2])

			// getAllNodes 应该只被调用一次
			expect(getAllNodes).toHaveBeenCalledTimes(1)
		})

		it("应该处理空节点列表", async () => {
			vi.mocked(getAllNodes).mockReturnValue(() => Promise.resolve(E.right([])))

			await searchEngine.buildIndex()

			// 不应该抛出错误
			expect(getAllNodes).toHaveBeenCalled()
		})

		it("应该处理数据库错误", async () => {
			vi.mocked(getAllNodes).mockReturnValue(() =>
				Promise.resolve(E.left({ type: "DB_ERROR", message: "数据库错误" })),
			)

			// 不应该抛出错误
			await expect(searchEngine.buildIndex()).resolves.not.toThrow()
		})
	})

	// ==========================================================================
	// search 测试（Lunr.js 索引搜索）
	// 注意：Lunr.js 对中文支持有限，这些测试主要验证搜索流程
	// ==========================================================================

	describe("search", () => {
		it("应该对空查询返回空数组", async () => {
			const results = await searchEngine.search("")
			expect(results).toEqual([])

			const results2 = await searchEngine.search("   ")
			expect(results2).toEqual([])
		})

		it("应该按工作区过滤结果", async () => {
			const results = await searchEngine.search("file", {
				workspaceId: "ws-1",
			})

			// 所有结果都应该属于 ws-1
			for (const result of results) {
				expect(result.workspaceId).toBe("ws-1")
			}
		})

		it("应该限制返回结果数量", async () => {
			const results = await searchEngine.search("file", { limit: 1 })

			expect(results.length).toBeLessThanOrEqual(1)
		})

		it("应该按分数排序结果", async () => {
			const results = await searchEngine.search("file")

			// 验证结果按分数降序排列
			for (let i = 1; i < results.length; i++) {
				expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
			}
		})

		it("应该在索引不存在时自动构建", async () => {
			// 清除索引
			searchEngine.clearIndex()
			vi.mocked(getAllNodes).mockClear()

			// 搜索应该触发索引构建
			await searchEngine.search("test")

			expect(getAllNodes).toHaveBeenCalled()
		})
	})

	// ==========================================================================
	// simpleSearch 测试
	// ==========================================================================

	describe("simpleSearch", () => {
		it("应该返回匹配标题的结果", async () => {
			const results = await searchEngine.simpleSearch("测试")

			expect(results.length).toBeGreaterThan(0)
			expect(results[0].title).toBe("测试文档")
		})

		it("应该返回匹配内容的结果", async () => {
			const results = await searchEngine.simpleSearch("关键词")

			expect(results.length).toBeGreaterThan(0)
			expect(results[0].id).toBe("node-1")
		})

		it("应该按工作区过滤结果", async () => {
			const results = await searchEngine.simpleSearch("内容", {
				workspaceId: "ws-1",
			})

			// 所有结果都应该属于 ws-1
			for (const result of results) {
				expect(result.workspaceId).toBe("ws-1")
			}
		})

		it("应该对空查询返回空数组", async () => {
			const results = await searchEngine.simpleSearch("")
			expect(results).toEqual([])
		})

		it("应该不区分大小写", async () => {
			// 添加一个英文节点用于测试
			const nodesWithEnglish = [
				...mockNodes,
				{
					id: "node-4",
					title: "Hello World",
					type: "file" as const,
					workspace: "ws-1",
					parent: null,
					order: 3,
					collapsed: false,
					tags: [],
					createDate: "2024-01-04T00:00:00.000Z",
					lastEdit: "2024-01-04T00:00:00.000Z",
				},
			]

			vi.mocked(getAllNodes).mockReturnValue(() => Promise.resolve(E.right(nodesWithEnglish)))

			const contentsWithEnglish = [
				...mockContents,
				{
					id: "content-4",
					nodeId: "node-4",
					content: JSON.stringify({
						root: {
							children: [
								{
									type: "paragraph",
									children: [{ type: "text", text: "Hello World content" }],
								},
							],
						},
					}),
					contentType: "lexical" as const,
					lastEdit: "2024-01-04T00:00:00.000Z",
				},
			]

			vi.mocked(getContentsByNodeIds).mockReturnValue(() =>
				Promise.resolve(E.right(contentsWithEnglish)),
			)

			const results = await searchEngine.simpleSearch("hello")

			expect(results.length).toBeGreaterThan(0)
			expect(results.some((r) => r.title === "Hello World")).toBe(true)
		})
	})

	// ==========================================================================
	// clearIndex 测试
	// ==========================================================================

	describe("clearIndex", () => {
		it("应该清除所有索引数据", async () => {
			// 先构建索引
			await searchEngine.buildIndex()

			// 清除索引
			searchEngine.clearIndex()

			// 再次搜索应该重新构建索引
			vi.mocked(getAllNodes).mockClear()
			await searchEngine.search("测试")

			// 应该重新调用 getAllNodes
			expect(getAllNodes).toHaveBeenCalled()
		})
	})

	// ==========================================================================
	// 边界情况测试
	// ==========================================================================

	describe("边界情况", () => {
		it("应该处理没有内容的节点", async () => {
			vi.mocked(getContentsByNodeIds).mockReturnValue(() => Promise.resolve(E.right([])))

			// simpleSearch 应该仍然能搜索标题
			const results = await searchEngine.simpleSearch("测试")
			expect(results.length).toBeGreaterThan(0)
		})

		it("应该处理没有标签的节点", async () => {
			const nodesWithoutTags = mockNodes.map((n) => ({
				...n,
				tags: undefined as string[] | undefined,
			}))
			vi.mocked(getAllNodes).mockReturnValue(() => Promise.resolve(E.right(nodesWithoutTags)))

			// 不应该抛出错误
			await expect(searchEngine.simpleSearch("测试")).resolves.not.toThrow()
		})

		it("应该处理无效的 JSON 内容", async () => {
			const invalidContents = [
				{
					id: "content-1",
					nodeId: "node-1",
					content: "invalid json",
					contentType: "lexical" as const,
					lastEdit: "2024-01-01T00:00:00.000Z",
				},
			]

			vi.mocked(getContentsByNodeIds).mockReturnValue(() =>
				Promise.resolve(E.right(invalidContents)),
			)

			// 不应该抛出错误
			await expect(searchEngine.simpleSearch("测试")).resolves.not.toThrow()
		})

		it("应该处理 workspace 获取失败", async () => {
			vi.mocked(getWorkspaceById).mockReturnValue(() =>
				Promise.resolve(E.left({ type: "DB_ERROR", message: "获取失败" })),
			)

			const results = await searchEngine.simpleSearch("测试")

			// 应该仍然返回结果，但 workspaceTitle 为 undefined
			expect(results.length).toBeGreaterThan(0)
			expect(results[0].workspaceTitle).toBeUndefined()
		})
	})
})
