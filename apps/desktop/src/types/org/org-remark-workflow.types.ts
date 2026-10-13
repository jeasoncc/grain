import type { OrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgDocumentInterface } from "./org.interface"

/** A mounted source window, or a clean canonical source used by after-save tracking. */
export interface OrgRemarkSourceCapture {
	readonly workspaceSessionId: string
	readonly relativePath: string
	readonly bufferId: string
	readonly runtimeIncarnation: string
	readonly sourceGeneration: number
	readonly remarkVersion: number
	readonly source: string
	readonly windowId: string | null
}

/** Verbatim sidecar body with its real disk baseline and optional canonical working copy. */
export interface OrgRemarkNotesContext {
	readonly workspaceSessionId: string
	readonly rootPath: string
	readonly document: OrgDocumentInterface
	readonly content: string
	readonly bufferId: string | null
	readonly runtime: OrgBufferRuntime | null
	readonly runtimeIncarnation: string | null
	readonly sourceGeneration: number | null
}

export type OrgRemarkReadOutcome =
	| { readonly kind: "ready"; readonly notes: OrgRemarkNotesContext }
	| { readonly kind: "stale" | "rejected"; readonly message: string }

export type OrgRemarkActionOutcome =
	| { readonly kind: "confirmed"; readonly notes: OrgRemarkNotesContext }
	| { readonly kind: "confirmation-required"; readonly id: string; readonly message: string }
	| { readonly kind: "stale" | "rejected" | "uncertain"; readonly message: string }
