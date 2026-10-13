import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import type {
	OrgDocumentInterface,
	OrgDocumentWriteResultInterface,
	OrgFileError,
} from "@/types/org"
import {
	captureOrgTodoFlow,
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	reopenDefaultOrgWorkspaceFlow,
	saveOrgDocumentFlow,
	selectOrgWorkspaceFlow,
} from "./org-workspace.flow"

const entries = [{ relativePath: "notes.org", revision: "rev-1" }]
const document: OrgDocumentInterface = {
	content: "* Notes\n",
	relativePath: "notes.org",
	revision: "rev-1",
}
const writeResult: OrgDocumentWriteResultInterface = {
	relativePath: "notes.org",
	revision: "rev-2",
}

const snapshot = { directories: ["projects"], documents: entries }
const workspace = { ...snapshot, rootPath: "/notes" }

const repositoryWith = (overrides: Partial<OrgFileRepository> = {}): OrgFileRepository => ({
	clearDerivedIndex: () =>
		TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
	createDirectory: () => TE.right(undefined),
	deleteDocument: () => TE.left(fileError("delete", "unexpected delete")),
	getDerivedIndexStats: () =>
		TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
	moveDocument: () => TE.right(writeResult),
	openDefaultWorkspace: () => TE.right(workspace),
	readDocument: () => TE.right(document),
	readMigrationRecovery: () =>
		TE.left(fileError("readMigrationRecovery", "unexpected recovery read")),
	releaseWorkspace: () => TE.right(undefined),
	reopenDefaultWorkspace: () => TE.right(workspace),
	replaceDerivedIndex: () =>
		TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
	scanWorkspace: () => TE.right(snapshot),
	selectWorkspace: () => TE.right(workspace),
	unwatchWorkspace: () => TE.right(undefined),
	verifyMigration: () => TE.right({ checkedCount: 0, mismatches: [] }),
	watchWorkspace: () => TE.right("watch-token"),
	writeDocument: () => TE.right(writeResult),
	writeMigration: () =>
		TE.right({ artifacts: [], verificationPath: "migration-verification.json", writtenPaths: [] }),
	...overrides,
})

const fileError = (operation: OrgFileError["operation"], message: string): OrgFileError => ({
	cause: message,
	command: `${operation}_org_document`,
	message,
	operation,
	type: "ORG_FILE_ERROR",
})

describe("Org TODO capture convenience", () => {
	it("uses the same scoped heading placement and fresh revision CAS as configured Capture", async () => {
		const readDocument = vi.fn(() => TE.right({ ...document, content: "* Work\r\nbody\r\n* Peer\nuntouched", revision: "latest" }))
		const writeDocument = vi.fn(() => TE.right(writeResult))
		const repository = repositoryWith({ readDocument, writeDocument })
		const result = await captureOrgTodoFlow({
			workspaceRoot: "/notes",
			target: { kind: "heading", relativePath: "notes.org", headingPath: ["Work"] },
			title: "Captured\nwith context",
			expectedRevision: "latest",
			capabilityToken: "exact-grant",
		}, { repository, isCurrent: () => true })()
		expect(writeDocument).toHaveBeenCalledExactlyOnceWith({
			workspaceRoot: "/notes", relativePath: "notes.org", capabilityToken: "exact-grant",
			expectedRevision: "latest", content: "* Work\r\nbody\r\n** TODO Captured with context\n* Peer\nuntouched",
		})
		expect(result).toEqual({ _tag: "Right", right: { ...writeResult, content: "* Work\r\nbody\r\n** TODO Captured with context\n* Peer\nuntouched" } })
	})
	it("does not downgrade an unconfirmed convenience write into a safe retry", async () => {
		const conflict = fileError("write", "revision conflict or lost native confirmation")
		const writeDocument = vi.fn(() => TE.left(conflict))
		const result = await captureOrgTodoFlow({
			workspaceRoot: "/notes", target: { kind: "file", relativePath: "notes.org" }, title: "Task",
		}, { repository: repositoryWith({ writeDocument }), isCurrent: () => true })()
		expect(result).toMatchObject({ _tag: "Left", left: { type: "ORG_CAPTURE_UNCERTAIN_WRITE_ERROR", cause: conflict } })
		expect(writeDocument).toHaveBeenCalledTimes(1)
	})
	it("rejects a stale confirmed preview without creating parents or invoking the content writer", async () => {
		const writeDocument = vi.fn(() => TE.right(writeResult))
		const result = await captureOrgTodoFlow({
			workspaceRoot: "/notes", target: { kind: "file", relativePath: "notes.org" }, title: "Task", expectedRevision: "old-preview",
		}, { repository: repositoryWith({ writeDocument }), isCurrent: () => true })()
		expect(result).toMatchObject({ _tag: "Left", left: { noWrite: true } })
		expect(writeDocument).not.toHaveBeenCalled()
	})
	it("rejects blank titles and stale owners before filesystem IO", async () => {
		const scanWorkspace = vi.fn(() => TE.right(snapshot))
		const repository = repositoryWith({ scanWorkspace })
		for (const [title, current] of [[" \n ", true], ["Task", false]] as const) {
			const result = await captureOrgTodoFlow({
				workspaceRoot: "/notes", target: { kind: "file", relativePath: "notes.org" }, title,
			}, { repository, isCurrent: () => current })()
			expect(result).toMatchObject({ _tag: "Left", left: { noWrite: true } })
		}
		expect(scanWorkspace).not.toHaveBeenCalled()
	})
})

describe("Org workspace flows", () => {
	it("opens the fixed default workspace through the capability repository", async () => {
		const openDefaultWorkspace = vi.fn(() => TE.right(workspace))
		const repository = repositoryWith({ openDefaultWorkspace })

		const result = await openDefaultOrgWorkspaceFlow(repository)()

		expect(result).toEqual({ _tag: "Right", right: workspace })
		expect(openDefaultWorkspace).toHaveBeenCalledOnce()
	})

	it("reopens an existing default workspace without creating it", async () => {
		const reopenDefaultWorkspace = vi.fn(() => TE.right(workspace))
		const repository = repositoryWith({ reopenDefaultWorkspace })

		const result = await reopenDefaultOrgWorkspaceFlow(repository)()

		expect(result).toEqual({ _tag: "Right", right: workspace })
		expect(reopenDefaultWorkspace).toHaveBeenCalledOnce()
	})

	it("selects and scans a workspace through the capability repository", async () => {
		const selectWorkspace = vi.fn(() => TE.right(workspace))
		const repository = repositoryWith({ selectWorkspace })

		const result = await selectOrgWorkspaceFlow(repository)()

		expect(result).toEqual({ _tag: "Right", right: workspace })
		expect(selectWorkspace).toHaveBeenCalledOnce()
	})

	it("treats directory selection cancellation as a successful null result", async () => {
		const repository = repositoryWith({ selectWorkspace: () => TE.right(null) })
		const result = await selectOrgWorkspaceFlow(repository)()
		expect(result).toEqual({ _tag: "Right", right: null })
	})


	it("opens and saves through the repository", async () => {
		const readDocument = vi.fn(() => TE.right(document))
		const writeDocument = vi.fn(() => TE.right(writeResult))
		const repository = repositoryWith({ readDocument, writeDocument })
		const openInput = { relativePath: "notes.org", workspaceRoot: "/notes" }
		const saveInput = { ...openInput, content: "* Updated\n", expectedRevision: "rev-1" }

		const opened = await openOrgDocumentFlow(openInput, repository)()
		const saved = await saveOrgDocumentFlow(saveInput, repository)()

		expect(opened).toEqual({ _tag: "Right", right: document })
		expect(saved).toEqual({ _tag: "Right", right: writeResult })
		expect(readDocument).toHaveBeenCalledWith(openInput)
		expect(writeDocument).toHaveBeenCalledWith(saveInput)
	})
})
