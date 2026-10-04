import type { OrgAgendaEntry } from "@/pipes/org/org-agenda.pipe"
import type { OrgTextEdit } from "@/pipes/org/org-text.pipe"

export type OrgAgendaActionOutcome =
	| { readonly kind: "confirmed" | "unchanged" | "rejected" | "stale"; readonly message?: string }
	| { readonly kind: "needs-note"; readonly entry: OrgAgendaEntry }

export type OrgAgendaCommand =
	| { readonly kind: "cycle-todo"; readonly timestamp?: string; readonly note?: string }
	| { readonly kind: "schedule" | "deadline"; readonly date: string }

export type OrgAgendaPlanningPreparation =
	| { readonly kind: "ready"; readonly entry: OrgAgendaEntry; readonly date: string | null }
	| { readonly kind: "stale" | "rejected"; readonly message?: string }

export type OrgAgendaOperation =
	| OrgAgendaCommand
	| { readonly kind: "prepare"; readonly field: "schedule" | "deadline" }

/** Planning cannot confirm a commit: that outcome belongs to the effect boundary. */
export type OrgAgendaOperationPlan =
	| { readonly kind: "edit"; readonly edits: readonly OrgTextEdit[]; readonly done?: boolean }
	| { readonly kind: "ready"; readonly entry: OrgAgendaEntry; readonly date: string | null }
	| { readonly kind: "needs-note"; readonly entry: OrgAgendaEntry }
	| { readonly kind: "unchanged"; readonly message?: string }
	| { readonly kind: "rejected"; readonly message?: string }
	| { readonly kind: "stale"; readonly message?: string }

export type OrgAgendaCapturedOperation =
	| Exclude<OrgAgendaOperation, { readonly kind: "cycle-todo" }>
	| { readonly kind: "cycle-todo"; readonly timestamp: string; readonly note?: string }

export type OrgAgendaOperationCapture =
	| { readonly kind: "captured"; readonly operation: OrgAgendaCapturedOperation }
	| { readonly kind: "rejected"; readonly message: string }

/** Observation only: does not authorize a command or replace Root's fresh guards. */
export interface OrgAgendaExecutionOptions {
	readonly onCommitStarted?: () => void
}
