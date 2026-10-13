import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { getLegacyMigrationSnapshot } from "@/io/api"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import {
	createLegacyWorkspaceRecoverySql,
	decodeLegacyRecoveryBundle,
	type LegacyMigrationPlan,
	planLegacyMigration,
} from "@/pipes/migration"
import type { AppError } from "@/types/error"
import type {
	OrgFileError,
	OrgMigrationArtifactInterface,
	OrgMigrationArtifactSummaryInterface,
	OrgMigrationRecoveryBundleInterface,
	OrgMigrationVerificationMismatchInterface,
	OrgMigrationVerificationResultInterface,
	OrgMigrationWriteResultInterface,
} from "@/types/org"
import type { LegacyRecoveryGraph } from "@/types/org/org.interface"
import type { WorkspaceInterface } from "@/types/workspace"

export type LegacyMigrationWorkspace = Pick<WorkspaceInterface, "id">

export type LegacyMigrationFlowError =
	| {
			readonly type: "LEGACY_MIGRATION_ERROR"
			readonly stage: "load-nodes"
			readonly cause: AppError
	  }
	| {
			readonly type: "LEGACY_MIGRATION_ERROR"
			readonly stage: "load-contents"
			readonly cause: AppError
	  }
	| {
			readonly type: "LEGACY_MIGRATION_ERROR"
			readonly stage: "write-artifacts"
			readonly cause: OrgFileError
	  }
	| {
			readonly type: "LEGACY_MIGRATION_ERROR"
			readonly stage: "hash-artifacts"
			readonly cause: LegacyMigrationArtifactHashCause
	  }
	| {
			readonly type: "LEGACY_MIGRATION_ERROR"
			readonly stage: "verify-artifacts"
			readonly cause: OrgFileError | LegacyMigrationVerificationMismatchCause
	  }
	| {
			readonly type: "LEGACY_MIGRATION_ERROR"
			readonly stage: "read-recovery"
			readonly cause: OrgFileError | LegacyMigrationRecoveryMismatchCause
	  }

export interface LegacyMigrationArtifactHashCause {
	readonly type: "MIGRATION_ARTIFACT_HASH_ERROR"
	readonly message: string
	readonly cause: unknown
}

export interface LegacyMigrationVerificationMismatchCause {
	readonly type: "MIGRATION_VERIFICATION_MISMATCH"
	readonly message: string
	readonly checkedCount: number
	readonly mismatches: readonly OrgMigrationVerificationMismatchInterface[]
}

export interface LegacyMigrationRecoveryMismatchCause {
	readonly type: "MIGRATION_RECOVERY_MISMATCH"
	readonly message: string
}

export interface RecoveredLegacyContentRow {
	readonly id: string
	readonly nodeId: string
	readonly content: string
	readonly contentType: string
	readonly version: string
	readonly createdAt: string
	readonly updatedAt: string
}

export interface RecoveredLegacyWorkspace {
	readonly graph: LegacyRecoveryGraph
	readonly contents: readonly RecoveredLegacyContentRow[]
}

/** Reconstructs the exact selected workspace graph/raw rows from the required v2 bundle. */
export const reconstructLegacyWorkspaceFromBundle = (
	input: OrgMigrationRecoveryBundleInterface,
): RecoveredLegacyWorkspace => {
	const bundle = decodeLegacyRecoveryBundle(input)
	return {
		graph: bundle.graph,
		contents: bundle.rawBackups.map((backup) => ({
			content: backup.content,
			contentType: backup.contentType,
			createdAt: backup.createdAt,
			id: backup.contentId,
			nodeId: backup.nodeId,
			updatedAt: backup.updatedAt,
			version: backup.version,
		})),
	}
}

export interface LegacyMigrationRecoveryDrillResult {
	readonly recoveredContentCount: number
	readonly recoveredNodeCount: number
	readonly recoveredWorkspaceId: string
	readonly verification: OrgMigrationVerificationResultInterface
	readonly manifestPath: string
	readonly recoverySqlPath: string
}

export interface LegacyMigrationCompletedResult {
	readonly write: OrgMigrationWriteResultInterface
	readonly verification: OrgMigrationVerificationResultInterface
}

export interface LegacyMigrationRecoveryCompletedResult {
	readonly expectedArtifacts: readonly OrgMigrationArtifactSummaryInterface[]
	readonly verification: OrgMigrationVerificationResultInterface
}

export interface LegacyMigrationArtifactPayload {
	readonly artifacts: readonly OrgMigrationArtifactInterface[]
	readonly directories: readonly string[]
}

export interface LegacyMigrationPreparationDependencies {
	readonly getLegacyMigrationSnapshot: typeof getLegacyMigrationSnapshot
}

const preparationDependencies: LegacyMigrationPreparationDependencies = {
	getLegacyMigrationSnapshot,
}

/** Rebuild the exact deterministic payload sent to the atomic migration writer. */
export const createLegacyMigrationArtifactPayload = (
	plan: LegacyMigrationPlan,
): LegacyMigrationArtifactPayload => ({
	artifacts: [
		...plan.documents.map(({ content, path }) => ({ content, relativePath: path })),
		...plan.rawBackups.map(({ content, path }) => ({ content, relativePath: path })),
		{ content: plan.recoverySql, relativePath: plan.recoverySqlPath },
		{ content: plan.manifest, relativePath: plan.manifestPath },
	],
	directories: plan.directories.map(({ path }) => path),
})

const compareUtf8 = (left: string, right: string): number => {
	const encoder = new TextEncoder()
	const leftBytes = encoder.encode(left)
	const rightBytes = encoder.encode(right)
	const sharedLength = Math.min(leftBytes.length, rightBytes.length)
	for (let index = 0; index < sharedLength; index += 1) {
		const difference = leftBytes[index] - rightBytes[index]
		if (difference !== 0) {
			return difference
		}
	}
	return leftBytes.length - rightBytes.length
}

/** Hash migration contents exactly as Rust does: UTF-8 byte length and lowercase SHA-256. */
export const summarizeLegacyMigrationArtifacts = async (
	artifacts: readonly OrgMigrationArtifactInterface[],
): Promise<readonly OrgMigrationArtifactSummaryInterface[]> => {
	const encoder = new TextEncoder()
	const summaries = await Promise.all(
		artifacts.map(async ({ content, relativePath }) => {
			const bytes = encoder.encode(content)
			const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes)
			const revision = Array.from(new Uint8Array(digest), (byte) =>
				byte.toString(16).padStart(2, "0"),
			).join("")
			return { byteLength: bytes.byteLength, relativePath, revision }
		}),
	)
	return summaries.sort((left, right) => compareUtf8(left.relativePath, right.relativePath))
}

export interface LegacyMigrationRecoveryDependencies
	extends LegacyMigrationPreparationDependencies {
	readonly summarizeArtifacts: typeof summarizeLegacyMigrationArtifacts
}

const recoveryDependencies: LegacyMigrationRecoveryDependencies = {
	...preparationDependencies,
	summarizeArtifacts: summarizeLegacyMigrationArtifacts,
}

/** Load one consistent legacy snapshot and turn it into a deterministic, side-effect-free plan. */
export const prepareLegacyMigrationFlow = (
	workspace: LegacyMigrationWorkspace,
	dependencies: LegacyMigrationPreparationDependencies = preparationDependencies,
): TE.TaskEither<LegacyMigrationFlowError, LegacyMigrationPlan> =>
	pipe(
		dependencies.getLegacyMigrationSnapshot(workspace.id),
		TE.mapLeft(
			(cause): LegacyMigrationFlowError => ({
				cause,
				stage: "load-nodes",
				type: "LEGACY_MIGRATION_ERROR",
			}),
		),
		TE.chainEitherK((snapshot) => E.tryCatch(
			() => {
				if (snapshot.graph.workspace.id !== workspace.id) {
					throw new Error("Legacy snapshot belongs to a different workspace")
				}
				return planLegacyMigration(snapshot)
			},
			(cause): LegacyMigrationFlowError => ({
				type: "LEGACY_MIGRATION_ERROR",
				stage: "load-contents",
				cause: { type: "VALIDATION_ERROR", message: String(cause) },
			}),
		)),
	)

const verifyExpectedArtifacts = (
	workspaceRoot: string,
	verificationPath: string,
	expectedArtifacts: readonly OrgMigrationArtifactSummaryInterface[],
	repository: OrgFileRepository,
	capabilityToken?: string,
): TE.TaskEither<LegacyMigrationFlowError, OrgMigrationVerificationResultInterface> =>
	pipe(
		repository.verifyMigration({
			capabilityToken,
			expectedArtifacts,
			verificationPath,
			workspaceRoot,
		}),
		TE.mapLeft(
			(cause): LegacyMigrationFlowError => ({
				cause,
				stage: "verify-artifacts",
				type: "LEGACY_MIGRATION_ERROR",
			}),
		),
		TE.chain((verification) => {
			if (
				verification.mismatches.length === 0 &&
				verification.checkedCount === expectedArtifacts.length
			) {
				return TE.right(verification)
			}
			const message =
				verification.mismatches.length > 0
					? `Migration verification found ${verification.mismatches.length} artifact mismatch(es)`
					: `Migration verification checked ${verification.checkedCount} of ${expectedArtifacts.length} artifact(s)`
			return TE.left<LegacyMigrationFlowError>({
				cause: {
					checkedCount: verification.checkedCount,
					message,
					mismatches: verification.mismatches,
					type: "MIGRATION_VERIFICATION_MISMATCH",
				},
				stage: "verify-artifacts",
				type: "LEGACY_MIGRATION_ERROR",
			})
		}),
	)

/** Install and immediately verify every planned migration artifact. */
export function executeLegacyMigrationFlow(
	workspaceRoot: string,
	capabilityToken: string | undefined,
	plan: LegacyMigrationPlan,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<LegacyMigrationFlowError, LegacyMigrationCompletedResult> {
	return pipe(
		repository.writeMigration({
			...createLegacyMigrationArtifactPayload(plan),
			capabilityToken,
			workspaceRoot,
		}),
		TE.mapLeft(
			(cause): LegacyMigrationFlowError => ({
				cause,
				stage: "write-artifacts",
				type: "LEGACY_MIGRATION_ERROR",
			}),
		),
		TE.chainW((write) =>
			pipe(
				verifyExpectedArtifacts(
					workspaceRoot,
					write.verificationPath,
					write.artifacts,
					repository,
					capabilityToken,
				),
				TE.map((verification) => ({ verification, write })),
			),
		),
	)
}

/** Rebuild and verify a previously written migration after an application restart. */
export const verifyLegacyMigrationRecoveryFlow = (
	workspace: LegacyMigrationWorkspace,
	workspaceRoot: string,
	dependencies: LegacyMigrationRecoveryDependencies = recoveryDependencies,
	repository: OrgFileRepository = orgFileRepository,
	capabilityToken?: string,
): TE.TaskEither<LegacyMigrationFlowError, LegacyMigrationRecoveryCompletedResult> =>
	pipe(
		prepareLegacyMigrationFlow(workspace, dependencies),
		TE.chainW((plan) => {
			const { artifacts } = createLegacyMigrationArtifactPayload(plan)
			return pipe(
				TE.tryCatch(
					() => dependencies.summarizeArtifacts(artifacts),
					(cause): LegacyMigrationFlowError => ({
						cause: {
							cause,
							message: "Failed to hash rebuilt migration artifacts",
							type: "MIGRATION_ARTIFACT_HASH_ERROR",
						},
						stage: "hash-artifacts",
						type: "LEGACY_MIGRATION_ERROR",
					}),
				),
				TE.chainW((expectedArtifacts) =>
					pipe(
						verifyExpectedArtifacts(
							workspaceRoot,
							`${plan.rootDirectory}/migration-verification.json`,
							expectedArtifacts,
							repository,
							capabilityToken,
						),
						TE.map((verification) => ({ expectedArtifacts, verification })),
					),
				),
			)
		}),
	)

/**
 * Verifies the complete artifact hash set, then reconstructs the selected workspace graph and
 * preserved content rows from the capability-read bundle. Unrelated DB tables are not restored.
 */
export const runLegacyMigrationRecoveryDrillFlow =
	(
		workspace: LegacyMigrationWorkspace,
		workspaceRoot: string,
		dependencies: LegacyMigrationRecoveryDependencies = recoveryDependencies,
		repository: OrgFileRepository = orgFileRepository,
		capabilityToken?: string,
	): TE.TaskEither<LegacyMigrationFlowError, LegacyMigrationRecoveryDrillResult> =>
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: preparation, hash verification, capability reads, and exact reconciliation form one audit transaction.
	async () => {
		const prepared = await prepareLegacyMigrationFlow(workspace, dependencies)()
		if (E.isLeft(prepared)) {
			return prepared
		}
		const plan = prepared.right
		let expectedArtifacts: readonly OrgMigrationArtifactSummaryInterface[]
		try {
			expectedArtifacts = await dependencies.summarizeArtifacts(
				createLegacyMigrationArtifactPayload(plan).artifacts,
			)
		} catch (cause) {
			return E.left({
				cause: {
					cause,
					message: "Failed to hash rebuilt migration artifacts",
					type: "MIGRATION_ARTIFACT_HASH_ERROR",
				},
				stage: "hash-artifacts",
				type: "LEGACY_MIGRATION_ERROR",
			})
		}
		const verified = await verifyExpectedArtifacts(
			workspaceRoot,
			`${plan.rootDirectory}/migration-verification.json`,
			expectedArtifacts,
			repository,
			capabilityToken,
		)()
		if (E.isLeft(verified)) {
			return verified
		}
		const manifestPath = plan.manifestPath
		const bundle = await repository.readMigrationRecovery(
			workspaceRoot,
			manifestPath,
			capabilityToken,
		)()
		if (E.isLeft(bundle)) {
			return E.left({
				cause: bundle.left,
				stage: "read-recovery",
				type: "LEGACY_MIGRATION_ERROR",
			})
		}
		const mismatch = (message: string) =>
			E.left<LegacyMigrationFlowError, LegacyMigrationRecoveryDrillResult>({
				cause: { message, type: "MIGRATION_RECOVERY_MISMATCH" },
				stage: "read-recovery",
				type: "LEGACY_MIGRATION_ERROR",
			})
		let reconstructed: RecoveredLegacyWorkspace
		try {
			reconstructed = reconstructLegacyWorkspaceFromBundle(bundle.right)
		} catch (cause) {
			return mismatch(`Invalid recovery bundle: ${String(cause)}`)
		}
		if (JSON.stringify(reconstructed.graph) !== JSON.stringify(plan.graph)) {
			return mismatch("Recovered workspace graph differs from the rebuilt legacy plan.")
		}
		const expectedBackups = new Map(plan.rawBackups.map((backup) => [backup.path, backup]))
		const reconstructedRows = reconstructed.contents
		const reconstructedById = new Map(reconstructedRows.map((row) => [row.id, row]))
		const recoveredPaths = new Set<string>()
		if (bundle.right.manifest !== plan.manifest) {
			return mismatch("Recovered migration manifest differs from the rebuilt legacy plan.")
		}
		const reconstructedSql = createLegacyWorkspaceRecoverySql(bundle.right.graph, bundle.right.rawBackups)
		if (bundle.right.recoverySql !== reconstructedSql || reconstructedSql !== plan.recoverySql) {
			return mismatch("Recovery SQL does not reconstruct the manifest raw backups.")
		}
		for (const recovered of bundle.right.rawBackups) {
			const expected = expectedBackups.get(recovered.path)
			if (
				!expected ||
				recoveredPaths.has(recovered.path) ||
				recovered.contentId !== expected.contentId ||
				recovered.contentType !== expected.contentType ||
				recovered.nodeId !== expected.nodeId ||
				recovered.version !== expected.version ||
				recovered.createdAt !== expected.createdAt ||
				recovered.updatedAt !== expected.updatedAt ||
				recovered.content !== expected.content
			) {
				return mismatch(`Raw backup recovery mismatch: ${recovered.path}`)
			}
			recoveredPaths.add(recovered.path)
		}
		if (
			reconstructedById.size !== reconstructedRows.length ||
			reconstructedRows.length !== expectedBackups.size
		) {
			return mismatch("Recovered legacy content IDs are incomplete or duplicated.")
		}
		if (recoveredPaths.size !== expectedBackups.size) {
			return mismatch(
				`Raw backup recovery count mismatch: expected ${expectedBackups.size}, recovered ${recoveredPaths.size}`,
			)
		}
		return E.right({
			manifestPath,
			recoveredContentCount: recoveredPaths.size,
			recoveredNodeCount: bundle.right.graph.nodes.length,
			recoveredWorkspaceId: bundle.right.graph.workspace.id,
			recoverySqlPath: plan.recoverySqlPath,
			verification: verified.right,
		})
	}

export const areLegacyMigrationPlansEquivalent = (
	left: LegacyMigrationPlan,
	right: LegacyMigrationPlan,
): boolean => {
	const leftPayload = createLegacyMigrationArtifactPayload(left)
	const rightPayload = createLegacyMigrationArtifactPayload(right)
	return (
		left.rootDirectory === right.rootDirectory &&
		leftPayload.directories.length === rightPayload.directories.length &&
		leftPayload.directories.every(
			(directory, index) => directory === rightPayload.directories[index],
		) &&
		leftPayload.artifacts.length === rightPayload.artifacts.length &&
		leftPayload.artifacts.every(
			(artifact, index) =>
				artifact.relativePath === rightPayload.artifacts[index]?.relativePath &&
				artifact.content === rightPayload.artifacts[index]?.content,
		)
	)
}

/** Prepare, source-recheck, publish, and post-check one complete legacy migration. */
export const migrateLegacyWorkspaceFlow =
	(
		workspace: LegacyMigrationWorkspace,
		workspaceRoot: string,
		dependencies: LegacyMigrationPreparationDependencies = preparationDependencies,
		repository: OrgFileRepository = orgFileRepository,
		capabilityToken?: string,
	): TE.TaskEither<LegacyMigrationFlowError, LegacyMigrationCompletedResult> =>
	async () => {
		const initial = await prepareLegacyMigrationFlow(workspace, dependencies)()
		if (E.isLeft(initial)) {
			return initial
		}
		const current = await prepareLegacyMigrationFlow(workspace, dependencies)()
		if (E.isLeft(current)) {
			return current
		}
		if (!areLegacyMigrationPlansEquivalent(current.right, initial.right)) {
			return E.left({
				cause: {
					message: "Legacy source changed before migration publication.",
					type: "MIGRATION_RECOVERY_MISMATCH",
				},
				stage: "read-recovery",
				type: "LEGACY_MIGRATION_ERROR",
			})
		}
		const migrated = await executeLegacyMigrationFlow(
			workspaceRoot,
			capabilityToken,
			current.right,
			repository,
		)()
		if (E.isLeft(migrated)) {
			return migrated
		}
		const final = await prepareLegacyMigrationFlow(workspace, dependencies)()
		if (E.isLeft(final)) {
			return final
		}
		if (!areLegacyMigrationPlansEquivalent(final.right, current.right)) {
			return E.left({
				cause: {
					message:
						"Legacy source changed during migration publication; output is an earlier recoverable snapshot.",
					type: "MIGRATION_RECOVERY_MISMATCH",
				},
				stage: "read-recovery",
				type: "LEGACY_MIGRATION_ERROR",
			})
		}
		return migrated
	}
