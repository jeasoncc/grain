import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "./client.api"
import { getLegacyMigrationSnapshot } from "./migration.api"

const nodeResponse = {
	createdAt: 1_735_689_600_000,
	id: "node-1",
	isCollapsed: false,
	nodeType: "file" as const,
	parentId: null,
	sortOrder: 2,
	tags: null,
	title: "Chapter",
	updatedAt: 1_735_689_601_000,
	workspaceId: "workspace-1",
}

const contentResponse = {
	content: "not valid lexical json",
	createdAt: "9223372036854775807",
	id: "content-1",
	nodeId: nodeResponse.id,
	updatedAt: "-9223372036854775808",
	version: "1",
}

describe("getLegacyMigrationSnapshot", () => {
	afterEach(() => vi.restoreAllMocks())

	it("makes one client call and decodes every snapshot collection", async () => {
		const invokeSnapshot = vi.spyOn(api, "getLegacyMigrationSnapshot").mockReturnValue(
			TE.right({
				allContents: [contentResponse],
				allNodes: [nodeResponse],
				workspaceNodes: [nodeResponse],
				workspaceTitle: "Workspace",
			}),
		)

		const result = await getLegacyMigrationSnapshot("workspace-1")()

		expect(invokeSnapshot).toHaveBeenCalledOnce()
		expect(invokeSnapshot).toHaveBeenCalledWith("workspace-1")
		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			expect(result.right.workspaceNodes[0]).toMatchObject({
				id: "node-1",
				order: 2,
				workspace: "workspace-1",
			})
			expect(result.right.allNodes).toEqual(result.right.workspaceNodes)
			expect(result.right.allContents[0]).toMatchObject({
				contentType: "text",
				id: "content-1",
				legacyCreatedAt: "9223372036854775807",
				legacyUpdatedAt: "-9223372036854775808",
				nodeId: "node-1",
			})
		}
	})
})
