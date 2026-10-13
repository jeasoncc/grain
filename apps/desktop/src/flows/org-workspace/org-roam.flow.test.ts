import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgDocumentInterface, OrgFileError, OrgWorkspaceInterface } from "@/types/org"
import { loadOrgRoamNodesFlow } from "./org-roam.flow"
import type { OrgQueryLiveOverlay } from "./org-query-source.flow"
import { createOrgFileRepository } from "@/io/file/org-file.repository"
import { orgRoamIdLink } from "@/pipes/org/org-roam.pipe"
import { orgLinkTargetAt } from "@/pipes/org/org-link.pipe"
import { resolveOrgLinkTargetFlow } from "./org-link-target.flow"
import { loadOrgBacklinksFlow } from "./org-backlinks.flow"

const source = (id: string, title = id) => `:PROPERTIES:\n:ID: ${id}\n:END:\n#+TITLE: ${title}\n`
const workspace: OrgWorkspaceInterface = { rootPath: "/approved", capabilityToken: "grant", directories: [], documents: [{ relativePath: ".hidden.org", revision: "disk" }, { relativePath: "source-notes.org", revision: "sidecar" }, { relativePath: "disk.org", revision: "disk" }] }
const live: OrgQueryLiveOverlay = { workspaceRoot: "/approved", capabilityToken: "grant", workspaceSessionId: "session", relativePath: ".hidden.org", content: source("live", "Unsaved"), diskRevision: "disk", sourceRevision: "buffer", runtimeIncarnation: "incarnation", sourceGeneration: 2 }

describe("approved Org-roam queries", () => {
	it("reads only unopened eligible files, uses dirty live nodes, and includes hidden names", async () => {
		const readDocument = vi.fn(({ relativePath }: { relativePath: string }) => TE.right<OrgFileError, OrgDocumentInterface>({ relativePath, revision: "fresh", content: source("disk") }))
		const result = await loadOrgRoamNodesFlow(workspace, [live], { readDocument }, { workspaceSessionId: "session" })()
		expect(result).toMatchObject({ _tag: "Right", right: [{ id: "disk" }, { id: "live", title: "Unsaved" }] })
		expect(readDocument).toHaveBeenCalledOnce()
		expect(readDocument).toHaveBeenCalledWith({ workspaceRoot: "/approved", capabilityToken: "grant", relativePath: "disk.org" })
	})
	it("includes a protected live source absent from the scan but never accepts another grant overlay", async () => {
		const readDocument = vi.fn(({ relativePath }: { relativePath: string }) => TE.right<OrgFileError, OrgDocumentInterface>({ relativePath, revision: "fresh", content: source("disk") }))
		const empty = { ...workspace, documents: [] }
		const result = await loadOrgRoamNodesFlow(empty, [{ ...live, relativePath: "parked.org" }, { ...live, relativePath: "other.org", capabilityToken: "other" }], { readDocument }, { workspaceSessionId: "session" })()
		expect(result).toMatchObject({ _tag: "Right", right: [{ id: "live", relativePath: "parked.org" }] })
		expect(readDocument).not.toHaveBeenCalled()
	})
	it("drains a started read but drops its result after abort and starts no subsequent read", async () => {
		const { promise, resolve } = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentInterface>>()
		const readDocument = vi.fn(() => () => promise)
		const abort = new AbortController()
		const pending = loadOrgRoamNodesFlow(workspace, [], { readDocument }, {}, abort.signal)()
		abort.abort()
		resolve(E.right({ relativePath: ".hidden.org", revision: "r", content: source("late") }))
		expect(await pending).toMatchObject({ _tag: "Left" })
		expect(readDocument).toHaveBeenCalledOnce()
	})
	it("marks IDs duplicated across live and disk sources unavailable rather than silently picking one", async () => {
		const readDocument = ({ relativePath }: { relativePath: string }) => TE.right<OrgFileError, OrgDocumentInterface>({ relativePath, revision: "r", content: source("live") })
		const result = await loadOrgRoamNodesFlow(workspace, [live], { readDocument })()
		expect(E.isRight(result) && result.right.every((node) => node.ambiguous)).toBe(true)
	})
	it("rejects mismatched native read paths and malformed snapshots before they confer node authority", async () => {
		const readDocument = vi.fn(() => TE.right<OrgFileError, OrgDocumentInterface>({ relativePath: "wrong.org", revision: "r", content: source("wrong") }))
		expect(await loadOrgRoamNodesFlow(workspace, [], { readDocument })()).toMatchObject({ _tag: "Left" })
		readDocument.mockClear()
		expect(await loadOrgRoamNodesFlow({ ...workspace, documents: [{ relativePath: "../escape.org", revision: "r" }] }, [], { readDocument })()).toMatchObject({ _tag: "Left" })
		expect(readDocument).not.toHaveBeenCalled()
	})
	it("follows an inserted file-node ID through canonical provenance and returns live backlinks without disk writes", async () => {
		const invoke = vi.fn(async () => { throw new Error("No native IO expected for canonical overlays") })
		const repository = createOrgFileRepository(invoke)
		const references: OrgQueryLiveOverlay = { ...live, relativePath: "references.org", sourceRevision: "references", content: `${source("references")}${orgRoamIdLink("live", "Unsaved")}\n` }
		const scoped = { ...workspace, documents: [] }
		const overlays = [live, references]
		const target = orgLinkTargetAt(references.content, references.content.indexOf("[[id:") + 3, references.relativePath)!
		const resolved = await resolveOrgLinkTargetFlow(scoped, target, overlays, repository, new Map(), { workspaceSessionId: "session" })()
		expect(resolved).toMatchObject({ _tag: "Right", right: { relativePath: ".hidden.org", line: 1, source: "live", sourceGeneration: 2, runtimeIncarnation: "incarnation", workspaceSessionId: "session", expectedRevision: null } })
		const backlinks = await loadOrgBacklinksFlow(scoped, ".hidden.org", overlays, repository, new Map(), { workspaceSessionId: "session" })()
		expect(backlinks).toMatchObject({ _tag: "Right", right: [{ sourceRelativePath: "references.org", targetKind: "id", label: "Unsaved" }] })
		expect(invoke).not.toHaveBeenCalled()
	})
	it.each(["literal%5B", "literal[", "slash\\[close]end\\"])("preserves literal ID %j through insertion, approved resolution and canonical backlinks", async (id) => {
		const invoke = vi.fn(async () => { throw new Error("No native IO expected") })
		const repository = createOrgFileRepository(invoke)
		const intended = { ...live, content: source(id) }
		const distinct = { ...live, relativePath: ".2.org", sourceRevision: "other", content: source(id === "literal%5B" ? "literal[" : "literal%5B") }
		const references = { ...live, relativePath: "refs.org", sourceRevision: "refs", content: `${source("references")}${orgRoamIdLink(id, "[Safe] title]]]")}\n` }
		const overlays = [intended, distinct, references]
		const scoped = { ...workspace, documents: [] }
		const target = orgLinkTargetAt(references.content, references.content.indexOf("[[id:") + 3, references.relativePath)!
		expect(target).toMatchObject({ kind: "id", value: id })
		expect(await resolveOrgLinkTargetFlow(scoped, target, overlays, repository, new Map(), { workspaceSessionId: "session" })()).toMatchObject({ _tag: "Right", right: { relativePath: ".hidden.org" } })
		expect(await loadOrgBacklinksFlow(scoped, ".hidden.org", overlays, repository, new Map(), { workspaceSessionId: "session" })()).toMatchObject({ _tag: "Right", right: [{ sourceRelativePath: "refs.org", targetKind: "id" }] })
		expect(await loadOrgBacklinksFlow(scoped, ".2.org", overlays, repository, new Map(), { workspaceSessionId: "session" })()).toMatchObject({ _tag: "Right", right: [] })
		expect(invoke).not.toHaveBeenCalled()
	})
})
