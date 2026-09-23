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
	createOrgDirectoryFlow,
	deleteOrgDocumentFlow,
	moveOrgDocumentFlow,
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
	deleteDocument: () => TE.right(undefined),
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

describe("Org TODO capture flow", () => {
	it("reads the latest existing source and writes with its exact revision", async () => {
		const latest = { ...document, content: "unknown syntax", revision: "latest-revision" }
		const readDocument = vi.fn(() => TE.right(latest))
		const writeDocument = vi.fn(() => TE.right(writeResult))
		const repository = repositoryWith({ readDocument, writeDocument })
		const input = { relativePath: "notes.org", title: "Captured", workspaceRoot: "/notes" }

		const result = await captureOrgTodoFlow(input, repository)()

		expect(readDocument).toHaveBeenCalledWith(input)
		expect(writeDocument).toHaveBeenCalledWith({
			content: "unknown syntax\n* TODO Captured\n",
			expectedRevision: "latest-revision",
			relativePath: "notes.org",
			workspaceRoot: "/notes",
		})
		expect(result).toEqual({
			_tag: "Right",
			right: { ...writeResult, content: "unknown syntax\n* TODO Captured\n" },
		})
	})

	it("creates a standard title file with the missing revision", async () => {
		const writeDocument = vi.fn(() =>
			TE.right({ relativePath: "lists/inbox.org", revision: "created" }),
		)
		const repository = repositoryWith({
			scanWorkspace: () => TE.right({ directories: [], documents: [] }),
			writeDocument,
		})

		const result = await captureOrgTodoFlow(
			{ relativePath: "lists/inbox.org", title: "New", workspaceRoot: "/notes" },
			repository,
		)()

		expect(writeDocument).toHaveBeenCalledWith({
			content: "#+title: inbox\n\n* TODO New\n",
			expectedRevision: "<missing>",
			relativePath: "lists/inbox.org",
			workspaceRoot: "/notes",
		})
		expect(result).toEqual({
			_tag: "Right",
			right: {
				content: "#+title: inbox\n\n* TODO New\n",
				relativePath: "lists/inbox.org",
				revision: "created",
			},
		})
	})

	it("propagates read and write conflicts", async () => {
		const readConflict = fileError("read", "read conflict")
		const writeConflict = fileError("write", "revision conflict")
		const readFailure = repositoryWith({ readDocument: () => TE.left(readConflict) })
		const writeFailure = repositoryWith({ writeDocument: () => TE.left(writeConflict) })
		const input = { relativePath: "notes.org", title: "Task", workspaceRoot: "/notes" }

		expect(await captureOrgTodoFlow(input, readFailure)()).toEqual({
			_tag: "Left",
			left: readConflict,
		})
		expect(await captureOrgTodoFlow(input, writeFailure)()).toEqual({
			_tag: "Left",
			left: writeConflict,
		})
	})

	it("rejects blank titles and non-relative Org targets before IO", async () => {
		const scanWorkspace = vi.fn(() => TE.right(snapshot))
		const repository = repositoryWith({ scanWorkspace })

		const blank = await captureOrgTodoFlow(
			{ relativePath: "inbox.org", title: " \n ", workspaceRoot: "/notes" },
			repository,
		)()
		const invalidPath = await captureOrgTodoFlow(
			{ relativePath: "../inbox.org", title: "Task", workspaceRoot: "/notes" },
			repository,
		)()

		expect(blank._tag).toBe("Left")
		expect(invalidPath._tag).toBe("Left")
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

	it("delegates lifecycle operations through the repository", async () => {
		const createDirectory = vi.fn(() => TE.right(undefined))
		const moveDocument = vi.fn(() => TE.right(writeResult))
		const deleteDocument = vi.fn(() => TE.right(undefined))
		const repository = repositoryWith({ createDirectory, deleteDocument, moveDocument })
		const createInput = { relativePath: "projects", workspaceRoot: "/notes" }
		const moveInput = {
			expectedSourceRevision: "rev-1",
			sourceRelativePath: "notes.org",
			targetRelativePath: "projects/notes.org",
			workspaceRoot: "/notes",
		}
		const deleteInput = {
			expectedRevision: "rev-2",
			relativePath: "projects/notes.org",
			workspaceRoot: "/notes",
		}

		expect(await createOrgDirectoryFlow(createInput, repository)()).toEqual({
			_tag: "Right",
			right: undefined,
		})
		expect(await moveOrgDocumentFlow(moveInput, repository)()).toEqual({
			_tag: "Right",
			right: writeResult,
		})
		expect(await deleteOrgDocumentFlow(deleteInput, repository)()).toEqual({
			_tag: "Right",
			right: undefined,
		})
		expect(createDirectory).toHaveBeenCalledWith(createInput)
		expect(moveDocument).toHaveBeenCalledWith(moveInput)
		expect(deleteDocument).toHaveBeenCalledWith(deleteInput)
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
