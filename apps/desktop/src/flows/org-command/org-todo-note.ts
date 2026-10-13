import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"

/** Opaque, in-memory Org logging capability. Never persist this request. */
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
	readonly label?: string
	/** Producer distinguishes a canonical working-copy edit from an already saved file effect. */
	readonly successMessage?: string
	readonly origin?: ApplicationToolOrigin
	/** Rechecks the captured editor lease without mutating source. */
	readonly validate?: () => OrgTodoNoteResult
	/** Publishes source capability invalidation, including origin-view teardown. */
	readonly subscribeValidation?: (listener: () => void) => () => void
	/** Plans and atomically applies the captured transition; note is literal text. */
	readonly execute: (note: string) => OrgTodoNoteResult | Promise<OrgTodoNoteResult>
	/** Revokes this capability without changing the document. */
	readonly abort: () => void
}
