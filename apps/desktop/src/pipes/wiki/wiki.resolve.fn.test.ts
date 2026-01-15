/**
 * @file wiki.resolve.fn.test.ts
 * @description Wiki 解析函数测试
 */

import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { generateWikiTemplate, getWikiFilesAsync } from "./wiki.resolve.fn"

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/io/api", () => ({
	getContentsByNodeIds: vi.fn(),
	getNodesByWorkspace: vi.fn(),
}))

// 使用 vi.hoisted 来创建可以在 vi.mock 中使用的变量
const { nodesMock } = vi.hoisted(() => {
	const mock = {
		and: vi.fn(),
		equals: vi.fn(),
		toArray: vi.fn(),
		where: vi.fn(),
	}
	mock.where.mockReturnValue(mock)
	mock.equals.mockReturnValue(mock)
	mock.and.mockReturnValue(mock)
	return { nodesMock: mock }
})

vi.mock("@/db/database", () => ({
	database: {
		nodes: nodesMock,
	},
}))

vi.mock("@/log/index", () => ({
	default: {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		start: vi.fn(),
		success: vi.fn(),
		warn: vi.fn(),
	},
}))

import { getContentsByNodeIds, getNodesByWorkspace } from "@/io/api"

// ============================================================================
// Test Data
// ============================================================================

// 使用有效的 UUID v4 格式
const MOCK_NODE_ID = "a1111111-1111-4111-8111-111111111111"
const MOCK_PARENT_ID = "b2222222-2222-4222-8222-222222222222"
const MOCK_WORKSPACE_ID = "c3333333-3333-4333-8333-333333333333"

const mockNode = {
	collapsed: false,
	createDate: "2024-01-01T00:00:00.000Z",
	id: MOCK_NODE_ID,
	lastEdit: "2024-01-01T00:00:00.000Z",
	order: 0,
	parent: null,
	tags: ["wiki"],
	title: "测试 Wiki",
	type: "file" as const,
	workspace: MOCK_WORKSPACE_ID,
}

const mockContent = {
	content: JSON.stringify({
		root: {
			children: [
				{
					children: [{ text: "测试内容", type: "text" }],
					type: "paragraph",
				},
			],
		},
	}),
	contentType: "lexical" as const,
	id: "d4444444-4444-4444-8444-444444444444",
	lastEdit: "2024-01-01T00:00:00.000Z",
	nodeId: MOCK_NODE_ID,
}

// ============================================================================
// Tests
// ============================================================================

describe("Wiki Resolution Functions", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	// ==========================================================================
	// generateWikiTemplate Tests
	// ==========================================================================

	describe("generateWikiTemplate", () => {
		it("应该生成有效的 Lexical JSON 模板", () => {
			const template = generateWikiTemplate("测试标题")
			const parsed = JSON.parse(template)

			expect(parsed.root).toBeDefined()
			expect(parsed.root.type).toBe("root")
			expect(parsed.root.children).toBeInstanceOf(Array)
			expect(parsed.root.children.length).toBeGreaterThan(0)
		})

		it("应该在模板中包含标题", () => {
			const title = "我的 Wiki 条目"
			const template = generateWikiTemplate(title)
			const parsed = JSON.parse(template)

			const titleNode = parsed.root.children.find(
				(child: { type: string }) => child.type === "heading",
			)
			expect(titleNode).toBeDefined()
			expect(titleNode.children[0].text).toBe(title)
		})

		it("应该在模板中包含 wiki 标签", () => {
			const template = generateWikiTemplate("测试")
			const parsed = JSON.parse(template)

			const tagNode = parsed.root.children[0]
			expect(tagNode.children).toBeInstanceOf(Array)
			expect(tagNode.children.some((child: { type: string }) => child.type === "tag")).toBe(true)
		})

		it("应该在模板中包含日期标签", () => {
			const template = generateWikiTemplate("测试")
			const parsed = JSON.parse(template)

			const tagNode = parsed.root.children[0]
			const dateTag = tagNode.children.find(
				(child: { type: string; tagName?: string }) =>
					child.type === "tag" && child.tagName?.includes("-"),
			)
			expect(dateTag).toBeDefined()
		})
	})

	// NOTE: createWikiFileAsync tests have been moved to actions/templated/create-wiki.action.test.ts

	// ==========================================================================
	// getWikiFilesAsync Tests
	// ==========================================================================

	describe("getWikiFilesAsync", () => {
		it("应该成功获取 Wiki 文件列表", async () => {
			nodesMock.toArray.mockResolvedValue([mockNode])
			vi.mocked(getContentsByNodeIds).mockReturnValue(() => Promise.resolve(E.right([mockContent])))
			vi.mocked(getNodesByWorkspace).mockReturnValue(() => Promise.resolve(E.right([mockNode])))

			const result = await getWikiFilesAsync(MOCK_WORKSPACE_ID)()

			// Debug: 打印结果
			if (E.isLeft(result)) {
				console.log("Error:", result.left)
			}

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toBeInstanceOf(Array)
				expect(result.right.length).toBe(1)
				expect(result.right[0].id).toBe(MOCK_NODE_ID)
				expect(result.right[0].name).toBe("测试 Wiki")
			}
		})

		it("应该处理空的 Wiki 文件列表", async () => {
			nodesMock.toArray.mockResolvedValue([])
			vi.mocked(getContentsByNodeIds).mockReturnValue(() => Promise.resolve(E.right([])))
			vi.mocked(getNodesByWorkspace).mockReturnValue(() => Promise.resolve(E.right([])))

			const result = await getWikiFilesAsync(MOCK_WORKSPACE_ID)()

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toEqual([])
			}
		})

		it("应该处理数据库查询失败", async () => {
			nodesMock.toArray.mockRejectedValue(new Error("查询失败"))

			const result = await getWikiFilesAsync(MOCK_WORKSPACE_ID)()

			expect(E.isLeft(result)).toBe(true)
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR")
			}
		})

		it("应该构建正确的文件路径", async () => {
			const parentNode = {
				...mockNode,
				id: MOCK_PARENT_ID,
				title: "Wiki",
				type: "folder" as const,
			}

			const childNode = {
				...mockNode,
				parent: MOCK_PARENT_ID,
			}

			nodesMock.toArray.mockResolvedValue([childNode])
			vi.mocked(getContentsByNodeIds).mockReturnValue(() => Promise.resolve(E.right([mockContent])))
			vi.mocked(getNodesByWorkspace).mockReturnValue(() =>
				Promise.resolve(E.right([parentNode, childNode])),
			)

			const result = await getWikiFilesAsync(MOCK_WORKSPACE_ID)()

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right[0].path).toBe("Wiki/测试 Wiki")
			}
		})

		it("应该处理缺失的内容", async () => {
			nodesMock.toArray.mockResolvedValue([mockNode])
			vi.mocked(getContentsByNodeIds).mockReturnValue(() => Promise.resolve(E.right([])))
			vi.mocked(getNodesByWorkspace).mockReturnValue(() => Promise.resolve(E.right([mockNode])))

			const result = await getWikiFilesAsync(MOCK_WORKSPACE_ID)()

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right[0].content).toBe("")
			}
		})
	})
})
