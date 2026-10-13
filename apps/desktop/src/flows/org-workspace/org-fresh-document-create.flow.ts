import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { z } from "zod"
import { orgFileRepository } from "@/io/file/org-file.repository"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import type { OrgFreshDocumentPlan, OrgFreshDocumentCreateFailure } from "@/types/org/org-fresh-document.types"
import { isSafeRelativeOrgPath } from "@/pipes/org/org-subtree-refile.pipe"
import type { OrgDocumentInterface } from "@/types/org"

export interface CreateOrgFreshDocumentInput {
	readonly workspaceRoot: string
	readonly capabilityToken: string
	readonly plan: OrgFreshDocumentPlan
	readonly occupiedPaths: readonly string[]
	readonly documentLabel: "Diary" | "Note"
	/** Exact session/effect authority, checked before each filesystem operation. */
	readonly confirmCurrent: () => boolean
}

const resultEnvelope = (value: unknown): E.Either<unknown, unknown> => {
	if (typeof value === "object" && value !== null && "_tag" in value) {
		if (value._tag === "Left" && "left" in value) return E.left(value.left)
		if (value._tag === "Right" && "right" in value) return E.right(value.right)
	}
	throw new Error("Malformed fresh-document filesystem result")
}
const messageOf = (cause: unknown): string =>
	typeof cause === "object" && cause !== null && "message" in cause && typeof cause.message === "string"
		? cause.message : String(cause)

const collisionSchema = z.object({
	type: z.literal("ORG_FILE_ERROR"),
	operation: z.literal("write"),
	cause: z.object({
		kind: z.literal("creation-collision"),
		noWrite: z.literal(true),
		relativePath: z.string(),
	}),
})
const confirmationSchema = z.object({
	relativePath: z.string(),
	revision: z.string().refine((value) => value.trim().length > 0 && value !== "<missing>"),
	byteLength: z.number().int().nonnegative().optional(),
})
// Never infer safe retry from human-readable error text or a generic revision conflict.
const isUnpublishedCollision = (error: unknown, relativePath: string): boolean => {
	const parsed = collisionSchema.safeParse(error)
	return parsed.success && parsed.data.cause.relativePath === relativePath
}
const stale = (label: string): E.Either<OrgFreshDocumentCreateFailure, never> => E.left({
	kind: "stale",
	message: `${label} creation lost its originating workspace owner; no further file operation was started.`,
})

/** Publish a complete initial body with no-clobber CAS; only proven unpublished collisions advance. */
export const createOrgFreshDocumentFlow = (
	input: CreateOrgFreshDocumentInput,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgFreshDocumentCreateFailure, OrgDocumentInterface> => {
	const { workspaceRoot, capabilityToken, documentLabel, confirmCurrent } = input
	const plan = Object.freeze({ ...input.plan })
	const occupied = new Set(input.occupiedPaths)
	return async () => {
		let writeInvoked = false
		let relativePath = `${plan.directory}/${plan.filenameStem}.org`
		try {
			if (!capabilityToken || !workspaceRoot || !isSafeRelativeOrgPath(relativePath)) {
				return E.left({ kind: "rejected", message: `${documentLabel} creation requires an approved workspace and a safe relative Org path.` })
			}
			if (!confirmCurrent()) return stale(documentLabel)
			const directory = resultEnvelope(await repository.createDirectory({
				workspaceRoot,
				capabilityToken,
				relativePath: plan.directory,
			})())
			if (!confirmCurrent()) return stale(documentLabel)
			if (E.isLeft(directory)) return E.left({ kind: "rejected", message: `${documentLabel} directory creation failed: ${messageOf(directory.left)}` })
			for (let candidate = 1; ; candidate += 1) {
				relativePath = `${plan.directory}/${plan.filenameStem}${candidate === 1 ? "" : `-${candidate}`}.org`
				if (occupied.has(relativePath)) continue
				if (!confirmCurrent()) return stale(documentLabel)
				writeInvoked = true
				const written = resultEnvelope(await repository.writeDocument({
					workspaceRoot,
					capabilityToken,
					relativePath,
					content: plan.content,
					expectedRevision: "<missing>",
				})())
				if (E.isLeft(written)) {
					if (isUnpublishedCollision(written.left, relativePath)) {
						writeInvoked = false
						continue
					}
					throw written.left
				}
				const confirmed = confirmationSchema.parse(written.right)
				if (confirmed.relativePath !== relativePath) {
					throw new Error(`${documentLabel} publication did not return a valid confirmation`)
				}
				// Disk confirmation can outlive its UI owner; the controller decides whether to navigate.
				return E.right({ relativePath, revision: confirmed.revision, content: plan.content })
			}
		} catch (cause) {
			return E.left({
				kind: writeInvoked ? "uncertain" : "rejected",
				message: writeInvoked
					? `${documentLabel} publication at ${relativePath} was not confirmed; the file may already exist. Refresh and reconcile before a manual retry; do not retry automatically. All buffers were retained. ${messageOf(cause)}`
					: `${documentLabel} creation failed before publication; all buffers were retained. ${messageOf(cause)}`,
			})
		}
	}
}
