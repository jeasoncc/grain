/** Opaque, in-memory TODO transition capability. Never persist this request. */
export type OrgTodoNoteResult =
	| { readonly kind: "ready" }
	| { readonly kind: "applied" }
	/** Settled without applying; an explicit abort authorizes discarding the draft. */
	| { readonly kind: "aborted" }
	| { readonly kind: "rejected"; readonly reason: string }

/** Read-backed Agenda execution settles asynchronously through the same protocol. */
export type OrgAgendaTodoNoteRequest = Omit<OrgTodoNoteRequest, "execute"> & {
	readonly execute: (note: string) => Promise<OrgTodoNoteResult>
}

export interface OrgTodoNoteRequest {
	/** Rechecks the captured editor lease without mutating source. */
	readonly validate?: () => OrgTodoNoteResult
	/** Plans and atomically applies the captured transition; note is literal text. */
	readonly execute: (note: string) => OrgTodoNoteResult | Promise<OrgTodoNoteResult>
	/** Revokes this capability without changing the document. */
	readonly abort: () => void
}
