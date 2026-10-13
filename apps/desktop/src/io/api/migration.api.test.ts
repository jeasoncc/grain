import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { afterEach, describe, expect, it, vi } from "vitest"
import { dbError } from "@/types/error"
import { api } from "./client.api"
import { getLegacyMigrationSnapshot, listLegacyWorkspaces } from "./migration.api"

const graph = {
	workspace: { id: "workspace-1", name: "原始\u0000Workspace", description: "description", createdAt: "9223372036854775807", updatedAt: "-9223372036854775808" },
	nodes: [{ id: "node-1", workspaceId: "workspace-1", parentId: "missing-parent", title: "Chapter", nodeType: "unknown-node-type", isCollapsed: "9007199254740993", sortOrder: "-9007199254740993", tags: '[ "原始" ]', createdAt: "9223372036854775807", updatedAt: "-9223372036854775808" }],
}
const content = { content: "not valid lexical json\u0000你好", createdAt: "9223372036854775807", id: "content-1", nodeId: "node-1", updatedAt: "-9223372036854775808", version: "9007199254740993" }

describe("atomic legacy migration snapshot", () => {
	afterEach(() => vi.restoreAllMocks())

	it("retains raw graph tuples and integer precision without fabricated timestamps/types", async () => {
		vi.spyOn(api, "getLegacyMigrationSnapshot").mockReturnValue(TE.right({ graph, contents: [content] }))
		const result = await getLegacyMigrationSnapshot("workspace-1")()
		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			expect(result.right.graph).toEqual(graph)
			expect(result.right.contents).toEqual([{ ...content, contentType: "text" }])
			expect(result.right.contents[0]).not.toHaveProperty("lastEdit")
		}
	})

	it.each(["01", "-0", "9223372036854775808"])("returns typed validation failures for malformed decimal %s", async (sortOrder) => {
		vi.spyOn(api, "getLegacyMigrationSnapshot").mockReturnValue(TE.right({ graph: { ...graph, nodes: [{ ...graph.nodes[0], sortOrder }] }, contents: [] }))
		expect(await getLegacyMigrationSnapshot("workspace-1")()).toMatchObject({ _tag: "Left", left: { type: "VALIDATION_ERROR" } })
	})

	it("lists raw historical metadata without changing names, nulls or i64 timestamps", async () => {
		vi.spyOn(api, "listLegacyWorkspaces").mockReturnValue(TE.right([graph.workspace]))
		expect(await listLegacyWorkspaces()()).toEqual(E.right([graph.workspace]))
	})

	it.each(["01", "-0", "9223372036854775808"])("rejects invalid list timestamps %s instead of offering a misleading migration choice", async (createdAt) => {
		vi.spyOn(api, "listLegacyWorkspaces").mockReturnValue(TE.right([{ ...graph.workspace, createdAt }]))
		expect(await listLegacyWorkspaces()()).toMatchObject({ _tag: "Left", left: { type: "VALIDATION_ERROR" } })
	})

	it("keeps startup errors discoverable and rejects ambiguous duplicate identifiers", async () => {
		vi.spyOn(api, "listLegacyWorkspaces").mockReturnValueOnce(TE.left(dbError("Historical source is missing")))
			.mockReturnValueOnce(TE.right([graph.workspace, { ...graph.workspace, name: "Another title" }]))
		expect(await listLegacyWorkspaces()()).toMatchObject({ _tag: "Left", left: { message: "Historical source is missing" } })
		expect(await listLegacyWorkspaces()()).toMatchObject({ _tag: "Left", left: { type: "VALIDATION_ERROR" } })
	})
})
