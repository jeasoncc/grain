import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import type {
	OrgDocumentWriteResultInterface,
	OrgFileError,
	WriteOrgDocumentInput,
} from "@/types/org"

/** A single immutable working copy, captured by the root before the effect. */
export interface OrgSaveWorkingCopyCapture {
	readonly relativePath: string
	readonly content: string
	readonly expectedRevision: string
	readonly workspaceRoot: string
	readonly capabilityToken?: string
}

export interface OrgSaveWorkingCopyPorts<C extends OrgSaveWorkingCopyCapture> {
	readonly isFresh: (capture: C) => boolean
	readonly isCurrent: () => boolean
	readonly write: (
		input: WriteOrgDocumentInput,
	) => TE.TaskEither<OrgFileError, OrgDocumentWriteResultInterface>
	/** Synchronous notification; the write has already started. Never retry if this throws. */
	readonly onWriteStarted?: (settled: Promise<boolean>) => void
	/** Synchronous baseline/mirror ACK, not an editor-source replacement. */
	readonly commitConfirmed: (capture: C, receipt: OrgDocumentWriteResultInterface) => void
}

export type OrgSaveWorkingCopyOutcome =
	| { readonly kind: "confirmed"; readonly effectStarted: true }
	| { readonly kind: "stale-before"; readonly effectStarted: false }
	| { readonly kind: "stale-after"; readonly effectStarted: true }
	| { readonly kind: "write-left"; readonly effectStarted: true; readonly error: OrgFileError }
	| {
			readonly kind: "unexpected" | "invalid-confirmation" | "commit"
			readonly effectStarted: boolean
	  }

/** One CAS effect, one confirmation, no retries or rollback. All state/IO are explicit ports. */
export const saveOrgWorkingCopyFlow = async <C extends OrgSaveWorkingCopyCapture>(
	capture: C,
	ports: OrgSaveWorkingCopyPorts<C>,
): Promise<OrgSaveWorkingCopyOutcome> => {
	let effectStarted = false
	let committing = false
	try {
		if (!ports.isFresh(capture)) return { kind: "stale-before", effectStarted: false }
		effectStarted = true
		const task = ports.write({
			content: capture.content,
			expectedRevision: capture.expectedRevision,
			relativePath: capture.relativePath,
			workspaceRoot: capture.workspaceRoot,
			capabilityToken: capture.capabilityToken,
		})()
		// Attach rejection handling even if the synchronous notification throws.
		const settled = task.then(E.isRight, () => false).catch(() => false)
		let notificationFailed = false
		try {
			ports.onWriteStarted?.(settled)
		} catch {
			notificationFailed = true
		}
		// A failed observer cannot cancel IO: retain the lease until the task settles.
		if (notificationFailed) {
			await settled
			if (!ports.isCurrent()) return { kind: "stale-after", effectStarted: true }
			return { kind: "unexpected", effectStarted: true }
		}
		const result = await task
		if (!ports.isCurrent()) return { kind: "stale-after", effectStarted: true }
		if (E.isLeft(result)) return { kind: "write-left", effectStarted: true, error: result.left }
		if (
			!E.isRight(result) ||
			!result.right ||
			result.right.relativePath !== capture.relativePath ||
			typeof result.right.revision !== "string" ||
			!result.right.revision
		) {
			return { kind: "invalid-confirmation", effectStarted: true }
		}
		committing = true
		ports.commitConfirmed(capture, result.right)
		return { kind: "confirmed", effectStarted: true }
	} catch {
		return { kind: committing ? "commit" : "unexpected", effectStarted }
	}
}
