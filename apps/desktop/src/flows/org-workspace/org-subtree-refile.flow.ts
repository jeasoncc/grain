import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { z } from "zod"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import {
	deriveOrgArchivePath,
	planOrgRefilePayload,
	isSafeRelativeOrgPath,
	removeOrgSubtree,
	type OrgRefileLoggingIntent,
} from "@/pipes/org/org-subtree-refile.pipe"
import {
	planOrgRefileInsertion,
	type OrgRefileHeadingTarget,
} from "@/pipes/org/org-refile-target.pipe"
import type { OrgDocumentInterface, OrgFileError } from "@/types/org"

export interface RefileOrgSubtreeInput {
	readonly capabilityToken?: string
	readonly workspaceRoot: string
	readonly sourceRelativePath: string
	readonly sourceContent: string
	readonly expectedSourceRevision: string
	readonly cursor: number
	readonly targetRelativePath: string
	readonly expectedTargetRevision?: string
	/** Exact reviewed target bytes; revision remains the disk CAS authority. */
	readonly expectedTargetContent?: string
	readonly targetHeading?: Pick<OrgRefileHeadingTarget, "from" | "heading">
	readonly logging?: OrgRefileLoggingIntent
	/** Live guard checked immediately before target copy and again before source removal. */
	readonly confirmSourceUnchanged?: () => boolean
	/** Live dirty/conflict protection for either affected document. */
	readonly isProtectedPath?: (relativePath: string) => boolean
}

export interface OrgSubtreeRefileResult {
	readonly source: OrgDocumentInterface
	readonly target: OrgDocumentInterface
}

export interface OrgSubtreeRefileValidationError {
	readonly type: "ORG_SUBTREE_REFILE_VALIDATION_ERROR"
	readonly message: string
}

export const ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE =
	"The target copy succeeded, but source removal was not confirmed. Treat this as a possible duplicate copy: reread both documents and remove one copy only after verifying that both contain the subtree. No destructive rollback was attempted."

export interface OrgSubtreeRefilePartialError {
	readonly type: "ORG_SUBTREE_REFILE_PARTIAL_ERROR"
	readonly message: string
	readonly recovery: typeof ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE
	readonly cause: OrgFileError | OrgSubtreeRefileValidationError
	/** The target document that was successfully persisted before the source write failed. */
	readonly target: OrgDocumentInterface
}

export interface OrgSubtreeRefileUncertainWriteError {
	readonly type: "ORG_SUBTREE_REFILE_UNCERTAIN_WRITE_ERROR"
	readonly message: string
	readonly cause: OrgFileError
	readonly targetRelativePath: string
}

export type OrgSubtreeRefileFlowError =
	| OrgSubtreeRefileUncertainWriteError
	| OrgFileError
	| OrgSubtreeRefileValidationError
	| OrgSubtreeRefilePartialError

const validationError = (message: string): OrgSubtreeRefileValidationError => ({
	message,
	type: "ORG_SUBTREE_REFILE_VALIDATION_ERROR",
})

const validRevision = (revision: unknown): revision is string =>
	typeof revision === "string" && revision.trim().length > 0 && revision !== "<missing>"

const validWrite = (
	value: unknown,
	path: string,
): value is { relativePath: string; revision: string } =>
	!!value &&
	typeof value === "object" &&
	"relativePath" in value &&
	value.relativePath === path &&
	"revision" in value &&
	validRevision(value.revision)

const validDocument = (value: unknown, path: string): value is OrgDocumentInterface =>
	validWrite(value, path) && "content" in value && typeof value.content === "string"

const comparablePath = (relativePath: string): string =>
	relativePath.normalize("NFC").toLocaleLowerCase("en-US")

const partialError = (
	cause: OrgFileError | OrgSubtreeRefileValidationError,
	target: OrgDocumentInterface,
): OrgSubtreeRefilePartialError => ({
	cause,
	message: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
	recovery: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
	target,
	type: "ORG_SUBTREE_REFILE_PARTIAL_ERROR",
})

// Match the native preflight proof inside the repository's typed command error.
// Human-readable collision messages and generic noWrite flags confer no authority.
const unpublishedTargetCollisionSchema = z.object({
	type: z.literal("ORG_FILE_ERROR"),
	operation: z.literal("write"),
	command: z.literal("write_org_document"),
	cause: z.object({
		kind: z.literal("creation-collision"),
		noWrite: z.literal(true),
		relativePath: z.string(),
	}),
})

const isUnpublishedTargetCollision = (error: OrgFileError, relativePath: string): boolean => {
	const parsed = unpublishedTargetCollisionSchema.safeParse(error)
	return parsed.success && parsed.data.cause.relativePath === relativePath
}

/**
 * Copies a complete subtree to its target before removing it from the source.
 * Only an exact native preflight collision proves a target failure wrote nothing.
 * A confirmed target followed by any source failure remains a recoverable duplicate;
 * neither uncertain nor partial effects are retried or rolled back automatically.
 */
export const refileOrgSubtreeFlow = (
	request: RefileOrgSubtreeInput,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgSubtreeRefileFlowError, OrgSubtreeRefileResult> => {
	// Retain setup values across IO; live guards are the only intentional continuations.
	let input: RefileOrgSubtreeInput
	try {
		const setup = { ...request }
		input = Object.freeze({
			...setup,
			...(setup.targetHeading ? { targetHeading: Object.freeze({ ...setup.targetHeading }) } : {}),
		})
	} catch (cause) {
		return TE.left({
			type: "ORG_FILE_ERROR", operation: "read", command: "read_org_document", cause,
			message: cause instanceof Error ? cause.message : String(cause),
		})
	}
	if (!isSafeRelativeOrgPath(input.sourceRelativePath)) {
		return TE.left(
			validationError("Org refile source must be a safe relative lowercase .org path."),
		)
	}
	if (!isSafeRelativeOrgPath(input.targetRelativePath)) {
		return TE.left(
			validationError("Org refile target must be a safe relative lowercase .org path."),
		)
	}
	if (comparablePath(input.sourceRelativePath) === comparablePath(input.targetRelativePath)) {
		return TE.left(validationError("Org refile source and target must be different documents."))
	}
	if (typeof input.sourceContent !== "string" || !validRevision(input.expectedSourceRevision)) {
		return TE.left(validationError("Org refile source must be saved with a nonempty revision."))
	}
	if (input.targetHeading !== undefined && input.expectedTargetRevision === undefined) {
		return TE.left(validationError("A heading target requires its snapshot revision."))
	}
	const payload = planOrgRefilePayload(input.sourceContent, input.cursor, input.logging)
	if (payload.kind === "rejected") return TE.left(validationError(payload.message))
	if (payload.kind === "needs-note") return TE.left(validationError("Collect the required Refile note before writing either file."))
	const subtree = payload.moved
	const sourceContent = removeOrgSubtree(input.sourceContent, subtree)
	return async () => {
		let phase: "scan" | "read" | "targetWrite" | "confirm" | "guard" | "sourceWrite" = "scan"
		let target: OrgDocumentInterface | undefined
		const classify = (cause: OrgFileError): OrgSubtreeRefileFlowError => {
			if (target) return partialError(cause, target)
			if (phase === "targetWrite" && isUnpublishedTargetCollision(cause, input.targetRelativePath))
				return cause
			if (phase === "targetWrite")
				return {
					type: "ORG_SUBTREE_REFILE_UNCERTAIN_WRITE_ERROR",
					cause,
					targetRelativePath: input.targetRelativePath,
					message: `The target write did not report a confirmed result; the target may already contain the subtree. This operation did not remove the source. Reread both documents and reconcile any duplicate before retrying. Do not retry automatically. No rollback was attempted. Original error: ${cause.message}`,
				}
			return cause
		}
		try {
			const transferAllowed = (): boolean => {
				const confirm = input.confirmSourceUnchanged
				const protectedPath = input.isProtectedPath
				return (
					(confirm === undefined || confirm() === true) &&
					(protectedPath === undefined ||
						(protectedPath(input.sourceRelativePath) !== true &&
							protectedPath(input.targetRelativePath) !== true))
				)
			}
			const scanned = await repository.scanWorkspace(input.workspaceRoot, input.capabilityToken)()
			if (E.isLeft(scanned)) return E.left(classify(scanned.left))
			const snapshot = scanned.right
			if (
				!snapshot ||
				!Array.isArray(snapshot.documents) ||
				snapshot.documents.some(
					(document) =>
						!document ||
						!isSafeRelativeOrgPath(document.relativePath) ||
						!validRevision(document.revision),
				)
			)
				throw new Error("Malformed workspace scan confirmation.")
			const exists = snapshot.documents.some(
				(document) => document.relativePath === input.targetRelativePath,
			)
			let targetBefore: OrgDocumentInterface = {
				content: "",
				relativePath: input.targetRelativePath,
				revision: "<missing>",
			}
			if (exists) {
				phase = "read"
				const read = await repository.readDocument({
					capabilityToken: input.capabilityToken,
					relativePath: input.targetRelativePath,
					workspaceRoot: input.workspaceRoot,
				})()
				if (E.isLeft(read)) return E.left(classify(read.left))
				if (!validDocument(read.right, input.targetRelativePath))
					throw new Error("Malformed target read confirmation.")
				targetBefore = read.right
			}
			if (
				input.expectedTargetRevision !== undefined &&
				input.expectedTargetRevision !== targetBefore.revision
			) {
				return E.left(
					validationError("The target snapshot revision changed; refresh the target selection."),
				)
			}
			if (input.expectedTargetContent !== undefined && input.expectedTargetContent !== targetBefore.content)
				return E.left(validationError("The reviewed target source changed; refresh the target selection."))
			const plan = planOrgRefileInsertion(targetBefore.content, payload.payload, input.targetHeading)
			if (E.isLeft(plan)) return E.left(validationError(plan.left.message))
			const targetContent = plan.right.content
			phase = "guard"
			if (!transferAllowed()) {
				return E.left(
					validationError(
						"The source editor changed or an affected document is protected; no copy was written.",
					),
				)
			}
			phase = "targetWrite"
			const written = await repository.writeDocument({
				capabilityToken: input.capabilityToken,
				content: targetContent,
				expectedRevision: targetBefore.revision,
				relativePath: input.targetRelativePath,
				workspaceRoot: input.workspaceRoot,
			})()
			if (E.isLeft(written)) return E.left(classify(written.left))
			if (!validWrite(written.right, input.targetRelativePath))
				throw new Error("Malformed target write confirmation.")
			target = { ...written.right, content: targetContent }
			phase = "confirm"
			const confirmed = await repository.readDocument({
				capabilityToken: input.capabilityToken,
				relativePath: input.targetRelativePath,
				workspaceRoot: input.workspaceRoot,
			})()
			if (E.isLeft(confirmed)) return E.left(classify(confirmed.left))
			if (
				!validDocument(confirmed.right, input.targetRelativePath) ||
				confirmed.right.revision !== target.revision ||
				confirmed.right.content !== target.content
			) {
				return E.left(
					partialError(
						validationError("The target changed before source removal; the source was preserved."),
						target,
					),
				)
			}
			phase = "guard"
			if (!transferAllowed()) {
				return E.left(
					partialError(
						validationError("The source editor changed while the target copy was being written."),
						target,
					),
				)
			}
			phase = "sourceWrite"
			const source = await repository.writeDocument({
				capabilityToken: input.capabilityToken,
				content: sourceContent,
				expectedRevision: input.expectedSourceRevision,
				relativePath: input.sourceRelativePath,
				workspaceRoot: input.workspaceRoot,
			})()
			if (E.isLeft(source)) return E.left(classify(source.left))
			if (!validWrite(source.right, input.sourceRelativePath))
				throw new Error("Malformed source write confirmation; source removal is uncertain.")
			return E.right({ source: { ...source.right, content: sourceContent }, target })
		} catch (cause) {
			const operation =
				phase === "scan"
					? "scan"
					: phase === "targetWrite" || phase === "sourceWrite"
						? "write"
						: "read"
			return E.left(
				classify({
					type: "ORG_FILE_ERROR",
					operation,
					command: `${operation}_org_${operation === "scan" ? "workspace" : "document"}`,
					cause,
					message: cause instanceof Error ? cause.message : String(cause),
				}),
			)
		}
	}
}

/** Refiles to the conventional sibling `<stem>_archive.org` document. */
export const archiveOrgSubtreeFlow = (
	input: Omit<RefileOrgSubtreeInput, "targetRelativePath">,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgSubtreeRefileFlowError, OrgSubtreeRefileResult> => {
	const targetRelativePath = deriveOrgArchivePath(input.sourceRelativePath)
	return targetRelativePath
		? refileOrgSubtreeFlow({ ...input, targetHeading: undefined, targetRelativePath }, repository)
		: TE.left(validationError("Cannot derive a safe archive path for this Org document."))
}
