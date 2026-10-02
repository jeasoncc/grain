import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import {
	appendOrgCaptureEntry,
	newOrgCaptureDocumentSource,
	validateOrgCaptureInput,
} from "@/pipes/org/org-capture.pipe"
import type {
	CaptureOrgEntryInput,
	OrgCaptureEntryFlowError,
	OrgCaptureEntryResult,
	OrgCaptureRejectedError,
	OrgCaptureUncertainWriteError,
} from "@/types/editor/org-capture.interface"

const causeMessage = (cause: unknown): string => {
	try {
		return cause instanceof Error
			? cause.message
			: typeof cause === "object" && cause !== null && "message" in cause
				? String(cause.message)
				: String(cause)
	} catch {
		return "Unknown error"
	}
}

const rejected = (
	phase: OrgCaptureRejectedError["phase"],
	cause: unknown,
): OrgCaptureRejectedError => ({
	type: "ORG_CAPTURE_REJECTED_ERROR",
	phase,
	noWrite: true,
	cause,
	message: `Capture rejected before writing (${phase}): ${causeMessage(cause)}`,
})

const uncertain = (targetRelativePath: string, cause: unknown): OrgCaptureUncertainWriteError => ({
	type: "ORG_CAPTURE_UNCERTAIN_WRITE_ERROR",
	targetRelativePath,
	cause,
	message: `The target may already contain the entry: the write did not report a confirmed result. Reread ${targetRelativePath} and reconcile before retrying. Do not retry automatically. No rollback was attempted. Original error: ${causeMessage(cause)}`,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value)

// RPC type annotations are not runtime evidence, including the Either envelope.
const repositoryResult = (value: unknown): E.Either<unknown, unknown> => {
	if (isRecord(value)) {
		if (value._tag === "Left" && "left" in value) return E.left(value.left)
		if (value._tag === "Right" && "right" in value) return E.right(value.right)
	}
	throw new Error("Malformed repository result")
}

const isRevision = (value: unknown): value is string =>
	typeof value === "string" && value.trim().length > 0 && value !== "<missing>"

const targetExists = (snapshot: unknown, relativePath: string): boolean => {
	if (!isRecord(snapshot) || !Array.isArray(snapshot.documents)) {
		throw new Error("Malformed workspace snapshot")
	}
	let matches = 0
	for (const document of snapshot.documents) {
		if (
			!isRecord(document) ||
			typeof document.relativePath !== "string" ||
			!document.relativePath
		) {
			throw new Error("Malformed workspace document path")
		}
		if (document.relativePath === relativePath) matches += 1
	}
	if (matches > 1) throw new Error("Duplicate capture target in workspace snapshot")
	return matches === 1
}

/** One local append and one revision-checked write. Never rolls back or retries an uncertain write. */
export const captureOrgEntryFlow =
	(
		input: CaptureOrgEntryInput,
		repository: OrgFileRepository = orgFileRepository,
	): TE.TaskEither<OrgCaptureEntryFlowError, OrgCaptureEntryResult> =>
	async () => {
		let phase: OrgCaptureRejectedError["phase"] = "validation"
		let writeInvoked = false
		try {
			const valid = validateOrgCaptureInput(input)
			if (E.isLeft(valid)) return E.left(rejected(phase, valid.left))
			const { workspaceRoot, relativePath, capabilityToken, entrySource } = valid.right
			const location = {
				workspaceRoot,
				relativePath,
				...(capabilityToken === undefined ? {} : { capabilityToken }),
			}
			phase = "scan"
			const scanned = repositoryResult(
				await repository.scanWorkspace(workspaceRoot, capabilityToken)(),
			)
			if (E.isLeft(scanned)) return E.left(rejected(phase, scanned.left))
			phase = "preparation"
			const exists = targetExists(scanned.right, relativePath)
			let expectedRevision = "<missing>"
			let prepared: ReturnType<typeof appendOrgCaptureEntry>
			if (exists) {
				phase = "read"
				const read = repositoryResult(await repository.readDocument(location)())
				if (E.isLeft(read)) return E.left(rejected(phase, read.left))
				phase = "preparation"
				const document = read.right
				if (!isRecord(document)) throw new Error("Malformed capture target read")
				const { relativePath: returnedPath, content, revision } = document
				if (returnedPath !== relativePath || typeof content !== "string" || !isRevision(revision)) {
					throw new Error("Capture target read has invalid path, content, or revision")
				}
				expectedRevision = revision
				prepared = appendOrgCaptureEntry(content, entrySource)
			} else {
				prepared = newOrgCaptureDocumentSource(relativePath, entrySource)
			}
			if (E.isLeft(prepared)) return E.left(rejected(phase, prepared.left))
			const content = prepared.right
			const writeInput = { ...location, content, expectedRevision }
			writeInvoked = true
			const written = repositoryResult(await repository.writeDocument(writeInput)())
			if (E.isLeft(written)) return E.left(uncertain(relativePath, written.left))
			const confirmation = written.right
			if (!isRecord(confirmation)) throw new Error("Malformed capture write confirmation")
			const { relativePath: confirmedPath, revision, byteLength } = confirmation
			if (
				confirmedPath !== relativePath ||
				!isRevision(revision) ||
				("byteLength" in confirmation &&
					(typeof byteLength !== "number" || !Number.isSafeInteger(byteLength) || byteLength < 0))
			) {
				throw new Error("Capture write has invalid path, revision, or byte length")
			}
			// Preserve only verified identity/revision and the locally prepared body, never RPC content.
			return E.right({ content, relativePath: confirmedPath, revision })
		} catch (cause) {
			return E.left(writeInvoked ? uncertain(input.relativePath, cause) : rejected(phase, cause))
		}
	}
