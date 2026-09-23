import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import type { OrgDerivedIndexInput, OrgFileError, OrgWorkspaceInterface } from "@/types/org"
import {
	aggregateOrgDerivedIndexDocuments,
	clearOrgDerivedIndexFlow,
	rebuildOrgDerivedIndexFlow,
} from "./org-derived-index.flow"

const unused = () => {
	throw new Error("Unexpected repository operation")
}

const repositoryWith = (overrides: Partial<OrgFileRepository>): OrgFileRepository => ({
	clearDerivedIndex: unused,
	createDirectory: unused,
	deleteDocument: unused,
	getDerivedIndexStats: unused,
	moveDocument: unused,
	openDefaultWorkspace: unused,
	readDocument: unused,
	readMigrationRecovery: unused,
	releaseWorkspace: unused,
	reopenDefaultWorkspace: unused,
	replaceDerivedIndex: unused,
	scanWorkspace: unused,
	selectWorkspace: unused,
	unwatchWorkspace: unused,
	verifyMigration: unused,
	watchWorkspace: unused,
	writeDocument: unused,
	writeMigration: unused,
	...overrides,
})

const workspace: OrgWorkspaceInterface = {
	directories: [],
	documents: [
		{ relativePath: "z.org", revision: "z1" },
		{ relativePath: "a.org", revision: "a1" },
	],
	rootPath: "/notes",
}

const empty: OrgDerivedIndexInput = { agenda: [], documents: [], headings: [], links: [] }

const fileError: OrgFileError = {
	cause: "database unavailable",
	command: "replace_org_derived_index",
	message: "replace failed",
	operation: "replaceDerivedIndex",
	type: "ORG_FILE_ERROR",
}

describe("Org derived index workspace flow", () => {
	it("aggregates and sorts every payload table deterministically", () => {
		const first: OrgDerivedIndexInput = {
			...empty,
			documents: [{ relativePath: "z.org", revision: "1", title: null }],
			headings: [
				{
					customId: null,
					level: 1,
					line: 3,
					orgId: null,
					relativePath: "z.org",
					title: "Z",
					todoKeyword: null,
				},
			],
		}
		const second: OrgDerivedIndexInput = {
			...empty,
			documents: [{ relativePath: "a.org", revision: "1", title: null }],
			links: [
				{
					column: 2,
					label: "x",
					line: 4,
					sourceRelativePath: "a.org",
					targetKind: "id",
					targetRelativePath: null,
					targetValue: "x",
				},
				{
					column: 1,
					label: "y",
					line: 2,
					sourceRelativePath: "a.org",
					targetKind: "id",
					targetRelativePath: null,
					targetValue: "y",
				},
			],
		}

		const result = aggregateOrgDerivedIndexDocuments([first, second])
		expect(result.documents.map(({ relativePath }) => relativePath)).toEqual(["a.org", "z.org"])
		expect(result.links.map(({ line }) => line)).toEqual([2, 4])
	})

	it("reads in path order, replaces once, and verifies persisted counts", async () => {
		const readDocument = vi.fn(({ relativePath }: { relativePath: string }) =>
			TE.right({
				content: `* TODO ${relativePath}`,
				relativePath,
				revision: `${relativePath[0]}1`,
			}),
		)
		const replaceDerivedIndex = vi.fn((_workspaceRoot: string, _payload: OrgDerivedIndexInput) =>
			TE.right({ agendaCount: 0, documentCount: 2, headingCount: 2, linkCount: 0 }),
		)
		const getDerivedIndexStats = vi.fn(() =>
			TE.right({ agendaCount: 0, documentCount: 2, headingCount: 2, linkCount: 0 }),
		)
		const result = await rebuildOrgDerivedIndexFlow(
			workspace,
			repositoryWith({ getDerivedIndexStats, readDocument, replaceDerivedIndex }),
		)()

		expect(E.isRight(result)).toBe(true)
		expect(readDocument.mock.calls.map(([input]) => input.relativePath)).toEqual(["a.org", "z.org"])
		expect(replaceDerivedIndex).toHaveBeenCalledTimes(1)
		const payload = replaceDerivedIndex.mock.calls[0]?.[1] as OrgDerivedIndexInput
		expect(payload.documents.map(({ relativePath }) => relativePath)).toEqual(["a.org", "z.org"])
	})

	it("rejects a stale read without replacing the existing index", async () => {
		const replaceDerivedIndex = vi.fn(() =>
			TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
		)
		const repository = repositoryWith({
			readDocument: () => TE.right({ content: "* stale", relativePath: "a.org", revision: "new" }),
			replaceDerivedIndex,
		})
		const result = await rebuildOrgDerivedIndexFlow(
			{ ...workspace, documents: [workspace.documents[1]] },
			repository,
		)()

		expect(result).toMatchObject({
			_tag: "Left",
			left: { type: "ORG_DERIVED_INDEX_STALE_READ_ERROR" },
		})
		expect(replaceDerivedIndex).not.toHaveBeenCalled()
	})

	it("returns replace failures without requesting stats", async () => {
		const getDerivedIndexStats = vi.fn()
		const result = await rebuildOrgDerivedIndexFlow(
			{ ...workspace, documents: [] },
			repositoryWith({
				getDerivedIndexStats,
				replaceDerivedIndex: () => TE.left(fileError),
			}),
		)()

		expect(result).toEqual(E.left(fileError))
		expect(getDerivedIndexStats).not.toHaveBeenCalled()
	})

	it("rejects count mismatches returned by atomic replacement", async () => {
		const result = await rebuildOrgDerivedIndexFlow(
			{ ...workspace, documents: [] },
			repositoryWith({
				replaceDerivedIndex: () =>
					TE.right({ agendaCount: 0, documentCount: 1, headingCount: 0, linkCount: 0 }),
			}),
		)()
		expect(result).toMatchObject({
			_tag: "Left",
			left: { type: "ORG_DERIVED_INDEX_COUNT_MISMATCH_ERROR" },
		})
	})

	it("clears and receives empty stats from the atomic command", async () => {
		const clearDerivedIndex = vi.fn(() =>
			TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
		)
		const result = await clearOrgDerivedIndexFlow("/notes", repositoryWith({ clearDerivedIndex }))()

		expect(result).toEqual(
			E.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
		)
		expect(clearDerivedIndex).toHaveBeenCalledWith("/notes")
	})
})
