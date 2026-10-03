import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import type {
	OrgDocumentInterface,
	OrgDocumentWriteResultInterface,
	OrgFileError,
	WriteOrgDocumentInput,
} from "@/types/org"
import { saveOrgDocumentFlow } from "./org-workspace.flow"

/** Values captured by the root before taking the batch mutation owner. */
export interface OrgSaveAllCapture {
	readonly document: Readonly<OrgDocumentInterface>
	readonly content: string
	readonly workspaceRoot: string
	readonly capabilityToken?: string
}

export interface OrgSaveAllPorts<C extends OrgSaveAllCapture> {
	/** Owner/origin and capture identity must still be current before each write. */
	readonly isFresh: (capture: C) => boolean
	/** Checked after every awaited write, before interpreting or committing it. */
	readonly isOwnerCurrent: () => boolean
	readonly write?: (
		input: WriteOrgDocumentInput,
	) => TE.TaskEither<OrgFileError, OrgDocumentWriteResultInterface>
	/** Synchronous root mirror/baseline update; never replaces newer editor source. */
	readonly commitConfirmed: (capture: C, receipt: OrgDocumentWriteResultInterface) => void
}

export type OrgSaveAllFailureKind =
	| "stale-capture"
	| "owner-lost"
	| "write-left"
	| "unexpected"
	| "commit"
export type OrgSaveAllFlowOutcome =
	| { readonly kind: "success"; readonly confirmedPaths: readonly string[] }
	| {
			readonly kind: "rejected" | "partial"
			readonly confirmedPaths: readonly string[]
			readonly failureKind: OrgSaveAllFailureKind
			readonly writingPath: string | null
			readonly message: string
	  }

/** Sequential CAS writes, first failure stops, no retry or rollback. No application state lives here. */
export const saveAllOrgDocumentsFlow = async <C extends OrgSaveAllCapture>(
	captures: readonly C[],
	ports: OrgSaveAllPorts<C>,
): Promise<OrgSaveAllFlowOutcome> => {
	const confirmedPaths: string[] = []
	let writingPath: string | null = null
	let committing = false
	const fail = (failureKind: OrgSaveAllFailureKind, message: string): OrgSaveAllFlowOutcome => ({
		kind: confirmedPaths.length ? "partial" : "rejected",
		confirmedPaths: [...confirmedPaths],
		failureKind,
		writingPath,
		message,
	})
	try {
		for (const capture of captures) {
			if (!ports.isFresh(capture)) {
				return fail(
					"stale-capture",
					"The save-all snapshot is no longer current. Reread affected files before a manual retry.",
				)
			}
			writingPath = capture.document.relativePath
			const result = await (ports.write ?? saveOrgDocumentFlow)({
				content: capture.content,
				expectedRevision: capture.document.revision,
				relativePath: writingPath,
				workspaceRoot: capture.workspaceRoot,
				capabilityToken: capture.capabilityToken,
			})()
			if (!ports.isOwnerCurrent()) {
				return fail(
					"owner-lost",
					"The save-all origin changed during a write; files may have changed. Reread affected files; do not automatically retry.",
				)
			}
			if (E.isLeft(result)) {
				return fail(
					"write-left",
					`Save all stopped at ${writingPath}: ${result.left.message}. Buffers were retained; files may have changed. Reread affected files before a manual retry. Do not automatically retry.`,
				)
			}
			if (
				result.right.relativePath !== writingPath ||
				typeof result.right.revision !== "string" ||
				!result.right.revision
			) {
				throw new Error("Unexpected save confirmation")
			}
			committing = true
			ports.commitConfirmed(capture, result.right)
			committing = false
			confirmedPaths.push(writingPath)
		}
		return { kind: "success", confirmedPaths }
	} catch {
		return fail(
			committing ? "commit" : "unexpected",
			`Save all ended unexpectedly${writingPath ? ` at ${writingPath}` : ""}; files may have changed. All editor bodies were retained. Reread affected files before reconciling; do not automatically retry. No rollback was attempted.`,
		)
	}
}
