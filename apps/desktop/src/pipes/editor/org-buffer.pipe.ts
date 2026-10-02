import type {
	OrgBufferApprovedRename,
	OrgBufferCloseResult,
	OrgBufferContext,
	OrgBufferEffectMessage,
	OrgBufferExternal,
	OrgBufferIdentity,
	OrgBufferOpenInput,
	OrgBufferOpenResult,
	OrgBufferRejection,
	OrgBufferResult,
	OrgBufferSaveCapture,
	OrgBufferSaveFailure,
	OrgBufferSnapshot,
} from "@/types/editor/org-buffer.interface"

const validPath = (path: string): boolean =>
	path.length > 0 &&
	!path.includes("\\") &&
	!path.includes("\u0000") &&
	!/^[A-Za-z]:/u.test(path) &&
	path.split("/").every((part) => part !== "" && part !== "." && part !== "..")

const reject = (snapshot: OrgBufferSnapshot, reason: OrgBufferRejection): OrgBufferResult => ({
	reason,
	snapshot,
	status: "rejected",
})

const updated = (
	snapshot: OrgBufferSnapshot,
	effect: OrgBufferEffectMessage | null = null,
): OrgBufferResult => ({ effect, snapshot: Object.freeze(snapshot), status: "updated" })

const guardIdentity = (
	snapshot: OrgBufferSnapshot,
	identity: OrgBufferIdentity,
): OrgBufferRejection | null => {
	if (snapshot.workspaceId !== identity.workspaceId) {
		return "wrong-workspace"
	}
	if (snapshot.bufferId !== identity.bufferId) {
		return "wrong-buffer"
	}
	if (snapshot.relativePath !== identity.relativePath) {
		return "moved-path"
	}
	return null
}

const guardContext = (
	snapshot: OrgBufferSnapshot,
	context: OrgBufferContext,
): OrgBufferRejection | null => {
	const identityError = guardIdentity(snapshot, context)
	if (identityError) {
		return identityError
	}
	if (snapshot.editGeneration !== context.expectedGeneration) {
		return "stale-generation"
	}
	if (snapshot.baseRevision !== context.expectedBaseRevision) {
		return "stale-revision"
	}
	return null
}

const canIncrement = (snapshot: OrgBufferSnapshot): boolean =>
	Number.isSafeInteger(snapshot.editGeneration) && snapshot.editGeneration < Number.MAX_SAFE_INTEGER

/** No normalization of the body, ID generation, or external access. */
export const openOrgBuffer = (input: OrgBufferOpenInput): OrgBufferOpenResult => {
	if (!input.bufferId || !input.workspaceId) {
		return { reason: "invalid-identity", status: "rejected" }
	}
	if (!validPath(input.relativePath)) {
		return { reason: "invalid-relative-path", status: "rejected" }
	}
	return {
		snapshot: Object.freeze({
			baseContent: input.content,
			baseRevision: input.baseRevision,
			bufferId: input.bufferId,
			conflict: null,
			content: input.content,
			editGeneration: 0,
			relativePath: input.relativePath,
			saving: null,
			workspaceId: input.workspaceId,
		}),
		status: "opened",
	}
}

/** New, absent file; initial text is unsaved against an empty baseline. */
export const createOrgBuffer = (
	input: OrgBufferIdentity & { readonly content: string },
): OrgBufferOpenResult => {
	const result = openOrgBuffer({ ...input, baseRevision: null })
	return result.status === "rejected"
		? result
		: {
				snapshot: Object.freeze({ ...result.snapshot, baseContent: "" }),
				status: "opened",
			}
}

export const isOrgBufferDirty = (snapshot: OrgBufferSnapshot): boolean =>
	snapshot.content !== snapshot.baseContent

/** Even a same-body edit advances the generation, preventing ABA callbacks. */
export const updateOrgBufferContent = (
	snapshot: OrgBufferSnapshot,
	context: OrgBufferContext,
	content: string,
): OrgBufferResult => {
	const error = guardContext(snapshot, context)
	if (error) {
		return reject(snapshot, error)
	}
	if (!canIncrement(snapshot)) {
		return reject(snapshot, "generation-exhausted")
	}
	return updated({ ...snapshot, content, editGeneration: snapshot.editGeneration + 1 })
}

/** Caller supplies a request token; retain the returned saving object verbatim. */
export const beginOrgBufferSave = (
	snapshot: OrgBufferSnapshot,
	context: OrgBufferContext,
	token: string,
): OrgBufferResult => {
	const error = guardContext(snapshot, context)
	if (error) {
		return reject(snapshot, error)
	}
	if (snapshot.saving) {
		return reject(snapshot, "save-in-flight")
	}
	if (!token) {
		return reject(snapshot, "invalid-save-token")
	}
	const saving: OrgBufferSaveCapture = Object.freeze({
		baseRevision: snapshot.baseRevision,
		bufferId: snapshot.bufferId,
		content: snapshot.content,
		editGeneration: snapshot.editGeneration,
		relativePath: snapshot.relativePath,
		token,
		workspaceId: snapshot.workspaceId,
	})
	return updated({ ...snapshot, saving })
}

const guardCapture = (
	snapshot: OrgBufferSnapshot,
	capture: OrgBufferSaveCapture,
): OrgBufferRejection | null =>
	guardIdentity(snapshot, capture) ?? (snapshot.saving === capture ? null : "wrong-capture")

export const finishOrgBufferSave = (
	snapshot: OrgBufferSnapshot,
	capture: OrgBufferSaveCapture,
	revision: string,
): OrgBufferResult => {
	const error = guardCapture(snapshot, capture)
	if (error) {
		return reject(snapshot, error)
	}
	return updated({
		...snapshot,
		baseContent: capture.content,
		baseRevision: revision,
		// An external observation made during this save must not be silently lost.
		conflict: snapshot.conflict?.externalRevision === revision ? null : snapshot.conflict,
		saving: null,
	})
}

const copyExternal = (external: OrgBufferExternal): OrgBufferExternal =>
	Object.freeze({
		externalContent: external.externalContent,
		externalRevision: external.externalRevision,
	})

const conflictEffect = (
	snapshot: OrgBufferSnapshot,
	external: OrgBufferExternal,
): OrgBufferEffectMessage =>
	Object.freeze({
		bufferId: snapshot.bufferId,
		externalContent: external.externalContent,
		externalRevision: external.externalRevision,
		kind: "revision-conflict",
		relativePath: snapshot.relativePath,
		workspaceId: snapshot.workspaceId,
	})

export const failOrgBufferSave = (
	snapshot: OrgBufferSnapshot,
	capture: OrgBufferSaveCapture,
	failure: OrgBufferSaveFailure,
): OrgBufferResult => {
	const error = guardCapture(snapshot, capture)
	if (error) {
		return reject(snapshot, error)
	}
	if (failure.kind === "failed") {
		return updated({ ...snapshot, saving: null })
	}
	const conflict = copyExternal(failure.external)
	return updated({ ...snapshot, conflict, saving: null }, conflictEffect(snapshot, conflict))
}

/** The context identifies the baseline that the external read was requested against. */
export const observeOrgBufferExternal = (
	snapshot: OrgBufferSnapshot,
	context: OrgBufferContext,
	external: OrgBufferExternal,
): OrgBufferResult => {
	const error = guardContext(snapshot, context)
	if (error) {
		return reject(snapshot, error)
	}
	if (
		external.externalRevision === snapshot.baseRevision &&
		external.externalContent === snapshot.baseContent
	) {
		return updated(snapshot)
	}
	if (isOrgBufferDirty(snapshot)) {
		const conflict = copyExternal(external)
		return updated({ ...snapshot, conflict }, conflictEffect(snapshot, conflict))
	}
	if (snapshot.saving) {
		return reject(snapshot, "save-in-flight")
	}
	if (!canIncrement(snapshot)) {
		return reject(snapshot, "generation-exhausted")
	}
	return updated({
		...snapshot,
		baseContent: external.externalContent,
		baseRevision: external.externalRevision,
		conflict: null,
		content: external.externalContent,
		editGeneration: snapshot.editGeneration + 1,
	})
}

/** Metadata-only move; the caller, not this pipe, authorizes/performs the rename. */
export const renameOrgBufferWithApprovedCapability = (
	snapshot: OrgBufferSnapshot,
	request: OrgBufferApprovedRename,
): OrgBufferResult => {
	const error = guardContext(snapshot, request)
	if (error) {
		return reject(snapshot, error)
	}
	if (!request.capabilityApproved) {
		return reject(snapshot, "rename-not-approved")
	}
	if (snapshot.saving) {
		return reject(snapshot, "save-in-flight")
	}
	if (!validPath(request.newRelativePath)) {
		return reject(snapshot, "invalid-relative-path")
	}
	if (!canIncrement(snapshot)) {
		return reject(snapshot, "generation-exhausted")
	}
	return updated({
		...snapshot,
		editGeneration: snapshot.editGeneration + 1,
		relativePath: request.newRelativePath,
	})
}

/** Only an explicit close decision. The owner removes memory; this pipe owns no store. */
export const discardCloseOrgBuffer = (
	snapshot: OrgBufferSnapshot,
	context: OrgBufferContext,
	force = false,
): OrgBufferCloseResult => {
	const error = guardContext(snapshot, context)
	if (error) {
		return { reason: error, snapshot, status: "rejected" }
	}
	if (snapshot.saving) {
		return { reason: "save-in-flight", snapshot, status: "rejected" }
	}
	if (isOrgBufferDirty(snapshot) && !force) {
		return { reason: "dirty-buffer", snapshot, status: "rejected" }
	}
	return {
		identity: Object.freeze({
			bufferId: snapshot.bufferId,
			relativePath: snapshot.relativePath,
			workspaceId: snapshot.workspaceId,
		}),
		status: "closed",
	}
}
