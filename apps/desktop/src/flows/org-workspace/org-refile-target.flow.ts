import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import {
	createOrgRefileTargetSnapshot,
	type OrgRefileTargetSnapshot,
} from "@/pipes/org/org-refile-target.pipe"
import { isSafeRelativeOrgPath } from "@/pipes/org/org-subtree-refile.pipe"
import type { OrgFileError } from "@/types/org"

export interface ReadOrgRefileTargetInput {
	readonly workspaceRoot: string
	readonly capabilityToken?: string
	readonly sourceRelativePath: string
	readonly targetRelativePath: string
	/** Read permission only; checked before each IO and before exposing its result. */
	readonly confirmCurrent?: () => boolean
}
export interface OrgRefileTargetValidationError {
	readonly type: "ORG_REFILE_TARGET_VALIDATION_ERROR"
	readonly message: string
}
export type OrgRefileTargetFlowError = OrgFileError | OrgRefileTargetValidationError

const validRevision = (value: unknown): value is string =>
	typeof value === "string" && value.trim().length > 0 && value !== "<missing>"
const comparable = (path: string) => path.normalize("NFC").toLocaleLowerCase("en-US")

/** Read-only, capability-qualified snapshot. Absence is established by a fresh scan. */
export const readOrgRefileTargetFlow =
	(
		input: ReadOrgRefileTargetInput,
		repository: OrgFileRepository = orgFileRepository,
	): TE.TaskEither<OrgRefileTargetFlowError, OrgRefileTargetSnapshot> =>
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ordered validation and capability-qualified read guards form a single read-only transaction.
	async () => {
		if (
			typeof input.sourceRelativePath !== "string" ||
			typeof input.targetRelativePath !== "string" ||
			!isSafeRelativeOrgPath(input.sourceRelativePath) ||
			!isSafeRelativeOrgPath(input.targetRelativePath) ||
			comparable(input.sourceRelativePath) === comparable(input.targetRelativePath)
		) {
			return E.left({
				message: "Refile target must be a safe, distinct relative Org path.",
				type: "ORG_REFILE_TARGET_VALIDATION_ERROR",
			})
		}
		let operation: "scan" | "read" = "scan"
		try {
			if (input.confirmCurrent && !input.confirmCurrent()) {
				throw new Error("Refile target lookup is stale.")
			}
			const scanned = await repository.scanWorkspace(input.workspaceRoot, input.capabilityToken)()
			if (input.confirmCurrent && !input.confirmCurrent()) {
				throw new Error("Refile target lookup is stale.")
			}
			if (E.isLeft(scanned)) {
				return scanned
			}
			if (
				!scanned.right ||
				!Array.isArray(scanned.right.documents) ||
				scanned.right.documents.some(
					(document) =>
						!document ||
						!isSafeRelativeOrgPath(document.relativePath) ||
						!validRevision(document.revision),
				)
			) {
				throw new Error("Malformed workspace scan confirmation.")
			}
			if (
				!scanned.right.documents.some(
					(document) => document.relativePath === input.targetRelativePath,
				)
			) {
				return E.right(createOrgRefileTargetSnapshot(input.targetRelativePath, "<missing>", ""))
			}
			operation = "read"
			const read = await repository.readDocument({
				capabilityToken: input.capabilityToken,
				relativePath: input.targetRelativePath,
				workspaceRoot: input.workspaceRoot,
			})()
			if (input.confirmCurrent && !input.confirmCurrent()) {
				throw new Error("Refile target lookup is stale.")
			}
			if (E.isLeft(read)) {
				return read
			}
			const document = read.right
			if (
				!document ||
				document.relativePath !== input.targetRelativePath ||
				typeof document.content !== "string" ||
				!validRevision(document.revision)
			) {
				throw new Error("Malformed target document confirmation.")
			}
			return E.right(
				createOrgRefileTargetSnapshot(document.relativePath, document.revision, document.content),
			)
		} catch (cause) {
			return E.left({
				cause,
				command: `${operation}_org_${operation === "scan" ? "workspace" : "document"}`,
				message: cause instanceof Error ? cause.message : String(cause),
				operation,
				type: "ORG_FILE_ERROR",
			})
		}
	}
