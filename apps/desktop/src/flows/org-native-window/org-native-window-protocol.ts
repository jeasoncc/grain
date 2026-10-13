import { isolateHistory } from "@codemirror/commands"
import { foldEffect, unfoldEffect } from "@codemirror/language"
import { ChangeSet, EditorSelection, type EditorState, type StateEffect, Transaction, type TransactionSpec } from "@codemirror/state"
import { orgSemanticHistory } from "@/flows/org-editor-runtime"
import type { OrgRemarkSnapshot } from "@/flows/org-editor-runtime/org-remark-tracker"

export interface DetachedOrgWindowBootstrap { readonly windowId: string; readonly binding: string }
export interface OrgNativeSelection {
 readonly ranges: readonly { readonly anchor: number; readonly head: number; readonly assoc: -1 | 0 | 1; readonly bidiLevel: number | null; readonly goalColumn: number | null; readonly undirectional: boolean }[]
 readonly main: number
}
export function encodeOrgNativeSelection(selection: EditorSelection): OrgNativeSelection {
 return { main: selection.mainIndex, ranges: selection.ranges.map(range => ({ anchor: range.anchor, head: range.head, assoc: range.assoc, bidiLevel: range.bidiLevel, goalColumn: range.goalColumn ?? null, undirectional: range.undirectional })) }
}
export function decodeOrgNativeSelection(selection: OrgNativeSelection): EditorSelection {
 if (!selection || !Array.isArray(selection.ranges) || !selection.ranges.length || !Number.isInteger(selection.main) || selection.main < 0 || selection.main >= selection.ranges.length) throw new Error("Invalid exact native selection")
 const ranges = selection.ranges.map(range => {
  if (!range || !Number.isInteger(range.anchor) || !Number.isInteger(range.head) || range.anchor < 0 || range.head < 0 || ![-1, 0, 1].includes(range.assoc) || typeof range.undirectional !== "boolean" || (range.bidiLevel !== null && (!Number.isInteger(range.bidiLevel) || range.bidiLevel < 0)) || (range.goalColumn !== null && (!Number.isFinite(range.goalColumn) || range.goalColumn < 0))) throw new Error("Invalid native selection range codec")
  const restored = range.undirectional
   ? EditorSelection.undirectionalRange(range.anchor, range.head)
   : EditorSelection.range(range.anchor, range.head, range.goalColumn ?? undefined, range.bidiLevel ?? undefined, range.assoc)
  if (restored.assoc !== range.assoc || restored.bidiLevel !== range.bidiLevel || (restored.goalColumn ?? null) !== range.goalColumn) throw new Error("Native selection attributes cannot be represented exactly")
  return restored
 })
 const restored = EditorSelection.create(ranges, selection.main)
 if (restored.ranges.length !== ranges.length || restored.mainIndex !== selection.main || restored.ranges.some((range, index) => !range.eq(ranges[index], true))) throw new Error("Native selection ranges must be ordered and nonoverlapping")
 return restored
}
export type OrgNativeChanges = readonly (number | readonly (number | string)[])[]
export interface OrgNativeIntentEnvelope extends DetachedOrgWindowBootstrap {
 readonly label: string
 readonly requestId: number
 readonly payload: unknown
}
export interface OrgNativeTransaction {
 readonly changes: OrgNativeChanges
 readonly selection: OrgNativeSelection
 readonly effects: readonly OrgNativeLocalEffect[]
 readonly userEvent: string | null
 readonly time: number
 readonly addToHistory: boolean
 readonly isolation: "before" | "after" | "full" | null
 readonly scrollIntoView: boolean
 readonly semanticHistory: { readonly selection: OrgNativeSelection; readonly group: string; readonly composition?: "update" | "end" } | null
}
export type OrgNativeLocalEffect = { readonly kind: "fold" | "unfold"; readonly from: number; readonly to: number }
export const orgNativeWorkflowCommandIds = [
 "capture", "agenda", "diary", "roam-find", "roam-insert", "roam-new", "link", "refile", "archive",
 "export-html", "export-markdown", "babel-execute",
 "table-recalculate", "clock-in", "clock-out", "cancel-clock", "clock-report",
 "remark-mark", "remark-line", "remark-important", "remark-idea", "remark-question", "remark-revise",
 "remark-quote", "remark-change", "remark-open", "remark-previous", "remark-next", "remark-remove", "remark-delete",
] as const
export type OrgNativeWorkflowCommandId = typeof orgNativeWorkflowCommandIds[number]
export interface OrgNativeWorkflowCapture {
 readonly selection: OrgNativeSelection
 readonly folds: readonly { readonly from: number; readonly to: number }[]
 readonly visibleRanges: readonly { readonly from: number; readonly to: number }[]
 readonly scrollTop: number
 readonly scrollLeft: number
 readonly inputConfiguration: string
 readonly behaviorConfiguration: string
 readonly linkPosition?: number
}
export function isOrgNativeWorkflowCapture(value: unknown): value is OrgNativeWorkflowCapture {
 if (!value || typeof value !== "object") return false
 const capture = value as OrgNativeWorkflowCapture
 try { decodeOrgNativeSelection(capture.selection) } catch { return false }
 return typeof capture.inputConfiguration === "string" && typeof capture.behaviorConfiguration === "string" &&
  (capture.linkPosition === undefined || (Number.isSafeInteger(capture.linkPosition) && capture.linkPosition >= 0)) &&
  Number.isFinite(capture.scrollTop) && capture.scrollTop >= 0 && Number.isFinite(capture.scrollLeft) && capture.scrollLeft >= 0 &&
  [capture.folds, capture.visibleRanges].every(ranges => Array.isArray(ranges) && ranges.every(range =>
   range && Number.isSafeInteger(range.from) && Number.isSafeInteger(range.to) && range.from >= 0 && range.to >= range.from))
}
export type OrgNativeIntent =
 | { readonly kind: "ready" }
 | { readonly kind: "window-destroyed" }
 | { readonly kind: "close-window"; readonly generation?: number }
 | { readonly kind: "attach"; readonly generation: number }
 | { readonly kind: "transactions"; readonly generation: number; readonly revision: number; readonly sequence: number; readonly transactions: readonly OrgNativeTransaction[] }
 | { readonly kind: "undo" | "redo" | "save"; readonly generation: number; readonly revision: number; readonly sequence: number }
 | { readonly kind: "workflow"; readonly generation: number; readonly revision: number; readonly sequence: number; readonly command: OrgNativeWorkflowCommandId; readonly capture: OrgNativeWorkflowCapture }
 | { readonly kind: "workflow-cancel"; readonly generation: number; readonly workflowRequestId: number }
 | { readonly kind: "clock-context"; readonly generation: number; readonly revision: number; readonly sequence: number }
export type OrgNativeProjection =
 | { readonly kind: "close-request"; readonly binding: string; readonly generation: number }
 | { readonly kind: "readiness"; readonly binding: string; readonly generation: number; readonly readOnly: boolean; readonly isDirty?: boolean }
 | { readonly kind: "remark-snapshot"; readonly binding: string; readonly generation: number; readonly revision: number; readonly snapshot: Omit<OrgRemarkSnapshot, "source" | "revision"> }
 | { readonly kind: "save-result"; readonly binding: string; readonly generation: number; readonly requestId: number; readonly success: boolean; readonly message: string }
 | { readonly kind: "workflow-result"; readonly binding: string; readonly generation: number; readonly requestId: number; readonly result: "success" | "rejected" | "cancelled"; readonly message: string }
 | { readonly kind: "workflow-return"; readonly binding: string; readonly generation: number; readonly requestId: number; readonly restorePresentation?: boolean }
 | { readonly kind: "clock-context"; readonly binding: string; readonly generation: number; readonly requestId: number; readonly includeClockingTask: true; readonly activeClock: { readonly headingStart: number; readonly startedAtEpochMs: number } | null; readonly error: string | null }
 | { readonly kind: "initial"; readonly binding: string; readonly generation: number; readonly nextRequestId: number; readonly bufferId: string; readonly path: string; readonly filename: string; readonly source: string; readonly separator: string; readonly revision: number; readonly sequence: number; readonly selection: OrgNativeSelection; readonly folds: readonly { readonly from: number; readonly to: number }[]; readonly scrollTop: number; readonly scrollLeft: number; readonly readOnly: boolean; readonly isDirty?: boolean }
 | { readonly kind: "update"; readonly binding: string; readonly generation: number; readonly revision: number; readonly sequence: number; readonly requestId: number | null; readonly separator: string; readonly transactions: readonly OrgNativeTransaction[]; readonly readOnly: boolean; readonly isDirty?: boolean }
 | { readonly kind: "accepted"; readonly binding: string; readonly generation: number; readonly revision: number; readonly sequence: number; readonly requestId: number; readonly outcome: "empty" | "history-noop" }
 | { readonly kind: "rejected"; readonly binding: string; readonly generation: number; readonly requestId: number | null; readonly message: string; readonly accepted: boolean }
 | { readonly kind: "retired"; readonly binding: string; readonly generation: number; readonly requestId: number | null; readonly message: string; readonly accepted: boolean }

/** Only public, explicitly named effect codecs cross the bridge. Window-issued
 * configuration/scroll/presentation effects stay in their original window. */
export function encodeOrgNativeTransaction(transaction: Transaction, localEffect: (effect: StateEffect<unknown>) => boolean): OrgNativeTransaction {
 const effects: OrgNativeLocalEffect[] = []
 for (const effect of transaction.effects) {
  if (effect.is(foldEffect) || effect.is(unfoldEffect)) {
   effects.push({ kind: effect.is(foldEffect) ? "fold" : "unfold", ...effect.value })
  } else if (!localEffect(effect)) {
   throw new Error("Unknown native window effect; input has not been accepted")
  }
 }
 const semantic = transaction.annotation(orgSemanticHistory)
 return {
  changes: transaction.changes.toJSON(), selection: encodeOrgNativeSelection(transaction.state.selection), effects,
  userEvent: transaction.annotation(Transaction.userEvent) ?? null,
  time: transaction.annotation(Transaction.time) ?? Date.now(),
  addToHistory: transaction.annotation(Transaction.addToHistory) !== false,
  isolation: transaction.annotation(isolateHistory) ?? null,
  scrollIntoView: transaction.scrollIntoView,
  semanticHistory: semantic ? { selection: encodeOrgNativeSelection(semantic.selection), group: semantic.group, ...(semantic.composition ? { composition: semantic.composition } : {}) } : null,
 }
}
export function decodeOrgNativeTransaction(state: EditorState, transaction: OrgNativeTransaction, project?: (state: EditorState, spec: TransactionSpec) => Transaction): Transaction {
 if (!transaction || !Array.isArray(transaction.effects) || typeof transaction.addToHistory !== "boolean" || typeof transaction.scrollIntoView !== "boolean" ||
  !Number.isFinite(transaction.time) || (transaction.userEvent !== null && typeof transaction.userEvent !== "string") ||
  ![null, "before", "after", "full"].includes(transaction.isolation)) throw new Error("Invalid native transaction metadata")
 const changes = ChangeSet.fromJSON(transaction.changes)
 const semantic = transaction.semanticHistory
 if (semantic !== null && (!semantic || typeof semantic.group !== "string" || !semantic.group.length || !semantic.selection ||
  (semantic.composition !== undefined && semantic.composition !== "update" && semantic.composition !== "end"))) throw new Error("Invalid native semantic history")
 const semanticSelection = semantic ? decodeOrgNativeSelection(semantic.selection) : null
 if (changes.length !== state.doc.length) throw new Error("Native transaction source length is stale")
 const effects = transaction.effects.map(effect => {
  if (!effect || (effect.kind !== "fold" && effect.kind !== "unfold") || !Number.isInteger(effect.from) || !Number.isInteger(effect.to) || effect.from < 0 || effect.to < effect.from || effect.to > changes.newLength) throw new Error("Unknown or invalid native effect codec")
  return (effect.kind === "fold" ? foldEffect : unfoldEffect).of({ from: effect.from, to: effect.to })
 })
 const spec: TransactionSpec = { changes, selection: decodeOrgNativeSelection(transaction.selection), effects,
  annotations: [Transaction.time.of(transaction.time), Transaction.addToHistory.of(transaction.addToHistory), ...(transaction.userEvent === null ? [] : [Transaction.userEvent.of(transaction.userEvent)]), ...(transaction.isolation === null ? [] : [isolateHistory.of(transaction.isolation)]), ...(semantic && semanticSelection ? [orgSemanticHistory.of({ selection: semanticSelection, group: semantic.group, ...(semantic.composition ? { composition: semantic.composition } : {}) })] : [])], scrollIntoView: transaction.scrollIntoView }
 return project ? project(state, spec) : state.update(spec)
}
export const isOrgNativeIntent = (value: unknown): value is OrgNativeIntent => {
 if (!value || typeof value !== "object" || !("kind" in value)) return false
 if (["ready", "close-window", "window-destroyed"].includes(String(value.kind))) return true
 if (value.kind === "attach") return "generation" in value && Number.isSafeInteger(value.generation)
 if (value.kind === "workflow-cancel") return "generation" in value && Number.isSafeInteger(value.generation) && "workflowRequestId" in value && Number.isSafeInteger(value.workflowRequestId) && Number(value.workflowRequestId) > 0
 if (value.kind === "clock-context") return "generation" in value && Number.isSafeInteger(value.generation) && Number(value.generation) > 0 && "revision" in value && Number.isSafeInteger(value.revision) && Number(value.revision) >= 0 && "sequence" in value && Number.isSafeInteger(value.sequence) && Number(value.sequence) >= 0
 if (value.kind === "workflow") return "generation" in value && Number.isSafeInteger(value.generation) && "revision" in value && Number.isSafeInteger(value.revision) && "sequence" in value && Number.isSafeInteger(value.sequence) &&
  "command" in value && orgNativeWorkflowCommandIds.includes(value.command as OrgNativeWorkflowCommandId) && "capture" in value && isOrgNativeWorkflowCapture(value.capture)
 if (!["transactions", "undo", "redo", "save"].includes(String(value.kind))) return false
 return "generation" in value && Number.isSafeInteger(value.generation) && "revision" in value && Number.isSafeInteger(value.revision) && "sequence" in value && Number.isSafeInteger(value.sequence) &&
  (value.kind !== "transactions" || ("transactions" in value && Array.isArray(value.transactions)))
}
