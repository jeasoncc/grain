import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import type {
	OpenOrgDocumentInput,
	OrgDocumentInterface,
	OrgFileError,
	OrgWorkspaceInterface,
} from "@/types/org"
import { loadOrgBacklinksFlow, type OrgBacklinksCache } from "./org-backlinks.flow"

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

const workspace = (rootPath = "/notes", sourceRevision = "1"): OrgWorkspaceInterface => ({
	directories: [],
	documents: [
		{ relativePath: "target.org", revision: "persisted-target" },
		{ relativePath: "refs/source.org", revision: sourceRevision },
	],
	rootPath,
})

const targetContent = "* Target\n:PROPERTIES:\n:ID: unsaved-id\n:CUSTOM_ID: unsaved-anchor\n:END:"

const sourceContent = [
	"#+title: References",
	"* Links",
	"[[../target.org][File]]",
	"[[id:unsaved-id][ID]]",
	"[[file:../target.org::#unsaved-anchor][Anchor]]",
].join("\n")

const successfulReader = (content = sourceContent, revision = () => "1") =>
	vi.fn(({ relativePath }: OpenOrgDocumentInput) =>
		TE.right<OrgFileError, OrgDocumentInterface>({
			content,
			relativePath,
			revision: revision(),
		}),
	)

describe("loadOrgBacklinksFlow", () => {
	it("uses unsaved target IDs, does not read the target, and returns deterministic typed backlinks", async () => {
		const readDocument = successfulReader()
		const result = await loadOrgBacklinksFlow(
			workspace(),
			"target.org",
			targetContent,
			repositoryWithRead(readDocument),
			new Map(),
		)()

		expect(result).toMatchObject({
			_tag: "Right",
			right: [
				{
					label: "File",
					line: 3,
					sourceHeading: "Links",
					sourceRelativePath: "refs/source.org",
					sourceTitle: "References",
					targetKind: "file",
				},
				{ label: "ID", line: 4, targetKind: "id" },
				{ label: "Anchor", line: 5, targetKind: "custom-id" },
			],
		})
		expect(readDocument).toHaveBeenCalledTimes(1)
		expect(readDocument).not.toHaveBeenCalledWith(
			expect.objectContaining({ relativePath: "target.org" }),
		)
	})

	it("reuses unchanged cache entries, rereads changed revisions, and isolates workspace roots", async () => {
		const cache: OrgBacklinksCache = new Map()
		let sourceRevision = "1"
		const readDocument = successfulReader(sourceContent, () => sourceRevision)
		const repository = repositoryWithRead(readDocument)

		await loadOrgBacklinksFlow(workspace(), "target.org", targetContent, repository, cache)()
		await loadOrgBacklinksFlow(workspace(), "target.org", targetContent, repository, cache)()
		sourceRevision = "2"
		await loadOrgBacklinksFlow(
			workspace("/notes", "2"),
			"target.org",
			targetContent,
			repository,
			cache,
		)()
		await loadOrgBacklinksFlow(
			workspace("/other", "2"),
			"target.org",
			targetContent,
			repository,
			cache,
		)()

		expect(readDocument).toHaveBeenCalledTimes(3)
		expect(readDocument.mock.calls.map(([input]) => input.workspaceRoot)).toEqual([
			"/notes",
			"/notes",
			"/other",
		])
	})

	it("does not cache content under a stale scan revision", async () => {
		const cache: OrgBacklinksCache = new Map()
		const readDocument = successfulReader(sourceContent, () => "newer-than-scan")
		const repository = repositoryWithRead(readDocument)
		await loadOrgBacklinksFlow(workspace(), "target.org", targetContent, repository, cache)()
		await loadOrgBacklinksFlow(workspace(), "target.org", targetContent, repository, cache)()
		expect(readDocument).toHaveBeenCalledTimes(2)
	})

	it("returns a typed error for one failed read", async () => {
		const cause: OrgFileError = {
			cause: "denied",
			command: "read_org_document",
			message: "permission denied",
			operation: "read",
			type: "ORG_FILE_ERROR",
		}
		const repository = repositoryWithRead(() => TE.left(cause))
		const result = await loadOrgBacklinksFlow(
			workspace(),
			"target.org",
			targetContent,
			repository,
			new Map(),
		)()

		expect(E.isLeft(result)).toBe(true)
		expect(result).toEqual({
			_tag: "Left",
			left: {
				cause,
				message: "Cannot build backlinks from refs/source.org: permission denied",
				relativePath: "refs/source.org",
				type: "ORG_BACKLINKS_ERROR",
			},
		})
	})
})
