import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { WorkspaceInterface } from "@/types/workspace"

const getLegacyMigrationSnapshot = vi.hoisted(() => vi.fn())

vi.mock("@/io/api", () => ({ getLegacyMigrationSnapshot }))

import { prepareLegacyMigrationFlow } from "./legacy-migration.flow"

const timestamp = "2025-01-01T00:00:00.000Z"
const workspace: WorkspaceInterface = {
	author: "Author",
	createDate: timestamp,
	description: "",
	id: "workspace-1",
	language: "en",
	lastOpen: timestamp,
	publisher: "",
	title: "My Book",
}

const node = {
	createDate: timestamp,
	id: "document-1",
	lastEdit: timestamp,
	order: 0,
	parent: null,
	title: "Chapter",
	type: "file" as const,
	workspace: workspace.id,
}

const content = {
	content: "body",
	contentType: "text" as const,
	id: "content-1",
	lastEdit: timestamp,
	nodeId: node.id,
}

describe("legacy migration production dependencies", () => {
	it("prepares through one snapshot call without the former three-call path", async () => {
		getLegacyMigrationSnapshot.mockReturnValue(
			TE.right({
				allContents: [content],
				allNodes: [node],
				workspaceNodes: [node],
				workspaceTitle: workspace.title,
			}),
		)

		const result = await prepareLegacyMigrationFlow(workspace)()

		expect(E.isRight(result)).toBe(true)
		expect(getLegacyMigrationSnapshot).toHaveBeenCalledOnce()
		expect(getLegacyMigrationSnapshot).toHaveBeenCalledWith(workspace.id)
	})
})
