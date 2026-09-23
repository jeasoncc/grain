import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import type { OrgFileError, OrgWorkspaceInterface } from "@/types/org"
import { type OrgLinkTargetIndexCache, resolveOrgLinkTargetFlow } from "./org-link-target.flow"

const unused = () => {
	throw new Error("Unexpected repository operation")
}

const repositoryWithRead = (
	readDocument: OrgFileRepository["readDocument"],
): OrgFileRepository => ({
	clearDerivedIndex: () =>
		TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
	createDirectory: unused,
	deleteDocument: unused,
	getDerivedIndexStats: () =>
		TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
	moveDocument: unused,
	openDefaultWorkspace: unused,
	readDocument,
	readMigrationRecovery: unused,
	releaseWorkspace: unused,
	reopenDefaultWorkspace: unused,
	replaceDerivedIndex: () =>
		TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
	scanWorkspace: unused,
	selectWorkspace: unused,
	unwatchWorkspace: unused,
	verifyMigration: unused,
	watchWorkspace: unused,
	writeDocument: unused,
	writeMigration: unused,
})

const workspace = (
	revisions: Record<string, string> = { "a.org": "1", "b.org": "1" },
): OrgWorkspaceInterface => ({
	directories: [],
	documents: Object.entries(revisions).map(([relativePath, revision]) => ({
		relativePath,
		revision,
	})),
	rootPath: "/workspace",
})

const document = (relativePath: string, content: string, revision: string) => ({
	content,
	relativePath,
	revision,
})

const idTarget = { kind: "id", relativePath: null, value: "wanted" } as const

const identifier = (value: string, custom = false): string =>
	`* Target\n:PROPERTIES:\n:${custom ? "CUSTOM_ID" : "ID"}: ${value}\n:END:`

describe("resolveOrgLinkTargetFlow", () => {
	it("uses unsaved source content for global IDs and same-file custom IDs", async () => {
		const readDocument = vi.fn(() => TE.right<OrgFileError, never>(undefined as never))
		const repository = repositoryWithRead(readDocument)
		const source = `${identifier("wanted")}\n* Local\n:PROPERTIES:\n:CUSTOM_ID: local\n:END:`

		const id = await resolveOrgLinkTargetFlow(
			workspace({ "a.org": "1" }),
			"a.org",
			source,
			idTarget,
			repository,
			new Map(),
		)()
		const custom = await resolveOrgLinkTargetFlow(
			workspace({ "a.org": "1" }),
			"a.org",
			source,
			{ kind: "custom-id", relativePath: "a.org", value: "local" },
			repository,
			new Map(),
		)()

		expect(id).toEqual({
			_tag: "Right",
			right: { expectedRevision: null, line: 3, relativePath: "a.org" },
		})
		expect(custom).toEqual({
			_tag: "Right",
			right: { expectedRevision: null, line: 7, relativePath: "a.org" },
		})
		expect(readDocument).not.toHaveBeenCalled()
	})

	it("returns line one for plain files and resolves a file search suffix", async () => {
		const readDocument = vi.fn(() => TE.right(document("b.org", "first\n* Heading\nlast", "1")))
		const repository = repositoryWithRead(readDocument)
		const plain = await resolveOrgLinkTargetFlow(
			workspace(),
			"a.org",
			"",
			{ kind: "file", relativePath: "b.org", value: null },
			repository,
			new Map(),
		)()
		const searched = await resolveOrgLinkTargetFlow(
			workspace(),
			"a.org",
			"",
			{ kind: "file", relativePath: "b.org", value: "*Heading" },
			repository,
			new Map(),
		)()
		expect(plain).toEqual({
			_tag: "Right",
			right: { expectedRevision: "1", line: 1, relativePath: "b.org" },
		})
		expect(searched).toEqual({
			_tag: "Right",
			right: { expectedRevision: "1", line: 2, relativePath: "b.org" },
		})
	})

	it("reuses matching revisions and does not reuse a stale scan revision", async () => {
		let returnedRevision = "1"
		const readDocument = vi.fn(({ relativePath }: { relativePath: string }) =>
			TE.right(document(relativePath, identifier("wanted"), returnedRevision)),
		)
		const repository = repositoryWithRead(readDocument)
		const cache: OrgLinkTargetIndexCache = new Map()
		await resolveOrgLinkTargetFlow(workspace(), "a.org", "", idTarget, repository, cache)()
		await resolveOrgLinkTargetFlow(workspace(), "a.org", "", idTarget, repository, cache)()
		expect(readDocument).toHaveBeenCalledTimes(1)

		returnedRevision = "3"
		await resolveOrgLinkTargetFlow(
			workspace({ "a.org": "1", "b.org": "2" }),
			"a.org",
			"",
			idTarget,
			repository,
			cache,
		)()
		expect(readDocument).toHaveBeenCalledTimes(2)
		await resolveOrgLinkTargetFlow(
			workspace({ "a.org": "1", "b.org": "2" }),
			"a.org",
			"",
			idTarget,
			repository,
			cache,
		)()
		expect(readDocument).toHaveBeenCalledTimes(3)
	})

	it("returns typed missing, duplicate, absent-file, and read errors", async () => {
		const duplicateRead = vi.fn(({ relativePath }: { relativePath: string }) =>
			TE.right(document(relativePath, identifier("wanted"), "1")),
		)
		const duplicate = await resolveOrgLinkTargetFlow(
			workspace(),
			"a.org",
			identifier("wanted"),
			idTarget,
			repositoryWithRead(duplicateRead),
			new Map(),
		)()
		expect(duplicate).toMatchObject({
			_tag: "Left",
			left: {
				matches: [{ relativePath: "a.org" }, { relativePath: "b.org" }],
				type: "ORG_LINK_TARGET_AMBIGUOUS",
			},
		})

		const missing = await resolveOrgLinkTargetFlow(
			workspace({ "a.org": "1" }),
			"a.org",
			"",
			idTarget,
			repositoryWithRead(duplicateRead),
			new Map(),
		)()
		expect(missing).toMatchObject({ _tag: "Left", left: { type: "ORG_LINK_TARGET_MISSING" } })
		const absent = await resolveOrgLinkTargetFlow(
			workspace({ "a.org": "1" }),
			"a.org",
			"",
			{ kind: "file", relativePath: "gone.org", value: null },
			repositoryWithRead(duplicateRead),
			new Map(),
		)()
		expect(absent).toMatchObject({ _tag: "Left", left: { type: "ORG_LINK_TARGET_FILE_ABSENT" } })

		const cause: OrgFileError = {
			cause: "no",
			command: "read",
			message: "failed",
			operation: "read",
			type: "ORG_FILE_ERROR",
		}
		const failed = await resolveOrgLinkTargetFlow(
			workspace(),
			"a.org",
			"",
			idTarget,
			repositoryWithRead(() => TE.left(cause)),
			new Map(),
		)()
		expect(failed).toMatchObject({
			_tag: "Left",
			left: { relativePath: "b.org", type: "ORG_LINK_TARGET_READ_ERROR" },
		})
	})
})
