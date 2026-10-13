import * as E from "fp-ts/Either"
import { z } from "zod"
import { isOrgCaptureTargetPath, validateOrgCaptureTarget } from "@/pipes/org/org-capture.pipe"
import type { OrgCaptureEntryType, OrgCaptureTarget } from "@/types/editor/org-capture.interface"

const PREFIX = "grain:org-capture-draft:"
const idSchema = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/)
const targetSchema = z.unknown().transform((value, context) => {
	const result = validateOrgCaptureTarget(value)
	if (E.isRight(result)) return result.right
	context.addIssue({ code: "custom", message: result.left.message })
	return z.NEVER
})
const recordSchema = z.object({
	version: z.literal(1),
	id: idSchema,
	rootPath: z.string().min(1).refine((path) => !path.includes("\0")),
	templateId: z.string().min(1),
	label: z.string().min(1),
	entryType: z.enum(["entry", "plain", "item", "checkitem", "table-line"]),
	target: targetSchema,
	initialSource: z.string(),
	initialCursor: z.number().int().nonnegative(),
	draft: z.string(),
	sourceRelativePath: z.string().refine(isOrgCaptureTargetPath).optional(),
	expectedRevision: z.string().min(1).optional(),
	status: z.enum(["editing", "publishing", "uncertain"]),
	updatedAt: z.number().nonnegative(),
}).strict().refine((record) => record.initialCursor <= record.initialSource.length, {
	message: "Capture recovery cursor is outside its original source.",
})

/** Plaintext scratch only. No grant, runtime/window identity, callback or native IO. */
export interface OrgCaptureDraftRecord {
	readonly version: 1
	readonly id: string
	readonly rootPath: string
	readonly templateId: string
	readonly label: string
	readonly entryType: OrgCaptureEntryType
	readonly target: OrgCaptureTarget
	readonly initialSource: string
	readonly initialCursor: number
	readonly draft: string
	readonly sourceRelativePath?: string
	readonly expectedRevision?: string
	readonly status: "editing" | "publishing" | "uncertain"
	readonly updatedAt: number
}
export interface OrgCaptureDraftStorage {
	readonly length: number
	readonly key: (index: number) => string | null
	readonly getItem: (key: string) => string | null
	readonly setItem: (key: string, value: string) => void
	readonly removeItem: (key: string) => void
}
export interface OrgCaptureDraftStorageOptions {
	/** Must be current explicit permission; never inferred from the presence of a record. */
	readonly enabled: boolean
	readonly storage?: OrgCaptureDraftStorage
}

export class OrgCaptureDraftPublicationError extends Error {
	constructor() {
		super("Capture publication may have started. Keep this draft read-only and reconcile the target.")
		this.name = "OrgCaptureDraftPublicationError"
	}
}
const rootPrefix = (rootPath: string) => `${PREFIX}${encodeURIComponent(rootPath)}:`
const draftKey = (rootPath: string, id: string) => `${rootPrefix(rootPath)}${id}`
const storageError = (cause: unknown): Error =>
	cause instanceof Error ? cause : new Error(`Capture draft recovery failed: ${String(cause)}`)

export const readOrgCaptureDrafts = (
	rootPath: string,
	options: OrgCaptureDraftStorageOptions,
): E.Either<Error, readonly OrgCaptureDraftRecord[]> => {
	// Default/off does not even obtain localStorage, enumerate keys or read a body.
	if (!options.enabled) return E.right([])
	return E.tryCatch(() => {
		const storage = options.storage ?? window.localStorage
		const prefix = rootPrefix(rootPath)
		const records: OrgCaptureDraftRecord[] = []
		for (let index = 0; index < storage.length; index++) {
			const key = storage.key(index)
			if (!key?.startsWith(prefix)) continue
			const raw = storage.getItem(key)
			if (raw === null) continue
			const value: unknown = JSON.parse(raw)
			const parsed = recordSchema.safeParse(value)
			if (!parsed.success) throw new Error(`Invalid saved Capture draft: ${parsed.error.message}`)
			const record = parsed.data
			if (record.rootPath !== rootPath || key !== draftKey(record.rootPath, record.id))
				throw new Error("Saved Capture draft does not match its workspace/key. No draft was restored.")
			records.push(record)
		}
		return records.sort((left, right) => right.updatedAt - left.updatedAt || left.id.localeCompare(right.id))
	}, storageError)
}

export const saveOrgCaptureDraft = (
	record: OrgCaptureDraftRecord,
	options: OrgCaptureDraftStorageOptions,
): E.Either<Error, void> => {
	if (!options.enabled) return E.left(new Error("Capture draft recovery is not permitted."))
	return E.tryCatch(() => {
		const parsed = recordSchema.safeParse(record)
		if (!parsed.success) throw new Error(`Invalid Capture draft: ${parsed.error.message}`)
		const storage = options.storage ?? window.localStorage
		const key = draftKey(parsed.data.rootPath, parsed.data.id)
		const raw = storage.getItem(key)
		if (raw !== null) {
			const previous: unknown = JSON.parse(raw)
			const checked = recordSchema.safeParse(previous)
			if (!checked.success) throw new Error("Saved Capture draft is invalid; it was not overwritten.")
			if (checked.data.rootPath !== parsed.data.rootPath || checked.data.id !== parsed.data.id)
				throw new Error("Saved Capture draft identity changed; it was not overwritten.")
			if (checked.data.status !== "editing" && parsed.data.status === "editing")
				throw new OrgCaptureDraftPublicationError()
		}
		storage.setItem(key, JSON.stringify(parsed.data))
	}, storageError)
}

/** Removal does not read bodies. Call only on explicit cancel/deletion or confirmed publication. */
export const removeOrgCaptureDraft = (
	rootPath: string,
	id: string,
	storage?: OrgCaptureDraftStorage,
): E.Either<Error, void> => E.tryCatch(() => {
	idSchema.parse(id)
	;(storage ?? window.localStorage).removeItem(draftKey(rootPath, id))
}, storageError)

/** Permission UI can detect saved records without reading a single draft body. */
export const hasOrgCaptureDrafts = (storage?: OrgCaptureDraftStorage): E.Either<Error, boolean> =>
	E.tryCatch(() => {
		const target = storage ?? window.localStorage
		for (let index = 0; index < target.length; index++)
			if (target.key(index)?.startsWith(PREFIX)) return true
		return false
	}, storageError)

/** Destructive opt-out is explicitly confirmed by the settings UI; unrelated keys survive. */
export const clearOrgCaptureDrafts = (storage?: OrgCaptureDraftStorage): E.Either<Error, void> =>
	E.tryCatch(() => {
		const target = storage ?? window.localStorage
		for (let index = target.length - 1; index >= 0; index--) {
			const key = target.key(index)
			if (key?.startsWith(PREFIX)) target.removeItem(key)
		}
	}, storageError)
