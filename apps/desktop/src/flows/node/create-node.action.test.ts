import * as E from "fp-ts/Either"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as nodeRepo from "@/io/api/node.api"
import type { NodeInterface } from "@/types/node"
import { createNode } from "./create-node.flow"

vi.mock("@/io/api/node.api", () => ({
	createNode: vi.fn(),
}))

vi.mock("@/io/log/logger.api", () => ({
	info: vi.fn(),
	success: vi.fn(),
}))

describe("createNode", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("delegates node creation with the current repository contract", async () => {
		const createdNode = {
			collapsed: true,
			createDate: "2025-01-01T00:00:00.000Z",
			id: "node-1",
			lastEdit: "2025-01-01T00:00:00.000Z",
			order: 0,
			parent: "parent-1",
			title: "New note",
			type: "file",
			workspace: "workspace-1",
		} as NodeInterface
		vi.mocked(nodeRepo.createNode).mockReturnValue(() => Promise.resolve(E.right(createdNode)))

		const result = await createNode({
			content: "initial content",
			parentId: "parent-1",
			title: "New note",
			type: "file",
			workspaceId: "workspace-1",
		})()

		expect(nodeRepo.createNode).toHaveBeenCalledWith(
			{
				collapsed: true,
				parent: "parent-1",
				title: "New note",
				type: "file",
				workspace: "workspace-1",
			},
			"initial content",
		)
		expect(result).toEqual(E.right(createdNode))
	})
})
