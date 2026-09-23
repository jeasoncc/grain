import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import { planLegacyMigration } from "@/pipes/migration"
import type { AppError } from "@/types/error"
import type {
	OrgDocumentInterface,
	OrgDocumentWriteResultInterface,
	OrgFileError,
} from "@/types/org"
import type { WorkspaceInterface } from "@/types/workspace"
import {
	areLegacyMigrationPlansEquivalent,
	createLegacyMigrationArtifactPayload,
	executeLegacyMigrationFlow,
	prepareLegacyMigrationFlow,
	runLegacyMigrationRecoveryDrillFlow,
	summarizeLegacyMigrationArtifacts,
	verifyLegacyMigrationRecoveryFlow,
} from "./legacy-migration.flow"

const timestamp = "2025-01-01T00:00:00.000Z"
const workspace: WorkspaceInterface = {
	author: "Author",
	createDate: timestamp,
	description: "",
	id: "workspace-1",
	language: "en",
	lastOpen: timestamp,
	publisher: "",
	title: "My Book",
}
const nodes = [
	{
		createDate: timestamp,
		id: "folder-1",
		lastEdit: timestamp,
		order: 0,
		parent: null,
		title: "Drafts",
		type: "folder" as const,
		workspace: workspace.id,
	},
	{
		createDate: timestamp,
		id: "document-1",
		lastEdit: timestamp,
		order: 0,
		parent: "folder-1",
		title: "Chapter",
		type: "file" as const,
		workspace: workspace.id,
	},
]
const contents = [
	{
		content: "body",
		contentType: "text" as const,
		id: "content-1",
		lastEdit: timestamp,
		nodeId: "document-1",
	},
]
const writeResult: OrgDocumentWriteResultInterface = {
	relativePath: "unused.org",
	revision: "revision",
}
const openedDocument: OrgDocumentInterface = { ...writeResult, content: "" }
const unexpectedOrgError: OrgFileError = {
	cause: "unexpected",
	command: "test",
	message: "unexpected recovery read",
	operation: "readMigrationRecovery",
	type: "ORG_FILE_ERROR",
}

const repositoryWith = (overrides: Partial<OrgFileRepository> = {}): OrgFileRepository => ({
	clearDerivedIndex: () =>
		TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
	createDirectory: () => TE.right(undefined),
	deleteDocument: () => TE.right(undefined),
	getDerivedIndexStats: () =>
		TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
	moveDocument: () => TE.right(writeResult),
	openDefaultWorkspace: () => TE.right({ directories: [], documents: [], rootPath: "/notes" }),
	readDocument: () => TE.right(openedDocument),
	readMigrationRecovery: () => TE.left(unexpectedOrgError),
	releaseWorkspace: () => TE.right(undefined),
	reopenDefaultWorkspace: () => TE.right(null),
	replaceDerivedIndex: () =>
		TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
	scanWorkspace: () => TE.right({ directories: [], documents: [] }),
	selectWorkspace: () => TE.right(null),
	unwatchWorkspace: () => TE.right(undefined),
	verifyMigration: () => TE.right({ checkedCount: 0, mismatches: [] }),
	watchWorkspace: () => TE.right("watch-token"),
	writeDocument: () => TE.right(writeResult),
	writeMigration: () =>
		TE.right({ artifacts: [], verificationPath: "migration-verification.json", writtenPaths: [] }),
	...overrides,
})

describe("legacy migration flows", () => {
	it("detects artifact content drift even when the serialized manifest is unchanged", () => {
		const plan = planLegacyMigration({ contents, nodes, workspaceTitle: workspace.title })
		const changed = {
			...plan,
			documents: plan.documents.map((document, index) =>
				index === 0 ? { ...document, content: `${document.content}changed` } : document,
			),
		}

		expect(changed.manifest).toBe(plan.manifest)
		expect(areLegacyMigrationPlansEquivalent(plan, changed)).toBe(false)
	})

	it("summarizes UTF-8 content with Rust-compatible byte length, SHA-256, and path order", async () => {
		const summaries = await summarizeLegacyMigrationArtifacts([
			{ content: "second", relativePath: "𐀀.org" },
			{ content: "你好🌾", relativePath: "\uE000.org" },
		])

		expect(summaries).toEqual([
			{
				byteLength: 10,
				relativePath: "\uE000.org",
				revision: "bdfb3860c6a56c4e7b83e37244375e78f4c1e45f9c6bed184aea4179a9e3e0d8",
			},
			{
				byteLength: 6,
				relativePath: "𐀀.org",
				revision: "16367aacb67a4a017c8da8ab95682ccb390863780f7114dda0a0e0c55644c7c4",
			},
		])
	})

	it("builds the same deterministic artifact payload for every execution", () => {
		const plan = planLegacyMigration({ contents, nodes, workspaceTitle: workspace.title })
		expect(createLegacyMigrationArtifactPayload(plan)).toEqual(
			createLegacyMigrationArtifactPayload(plan),
		)
	})

	it("includes dangling content but excludes content owned by another workspace", async () => {
		const otherWorkspaceNode = { ...nodes[1], id: "other-document", workspace: "workspace-2" }
		const danglingContent = {
			...contents[0],
			content: "{dangling legacy source}",
			contentType: "lexical" as const,
			id: "content-dangling",
			nodeId: "missing-node",
		}
		const otherWorkspaceContent = {
			...danglingContent,
			content: "{must not migrate}",
			id: "content-other",
			nodeId: otherWorkspaceNode.id,
		}
		const getSnapshot = vi.fn(() =>
			TE.right({
				allContents: [...contents, danglingContent, otherWorkspaceContent],
				allNodes: [...nodes, otherWorkspaceNode],
				workspaceNodes: nodes,
				workspaceTitle: workspace.title,
			}),
		)

		const result = await prepareLegacyMigrationFlow(workspace, {
			getLegacyMigrationSnapshot: getSnapshot,
		})()

		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			expect(result.right.rootDirectory).toBe("My Book")
			expect(result.right.documents).toEqual([
				{
					content: "#+TITLE: Chapter\n#+SOURCE_ID: document-1\n\nbody",
					nodeId: "document-1",
					path: "My Book/Drafts/Chapter.org",
				},
			])
			expect(result.right.rawBackups.map(({ contentId }) => contentId)).toEqual([
				"content-1",
				"content-dangling",
			])
			expect(result.right.manifest).toContain("Content references missing node missing-node")
			expect(result.right.manifest).not.toContain("other-document")
			expect(result.right.manifest).not.toContain("content-other")
		}
		expect(getSnapshot).toHaveBeenCalledOnce()
		expect(getSnapshot).toHaveBeenCalledWith("workspace-1")
	})

	it("preserves the failing API error and identifies its preparation stage", async () => {
		const nodeError: AppError = { message: "nodes unavailable", type: "DB_ERROR" }
		const getSnapshot = vi.fn(() => TE.left(nodeError))

		const nodeFailure = await prepareLegacyMigrationFlow(workspace, {
			getLegacyMigrationSnapshot: getSnapshot,
		})()
		expect(nodeFailure).toEqual({
			_tag: "Left",
			left: { cause: nodeError, stage: "load-nodes", type: "LEGACY_MIGRATION_ERROR" },
		})
		expect(getSnapshot).toHaveBeenCalledOnce()
	})

	it("writes an exact batch, verifies its sidecar, and returns the completed result", async () => {
		const plan = planLegacyMigration({
			contents: [
				{
					content: "{legacy lexical}",
					contentType: "lexical",
					id: "content-1",
					lastEdit: timestamp,
					nodeId: "document-1",
				},
			],
			nodes: [nodes[1]],
			workspaceTitle: workspace.title,
		})
		const migrationResult = {
			artifacts: plan.documents.map(({ path }) => ({
				byteLength: 12,
				relativePath: path,
				revision: "rev-1",
			})),
			verificationPath: "My Book/migration-verification.json",
			writtenPaths: plan.documents.map(({ path }) => path),
		}
		const verificationResult = { checkedCount: 1, mismatches: [] }
		const writeMigration = vi.fn(() => TE.right(migrationResult))
		const verifyMigration = vi.fn(() => TE.right(verificationResult))

		const result = await executeLegacyMigrationFlow(
			"/approved",
			plan,
			repositoryWith({ verifyMigration, writeMigration }),
		)()

		expect(result).toEqual({
			_tag: "Right",
			right: { verification: verificationResult, write: migrationResult },
		})
		expect(writeMigration).toHaveBeenCalledWith({
			artifacts: [
				...plan.documents.map(({ content, path }) => ({ content, relativePath: path })),
				...plan.rawBackups.map(({ content, path }) => ({ content, relativePath: path })),
				{ content: plan.recoverySql, relativePath: plan.recoverySqlPath },
				{ content: plan.manifest, relativePath: plan.manifestPath },
			],
			directories: plan.directories.map(({ path }) => path),
			workspaceRoot: "/approved",
		})
		expect(verifyMigration).toHaveBeenCalledWith({
			expectedArtifacts: migrationResult.artifacts,
			verificationPath: migrationResult.verificationPath,
			workspaceRoot: "/approved",
		})
		expect(plan.rawBackups).toHaveLength(1)
	})

	it("returns a typed verify-artifacts failure when the verifier command fails", async () => {
		const error: OrgFileError = {
			cause: "verification sidecar unreadable",
			command: "verify_org_migration",
			message: "verify_org_migration failed: verification sidecar unreadable",
			operation: "verifyMigration",
			type: "ORG_FILE_ERROR",
		}
		const plan = planLegacyMigration({ contents, nodes, workspaceTitle: workspace.title })

		const result = await executeLegacyMigrationFlow(
			"/approved",
			plan,
			repositoryWith({ verifyMigration: () => TE.left(error) }),
		)()

		expect(result).toEqual({
			_tag: "Left",
			left: { cause: error, stage: "verify-artifacts", type: "LEGACY_MIGRATION_ERROR" },
		})
	})

	it("returns mismatch details as a typed verify-artifacts failure", async () => {
		const mismatch = {
			actualByteLength: 8,
			actualRevision: "actual-revision",
			expectedByteLength: 12,
			expectedRevision: "expected-revision",
			relativePath: "My Book/Chapter.org",
		}
		const plan = planLegacyMigration({ contents, nodes, workspaceTitle: workspace.title })

		const result = await executeLegacyMigrationFlow(
			"/approved",
			plan,
			repositoryWith({
				verifyMigration: () => TE.right({ checkedCount: 3, mismatches: [mismatch] }),
			}),
		)()

		expect(result).toEqual({
			_tag: "Left",
			left: {
				cause: {
					checkedCount: 3,
					message: "Migration verification found 1 artifact mismatch(es)",
					mismatches: [mismatch],
					type: "MIGRATION_VERIFICATION_MISMATCH",
				},
				stage: "verify-artifacts",
				type: "LEGACY_MIGRATION_ERROR",
			},
		})
	})

	it("rejects a verification result that checked fewer artifacts than were written", async () => {
		const plan = planLegacyMigration({ contents, nodes, workspaceTitle: workspace.title })
		const migrationResult = {
			artifacts: [
				{ byteLength: 12, relativePath: "My Book/Chapter.org", revision: "rev-1" },
				{ byteLength: 8, relativePath: "My Book/manifest.json", revision: "rev-2" },
			],
			verificationPath: "My Book/migration-verification.json",
			writtenPaths: [],
		}

		const result = await executeLegacyMigrationFlow(
			"/approved",
			plan,
			repositoryWith({
				verifyMigration: () => TE.right({ checkedCount: 1, mismatches: [] }),
				writeMigration: () => TE.right(migrationResult),
			}),
		)()

		expect(result).toEqual({
			_tag: "Left",
			left: {
				cause: {
					checkedCount: 1,
					message: "Migration verification checked 1 of 2 artifact(s)",
					mismatches: [],
					type: "MIGRATION_VERIFICATION_MISMATCH",
				},
				stage: "verify-artifacts",
				type: "LEGACY_MIGRATION_ERROR",
			},
		})
	})

	it("verifies a rebuilt migration plan after restart", async () => {
		const verifyMigration = vi.fn(
			({ expectedArtifacts }: { expectedArtifacts: readonly unknown[] }) =>
				TE.right({ checkedCount: expectedArtifacts.length, mismatches: [] }),
		)

		const result = await verifyLegacyMigrationRecoveryFlow(
			workspace,
			"/approved",
			{
				getLegacyMigrationSnapshot: () =>
					TE.right({
						allContents: contents,
						allNodes: nodes,
						workspaceNodes: nodes,
						workspaceTitle: workspace.title,
					}),
				summarizeArtifacts: summarizeLegacyMigrationArtifacts,
			},
			repositoryWith({ verifyMigration }),
		)()

		expect(E.isRight(result)).toBe(true)
		expect(verifyMigration).toHaveBeenCalledWith({
			expectedArtifacts: expect.arrayContaining([
				expect.objectContaining({ relativePath: "My Book/Drafts/Chapter.org" }),
			]),
			verificationPath: "My Book/migration-verification.json",
			workspaceRoot: "/approved",
		})
		if (E.isRight(result)) {
			expect(result.right.verification.checkedCount).toBe(result.right.expectedArtifacts.length)
		}
	})

	it("reports a changed rebuilt legacy source as a verification mismatch", async () => {
		const mismatch = {
			actualByteLength: 4,
			actualRevision: "old-revision",
			expectedByteLength: 7,
			expectedRevision: "new-revision",
			relativePath: "My Book/Drafts/Chapter.org",
		}
		const result = await verifyLegacyMigrationRecoveryFlow(
			workspace,
			"/approved",
			{
				getLegacyMigrationSnapshot: () =>
					TE.right({
						allContents: [{ ...contents[0], content: "changed" }],
						allNodes: nodes,
						workspaceNodes: nodes,
						workspaceTitle: workspace.title,
					}),
				summarizeArtifacts: summarizeLegacyMigrationArtifacts,
			},
			repositoryWith({
				verifyMigration: ({ expectedArtifacts }) =>
					TE.right({ checkedCount: expectedArtifacts.length, mismatches: [mismatch] }),
			}),
		)()

		expect(result).toEqual({
			_tag: "Left",
			left: {
				cause: {
					checkedCount: 4,
					message: "Migration verification found 1 artifact mismatch(es)",
					mismatches: [mismatch],
					type: "MIGRATION_VERIFICATION_MISMATCH",
				},
				stage: "verify-artifacts",
				type: "LEGACY_MIGRATION_ERROR",
			},
		})
	})

	it("keeps recovery verifier command failures in the typed verification stage", async () => {
		const error: OrgFileError = {
			cause: "sidecar unavailable",
			command: "verify_org_migration",
			message: "verify_org_migration failed: sidecar unavailable",
			operation: "verifyMigration",
			type: "ORG_FILE_ERROR",
		}
		const result = await verifyLegacyMigrationRecoveryFlow(
			workspace,
			"/approved",
			{
				getLegacyMigrationSnapshot: () =>
					TE.right({
						allContents: contents,
						allNodes: nodes,
						workspaceNodes: nodes,
						workspaceTitle: workspace.title,
					}),
				summarizeArtifacts: summarizeLegacyMigrationArtifacts,
			},
			repositoryWith({ verifyMigration: () => TE.left(error) }),
		)()

		expect(result).toEqual({
			_tag: "Left",
			left: { cause: error, stage: "verify-artifacts", type: "LEGACY_MIGRATION_ERROR" },
		})
	})

	it("keeps recovery hashing failures in the typed hash stage", async () => {
		const failure = new Error("crypto unavailable")
		const result = await verifyLegacyMigrationRecoveryFlow(
			workspace,
			"/approved",
			{
				getLegacyMigrationSnapshot: () =>
					TE.right({
						allContents: contents,
						allNodes: nodes,
						workspaceNodes: nodes,
						workspaceTitle: workspace.title,
					}),
				summarizeArtifacts: () => Promise.reject(failure),
			},
			repositoryWith(),
		)()

		expect(result).toEqual({
			_tag: "Left",
			left: {
				cause: {
					cause: failure,
					message: "Failed to hash rebuilt migration artifacts",
					type: "MIGRATION_ARTIFACT_HASH_ERROR",
				},
				stage: "hash-artifacts",
				type: "LEGACY_MIGRATION_ERROR",
			},
		})
	})

	it("reconstructs every content row exactly from verified raw backups", async () => {
		const plan = planLegacyMigration({ contents, nodes, workspaceTitle: workspace.title })
		const result = await runLegacyMigrationRecoveryDrillFlow(
			workspace,
			"/approved",
			{
				getLegacyMigrationSnapshot: () =>
					TE.right({
						allContents: contents,
						allNodes: nodes,
						workspaceNodes: nodes,
						workspaceTitle: workspace.title,
					}),
				summarizeArtifacts: summarizeLegacyMigrationArtifacts,
			},
			repositoryWith({
				readMigrationRecovery: () =>
					TE.right({
						manifest: plan.manifest,
						rawBackups: plan.rawBackups.map((backup) => ({ ...backup })),
						recoverySql: plan.recoverySql,
					}),
				verifyMigration: ({ expectedArtifacts }) =>
					TE.right({ checkedCount: expectedArtifacts.length, mismatches: [] }),
			}),
		)()

		expect(result).toMatchObject({
			_tag: "Right",
			right: {
				manifestPath: plan.manifestPath,
				recoveredContentCount: contents.length,
			},
		})
	})

	it("rejects a raw backup whose exact content differs from the rebuilt source", async () => {
		const plan = planLegacyMigration({ contents, nodes, workspaceTitle: workspace.title })
		const result = await runLegacyMigrationRecoveryDrillFlow(
			workspace,
			"/approved",
			{
				getLegacyMigrationSnapshot: () =>
					TE.right({
						allContents: contents,
						allNodes: nodes,
						workspaceNodes: nodes,
						workspaceTitle: workspace.title,
					}),
				summarizeArtifacts: summarizeLegacyMigrationArtifacts,
			},
			repositoryWith({
				readMigrationRecovery: () =>
					TE.right({
						manifest: plan.manifest,
						rawBackups: plan.rawBackups.map((backup, index) => ({
							...backup,
							content: index === 0 ? `${backup.content}tampered` : backup.content,
						})),
						recoverySql: plan.recoverySql,
					}),
				verifyMigration: ({ expectedArtifacts }) =>
					TE.right({ checkedCount: expectedArtifacts.length, mismatches: [] }),
			}),
		)()
		expect(result).toMatchObject({
			_tag: "Left",
			left: { cause: { type: "MIGRATION_RECOVERY_MISMATCH" }, stage: "read-recovery" },
		})
	})

	it("preserves a repository failure at the write stage", async () => {
		const error: OrgFileError = {
			cause: "disk full",
			command: "write_org_migration",
			message: "write_org_migration failed: disk full",
			operation: "writeMigration",
			type: "ORG_FILE_ERROR",
		}
		const plan = planLegacyMigration({ contents, nodes, workspaceTitle: workspace.title })

		const result = await executeLegacyMigrationFlow(
			"/approved",
			plan,
			repositoryWith({ writeMigration: () => TE.left(error) }),
		)()

		expect(result).toEqual({
			_tag: "Left",
			left: { cause: error, stage: "write-artifacts", type: "LEGACY_MIGRATION_ERROR" },
		})
	})
})
