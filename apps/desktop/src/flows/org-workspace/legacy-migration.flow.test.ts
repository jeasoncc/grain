import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import { planLegacyMigration } from "@/pipes/migration"
import type { AppError } from "@/types/error"
import type { LegacyRecoveryGraph } from "@/types/org/org.interface"
import type { OrgFileError } from "@/types/org"
import type { WorkspaceInterface } from "@/types/workspace"
import {
	areLegacyMigrationPlansEquivalent,
	executeLegacyMigrationFlow,
	migrateLegacyWorkspaceFlow,
	prepareLegacyMigrationFlow,
	runLegacyMigrationRecoveryDrillFlow,
	summarizeLegacyMigrationArtifacts,
	verifyLegacyMigrationRecoveryFlow,
} from "./legacy-migration.flow"

const timestamp = "2025-01-01T00:00:00.000Z"
const workspace: WorkspaceInterface = {
	author: "Author", createDate: timestamp, description: "", id: "workspace-1",
	language: "en", lastOpen: timestamp, publisher: "", title: "Stale UI title",
}
const graph: LegacyRecoveryGraph = {
	workspace: {
		id: workspace.id, name: "My Book", description: "原始\u0000metadata",
		createdAt: "9223372036854775807", updatedAt: "-9223372036854775808",
	},
	nodes: [
		{ id: "folder-1", workspaceId: workspace.id, parentId: null, title: "Drafts", nodeType: "folder", isCollapsed: "1", sortOrder: "9007199254740993", tags: '[ "原始" ]', createdAt: "9223372036854775807", updatedAt: "-9223372036854775808" },
		{ id: "document-1", workspaceId: workspace.id, parentId: "folder-1", title: "Chapter", nodeType: "file", isCollapsed: "0", sortOrder: "-9007199254740993", tags: null, createdAt: "9007199254740993", updatedAt: "9007199254740995" },
	],
}
const contents = [{ content: "body\u0000你好", contentType: "text", id: "content-1", nodeId: "document-1", version: "9007199254740993", createdAt: "9223372036854775807", updatedAt: "-9223372036854775808" }]
const snapshot = { graph, contents }
const dependencies = { getLegacyMigrationSnapshot: () => TE.right(snapshot), summarizeArtifacts: summarizeLegacyMigrationArtifacts }
const boundaryError: OrgFileError = { cause: "unavailable", command: "test", message: "unavailable", operation: "readMigrationRecovery", type: "ORG_FILE_ERROR" }
const repositoryWith = (overrides: Partial<OrgFileRepository> = {}): OrgFileRepository => ({
	clearDerivedIndex: () => TE.left(boundaryError), createDirectory: () => TE.left(boundaryError),
	deleteDocument: () => TE.left(boundaryError), getDerivedIndexStats: () => TE.left(boundaryError),
	moveDocument: () => TE.left(boundaryError), openDefaultWorkspace: () => TE.left(boundaryError),
	readDocument: () => TE.left(boundaryError), readMigrationRecovery: () => TE.left(boundaryError),
	releaseWorkspace: () => TE.left(boundaryError), reopenDefaultWorkspace: () => TE.left(boundaryError),
	replaceDerivedIndex: () => TE.left(boundaryError), scanWorkspace: () => TE.left(boundaryError),
	selectWorkspace: () => TE.left(boundaryError), unwatchWorkspace: () => TE.left(boundaryError),
	verifyMigration: () => TE.right({ checkedCount: 0, mismatches: [] }), watchWorkspace: () => TE.left(boundaryError),
	writeDocument: () => TE.left(boundaryError),
	writeMigration: () => TE.right({ artifacts: [], verificationPath: "My Book/migration-verification.json", writtenPaths: [] }),
	...overrides,
})

describe("legacy migration flows", () => {
	it("detects document drift even when the manifest is unchanged", () => {
		const plan = planLegacyMigration(snapshot)
		expect(areLegacyMigrationPlansEquivalent(plan, {
			...plan, documents: plan.documents.map((document) => ({ ...document, content: `${document.content}changed` })),
		})).toBe(false)
	})

	it("detects raw workspace/node metadata changes that leave rendered Org unchanged", () => {
		const original = planLegacyMigration(snapshot)
		const changed = planLegacyMigration({ ...snapshot, graph: {
			...graph, workspace: { ...graph.workspace, description: "changed raw metadata" },
			nodes: graph.nodes.map((node) => ({ ...node, updatedAt: "9007199254740997" })),
		} })
		expect(changed.documents).toEqual(original.documents)
		expect(areLegacyMigrationPlansEquivalent(original, changed)).toBe(false)
	})

	it("summarizes UTF-8 with native byte lengths, SHA-256, and bytewise path ordering", async () => {
		expect(await summarizeLegacyMigrationArtifacts([
			{ content: "second", relativePath: "𐀀.org" }, { content: "你好🌾", relativePath: "\uE000.org" },
		])).toEqual([
			{ byteLength: 10, relativePath: "\uE000.org", revision: "bdfb3860c6a56c4e7b83e37244375e78f4c1e45f9c6bed184aea4179a9e3e0d8" },
			{ byteLength: 6, relativePath: "𐀀.org", revision: "16367aacb67a4a017c8da8ab95682ccb390863780f7114dda0a0e0c55644c7c4" },
		])
	})

	it("uses the atomic raw workspace title and preserves dangling content without UI-derived metadata", async () => {
		const dangling = { ...contents[0], id: "dangling", nodeId: "missing-node", content: "orphan\u0000" }
		const result = await prepareLegacyMigrationFlow(workspace, { getLegacyMigrationSnapshot: () => TE.right({ graph, contents: [...contents, dangling] }) })()
		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			expect(result.right.rootDirectory).toBe("My Book")
			expect(result.right.graph.workspace).toEqual(graph.workspace)
			expect(result.right.rawBackups.map(({ contentId }) => contentId).sort()).toEqual(["content-1", "dangling"])
			expect(result.right.rawBackups.find(({ contentId }) => contentId === "dangling")?.content).toBe("orphan\u0000")
		}
	})

	it("preserves failing API errors in the preparation stage", async () => {
		const error: AppError = { message: "nodes unavailable", type: "DB_ERROR" }
		expect(await prepareLegacyMigrationFlow(workspace, { getLegacyMigrationSnapshot: () => TE.left(error) })()).toMatchObject({ _tag: "Left", left: { cause: error, stage: "load-nodes" } })
	})

	it("rejects another workspace's graph and noncanonical metadata in the typed preparation stage", async () => {
		for (const invalidGraph of [
			{ ...graph, workspace: { ...graph.workspace, id: "another-workspace" } },
			{ ...graph, nodes: graph.nodes.map((node) => ({ ...node, createdAt: "9223372036854775808" })) },
		]) {
			expect(await prepareLegacyMigrationFlow(workspace, { getLegacyMigrationSnapshot: () => TE.right({ graph: invalidGraph, contents }) })()).toMatchObject({ _tag: "Left", left: { stage: "load-contents", cause: { type: "VALIDATION_ERROR" } } })
		}
	})

	it("preserves write and verification command errors in their typed stages", async () => {
		const plan = planLegacyMigration(snapshot)
		for (const [stage, repository] of [
			["write-artifacts", repositoryWith({ writeMigration: () => TE.left(boundaryError) })],
			["verify-artifacts", repositoryWith({ verifyMigration: () => TE.left(boundaryError) })],
		] as const) {
			expect(await executeLegacyMigrationFlow("/approved", "grant", plan, repository)()).toMatchObject({ _tag: "Left", left: { stage, cause: boundaryError } })
		}
	})

	it("reports verifier mismatches and rejects incomplete verification receipts", async () => {
		const plan = planLegacyMigration(snapshot)
		const mismatch = { actualByteLength: 8, actualRevision: "actual", expectedByteLength: 12, expectedRevision: "expected", relativePath: "My Book/Chapter.org" }
		const result = await executeLegacyMigrationFlow("/approved", "grant", plan, repositoryWith({ verifyMigration: () => TE.right({ checkedCount: 3, mismatches: [mismatch] }) }))()
		expect(result).toMatchObject({ _tag: "Left", left: { stage: "verify-artifacts", cause: { type: "MIGRATION_VERIFICATION_MISMATCH", mismatches: [mismatch] } } })
		const incomplete = await executeLegacyMigrationFlow("/approved", "grant", plan, repositoryWith({
			writeMigration: () => TE.right({ artifacts: [{ byteLength: 12, relativePath: "My Book/Chapter.org", revision: "rev-1" }, { byteLength: 8, relativePath: plan.manifestPath, revision: "rev-2" }], verificationPath: "My Book/migration-verification.json", writtenPaths: [] }),
			verifyMigration: () => TE.right({ checkedCount: 1, mismatches: [] }),
		}))()
		expect(incomplete).toMatchObject({ _tag: "Left", left: { stage: "verify-artifacts", cause: { type: "MIGRATION_VERIFICATION_MISMATCH", checkedCount: 1 } } })
	})

	it("reports changed rebuilt source, command failures, and hashing failures after restart", async () => {
		const mismatch = { actualByteLength: 4, actualRevision: "old", expectedByteLength: 7, expectedRevision: "new", relativePath: "My Book/Drafts/Chapter.org" }
		const changed = await verifyLegacyMigrationRecoveryFlow(workspace, "/approved", { ...dependencies, getLegacyMigrationSnapshot: () => TE.right({ graph, contents: [{ ...contents[0], content: "changed" }] }) }, repositoryWith({ verifyMigration: ({ expectedArtifacts }) => TE.right({ checkedCount: expectedArtifacts.length, mismatches: [mismatch] }) }), "grant")()
		expect(changed).toMatchObject({ _tag: "Left", left: { stage: "verify-artifacts", cause: { mismatches: [mismatch] } } })
		expect(await verifyLegacyMigrationRecoveryFlow(workspace, "/approved", dependencies, repositoryWith({ verifyMigration: () => TE.left(boundaryError) }), "grant")()).toMatchObject({ _tag: "Left", left: { stage: "verify-artifacts", cause: boundaryError } })
		const failure = new Error("crypto unavailable")
		expect(await verifyLegacyMigrationRecoveryFlow(workspace, "/approved", { ...dependencies, summarizeArtifacts: () => Promise.reject(failure) }, repositoryWith(), "grant")()).toMatchObject({ _tag: "Left", left: { stage: "hash-artifacts", cause: { cause: failure, type: "MIGRATION_ARTIFACT_HASH_ERROR" } } })
	})

	it.each(["body", "graph", "sql", "missing-graph"])("rejects corrupted %s recovery receipts without throwing", async (kind) => {
		const plan = planLegacyMigration(snapshot)
		const bundle = { manifest: plan.manifest, graph: plan.graph, rawBackups: plan.rawBackups, recoverySql: plan.recoverySql }
		const corrupted = kind === "body" ? { ...bundle, rawBackups: bundle.rawBackups.map((backup) => ({ ...backup, content: "tampered" })) }
			: kind === "graph" ? { ...bundle, graph: { ...graph, workspace: { ...graph.workspace, updatedAt: "1" } } }
			: kind === "sql" ? { ...bundle, recoverySql: "DROP TABLE nodes;" }
			: { ...bundle, graph: undefined }
		const result = await runLegacyMigrationRecoveryDrillFlow(workspace, "/approved", dependencies, repositoryWith({
			readMigrationRecovery: () => TE.right(corrupted as typeof bundle),
			verifyMigration: ({ expectedArtifacts }) => TE.right({ checkedCount: expectedArtifacts.length, mismatches: [] }),
		}), "grant")()
		expect(result).toMatchObject({ _tag: "Left", left: { stage: "read-recovery", cause: { type: "MIGRATION_RECOVERY_MISMATCH" } } })
	})

	it("refuses publication when exact graph metadata changes between atomic snapshots", async () => {
		let reads = 0
		const writeMigration = vi.fn<OrgFileRepository["writeMigration"]>(() => TE.left(boundaryError))
		const result = await migrateLegacyWorkspaceFlow(workspace, "/approved", { getLegacyMigrationSnapshot: () => TE.right(++reads === 1 ? snapshot : { ...snapshot, graph: { ...graph, workspace: { ...graph.workspace, description: "changed" } } }) }, repositoryWith({ writeMigration }), "grant")()
		expect(result).toMatchObject({ _tag: "Left", left: { stage: "read-recovery", cause: { type: "MIGRATION_RECOVERY_MISMATCH" } } })
		expect(writeMigration).not.toHaveBeenCalled()
	})

	it("retains a published snapshot and reports source changes during publication", async () => {
		let reads = 0
		const result = await migrateLegacyWorkspaceFlow(workspace, "/approved", { getLegacyMigrationSnapshot: () => TE.right(++reads < 3 ? snapshot : { ...snapshot, graph: { ...graph, nodes: graph.nodes.map((node) => ({ ...node, tags: "changed raw metadata" })) } }) }, repositoryWith(), "grant")()
		expect(result).toMatchObject({ _tag: "Left", left: { stage: "read-recovery", cause: { type: "MIGRATION_RECOVERY_MISMATCH" } } })
	})
})
