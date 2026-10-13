import type { OrgAgendaEntry } from "@/pipes/org/org-agenda.pipe"
import type { OrgTextEdit } from "@/pipes/org/org-text.pipe"
import type { OrgDateContext } from "@/pipes/org/org-date-reader.pipe"
import type { OrgLoggingPolicyOptions } from "@/pipes/org/org-logging-policy.pipe"
import type { OrgClockContext, OrgClockReport, OrgClockOperation } from "@/pipes/org/org-clock.pipe"

export type OrgAgendaActionOutcome =
	| { readonly kind: "confirmed" | "unchanged" | "rejected" | "stale"; readonly message?: string }
	| { readonly kind: "needs-note"; readonly entry: OrgAgendaEntry; readonly command: OrgAgendaNoteCommand }
	| { readonly kind: "report"; readonly report: OrgClockReport }

export type OrgAgendaCommand = (
	| { readonly kind: "cycle-todo"; readonly timestamp?: string; readonly note?: string; readonly repeatToState?: string | boolean }
	| { readonly kind: "complete-repeating"; readonly timestamp?: string; readonly note?: string; readonly repeatToState?: string | boolean }
	| { readonly kind: "todo-state"; readonly state: string; readonly timestamp?: string; readonly note?: string; readonly repeatToState?: string | boolean }
	| { readonly kind: "schedule" | "deadline"; readonly date: string; readonly context?: OrgDateContext }
	| { readonly kind: "remove-schedule" | "remove-deadline"; readonly context?: OrgDateContext }
	| { readonly kind: OrgClockOperation; readonly clockContext: OrgClockContext }
	| { readonly kind: "clock-report" }
) & OrgLoggingPolicyOptions
/** Only these operations can enter the shared deferred-note protocol. */
export type OrgAgendaNoteCommand = Exclude<OrgAgendaCommand, { readonly kind: OrgClockOperation | "clock-report" }>

export type OrgAgendaPreparation =
	| { readonly kind: "ready"; readonly entry: OrgAgendaEntry; readonly date: string | null; readonly states?: readonly string[]; readonly initialInput?: string }
	| { readonly kind: "stale" | "rejected"; readonly message?: string }

export type OrgAgendaOperation =
	| OrgAgendaCommand
	| { readonly kind: "prepare"; readonly field: "schedule" | "deadline" | "todo-state" }

/** Planning cannot confirm a commit: that outcome belongs to the effect boundary. */
export type OrgAgendaOperationPlan =
	| { readonly kind: "edit"; readonly edits: readonly OrgTextEdit[]; readonly done?: boolean }
	| { readonly kind: "ready"; readonly entry: OrgAgendaEntry; readonly date: string | null; readonly states?: readonly string[]; readonly initialInput?: string }
	| { readonly kind: "needs-note"; readonly entry: OrgAgendaEntry; readonly command: OrgAgendaNoteCommand }
	| { readonly kind: "unchanged"; readonly message?: string }
	| { readonly kind: "rejected"; readonly message?: string }
	| { readonly kind: "stale"; readonly message?: string }
	| { readonly kind: "report"; readonly report: OrgClockReport }

export type OrgAgendaCapturedOperation =
	| Exclude<OrgAgendaOperation, { readonly kind: "cycle-todo" | "todo-state" | "complete-repeating" }>
	| (Extract<OrgAgendaCommand, { readonly kind: "cycle-todo" | "todo-state" | "complete-repeating" }> & { readonly timestamp: string })

export type OrgAgendaOperationCapture =
	| { readonly kind: "captured"; readonly operation: OrgAgendaCapturedOperation }
	| { readonly kind: "rejected"; readonly message: string }

/** Observation only: does not authorize a command or replace Root's fresh guards. */
export interface OrgAgendaExecutionOptions {
	readonly onCommitStarted?: () => void
	/** Captured producer/window lease, checked again after reads and before publication. */
	readonly isCurrent?: () => boolean
}
