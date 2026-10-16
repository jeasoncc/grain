import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import type { OrgDocumentInterface, OrgFileError, OrgWorkspaceInterface } from "@/types/org"
import { type OrgLinkTargetIndexCache, resolveOrgLinkTargetFlow } from "./org-link-target.flow"
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
	revealWorkspacePath: unused,
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

const live = (content = "", relativePath = "a.org"): OrgQueryLiveOverlay => ({
	workspaceRoot: "/workspace",
	relativePath,
	content,
	sourceRevision: `buffer:${relativePath}`,
	diskRevision: "1",
	runtimeIncarnation: `runtime:${relativePath}`,
	sourceGeneration: 7,
})

describe("resolveOrgLinkTargetFlow", () => {
	it("uses canonical live snapshots for global IDs and local custom IDs", async () => {
		const readDocument = vi.fn(() => TE.right<OrgFileError, never>(undefined as never))
		const repository = repositoryWithRead(readDocument)
		const source = `${identifier("wanted")}\n* Local\n:PROPERTIES:\n:CUSTOM_ID: local\n:END:`

		const id = await resolveOrgLinkTargetFlow(
			workspace({ "a.org": "1" }),
			idTarget,
			[live(source)],
			repository,
			new Map(),
		)()
		const custom = await resolveOrgLinkTargetFlow(
			workspace({ "a.org": "1" }),
			{ kind: "custom-id", relativePath: "a.org", value: "local" },
			[live(source)],
			repository,
			new Map(),
		)()

		expect(id).toMatchObject({
			_tag: "Right",
			right: { expectedRevision: null, relativePath: "a.org", source: "live", runtimeIncarnation: "runtime:a.org", sourceGeneration: 7 },
		})
		expect(custom).toMatchObject({
			_tag: "Right",
			right: { expectedRevision: null, relativePath: "a.org" },
		})
		expect(readDocument).not.toHaveBeenCalled()
	})

	it("returns line one for plain files and resolves a file search suffix", async () => {
		const readDocument = vi.fn(() => TE.right(document("b.org", "first\n* Heading\nlast", "1")))
		const repository = repositoryWithRead(readDocument)
		const plain = await resolveOrgLinkTargetFlow(
			workspace(),
			{ kind: "file", relativePath: "b.org", value: null },
			[live()],
			repository,
			new Map(),
		)()
		const searched = await resolveOrgLinkTargetFlow(
			workspace(),
			{ kind: "file", relativePath: "b.org", value: "*Heading" },
			[live()],
			repository,
			new Map(),
		)()
		expect(plain).toMatchObject({
			_tag: "Right",
			right: { expectedRevision: "1", line: 1, relativePath: "b.org", source: "disk", sourceRevision: "1", diskRevision: "1" },
		})
		expect(searched).toMatchObject({
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
		await resolveOrgLinkTargetFlow(workspace(), idTarget, [live()], repository, cache)()
		await resolveOrgLinkTargetFlow(workspace(), idTarget, [live()], repository, cache)()
		expect(readDocument).toHaveBeenCalledTimes(1)

		returnedRevision = "3"
		await resolveOrgLinkTargetFlow(
			workspace({ "a.org": "1", "b.org": "2" }),
			idTarget,
			[live()],
			repository,
			cache,
		)()
		expect(readDocument).toHaveBeenCalledTimes(2)
		await resolveOrgLinkTargetFlow(
			workspace({ "a.org": "1", "b.org": "2" }),
			idTarget,
			[live()],
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
			idTarget,
			[live(identifier("wanted"))],
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
			idTarget,
			[live()],
			repositoryWithRead(duplicateRead),
			new Map(),
		)()
		expect(missing).toMatchObject({ _tag: "Left", left: { type: "ORG_LINK_TARGET_MISSING" } })
		const absent = await resolveOrgLinkTargetFlow(
			workspace({ "a.org": "1" }),
			{ kind: "file", relativePath: "gone.org", value: null },
			[live()],
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
			idTarget,
			[live()],
			repositoryWithRead(() => TE.left(cause)),
			new Map(),
		)()
		expect(failed).toMatchObject({
			_tag: "Left",
			left: { relativePath: "b.org", type: "ORG_LINK_TARGET_READ_ERROR" },
		})
	})

	it("resolves parked live IDs/custom IDs/file searches instead of stale disk and never caches live text", async () => {
		const read = vi.fn(() => TE.right(document("b.org", identifier("disk-only"), "1")))
		const repository = repositoryWithRead(read)
		const cache: OrgLinkTargetIndexCache = new Map()
		await resolveOrgLinkTargetFlow(workspace(), { ...idTarget, value: "disk-only" }, [live()], repository, cache)()
		const parked = live(`😀\r\n${identifier("wanted")}\r\n* Changed heading\r\nliteral \0 no-final-newline`, "b.org")
		const overlays = [live(), parked]
		const id = await resolveOrgLinkTargetFlow(workspace({ "a.org": "1", "b.org": "external-drift" }), idTarget, overlays, repository, cache, { workspaceSessionId: "current-session" })()
		expect(id).toMatchObject({
			_tag: "Right",
			right: {
				relativePath: "b.org", source: "live", expectedRevision: null,
				diskRevision: "1", sourceRevision: "buffer:b.org", sourceGeneration: 7,
				runtimeIncarnation: "runtime:b.org", workspaceSessionId: "current-session",
			},
		})
		const searched = await resolveOrgLinkTargetFlow(workspace(), { kind: "file", relativePath: "b.org", value: "*Changed heading" }, overlays, repository, cache)()
		expect(searched).toMatchObject({ _tag: "Right", right: { line: 6, source: "live", expectedRevision: null } })
		const custom = await resolveOrgLinkTargetFlow(workspace(), { kind: "custom-id", relativePath: "b.org", value: "live-custom" }, [
			live(), { ...parked, content: identifier("live-custom", true), sourceGeneration: 8 },
		], repository, cache)()
		expect(custom).toMatchObject({ _tag: "Right", right: { sourceGeneration: 8 } })
		const removed = await resolveOrgLinkTargetFlow(workspace(), idTarget, [
			live(), { ...parked, content: "* ID removed", sourceGeneration: 9 },
		], repository, cache)()
		expect(removed).toMatchObject({ _tag: "Left", left: { type: "ORG_LINK_TARGET_MISSING" } })
		expect(read).toHaveBeenCalledTimes(1)
		expect(cache.size).toBe(0)
		const disk = await resolveOrgLinkTargetFlow(workspace(), idTarget, [live()], repository, cache)()
		expect(disk).toMatchObject({ _tag: "Left", left: { type: "ORG_LINK_TARGET_MISSING" } })
		expect(read).toHaveBeenCalledTimes(2)
	})

	it("preserves protected live targets missing from a scan and removes them when their runtime closes", async () => {
		const read = vi.fn(() => TE.right(document("b.org", "", "1")))
		const repository = repositoryWithRead(read)
		const target = { kind: "file", relativePath: "b.org", value: "*Target" } as const
		const current = workspace({ "a.org": "1" })
		expect(await resolveOrgLinkTargetFlow(current, target, [live(), live(identifier("wanted"), "b.org")], repository, new Map())()).toMatchObject({
			_tag: "Right", right: { relativePath: "b.org", line: 1, source: "live" },
		})
		expect(await resolveOrgLinkTargetFlow(current, target, [live()], repository, new Map())()).toMatchObject({
			_tag: "Left", left: { type: "ORG_LINK_TARGET_FILE_ABSENT" },
		})
		expect(read).not.toHaveBeenCalled()
	})

	it("partitions disk indexes by grant and ignores foreign live session snapshots", async () => {
		const read = vi.fn(({ relativePath, capabilityToken }) => TE.right(document(relativePath,
			identifier(capabilityToken === "old" ? "wanted" : "different"), "1")))
		const repository = repositoryWithRead(read)
		const cache: OrgLinkTargetIndexCache = new Map()
		const current = { ...workspace({ "b.org": "1" }), capabilityToken: "old" }
		expect(E.isRight(await resolveOrgLinkTargetFlow(current, idTarget, [], repository, cache)())).toBe(true)
		const result = await resolveOrgLinkTargetFlow({ ...current, capabilityToken: "new" }, idTarget, [
			{ ...live(identifier("wanted"), "b.org"), capabilityToken: "old" },
			{ ...live(identifier("wanted"), "b.org"), capabilityToken: "new", workspaceSessionId: "retired" },
		], repository, cache, { workspaceSessionId: "current" })()
		expect(result).toMatchObject({ _tag: "Left", left: { type: "ORG_LINK_TARGET_MISSING" } })
		expect(read).toHaveBeenCalledTimes(2)
	})

	it("captures immutable target provenance before earlier disk IO and cancels without cache publication", async () => {
		const cache: OrgLinkTargetIndexCache = new Map()
		let resolve!: (value: E.Either<OrgFileError, OrgDocumentInterface>) => void
		const read = vi.fn(() => () => new Promise<E.Either<OrgFileError, OrgDocumentInterface>>((settle) => { resolve = settle }))
		const parked = { ...live(identifier("wanted"), "b.org") }
		const current = workspace({ "0.org": "1", "b.org": "1" })
		const resultPromise = resolveOrgLinkTargetFlow(current, idTarget, [parked], repositoryWithRead(read), cache)()
		parked.content = "* Newer source without the target"
		parked.sourceGeneration = 8
		resolve(E.right(document("0.org", "", "1")))
		expect(await resultPromise).toMatchObject({ _tag: "Right", right: { relativePath: "b.org", sourceGeneration: 7 } })
		cache.clear()
		const abort = new AbortController()
		const cancelled = resolveOrgLinkTargetFlow(current, idTarget, [], repositoryWithRead(read), cache, {}, abort.signal)()
		abort.abort()
		resolve(E.right(document("0.org", identifier("wanted"), "1")))
		await cancelled
		expect(cache.size).toBe(0)
		expect(read).toHaveBeenCalledTimes(2)
	})
})
