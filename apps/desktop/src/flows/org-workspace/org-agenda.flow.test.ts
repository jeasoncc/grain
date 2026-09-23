import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import type { OrgDocumentInterface, OrgFileError, OrgWorkspaceInterface } from "@/types/org"
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
})
