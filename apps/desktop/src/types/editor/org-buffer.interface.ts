/** Memory-only raw text. IDs and opaque revisions are supplied by the caller. */
export interface OrgBufferIdentity {
	readonly bufferId: string
	/** Approved workspace capability identity, not a display name or filesystem root. */
	readonly workspaceId: string
	readonly relativePath: string
}

export interface OrgBufferExternal {
	readonly externalRevision: string | null
	readonly externalContent: string
}

/** Keep this exact object for completion; a reconstructed capture is not authority. */
export interface OrgBufferSaveCapture extends OrgBufferIdentity {
	readonly token: string
	readonly baseRevision: string | null
	readonly editGeneration: number
	readonly content: string
}

export interface OrgBufferSnapshot extends OrgBufferIdentity {
	/** null denotes an absent file, including a newly created buffer. */
	readonly baseRevision: string | null
	readonly baseContent: string
	readonly content: string
	readonly editGeneration: number
	readonly conflict: OrgBufferExternal | null
	readonly saving: OrgBufferSaveCapture | null
}

export interface OrgBufferOpenInput extends OrgBufferIdentity {
	readonly baseRevision: string | null
	readonly content: string
}

/** Optimistic guard for every command other than a save callback. */
export interface OrgBufferContext extends OrgBufferIdentity {
	readonly expectedGeneration: number
	readonly expectedBaseRevision: string | null
}

export type OrgBufferRejection =
	| "invalid-identity"
	| "invalid-relative-path"
	| "wrong-buffer"
	| "wrong-workspace"
	| "moved-path"
	| "stale-generation"
	| "stale-revision"
	| "generation-exhausted"
	| "save-in-flight"
	| "invalid-save-token"
	| "wrong-capture"
	| "rename-not-approved"
	| "dirty-buffer"

/** A message for a caller to handle, never an IO operation performed by this model. */
export interface OrgBufferEffectMessage {
	readonly kind: "revision-conflict"
	readonly bufferId: string
	readonly workspaceId: string
	readonly relativePath: string
	readonly externalRevision: string | null
	readonly externalContent: string
}

export type OrgBufferResult =
	| {
			readonly status: "updated"
			readonly snapshot: OrgBufferSnapshot
			readonly effect: OrgBufferEffectMessage | null
	  }
	| {
			readonly status: "rejected"
			readonly snapshot: OrgBufferSnapshot
			readonly reason: OrgBufferRejection
	  }

export type OrgBufferOpenResult =
	| { readonly status: "opened"; readonly snapshot: OrgBufferSnapshot }
	| { readonly status: "rejected"; readonly reason: OrgBufferRejection }

export type OrgBufferSaveFailure =
	| { readonly kind: "revision-conflict"; readonly external: OrgBufferExternal }
	| { readonly kind: "failed" }

/** The boundary has already authorized this move in the same workspace capability. */
export interface OrgBufferApprovedRename extends OrgBufferContext {
	readonly capabilityApproved: boolean
	readonly newRelativePath: string
}

export type OrgBufferCloseResult =
	| { readonly status: "closed"; readonly identity: OrgBufferIdentity }
	| {
			readonly status: "rejected"
			readonly snapshot: OrgBufferSnapshot
			readonly reason: OrgBufferRejection
	  }
