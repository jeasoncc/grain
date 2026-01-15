/**
 * @file delete-node.action.test.ts
 * @description 删除节点 Action 测试
 */

import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { deleteNode } from "./delete-node.flow"

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/io/api/node.api", () => ({
	deleteNode: vi.fn(),
}))

vi.mock("@/log/index", () => ({
	default: {
		start: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
	},
}))

import { deleteNode as deleteNodeRepo } from "@/io/api/node.api"

// ============================================================================
// Tests
// ============================================================================

describe("deleteNode", () => {
	beforeEach(() => {
		vi.clearAllMocks()

		// 设置默认 mock 返回值
		vi.mocked(deleteNodeRepo).mockReturnValue(() => Promise.resolve(E.right(undefined)))
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it("应该成功删除节点", async () => {
		const nodeId = "node-1"

		const result = await deleteNode(nodeId)()

		expect(E.isRight(result)).toBe(true)
		expect(deleteNodeRepo).toHaveBeenCalledWith(nodeId)
	})

	it("应该处理删除失败", async () => {
		vi.mocked(deleteNodeRepo).mockReturnValue(() =>
			Promise.resolve(E.left({ type: "DB_ERROR", message: "删除失败" })),
		)

		const nodeId = "node-1"

		const result = await deleteNode(nodeId)()

		expect(E.isLeft(result)).toBe(true)
		if (E.isLeft(result)) {
			expect(result.left.message).toContain("删除失败")
		}
	})

	it("应该处理空节点 ID", async () => {
		const nodeId = ""

		await deleteNode(nodeId)()

		expect(deleteNodeRepo).toHaveBeenCalledWith("")
	})
})
