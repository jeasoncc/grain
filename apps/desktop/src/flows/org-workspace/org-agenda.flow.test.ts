import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import type { OrgDocumentInterface, OrgFileError, OrgWorkspaceInterface } from "@/types/org"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION } from "@/pipes/org/org-behavior-configuration.pipe"
import type { OrgAgendaViewConfiguration } from "@/pipes/org/org-agenda-configuration.pipe"
import {
	loadOrgAgendaFlow,
	ORG_AGENDA_CACHE_MAX_ENTRIES,
	type OrgAgendaCache,
} from "./org-agenda.flow"

const workspace: OrgWorkspaceInterface = {
	directories: [],
	documents: [
		{ relativePath: "b.org", revision: "2" },
		{ relativePath: "a.org", revision: "1" },
	],
	rootPath: "/notes",
}

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

const sources: Record<string, string> = {
	"a.org": "* TODO A\nSCHEDULED: <2025-05-02 Fri>",
	"b.org": "* B\n<2025-05-01 Thu>",
}

const successfulReader = (
	sourceByPath: Record<string, string> = sources,
	revisions: Record<string, string> = {
		"a.org": "1",
		"b.org": "2",
		"bounded.org": "1",
		"remount.org": "unique-1",
	},
) =>
	vi.fn(({ relativePath }: { readonly relativePath: string }) =>
		TE.right<OrgFileError, OrgDocumentInterface>({
			content: sourceByPath[relativePath],
			relativePath,
			revision: revisions[relativePath],
		}),
	)

const load = (
	inputWorkspace: OrgWorkspaceInterface,
	repository: OrgFileRepository,
	cache: OrgAgendaCache,
) => loadOrgAgendaFlow(inputWorkspace, repository, cache)()

describe("loadOrgAgendaFlow", () => {
	it("refuses malformed RPC payloads without caching or throwing", async () => {
		for (const payload of [
			null,
			{},
			{ _tag: "Right", right: null },
			{
				_tag: "Right",
				right: { content: "<2025-01-01>", relativePath: "other.org", revision: "1" },
			},
			{ _tag: "Right", right: { content: "<2025-01-01>", relativePath: "a.org", revision: "" } },
			{ _tag: "Right", right: { content: null, relativePath: "a.org", revision: "1" } },
			{ _tag: "Left", left: null },
		]) {
			const cache: OrgAgendaCache = new Map()
			const read = vi.fn(() => async () => payload) as unknown as OrgFileRepository["readDocument"]
			expect(E.isLeft(await load(workspace, repositoryWithRead(read), cache))).toBe(true)
			expect(cache.size).toBe(0)
		}
	})

	it("scopes emitted disk entries to the current session without contaminating the cache", async () => {
		const cache: OrgAgendaCache = new Map()
		const read = successfulReader()
		for (const workspaceSessionId of ["first", "second"]) {
			const result = await loadOrgAgendaFlow(workspace, repositoryWithRead(read), cache, [], {
				workspaceSessionId,
			})()
			expect(
				E.isRight(result) &&
					result.right.every((entry) => entry.origin.workspaceSessionId === workspaceSessionId),
			).toBe(true)
		}
		expect(read).toHaveBeenCalledTimes(2)
		expect(
			[...cache.values()].every(({ entries }) =>
				entries.every(({ origin }) => origin.workspaceSessionId === undefined),
			),
		).toBe(true)
	})

	it("maps thrown reads into explicit errors", async () => {
		const read = () => async () => {
			throw new Error("RPC disconnected")
		}
		const result = await load(workspace, repositoryWithRead(read), new Map())
		expect(E.isLeft(result) && result.left.message).toContain("RPC disconnected")
	})

	it("refuses unsafe scan paths and empty revisions before reading", async () => {
		const read = successfulReader()
		for (const document of [
			{ relativePath: "../a.org", revision: "1" },
			{ relativePath: "a.org", revision: "" },
			{ relativePath: "a\n.org", revision: "1" },
		]) {
			expect(
				E.isLeft(
					await load({ ...workspace, documents: [document] }, repositoryWithRead(read), new Map()),
				),
			).toBe(true)
		}
		expect(read).not.toHaveBeenCalled()
	})

	it("retains live overlays missing from the scan and refuses malformed local overlays", async () => {
		const read = successfulReader()
		const overlay = {
			content: "* TODO Live\n<2025-01-01>",
			diskRevision: "old",
			relativePath: "a.org",
			sourceRevision: "buffer",
			workspaceRoot: workspace.rootPath,
		}
		const result = await loadOrgAgendaFlow(
			{ ...workspace, documents: [] },
			repositoryWithRead(read),
			new Map(),
			[overlay],
			{ workspaceSessionId: "s" },
		)()
		expect(E.isRight(result) && result.right[0].origin).toMatchObject({
			diskRevision: "old",
			source: "live",
			workspaceSessionId: "s",
		})
		for (const invalid of [
			{ ...overlay, sourceRevision: "" },
			{ ...overlay, diskRevision: "" },
			{ ...overlay, relativePath: "../a.org" },
			{ ...overlay, sourceGeneration: -1 },
		]) {
			expect(
				E.isLeft(
					await loadOrgAgendaFlow(workspace, repositoryWithRead(read), new Map(), [invalid])(),
				),
			).toBe(true)
		}
		expect(read).not.toHaveBeenCalled()
	})

	it("partitions cache and pruning by exact grant, including absent versus empty", async () => {
		const cache: OrgAgendaCache = new Map()
		const readDocument = successfulReader()
		const repository = repositoryWithRead(readDocument)
		for (const capabilityToken of [undefined, "", "grant-a", "grant-b"]) {
			const granted = {
				...workspace,
				...(capabilityToken === undefined ? {} : { capabilityToken }),
			}
			const result = await load(granted, repository, cache)
			expect(E.isRight(result) && result.right[0].origin).toMatchObject({
				diskRevision: "2",
				source: "disk",
				sourceRevision: "2",
				workspaceRoot: workspace.rootPath,
			})
		}
		expect(readDocument).toHaveBeenCalledTimes(8)
		await load({ ...workspace, capabilityToken: "grant-a", documents: [] }, repository, cache)
		await load({ ...workspace, capabilityToken: "grant-b" }, repository, cache)
		expect(readDocument).toHaveBeenCalledTimes(8)
		await load({ ...workspace, capabilityToken: "grant-a" }, repository, cache)
		expect(readDocument).toHaveBeenCalledTimes(10)
	})

	it("overlays live source without poisoning disk cache and rejects foreign snapshots", async () => {
		const cache: OrgAgendaCache = new Map()
		const readDocument = successfulReader()
		const repository = repositoryWithRead(readDocument)
		await load(workspace, repository, cache)
		const overlay = {
			content: "* NEXT Live\n#+TODO: NEXT | DONE\n<2025-01-01>",
			diskRevision: "1",
			relativePath: "a.org",
			sourceRevision: "buffer-7",
			workspaceRoot: workspace.rootPath,
		}
		const result = await loadOrgAgendaFlow(workspace, repository, cache, [overlay])()
		expect(E.isRight(result) && result.right[0]).toMatchObject({
			date: "2025-01-01",
			heading: "Live",
			origin: { diskRevision: "1", source: "live", sourceRevision: "buffer-7" },
			todo: "NEXT",
		})
		for (const snapshot of [
			{ ...overlay, capabilityToken: "foreign" },
			{ ...overlay, workspaceRoot: "/elsewhere" },
		]) {
			const rejected = await loadOrgAgendaFlow(workspace, repository, cache, [snapshot])()
			expect(E.isRight(rejected) && rejected.right.map(({ date }) => date)).toEqual([
				"2025-05-01",
				"2025-05-02",
			])
		}
		const drifted = await loadOrgAgendaFlow(workspace, repository, cache, [
			{
				...overlay,
				diskRevision: "old",
				runtimeIncarnation: "runtime-2",
				sourceGeneration: 7,
				workspaceSessionId: "session",
			},
		])()
		expect(E.isRight(drifted) && drifted.right[0].origin).toMatchObject({
			diskRevision: "old",
			runtimeIncarnation: "runtime-2",
			source: "live",
			sourceGeneration: 7,
			workspaceSessionId: "session",
		})
		const disk = await load(workspace, repository, cache)
		expect(E.isRight(disk) && disk.right[1].origin.source).toBe("disk")
		expect(readDocument).toHaveBeenCalledTimes(4)
	})

	it("returns globally sorted entries and performs zero reads on a second load", async () => {
		const cache: OrgAgendaCache = new Map()
		const readDocument = successfulReader()
		const repository = repositoryWithRead(readDocument)

		const first = await load(workspace, repository, cache)
		const second = await load(workspace, repository, cache)

		expect(first).toMatchObject({
			_tag: "Right",
			right: [
				{ date: "2025-05-01", relativePath: "b.org" },
				{ date: "2025-05-02", relativePath: "a.org" },
			],
		})
		expect(second).toEqual(first)
		expect(readDocument.mock.calls.map(([input]) => input.relativePath)).toEqual(["a.org", "b.org"])
	})

	it("reads only the document whose revision changed", async () => {
		const cache: OrgAgendaCache = new Map()
		const revisions = { "a.org": "1", "b.org": "2" }
		const readDocument = successfulReader(sources, revisions)
		const repository = repositoryWithRead(readDocument)
		await load(workspace, repository, cache)
		readDocument.mockClear()
		revisions["b.org"] = "3"

		const changed: OrgWorkspaceInterface = {
			...workspace,
			documents: workspace.documents.map((document) =>
				document.relativePath === "b.org" ? { ...document, revision: "3" } : document,
			),
		}
		await load(changed, repository, cache)

		expect(readDocument).toHaveBeenCalledTimes(1)
		expect(readDocument).toHaveBeenCalledWith({
			relativePath: "b.org",
			workspaceRoot: "/notes",
		})
	})

	it("prunes deleted paths from the cache", async () => {
		const cache: OrgAgendaCache = new Map()
		const readDocument = successfulReader()
		const repository = repositoryWithRead(readDocument)
		await load(workspace, repository, cache)

		const withoutB: OrgWorkspaceInterface = {
			...workspace,
			documents: workspace.documents.filter(({ relativePath }) => relativePath !== "b.org"),
		}
		await load(withoutB, repository, cache)
		readDocument.mockClear()
		await load(workspace, repository, cache)

		expect(readDocument).toHaveBeenCalledTimes(1)
		expect(readDocument).toHaveBeenCalledWith({
			relativePath: "b.org",
			workspaceRoot: "/notes",
		})
	})

	it("does not collide when workspaces contain the same relative path and revision", async () => {
		const cache: OrgAgendaCache = new Map()
		const readDocument = vi.fn(({ relativePath, workspaceRoot }) =>
			TE.right<OrgFileError, OrgDocumentInterface>({
				content: `<2025-05-${workspaceRoot === "/one" ? "01" : "02"} Thu>`,
				relativePath,
				revision: "1",
			}),
		)
		const repository = repositoryWithRead(readDocument)
		const documents = [{ relativePath: "same.org", revision: "1" }]

		const one = await load({ directories: [], documents, rootPath: "/one" }, repository, cache)
		const two = await load({ directories: [], documents, rootPath: "/two" }, repository, cache)

		expect(E.isRight(one) && one.right[0]?.date).toBe("2025-05-01")
		expect(E.isRight(two) && two.right[0]?.date).toBe("2025-05-02")
		expect(readDocument).toHaveBeenCalledTimes(2)
	})

	it("does not cache content under a stale scan revision", async () => {
		const cache: OrgAgendaCache = new Map()
		const readDocument = successfulReader(sources, { "a.org": "new", "b.org": "new" })
		const repository = repositoryWithRead(readDocument)
		await load(workspace, repository, cache)
		await load(workspace, repository, cache)
		expect(readDocument).toHaveBeenCalledTimes(4)
	})

	it("retries failed reads instead of caching the failure", async () => {
		const cache: OrgAgendaCache = new Map()
		const fileError: OrgFileError = {
			cause: "denied",
			command: "read_org_document",
			message: "permission denied",
			operation: "read",
			type: "ORG_FILE_ERROR",
		}
		let shouldFail = true
		const readDocument = vi.fn(({ relativePath }) => {
			if (relativePath === "a.org" && shouldFail) {
				return TE.left<OrgFileError, OrgDocumentInterface>(fileError)
			}
			return TE.right<OrgFileError, OrgDocumentInterface>({
				content: sources[relativePath],
				relativePath,
				revision: relativePath === "a.org" ? "1" : "2",
			})
		})
		const repository = repositoryWithRead(readDocument)

		const failed = await load(workspace, repository, cache)
		shouldFail = false
		const retried = await load(workspace, repository, cache)

		expect(failed).toEqual({
			_tag: "Left",
			left: {
				cause: fileError,
				message: "Cannot build agenda from a.org: permission denied",
				relativePath: "a.org",
				type: "ORG_AGENDA_ERROR",
			},
		})
		expect(E.isRight(retried)).toBe(true)
		expect(
			readDocument.mock.calls.filter(([input]) => input.relativePath === "a.org"),
		).toHaveLength(2)
	})

	it("bounds the default cache across workspace roots", async () => {
		const readDocument = successfulReader({ "bounded.org": "" })
		const repository = repositoryWithRead(readDocument)
		const workspaceAt = (index: number): OrgWorkspaceInterface => ({
			directories: [],
			documents: [{ relativePath: "bounded.org", revision: "1" }],
			rootPath: `/bounded-cache-test/${index}`,
		})

		for (let index = 0; index <= ORG_AGENDA_CACHE_MAX_ENTRIES; index += 1) {
			await loadOrgAgendaFlow(workspaceAt(index), repository)()
		}
		await loadOrgAgendaFlow(workspaceAt(0), repository)()

		expect(readDocument).toHaveBeenCalledTimes(ORG_AGENDA_CACHE_MAX_ENTRIES + 2)
	})

	it("shares the default module cache across agenda remount-style loads", async () => {
		const remountedWorkspace: OrgWorkspaceInterface = {
			directories: [],
			documents: [{ relativePath: "remount.org", revision: "unique-1" }],
			rootPath: "/default-cache-remount-test",
		}
		const readDocument = successfulReader({ "remount.org": "<2025-06-01 Sun>" })
		const repository = repositoryWithRead(readDocument)

		await loadOrgAgendaFlow(remountedWorkspace, repository)()
		await loadOrgAgendaFlow(remountedWorkspace, repository)()

		expect(readDocument).toHaveBeenCalledTimes(1)
	})

	it("cancels superseded reads before cache publication or reading the remaining files", async () => {
		const cache: OrgAgendaCache = new Map()
		const abort = new AbortController()
		let resolve!: (value: E.Either<OrgFileError, OrgDocumentInterface>) => void
		const read = vi.fn(() => () => new Promise<E.Either<OrgFileError, OrgDocumentInterface>>((settle) => { resolve = settle }))
		const pending = loadOrgAgendaFlow(workspace, repositoryWithRead(read), cache, [], {}, abort.signal)()
		abort.abort()
		resolve(E.right({ relativePath: "a.org", revision: "1", content: sources["a.org"] }))
		const result = await pending
		expect(E.isLeft(result) && result.left.message).toBe("Org query cancelled.")
		expect(cache.size).toBe(0)
		expect(read).toHaveBeenCalledTimes(1)
	})

	it("requires an explicit calendar before any configured read and filters only exact granted file paths", async () => {
		const read = successfulReader()
		const repository = repositoryWithRead(read)
		const view: OrgAgendaViewConfiguration = { id: "owned", name: "Owned", files: ["a.org"], mode: "dates", todo: null, match: null, window: { start: "2025-05-02", span: 1 }, overdue: false, deadlineWarningDays: null }
		const request = { view, inheritance: DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance }
		const missing = await loadOrgAgendaFlow(workspace, repository, new Map(), [], {}, undefined, request)()
		expect(E.isLeft(missing)).toBe(true)
		expect(read).not.toHaveBeenCalled()
		const calendar = { today: "2026-10-03", now: "12:00" }
		const scoped = await loadOrgAgendaFlow(workspace, repository, new Map(), [], {}, undefined, { ...request, calendar })()
		expect(E.isRight(scoped) && scoped.right.map(row => [row.relativePath, row.heading, row.date])).toEqual([["a.org", "A", "2025-05-02"]])
		read.mockClear()
		const literal = await loadOrgAgendaFlow(workspace, repository, new Map(), [], {}, undefined, { ...request, calendar, view: { ...view, files: ["*.org"] } })()
		expect(E.isRight(literal) && literal.right).toEqual([])
		expect(read).not.toHaveBeenCalled()
	})
})
