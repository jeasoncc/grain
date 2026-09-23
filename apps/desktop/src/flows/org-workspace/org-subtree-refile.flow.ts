import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import {
	appendOrgSubtree,
	deriveOrgArchivePath,
	extractOrgSubtreeAt,
	isSafeRelativeOrgPath,
	removeOrgSubtree,
} from "@/pipes/org/org-subtree-refile.pipe"
import type { OrgDocumentInterface, OrgFileError } from "@/types/org"

export interface RefileOrgSubtreeInput {
	readonly workspaceRoot: string
	readonly sourceRelativePath: string
	readonly sourceContent: string
	readonly expectedSourceRevision: string
	readonly cursor: number
	readonly targetRelativePath: string
	/** Last-moment guard checked after target copy and before source removal. */
	readonly confirmSourceUnchanged?: () => boolean
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

export type OrgSubtreeRefileFlowError =
	| OrgFileError
	| OrgSubtreeRefileValidationError
	| OrgSubtreeRefilePartialError

const validationError = (message: string): OrgSubtreeRefileValidationError => ({
	message,
	type: "ORG_SUBTREE_REFILE_VALIDATION_ERROR",
})

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

/**
 * Copies a complete subtree to its target before removing it from the source.
 * A failed source write is intentionally not rolled back, so the data remains
 * recoverable as a duplicate in both documents.
 */
export const refileOrgSubtreeFlow = (
	input: RefileOrgSubtreeInput,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgSubtreeRefileFlowError, OrgSubtreeRefileResult> => {
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
	const subtree = extractOrgSubtreeAt(input.sourceContent, input.cursor)
	if (!subtree) {
		return TE.left(validationError("Org refile cursor must be on a heading line."))
	}

	const sourceContent = removeOrgSubtree(input.sourceContent, subtree)
	return pipe(
		repository.scanWorkspace(input.workspaceRoot),
		TE.chain((snapshot) => {
			const targetExists = snapshot.documents.some(
				(document) => document.relativePath === input.targetRelativePath,
			)
			return targetExists
				? repository.readDocument({
						relativePath: input.targetRelativePath,
						workspaceRoot: input.workspaceRoot,
					})
				: TE.right<OrgFileError, OrgDocumentInterface>({
						content: "",
						relativePath: input.targetRelativePath,
						revision: "<missing>",
					})
		}),
		TE.chain((targetBefore) => {
			const targetContent = appendOrgSubtree(targetBefore.content, subtree.text)
			return pipe(
				repository.writeDocument({
					content: targetContent,
					expectedRevision: targetBefore.revision,
					relativePath: input.targetRelativePath,
					workspaceRoot: input.workspaceRoot,
				}),
				TE.map(
					(writtenTarget): OrgDocumentInterface => ({ ...writtenTarget, content: targetContent }),
				),
			)
		}),
		TE.chainW((target) =>
			pipe(
				repository.readDocument({
					relativePath: input.targetRelativePath,
					workspaceRoot: input.workspaceRoot,
				}),
				TE.mapLeft((cause) => partialError(cause, target)),
				TE.chainW((confirmed) =>
					confirmed.revision === target.revision && confirmed.content === target.content
						? TE.right(target)
						: TE.left(
								partialError(
									validationError(
										"The target changed before source removal; the source was preserved.",
									),
									target,
								),
							),
				),
			),
		),
		TE.chainW((target) => {
			if (input.confirmSourceUnchanged && !input.confirmSourceUnchanged()) {
				return TE.left(
					partialError(
						validationError("The source editor changed while the target copy was being written."),
						target,
					),
				)
			}
			return pipe(
				repository.writeDocument({
					content: sourceContent,
					expectedRevision: input.expectedSourceRevision,
					relativePath: input.sourceRelativePath,
					workspaceRoot: input.workspaceRoot,
				}),
				TE.map(
					(writtenSource): OrgSubtreeRefileResult => ({
						source: { ...writtenSource, content: sourceContent },
						target,
					}),
				),
				TE.mapLeft((cause) => partialError(cause, target)),
			)
		}),
	)
}

/** Refiles to the conventional sibling `<stem>_archive.org` document. */
export const archiveOrgSubtreeFlow = (
	input: Omit<RefileOrgSubtreeInput, "targetRelativePath">,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgSubtreeRefileFlowError, OrgSubtreeRefileResult> => {
	const targetRelativePath = deriveOrgArchivePath(input.sourceRelativePath)
	return targetRelativePath
		? refileOrgSubtreeFlow({ ...input, targetRelativePath }, repository)
		: TE.left(validationError("Cannot derive a safe archive path for this Org document."))
}
