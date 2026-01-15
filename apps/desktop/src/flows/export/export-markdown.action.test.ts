/**
 * @file export-markdown.action.test.ts
 * @description Markdown 导出 Action 的单元测试
 *
 * 测试覆盖：
 * - 节点内容导出
 * - 直接内容导出
 * - 错误处理
 */

import dayjs from "dayjs"
import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ContentInterface } from "@/types/content/content.interface"
import type { NodeInterface } from "@/types/node/node.interface"

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 NodeInterface 对象
 */
function createTestNode(overrides: Partial<NodeInterface> = {}): NodeInterface {
	return {
		collapsed: overrides.collapsed ?? false,
		createDate: overrides.createDate ?? dayjs().toISOString(),
		id: overrides.id ?? "node-1",
		lastEdit: overrides.lastEdit ?? dayjs().toISOString(),
		order: overrides.order ?? 0,
		parent: overrides.parent ?? null,
		tags: overrides.tags ?? [],
		title: overrides.title ?? "Test Node",
		type: overrides.type ?? "file",
		workspace: overrides.workspace ?? "workspace-1",
	}
}

/**
 * 创建测试用的 ContentInterface 对象
 */
function createTestContent(overrides: Partial<ContentInterface> = {}): ContentInterface {
	return {
		content:
			overrides.content ??
			JSON.stringify({
				root: {
					children: [
						{
							children: [{ format: 0, text: "Hello World", type: "text" }],
							type: "paragraph",
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "root",
					version: 1,
				},
			}),
		contentType: overrides.contentType ?? "lexical",
		id: overrides.id ?? "content-1",
		lastEdit: overrides.lastEdit ?? dayjs().toISOString(),
		nodeId: overrides.nodeId ?? "node-1",
	}
}

/**
 * 运行 TaskEither 并返回 Either 结果
 */
async function runTE<Err, A>(te: TE.TaskEither<Err, A>): Promise<E.Either<Err, A>> {
	return te()
}

// ============================================================================
// Mock Setup
// ============================================================================

const mockGetNodeByIdOrFail = vi.fn()
const mockGetContentByNodeIdOrFail = vi.fn()

vi.mock("@/db/node.db.fn", () => ({
	getNodeByIdOrFail: (...args: unknown[]) => mockGetNodeByIdOrFail(...args),
}))

vi.mock("@/db/content.db.fn", () => ({
	getContentByNodeIdOrFail: (...args: unknown[]) => mockGetContentByNodeIdOrFail(...args),
}))

vi.mock("@/log", () => ({
	default: {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		start: vi.fn(),
		success: vi.fn(),
		warn: vi.fn(),
	},
}))

// Logger removed - not needed in tests
import { exportContentToMarkdown, exportNodeToMarkdown } from "./export-markdown.flow"

// ============================================================================
// Unit Tests
// ============================================================================

describe("exportNodeToMarkdown", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should export node content to Markdown format", async () => {
		const testNode = createTestNode({ title: "My Document" })
		const testContent = createTestContent({ nodeId: testNode.id })

		mockGetNodeByIdOrFail.mockReturnValue(() => Promise.resolve(E.right(testNode)))
		mockGetContentByNodeIdOrFail.mockReturnValue(() => Promise.resolve(E.right(testContent)))

		const result = await runTE(exportNodeToMarkdown({ nodeId: testNode.id }))

		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			expect(result.right.filename).toBe("My Document")
			expect(result.right.extension).toBe("md")
			expect(result.right.content).toContain("Hello World")
		}
	})

	it("should include title in export when option is set", async () => {
		const testNode = createTestNode({ title: "My Document" })
		const testContent = createTestContent({ nodeId: testNode.id })

		mockGetNodeByIdOrFail.mockReturnValue(() => Promise.resolve(E.right(testNode)))
		mockGetContentByNodeIdOrFail.mockReturnValue(() => Promise.resolve(E.right(testContent)))

		const result = await runTE(
			exportNodeToMarkdown({
				nodeId: testNode.id,
				options: { includeTitle: true },
			}),
		)

		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			expect(result.right.content).toContain("# My Document")
		}
	})

	it("should return Left when node not found", async () => {
		const error = { message: "Node not found", type: "NOT_FOUND" as const }
		mockGetNodeByIdOrFail.mockReturnValue(() => Promise.resolve(E.left(error)))

		const result = await runTE(exportNodeToMarkdown({ nodeId: "non-existent" }))

		expect(E.isLeft(result)).toBe(true)
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("NOT_FOUND")
		}
	})

	it("should return Left when content not found", async () => {
		const testNode = createTestNode()
		const error = { message: "Content not found", type: "NOT_FOUND" as const }

		mockGetNodeByIdOrFail.mockReturnValue(() => Promise.resolve(E.right(testNode)))
		mockGetContentByNodeIdOrFail.mockReturnValue(() => Promise.resolve(E.left(error)))

		const result = await runTE(exportNodeToMarkdown({ nodeId: testNode.id }))

		expect(E.isLeft(result)).toBe(true)
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("NOT_FOUND")
		}
	})
})

describe("exportContentToMarkdown", () => {
	it("should export content directly to Markdown format", () => {
		const content = JSON.stringify({
			root: {
				children: [
					{
						children: [{ format: 0, text: "Direct export", type: "text" }],
						type: "paragraph",
					},
				],
				direction: "ltr",
				format: "",
				indent: 0,
				type: "root",
				version: 1,
			},
		})

		const result = exportContentToMarkdown(content)

		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			expect(result.right).toContain("Direct export")
		}
	})

	it("should return Left for invalid content", () => {
		const result = exportContentToMarkdown("invalid json")

		expect(E.isLeft(result)).toBe(true)
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("EXPORT_ERROR")
		}
	})

	it("should return Left for empty content", () => {
		const result = exportContentToMarkdown("")

		expect(E.isLeft(result)).toBe(true)
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("EXPORT_ERROR")
		}
	})
})
