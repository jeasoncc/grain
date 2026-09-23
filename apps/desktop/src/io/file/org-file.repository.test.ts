import { describe, expect, it, vi } from "vitest"
import type { OrgDocumentInterface, OrgDocumentWriteResultInterface } from "@/types/org"
import {
	createOrgFileRepository,
	type InvokeCommand,
	ORG_FILE_COMMANDS,
} from "./org-file.repository"

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

const asInvokeCommand = (mock: ReturnType<typeof vi.fn>): InvokeCommand =>
	mock as unknown as InvokeCommand

describe("org file repository", () => {
	it("maps default, selected, scan, read, and write arguments to Tauri command payloads", async () => {
		const workspace = { directories: ["projects"], documents: entries, rootPath: "/notes" }
		const snapshot = { directories: workspace.directories, documents: entries }
		const invokeMock = vi
			.fn()
			.mockResolvedValueOnce(workspace)
			.mockResolvedValueOnce(workspace)
			.mockResolvedValueOnce(workspace)
			.mockResolvedValueOnce(snapshot)
			.mockResolvedValueOnce(document)
			.mockResolvedValueOnce(writeResult)
		const repository = createOrgFileRepository(asInvokeCommand(invokeMock))

		await repository.openDefaultWorkspace()()
		await repository.reopenDefaultWorkspace()()
		await repository.selectWorkspace()()
		await repository.scanWorkspace("/notes")()
		await repository.readDocument({ relativePath: "notes.org", workspaceRoot: "/notes" })()
		await repository.writeDocument({
			content: "* Updated\n",
			expectedRevision: "rev-1",
			relativePath: "notes.org",
			workspaceRoot: "/notes",
		})()

		expect(invokeMock.mock.calls).toEqual([
			[ORG_FILE_COMMANDS.openDefault, {}],
			[ORG_FILE_COMMANDS.reopenDefault, {}],
			[ORG_FILE_COMMANDS.select, {}],
			[ORG_FILE_COMMANDS.scan, { workspaceRoot: "/notes" }],
			[ORG_FILE_COMMANDS.read, { relativePath: "notes.org", workspaceRoot: "/notes" }],
			[
				ORG_FILE_COMMANDS.write,
				{
					content: "* Updated\n",
					expectedRevision: "rev-1",
					relativePath: "notes.org",
					workspaceRoot: "/notes",
				},
			],
		])
	})

	it("maps derived-index replace, stats, and clear commands to exact payloads", async () => {
		const payload = { agenda: [], documents: [], headings: [], links: [] }
		const stats = { agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }
		const invokeMock = vi
			.fn()
			.mockResolvedValueOnce(stats)
			.mockResolvedValueOnce(stats)
			.mockResolvedValueOnce(stats)
		const repository = createOrgFileRepository(asInvokeCommand(invokeMock))

		await repository.replaceDerivedIndex("/notes", payload)()
		const result = await repository.getDerivedIndexStats("/notes")()
		await repository.clearDerivedIndex("/notes")()

		expect(result).toEqual({ _tag: "Right", right: stats })
		expect(invokeMock.mock.calls).toEqual([
			[ORG_FILE_COMMANDS.replaceDerivedIndex, { payload, workspaceRoot: "/notes" }],
			[ORG_FILE_COMMANDS.getDerivedIndexStats, { workspaceRoot: "/notes" }],
			[ORG_FILE_COMMANDS.clearDerivedIndex, { workspaceRoot: "/notes" }],
		])
	})

	it("reads a migration recovery bundle through the retained workspace capability", async () => {
		const bundle = { manifest: "{}\n", rawBackups: [] }
		const invokeMock = vi.fn().mockResolvedValueOnce(bundle)
		const repository = createOrgFileRepository(asInvokeCommand(invokeMock))
		const result = await repository.readMigrationRecovery(
			"/notes",
			"Migration/migration-manifest.json",
		)()
		expect(result).toEqual({ _tag: "Right", right: bundle })
		expect(invokeMock).toHaveBeenCalledWith(ORG_FILE_COMMANDS.readMigrationRecovery, {
			manifestRelativePath: "Migration/migration-manifest.json",
			workspaceRoot: "/notes",
		})
	})

	it("maps workspace watch lifecycle to exact Tauri payloads", async () => {
		const invokeMock = vi.fn().mockResolvedValueOnce("watch-123").mockResolvedValueOnce(undefined)
		const repository = createOrgFileRepository(asInvokeCommand(invokeMock))

		const watched = await repository.watchWorkspace("/notes")()
		const unwatched = await repository.unwatchWorkspace("watch-123")()

		expect(watched).toEqual({ _tag: "Right", right: "watch-123" })
		expect(unwatched).toEqual({ _tag: "Right", right: undefined })
		expect(invokeMock.mock.calls).toEqual([
			[ORG_FILE_COMMANDS.watch, { workspaceRoot: "/notes" }],
			[ORG_FILE_COMMANDS.unwatch, { token: "watch-123" }],
		])
	})

	it("maps a migration batch to the exact Tauri payload", async () => {
		const migrationResult = {
			artifacts: [
				{ byteLength: 9, relativePath: "Book/chapter.org", revision: "chapter-revision" },
			],
			verificationPath: "Book/migration-verification.json",
			writtenPaths: [
				"Book/chapter.org",
				"Book/_migration-raw-backups/chapter.lexical.json",
				"Book/migration-manifest.json",
			],
		}
		const invokeMock = vi.fn().mockResolvedValue(migrationResult)
		const repository = createOrgFileRepository(asInvokeCommand(invokeMock))
		const input = {
			artifacts: [
				{ content: "* Chapter", relativePath: "Book/chapter.org" },
				{
					content: "{raw}",
					relativePath: "Book/_migration-raw-backups/chapter.lexical.json",
				},
				{ content: "{manifest}", relativePath: "Book/migration-manifest.json" },
			],
			directories: ["Book", "Book/_migration-raw-backups"],
			workspaceRoot: "/notes",
		}

		const result = await repository.writeMigration(input)()

		expect(result).toEqual({ _tag: "Right", right: migrationResult })
		expect(invokeMock).toHaveBeenCalledWith(ORG_FILE_COMMANDS.writeMigration, input)
	})

	it("maps migration verification to the exact Tauri payload and result", async () => {
		const verificationResult = {
			checkedCount: 2,
			mismatches: [
				{
					actualByteLength: null,
					actualRevision: null,
					expectedByteLength: 9,
					expectedRevision: "chapter-revision",
					relativePath: "Book/chapter.org",
				},
			],
		}
		const invokeMock = vi.fn().mockResolvedValue(verificationResult)
		const repository = createOrgFileRepository(asInvokeCommand(invokeMock))
		const input = {
			expectedArtifacts: [
				{ byteLength: 9, relativePath: "Book/chapter.org", revision: "chapter-revision" },
			],
			verificationPath: "Book/migration-verification.json",
			workspaceRoot: "/notes",
		}

		const result = await repository.verifyMigration(input)()

		expect(result).toEqual({ _tag: "Right", right: verificationResult })
		expect(invokeMock).toHaveBeenCalledWith(ORG_FILE_COMMANDS.verifyMigration, input)
	})

	it("maps lifecycle operations to exact Tauri payloads", async () => {
		const invokeMock = vi
			.fn()
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(writeResult)
			.mockResolvedValueOnce(undefined)
		const repository = createOrgFileRepository(asInvokeCommand(invokeMock))

		await repository.createDirectory({ relativePath: "projects", workspaceRoot: "/notes" })()
		await repository.moveDocument({
			expectedSourceRevision: "rev-1",
			sourceRelativePath: "notes.org",
			targetRelativePath: "projects/notes.org",
			workspaceRoot: "/notes",
		})()
		await repository.deleteDocument({
			expectedRevision: "rev-2",
			relativePath: "projects/notes.org",
			workspaceRoot: "/notes",
		})()

		expect(invokeMock.mock.calls).toEqual([
			[ORG_FILE_COMMANDS.createDirectory, { relativePath: "projects", workspaceRoot: "/notes" }],
			[
				ORG_FILE_COMMANDS.move,
				{
					expectedSourceRevision: "rev-1",
					sourceRelativePath: "notes.org",
					targetRelativePath: "projects/notes.org",
					workspaceRoot: "/notes",
				},
			],
			[
				ORG_FILE_COMMANDS.delete,
				{
					expectedRevision: "rev-2",
					relativePath: "projects/notes.org",
					workspaceRoot: "/notes",
				},
			],
		])
	})

	it("maps rejected commands to an operation-specific Org file error", async () => {
		const cause = new Error("permission denied")
		const invokeMock = vi.fn().mockRejectedValue(cause)
		const repository = createOrgFileRepository(asInvokeCommand(invokeMock))

		const result = await repository.readDocument({
			relativePath: "private.org",
			workspaceRoot: "/notes",
		})()

		expect(result).toEqual({
			_tag: "Left",
			left: {
				cause,
				command: ORG_FILE_COMMANDS.read,
				message: "read_org_document failed: permission denied",
				operation: "read",
				type: "ORG_FILE_ERROR",
			},
		})
	})
})
