import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { z } from "zod"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import { orgCaptureDocumentHeader, validateOrgCaptureInput, validateOrgCaptureTarget } from "@/pipes/org/org-capture.pipe"
import { planOrgCapturePlacement, previewOrgCaptureTarget } from "@/pipes/org/org-capture-target.pipe"
import type {
	CaptureOrgEntryInput,
	OrgCaptureEntryFlowError,
	OrgCaptureEntryResult,
	OrgCaptureRejectedError,
	OrgCaptureTarget,
	OrgCaptureTargetPreview,
	OrgCaptureUncertainWriteError,
} from "@/types/editor/org-capture.interface"

export interface OrgCaptureFlowOptions {
	readonly isCurrent: () => boolean
	readonly repository?: OrgFileRepository
	readonly signal?: AbortSignal
}
export interface OrgCaptureTargetReadInput {
	readonly workspaceRoot: string
	readonly capabilityToken?: string
	readonly target: OrgCaptureTarget
}
export interface OrgCaptureTargetReadResult {
	readonly target: OrgCaptureTarget
	readonly expectedRevision: string
	readonly preview: OrgCaptureTargetPreview
}

const causeMessage = (cause: unknown): string => {
	try {
		return cause instanceof Error ? cause.message :
			typeof cause === "object" && cause !== null && "message" in cause ? String(cause.message) : String(cause)
	} catch {
		return "Unknown error"
	}
}
const rejected = (phase: OrgCaptureRejectedError["phase"], cause: unknown): OrgCaptureRejectedError => ({
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
// RPC type annotations are not runtime evidence, including the Either envelope.
const repositoryResult = (value: unknown): E.Either<unknown, unknown> => {
	if (typeof value === "object" && value !== null && !Array.isArray(value) && "_tag" in value) {
		if (value._tag === "Left" && "left" in value) return E.left(value.left)
		if (value._tag === "Right" && "right" in value) return E.right(value.right)
	}
	throw new Error("Malformed repository result")
}
const revisionSchema = z.string().refine((value) => value.trim().length > 0 && value !== "<missing>")
const snapshotSchema = z.object({
	documents: z.array(z.object({ relativePath: z.string().min(1) })),
	directories: z.array(z.string().min(1).refine((directory) =>
		!/[\\\x00-\x1f\x7f:]/.test(directory) && directory === directory.trim() &&
		directory.split("/").every((part) => !!part && part !== "." && part !== ".."))),
})
const documentSchema = z.object({ relativePath: z.string(), content: z.string(), revision: revisionSchema })
const confirmationSchema = z.object({
	relativePath: z.string(),
	revision: revisionSchema,
	byteLength: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
}).refine((value) => !("byteLength" in value) || value.byteLength !== undefined)

interface FreshTarget {
	readonly source: string
	readonly expectedRevision: string
	readonly directories: readonly string[]
}

/** Every read is fresh and owner-scoped; no buffers, directories, or content writers are acquired. */
const readFreshTarget = async (
	input: OrgCaptureTargetReadInput,
	repository: OrgFileRepository,
	assertCurrent: () => void,
): Promise<E.Either<OrgCaptureRejectedError, FreshTarget>> => {
	let phase: OrgCaptureRejectedError["phase"] = "scan"
	try {
		assertCurrent()
		const scannedResult = await repository.scanWorkspace(input.workspaceRoot, input.capabilityToken)()
		assertCurrent()
		const scanned = repositoryResult(scannedResult)
		if (E.isLeft(scanned)) return E.left(rejected(phase, scanned.left))
		phase = "preparation"
		const snapshot = snapshotSchema.parse(scanned.right)
		const relativePath = input.target.relativePath
		let matches = 0
		for (const document of snapshot.documents) {
			if (document.relativePath === relativePath) matches++
		}
		if (matches > 1) throw new Error("Duplicate capture target in workspace snapshot")
		const directories = snapshot.directories
		if (new Set(directories).size !== directories.length) throw new Error("Duplicate workspace directory path")
		if (directories.includes(relativePath)) throw new Error("Capture target is an existing directory")
		if (!matches) {
			const header = orgCaptureDocumentHeader(relativePath)
			if (E.isLeft(header)) return E.left(rejected(phase, header.left))
			return E.right({ source: header.right, expectedRevision: "<missing>", directories })
		}
		phase = "read"
		assertCurrent()
		const readResult = await repository.readDocument({
			workspaceRoot: input.workspaceRoot,
			relativePath,
			...(input.capabilityToken === undefined ? {} : { capabilityToken: input.capabilityToken }),
		})()
		assertCurrent()
		const read = repositoryResult(readResult)
		if (E.isLeft(read)) return E.left(rejected(phase, read.left))
		phase = "preparation"
		const { relativePath: returnedPath, content, revision } = documentSchema.parse(read.right)
		if (returnedPath !== relativePath) throw new Error("Capture target read has an invalid path")
		return E.right({ source: content, expectedRevision: revision, directories })
	} catch (cause) {
		return E.left(rejected(phase, cause))
	}
}

export const readOrgCaptureTargetFlow = (
	input: OrgCaptureTargetReadInput,
	options: OrgCaptureFlowOptions,
): TE.TaskEither<OrgCaptureRejectedError, OrgCaptureTargetReadResult> => async () => {
	try {
		const { isCurrent, signal, repository = orgFileRepository } = options
		const assertCurrent = () => {
			if (typeof isCurrent !== "function" || signal?.aborted || !isCurrent()) throw new Error("Capture preview scope is no longer current or was cancelled")
		}
		assertCurrent()
		if (!input || typeof input.workspaceRoot !== "string" || !input.workspaceRoot.trim() || /[\x00-\x1f\x7f]/.test(input.workspaceRoot) || (input.capabilityToken !== undefined && (typeof input.capabilityToken !== "string" || !input.capabilityToken)))
			return E.left(rejected("validation", "Capture workspace location is invalid"))
		const valid = validateOrgCaptureTarget(input.target)
		if (E.isLeft(valid)) return E.left(rejected("validation", valid.left))
		const location = { workspaceRoot: input.workspaceRoot, capabilityToken: input.capabilityToken, target: valid.right }
		const fresh = await readFreshTarget(location, repository, assertCurrent)
		assertCurrent()
		if (E.isLeft(fresh)) return fresh
		const preview = previewOrgCaptureTarget(fresh.right.source, valid.right)
		if (E.isLeft(preview)) return E.left(rejected("preparation", preview.left))
		assertCurrent()
		return E.right({ target: valid.right, expectedRevision: fresh.right.expectedRevision, preview: preview.right })
	} catch (cause) {
		return E.left(rejected("preparation", cause))
	}
}

/** One native content CAS. Once invoked, drain it and never retry or roll back uncertain publication. */
export const captureOrgEntryFlow = (
	input: CaptureOrgEntryInput,
	options: OrgCaptureFlowOptions,
): TE.TaskEither<OrgCaptureEntryFlowError, OrgCaptureEntryResult> => async () => {
	let phase: OrgCaptureRejectedError["phase"] = "validation"
	let writeInvoked = false
	let relativePath = ""
	try {
		const { isCurrent, signal, repository = orgFileRepository } = options
		const assertCurrent = () => {
			if (typeof isCurrent !== "function" || signal?.aborted || !isCurrent()) throw new Error("Capture scope is no longer current or was cancelled")
		}
		assertCurrent()
		const valid = validateOrgCaptureInput(input)
		if (E.isLeft(valid)) return E.left(rejected(phase, valid.left))
		const request = valid.right
		relativePath = request.target.relativePath
		const location = {
			workspaceRoot: request.workspaceRoot,
			relativePath,
			...(request.capabilityToken === undefined ? {} : { capabilityToken: request.capabilityToken }),
		}
		const fresh = await readFreshTarget(request, repository, assertCurrent)
		phase = "preparation"
		assertCurrent()
		if (E.isLeft(fresh)) return fresh
		const { source, expectedRevision, directories } = fresh.right
		if (request.expectedRevision !== undefined && request.expectedRevision !== expectedRevision)
			return E.left(rejected(phase, "Capture preview is stale; read and confirm the target again"))
		const prepared = planOrgCapturePlacement(source, request)
		if (E.isLeft(prepared)) return E.left(rejected(phase, prepared.left))
		// Only explicitly declared ancestors, top-down, within the exact approved grant.
		const ancestors = relativePath.split("/").slice(0, -1)
		for (let index = 0; index < ancestors.length; index++) {
			const directory = ancestors.slice(0, index + 1).join("/")
			if (directories.includes(directory)) continue
			assertCurrent()
			const createdResult = await repository.createDirectory({ ...location, relativePath: directory })()
			assertCurrent()
			const created = repositoryResult(createdResult)
			if (E.isLeft(created)) return E.left(rejected(phase, created.left))
			if (created.right !== undefined && created.right !== null) throw new Error("Malformed directory creation confirmation")
		}
		assertCurrent()
		const content = prepared.right.content
		writeInvoked = true
		const writtenResult = await repository.writeDocument({ ...location, content, expectedRevision })()
		// A lost owner is not evidence that the already-invoked native write did not publish.
		assertCurrent()
		const written = repositoryResult(writtenResult)
		if (E.isLeft(written)) return E.left(uncertain(relativePath, written.left))
		const { relativePath: confirmedPath, revision } = confirmationSchema.parse(written.right)
		if (confirmedPath !== relativePath) throw new Error("Capture write has an invalid path")
		assertCurrent()
		// Only verified identity/revision and local source, never RPC content.
		return E.right({ content, relativePath: confirmedPath, revision })
	} catch (cause) {
		return E.left(writeInvoked ? uncertain(relativePath, cause) : rejected(phase, cause))
	}
}
