import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import { loadOrgAgendaFlow } from "./org-agenda.flow"
import { loadOrgBacklinksFlow } from "./org-backlinks.flow"
import {
	clearOrgDerivedIndexFlow,
	orgDerivedIndexStatsFrom,
	rebuildOrgDerivedIndexFlow,
} from "./org-derived-index.flow"
import { resolveOrgLinkTargetFlow } from "./org-link-target.flow"
import {
	captureOrgTodoFlow,
	createOrgDirectoryFlow,
	deleteOrgDocumentFlow,
	moveOrgDocumentFlow,
	openOrgDocumentFlow,
	saveOrgDocumentFlow,
	scanOrgWorkspaceFlow,
} from "./org-workspace.flow"

const capabilityToken = "synthetic-workspace-capability"
const workspace = {
	capabilityToken,
	directories: [],
	documents: [{ relativePath: "notes.org", revision: "rev-1" }],
	rootPath: "/notes",
}
const opened = {
	content: "* TODO Task\n:PROPERTIES:\n:ID: wanted\n:END:\n",
	relativePath: "notes.org",
	revision: "rev-1",
}
const emptyStats = { agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }
const fixture = () => {
	const readDocument = vi.fn<OrgFileRepository["readDocument"]>(() => TE.right(opened))
	const writeDocument = vi.fn<OrgFileRepository["writeDocument"]>(() => TE.right(opened))
	const scanWorkspace = vi.fn<OrgFileRepository["scanWorkspace"]>(() => TE.right(workspace))
	const replaceDerivedIndex = vi.fn<OrgFileRepository["replaceDerivedIndex"]>((_root, payload) =>
		TE.right(orgDerivedIndexStatsFrom(payload)),
	)
	const clearDerivedIndex = vi.fn<OrgFileRepository["clearDerivedIndex"]>(() =>
		TE.right(emptyStats),
	)
	const createDirectory = vi.fn<OrgFileRepository["createDirectory"]>(() => TE.right(undefined))
	const moveDocument = vi.fn<OrgFileRepository["moveDocument"]>(() => TE.right(opened))
	const deleteDocument = vi.fn<OrgFileRepository["deleteDocument"]>(() => TE.right(undefined))
	const unused = () => {
		throw new Error("Unexpected IO")
	}
	const repository: OrgFileRepository = {
		readDocument,
		writeDocument,
		scanWorkspace,
		replaceDerivedIndex,
		clearDerivedIndex,
		createDirectory,
		moveDocument,
		deleteDocument,
		getDerivedIndexStats: unused,
		openDefaultWorkspace: unused,
		reopenDefaultWorkspace: unused,
		selectWorkspace: unused,
		releaseWorkspace: unused,
		watchWorkspace: unused,
		unwatchWorkspace: unused,
		readMigrationRecovery: unused,
		verifyMigration: unused,
		writeMigration: unused,
	}
	return {
		repository,
		readDocument,
		writeDocument,
		scanWorkspace,
		replaceDerivedIndex,
		clearDerivedIndex,
		createDirectory,
		moveDocument,
		deleteDocument,
	}
}

describe("Org flow capability propagation", () => {
	it("retains tokens through scans and supports legacy repository injection", async () => {
		const { repository, scanWorkspace } = fixture()
		expect(await scanOrgWorkspaceFlow("/notes", capabilityToken, repository)()).toEqual({
			_tag: "Right",
			right: workspace,
		})
		expect(scanWorkspace).toHaveBeenLastCalledWith("/notes", capabilityToken)
		await scanOrgWorkspaceFlow("/notes", repository)()
		expect(scanWorkspace).toHaveBeenLastCalledWith("/notes", undefined)
	})

	it.each([false, true])("forwards capture tokens for missing=%s", async (missing) => {
		const { repository, readDocument, writeDocument, scanWorkspace } = fixture()
		if (missing)
			scanWorkspace.mockImplementation(() => TE.right({ directories: [], documents: [] }))
		const input = {
			capabilityToken,
			workspaceRoot: "/notes",
			relativePath: "notes.org",
			title: "Captured",
		}
		expect((await captureOrgTodoFlow(input, repository)())._tag).toBe("Right")
		expect(scanWorkspace).toHaveBeenCalledWith("/notes", capabilityToken)
		if (!missing) expect(readDocument).toHaveBeenCalledWith(input)
		expect(writeDocument).toHaveBeenCalledWith(expect.objectContaining({ capabilityToken }))
	})

	it("forwards direct document and directory operation tokens", async () => {
		const f = fixture()
		const input = { capabilityToken, workspaceRoot: "/notes", relativePath: "notes.org" }
		await openOrgDocumentFlow(input, f.repository)()
		await saveOrgDocumentFlow(
			{ ...input, content: "new", expectedRevision: "rev-1" },
			f.repository,
		)()
		await createOrgDirectoryFlow(input, f.repository)()
		await deleteOrgDocumentFlow({ ...input, expectedRevision: "rev-1" }, f.repository)()
		await moveOrgDocumentFlow(
			{
				capabilityToken,
				workspaceRoot: "/notes",
				sourceRelativePath: "notes.org",
				targetRelativePath: "new.org",
				expectedSourceRevision: "rev-1",
			},
			f.repository,
		)()
		for (const spy of [
			f.readDocument,
			f.writeDocument,
			f.createDirectory,
			f.deleteDocument,
			f.moveDocument,
		]) {
			expect(spy).toHaveBeenCalledWith(expect.objectContaining({ capabilityToken }))
		}
	})

	it("forwards tokens through agenda, backlinks and both link target read paths", async () => {
		const { repository, readDocument } = fixture()
		await loadOrgAgendaFlow(workspace, repository, new Map())()
		await loadOrgBacklinksFlow(workspace, "source.org", "", repository, new Map())()
		await resolveOrgLinkTargetFlow(
			workspace,
			"source.org",
			"",
			{ kind: "id", relativePath: null, value: "wanted" },
			repository,
			new Map(),
		)()
		await resolveOrgLinkTargetFlow(
			workspace,
			"source.org",
			"",
			{ kind: "file", relativePath: "notes.org", value: "Task" },
			repository,
			new Map(),
		)()
		expect(readDocument).toHaveBeenCalledTimes(4)
		for (const [input] of readDocument.mock.calls)
			expect(input.capabilityToken).toBe(capabilityToken)
	})

	it("forwards tokens to index reads, replacement and clearing", async () => {
		const { repository, readDocument, replaceDerivedIndex, clearDerivedIndex } = fixture()
		expect((await rebuildOrgDerivedIndexFlow(workspace, repository)())._tag).toBe("Right")
		expect(readDocument).toHaveBeenCalledWith(expect.objectContaining({ capabilityToken }))
		expect(replaceDerivedIndex).toHaveBeenCalledWith("/notes", expect.any(Object), capabilityToken)
		expect((await clearOrgDerivedIndexFlow("/notes", capabilityToken, repository)())._tag).toBe(
			"Right",
		)
		expect(clearDerivedIndex).toHaveBeenLastCalledWith("/notes", capabilityToken)
		await clearOrgDerivedIndexFlow("/notes", repository)()
		expect(clearDerivedIndex).toHaveBeenLastCalledWith("/notes", undefined)
	})
})
