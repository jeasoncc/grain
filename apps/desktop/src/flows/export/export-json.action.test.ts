/**
 * @file export-json.action.test.ts
 * @description JSON 导出 Action 的单元测试
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
import { exportContentToJson, exportNodeToJson } from "./export-json.flow"

// ============================================================================
// Unit Tests
// ============================================================================

describe("exportNodeToJson", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should export node content to JSON format", async () => {
		const testNode = createTestNode({ title: "My Document" })
		const testContent = createTestContent({ nodeId: testNode.id })

		mockGetNodeByIdOrFail.mockReturnValue(() => Promise.resolve(E.right(testNode)))
		mockGetContentByNodeIdOrFail.mockReturnValue(() => Promise.resolve(E.right(testContent)))

		const result = await runTE(exportNodeToJson({ nodeId: testNode.id }))

		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			expect(result.right.filename).toBe("My Document")
			expect(result.right.extension).toBe("json")
			// JSON 导出应该包含有效的 JSON
			expect(() => JSON.parse(result.right.content)).not.toThrow()
		}
	})

	it("should include metadata in export when option is set", async () => {
		const testNode = createTestNode({ title: "My Document" })
		const testContent = createTestContent({ nodeId: testNode.id })

		mockGetNodeByIdOrFail.mockReturnValue(() => Promise.resolve(E.right(testNode)))
		mockGetContentByNodeIdOrFail.mockReturnValue(() => Promise.resolve(E.right(testContent)))

		const result = await runTE(
			exportNodeToJson({
				nodeId: testNode.id,
				options: { includeMetadata: true },
			}),
		)

		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			const parsed = JSON.parse(result.right.content)
			expect(parsed.metadata).toBeDefined()
			expect(parsed.metadata.title).toBe("My Document")
		}
	})

	it("should return Left when node not found", async () => {
		const error = { message: "Node not found", type: "NOT_FOUND" as const }
		mockGetNodeByIdOrFail.mockReturnValue(() => Promise.resolve(E.left(error)))

		const result = await runTE(exportNodeToJson({ nodeId: "non-existent" }))

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

		const result = await runTE(exportNodeToJson({ nodeId: testNode.id }))

		expect(E.isLeft(result)).toBe(true)
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("NOT_FOUND")
		}
	})
})

describe("exportContentToJson", () => {
	it("should export content directly to JSON format", () => {
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

		const result = exportContentToJson(content)

		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			// 应该是有效的 JSON
			expect(() => JSON.parse(result.right)).not.toThrow()
		}
	})

	it("should return Left for invalid content", () => {
		const result = exportContentToJson("invalid json")

		expect(E.isLeft(result)).toBe(true)
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("EXPORT_ERROR")
		}
	})

	it("should return Left for empty content", () => {
		const result = exportContentToJson("")

		expect(E.isLeft(result)).toBe(true)
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("EXPORT_ERROR")
		}
	})

	it("should format JSON with pretty option", () => {
		const content = JSON.stringify({
			root: {
				children: [
					{
						children: [{ format: 0, text: "Test", type: "text" }],
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

		const result = exportContentToJson(content, { indent: 2, pretty: true })

		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			// Pretty JSON 应该包含换行符
			expect(result.right).toContain("\n")
		}
	})
})
