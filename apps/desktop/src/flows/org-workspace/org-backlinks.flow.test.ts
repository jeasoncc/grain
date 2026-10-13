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
import {
	loadOrgBacklinksFlow,
	ORG_BACKLINKS_CACHE_MAX_ENTRIES,
	type OrgBacklinksCache,
} from "./org-backlinks.flow"
import type { OrgQueryLiveOverlay } from "./org-query-source.flow"

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
const targetOverlays = (workspaceRoot = "/notes", capabilityToken?: string): readonly OrgQueryLiveOverlay[] => [{
	workspaceRoot,
	capabilityToken,
	relativePath: "target.org",
	content: targetContent,
	sourceRevision: "target-buffer",
	diskRevision: "persisted-target",
}]

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
			targetOverlays(),
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

		await loadOrgBacklinksFlow(workspace(), "target.org", targetOverlays(), repository, cache)()
		await loadOrgBacklinksFlow(workspace(), "target.org", targetOverlays(), repository, cache)()
		sourceRevision = "2"
		await loadOrgBacklinksFlow(
			workspace("/notes", "2"),
			"target.org",
			targetOverlays(),
			repository,
			cache,
		)()
		await loadOrgBacklinksFlow(
			workspace("/other", "2"),
			"target.org",
			targetOverlays("/other"),
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
		await loadOrgBacklinksFlow(workspace(), "target.org", targetOverlays(), repository, cache)()
		await loadOrgBacklinksFlow(workspace(), "target.org", targetOverlays(), repository, cache)()
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
			targetOverlays(),
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

	it("uses parked dirty/conflicted source through changes and removal without poisoning the disk cache", async () => {
		const cache: OrgBacklinksCache = new Map()
		const read = successfulReader("No persisted links")
		const repository = repositoryWithRead(read)
		const live: OrgQueryLiveOverlay = {
			workspaceRoot: "/notes",
			relativePath: "refs/source.org",
			content: "* Parked source\n[[../target.org][Working link]]",
			sourceRevision: "parked-buffer",
			diskRevision: "1",
			runtimeIncarnation: "runtime-A",
			sourceGeneration: 1,
		}
		await loadOrgBacklinksFlow(workspace(), "target.org", targetOverlays(), repository, cache)()
		const linked = await loadOrgBacklinksFlow(workspace("/notes", "external-change"), "target.org", [
			...targetOverlays(), live,
		], repository, cache)()
		expect(E.isRight(linked) && linked.right.map(({ label }) => label)).toEqual(["Working link"])
		expect(cache.size).toBe(0)
		const removed = await loadOrgBacklinksFlow(workspace(), "target.org", [
			...targetOverlays(), { ...live, content: "* Link removed", sourceGeneration: 2 },
		], repository, cache)()
		expect(removed).toEqual(E.right([]))
		const disk = await loadOrgBacklinksFlow(workspace(), "target.org", targetOverlays(), repository, cache)()
		expect(disk).toEqual(E.right([]))
		expect(read).toHaveBeenCalledTimes(2)
		const deleted = { ...workspace(), documents: workspace().documents.filter(({ relativePath }) => relativePath !== live.relativePath) }
		const protectedResult = await loadOrgBacklinksFlow(deleted, "target.org", [...targetOverlays(), live], repository, cache)()
		expect(E.isRight(protectedResult) && protectedResult.right).toHaveLength(1)
		expect(await loadOrgBacklinksFlow(deleted, "target.org", targetOverlays(), repository, cache)()).toEqual(E.right([]))
		expect(cache.size).toBe(0)
	})

	it("isolates same-root replacement grants and rejects foreign session/runtime overlays", async () => {
		const cache: OrgBacklinksCache = new Map()
		const read = vi.fn(({ relativePath, capabilityToken }) => TE.right<OrgFileError, OrgDocumentInterface>({
			relativePath, revision: "1",
			content: capabilityToken === "old" ? "[[../target.org][Old grant]]" : "No links",
		}))
		const repository = repositoryWithRead(read)
		const oldWorkspace = { ...workspace(), capabilityToken: "old" }
		const newWorkspace = { ...workspace(), capabilityToken: "new" }
		expect(E.isRight(await loadOrgBacklinksFlow(oldWorkspace, "target.org", targetOverlays("/notes", "old"), repository, cache)())).toBe(true)
		const result = await loadOrgBacklinksFlow(newWorkspace, "target.org", [
			...targetOverlays("/notes", "new"),
			{ workspaceRoot: "/notes", capabilityToken: "old", relativePath: "refs/source.org", content: "[[../target.org][Foreign grant]]", sourceRevision: "buffer", diskRevision: "1" },
			{ workspaceRoot: "/notes", capabilityToken: "new", workspaceSessionId: "retired", relativePath: "refs/source.org", content: "[[../target.org][Foreign session]]", sourceRevision: "buffer", diskRevision: "1" },
		], repository, cache, { workspaceSessionId: "current" })()
		expect(result).toEqual(E.right([]))
		expect(read).toHaveBeenCalledTimes(2)
	})

	it("cancels a superseded disk read before caching or starting another source", async () => {
		const cache: OrgBacklinksCache = new Map()
		const abort = new AbortController()
		let resolve!: (value: E.Either<OrgFileError, OrgDocumentInterface>) => void
		const read = vi.fn(() => () => new Promise<E.Either<OrgFileError, OrgDocumentInterface>>((settle) => { resolve = settle }))
		const pending = loadOrgBacklinksFlow(workspace(), "target.org", [], repositoryWithRead(read), cache, {}, abort.signal)()
		abort.abort()
		resolve(E.right({ relativePath: "refs/source.org", revision: "1", content: sourceContent }))
		const result = await pending
		expect(E.isLeft(result) && result.left.message).toBe("Org query cancelled.")
		expect(cache.size).toBe(0)
		expect(read).toHaveBeenCalledTimes(1)
	})

	it("preserves disk-only target parsing and bounds injected caches across grants", async () => {
		const cache: OrgBacklinksCache = new Map()
		const read = vi.fn(({ relativePath }) => TE.right<OrgFileError, OrgDocumentInterface>({
			relativePath, revision: relativePath === "target.org" ? "persisted-target" : "1",
			content: relativePath === "target.org" ? targetContent : sourceContent,
		}))
		const repository = repositoryWithRead(read)
		const first = await loadOrgBacklinksFlow(workspace(), "target.org", [], repository, cache)()
		expect(E.isRight(first) && first.right).toHaveLength(3)
		expect(await loadOrgBacklinksFlow(workspace(), "target.org", [], repository, cache)()).toEqual(first)
		expect(read).toHaveBeenCalledTimes(2)
		for (let index = 0; index < ORG_BACKLINKS_CACHE_MAX_ENTRIES; index += 1) {
			await loadOrgBacklinksFlow({ ...workspace(), capabilityToken: `grant-${index}` }, "target.org", [], repository, cache)()
		}
		expect(cache.size).toBe(ORG_BACKLINKS_CACHE_MAX_ENTRIES)
	})
})
