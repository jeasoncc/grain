import { foldEffect, foldedRanges, unfoldEffect } from "@codemirror/language"
import { Compartment, EditorState, Transaction, type StateEffect } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { invoke } from "@tauri-apps/api/core"
import { createOrgSourceProjectionAuthority } from "@/flows/org-editor-runtime"
import type { OrgNativeEditorProjection } from "./org-native-editor-projection.types"
import { decodeOrgNativeSelection, decodeOrgNativeTransaction, encodeOrgNativeSelection, encodeOrgNativeTransaction, type DetachedOrgWindowBootstrap, type OrgNativeIntent, type OrgNativeProjection, type OrgNativeTransaction, type OrgNativeWorkflowCommandId } from "./org-native-window-protocol"
import { useSettings } from "@/hooks/use-settings"
import { getOrgInputConfiguration } from "@/hooks/use-org-input-configuration"
import type { OrgSparseClockAdapter } from "@/flows/org-command/org-sparse-tree-context"
import type { OrgRemarkSnapshot } from "@/flows/org-editor-runtime/org-remark-tracker"

export interface OrgNativeProjectionStatus {
 readonly pending: number
 readonly error: string | null
 readonly retainedSource: string | null
 readonly message: string | null
 readonly acceptedRevision: number
 readonly acceptedProjectionFailure: boolean
 readonly readOnly: boolean
 readonly isDirty: boolean
 readonly remarkSnapshot: OrgRemarkSnapshot | null
}
export interface OrgNativeSubmissionResult { readonly kind: "success" | "rejected" | "cancelled"; readonly message: string }
export interface OrgNativeChildProjection extends OrgNativeEditorProjection {
 receive(payload: OrgNativeProjection): void
 getSnapshot(): OrgNativeProjectionStatus
 subscribe(listener: () => void): () => void
 requestWindowAction(kind: "attach" | "close-window"): Promise<void>
 requestSave(): Promise<OrgNativeSubmissionResult>
 captureSubmission(run: () => boolean): Promise<OrgNativeSubmissionResult>
 captureWorkflow(command: OrgNativeWorkflowCommandId, visibleRanges: readonly { readonly from: number; readonly to: number }[], linkPosition?: number): (() => Promise<OrgNativeSubmissionResult>) | null
 captureClockContext(source: string, filename: string | null): OrgSparseClockAdapter
 retainDraft(): string | null
 discardRetainedAndClose(expected: OrgNativeProjectionStatus, source: string): Promise<boolean>
 retire(): void
}
export type OrgNativeSendIntent = (requestId: number, payload: OrgNativeIntent) => Promise<void>
interface PendingInput {
 readonly requestId: number
 readonly encoded: readonly OrgNativeTransaction[]
 readonly transactions: readonly Transaction[]
 readonly history: "undo" | "redo" | "save" | null
 readonly result: Promise<OrgNativeSubmissionResult>
 readonly resolve: (result: OrgNativeSubmissionResult) => void
}

/** The view may show native input immediately, but it is labelled pending until
 * the sole canonical parent commits. Rejection freezes publication, not the draft. */
export function createOrgNativeChildProjection(bootstrap: DetachedOrgWindowBootstrap, initial: Extract<OrgNativeProjection, { kind: "initial" }>, send?: OrgNativeSendIntent, closeSelf?: () => Promise<void>): OrgNativeChildProjection {
 const sourcePolicy = new Compartment()
 const readinessPolicy = new Compartment()
 let readOnly = initial.readOnly
 let isDirty = initial.isDirty ?? true
 let submissionCapture: PendingInput[] | null = null
 const authority = createOrgSourceProjectionAuthority()
 const deferred: OrgNativeProjection[] = []
 const sendIntent: OrgNativeSendIntent = send ?? ((requestId, payload) => invoke("post_org_window_intent", { binding: bootstrap.binding, requestId, payload }))
 const closeNativeSelf = closeSelf ?? (() => invoke<void>("close_org_detached_window", { label: `org-detached-${bootstrap.windowId}`, binding: bootstrap.binding }))
 const listeners = new Set<() => void>()
 const queue: PendingInput[] = []
 const saves = new Map<number, PendingInput>()
 type ClockMetadata = Pick<Extract<OrgNativeProjection, { kind: "clock-context" }>, "includeClockingTask" | "activeClock">
 const clockReads = new Map<number, { resolve: (clock: ClockMetadata) => void; reject: (cause: Error) => void }>()
 const retireClockReads = () => {
  for (const read of clockReads.values()) read.reject(new Error("The captured native clock context retired"))
  clockReads.clear()
 }
 let view: EditorView | null = null
 let revision = initial.revision, sequence = initial.sequence, requestId = initial.nextRequestId - 1, active = true
 let error: string | null = null, retainedSource: string | null = null
 let message: string | null = null
 let acceptedProjectionFailure = false
 let inFlight: PendingInput | null = null
 let workflow: { readonly requestId: number; readonly inputConfiguration: string; readonly behaviorConfiguration: string;
  selection: EditorState["selection"]; folds: readonly { readonly from: number; readonly to: number }[];
  readonly scrollTop: number; readonly scrollLeft: number;
  readonly focus: Element | null;
  resolve: ((result: OrgNativeSubmissionResult) => void) | null } | null = null
 const cancelWorkflow = () => {
  const captured = workflow
  if (!captured) return
  workflow = null
  captured.resolve?.({ kind: "cancelled", message: "The captured native workflow origin changed" })
  if (active) void sendIntent(++requestId, { kind: "workflow-cancel", generation: initial.generation, workflowRequestId: captured.requestId }).catch(() => undefined)
 }
 let behaviorRaw = useSettings.getState().orgBehaviorConfigurationJson
 let behaviorIdentity = {}
 const releaseWorkflowConfiguration = useSettings.subscribe(settings => {
  if (settings.orgBehaviorConfigurationJson !== behaviorRaw) {
   behaviorRaw = settings.orgBehaviorConfigurationJson; behaviorIdentity = {}
  }
  if (workflow && (workflow.inputConfiguration !== settings.orgKeymapConfigurationJson || workflow.behaviorConfiguration !== settings.orgBehaviorConfigurationJson)) {
   cancelWorkflow(); notify()
  }
 })
 let remarkSnapshot: OrgRemarkSnapshot | null = null
 let pendingRemarks: Extract<OrgNativeProjection, { kind: "remark-snapshot" }> | null = null
 let receivedRemarkVersion = -1
 let status: OrgNativeProjectionStatus = { pending: 0, error, retainedSource, acceptedRevision: revision, message, acceptedProjectionFailure, readOnly, isDirty, remarkSnapshot }
 let accepted: EditorState | null = null
 const refreshRemarks = () => {
  if (remarkSnapshot && remarkSnapshot.revision !== revision) remarkSnapshot = null
  if (pendingRemarks && pendingRemarks.revision < revision) pendingRemarks = null
  if (!pendingRemarks || pendingRemarks.revision !== revision || !active || error || queue.length || !accepted) return
  const snapshot = pendingRemarks.snapshot
  // Restore the source witness from accepted state, never optimistic input or a second wire body.
  remarkSnapshot = snapshot.needsReload || !snapshot.marks.length ? null : {
   ...snapshot, revision, source: accepted.sliceDoc(),
  }
  pendingRemarks = null
 }
 const notify = () => { refreshRemarks(); status = { pending: queue.length + saves.size + (workflow?.resolve ? 1 : 0), error, retainedSource, acceptedRevision: revision, message, acceptedProjectionFailure, readOnly, isDirty, remarkSnapshot }; for (const listener of listeners) listener() }
 const retain = () => error && retainedSource !== null ? retainedSource : view?.state.sliceDoc() ?? retainedSource
 const installReadiness = () => {
  const effects = readinessPolicy.reconfigure([EditorState.readOnly.of(readOnly || error !== null || !active), EditorView.editable.of(!readOnly && error === null && active)])
  const matched = accepted !== null && accepted === view?.state
  if (accepted && !matched) accepted = authority.update(accepted, { effects, annotations: Transaction.addToHistory.of(false) }).state
  if (view) {
   view.update([authority.update(view.state, { effects, annotations: Transaction.addToHistory.of(false) })])
   if (matched) accepted = view.state
  }
 }
 const fail = (message: string, source = retain()) => {
  error = message; retainedSource = source
  cancelWorkflow()
  retireClockReads()
  for (const input of queue) input.resolve({ kind: "rejected", message })
  for (const input of saves.values()) input.resolve({ kind: "rejected", message })
  installReadiness(); notify()
 }
 const enqueue = (encoded: readonly OrgNativeTransaction[], transactions: readonly Transaction[], history: PendingInput["history"]) => {
  const { promise, resolve } = Promise.withResolvers<OrgNativeSubmissionResult>()
  const input: PendingInput = { requestId: ++requestId, encoded, transactions, history, result: promise, resolve }
  queue.push(input); submissionCapture?.push(input)
  notify(); publish()
  return input.result
 }
 const publish = () => {
  if (!active || error || inFlight || !queue.length) return
  if (readOnly && (queue[0].history !== null || queue[0].transactions.some(transaction => transaction.docChanged))) return
  inFlight = queue[0]
  const input = inFlight
  const payload: OrgNativeIntent = input.history
   ? { kind: input.history, generation: initial.generation, revision, sequence }
   : { kind: "transactions", generation: initial.generation, revision, sequence, transactions: input.encoded }
  if (input.history === "save") {
   queue.shift(); inFlight = null; saves.set(input.requestId, input)
   void sendIntent(input.requestId, payload).catch(cause => {
    if (active && saves.get(input.requestId) === input) fail(`Save bridge failed: ${cause instanceof Error ? cause.message : String(cause)}`)
   })
   notify(); publish(); return
  }
  void sendIntent(input.requestId, payload).catch(cause => { if (active && inFlight === input) fail(`Native input remains unaccepted: ${cause instanceof Error ? cause.message : String(cause)}`) })
 }
 const acknowledge = (id: number, result: OrgNativeSubmissionResult = { kind: "success", message: "Canonical Source command accepted" }) => {
  if (!inFlight || inFlight.requestId !== id || queue[0] !== inFlight) throw new Error("Unknown native acceptance identity")
  inFlight.resolve(result)
  queue.shift(); inFlight = null
  if (!queue.length && !saves.size && !error) retainedSource = null
  notify(); publish()
 }
 const closeCurrentView = async () => {
  cancelWorkflow()
  active = false; retainedSource = retain()
  retireClockReads()
  installReadiness(); notify()
  try { await closeNativeSelf(); releaseWorkflowConfiguration() }
  catch (cause) {
   active = true
   fail(`Native view could not close: ${cause instanceof Error ? cause.message : String(cause)}`)
   throw cause
  }
 }
 const projection: OrgNativeChildProjection = {
  captureClockContext(source, filename) {
   const editor = view, capturedRevision = revision, capturedSequence = sequence, configuration = getOrgInputConfiguration().generation
   const behavior = behaviorIdentity
   const capturedDocument = editor?.state.doc, capturedSeparator = editor?.state.lineBreak
   const sourceMatches = editor?.state.sliceDoc() === source
   const current = () => active && editor !== null && view === editor && !error && queue.length === 0 && revision === capturedRevision &&
    sequence === capturedSequence && sourceMatches && editor.state.doc === capturedDocument && editor.state.lineBreak === capturedSeparator && filename === initial.filename &&
    getOrgInputConfiguration().generation === configuration && behaviorIdentity === behavior
   return async nativeClock => {
    if (!current()) throw new Error("The native Source clock context changed before invocation")
    const pending = Promise.withResolvers<ClockMetadata>(), id = ++requestId
    clockReads.set(id, pending)
    try { await sendIntent(id, { kind: "clock-context", generation: initial.generation, revision: capturedRevision, sequence: capturedSequence }) }
    catch (cause) {
     clockReads.delete(id)
     pending.reject(cause instanceof Error ? cause : new Error(String(cause)))
    }
    const captured = await pending.promise
    if (!current()) throw new Error("The native Source clock context retired before acceptance")
    return { ...nativeClock, ...captured }
   }
  },
  historyFreeExtensions: [authority.extension, sourcePolicy.of(EditorState.lineSeparator.of(initial.separator)), readinessPolicy.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]), EditorState.allowMultipleSelections.of(true)],
  attach(editor, knownLocalEffect, preflight) {
   if (view) throw new Error("Native projection already attached")
   view = editor; accepted = editor.state
   // Exact canonical multi-range selection, not only its primary cursor.
   const folds = initial.folds.map(range => {
    if (!Number.isInteger(range.from) || !Number.isInteger(range.to) || range.from < 0 || range.to < range.from || range.to > editor.state.doc.length) throw new Error("Invalid native initial fold codec")
    return foldEffect.of(range)
   })
   editor.update([authority.update(editor.state, { selection: decodeOrgNativeSelection(initial.selection), effects: folds, annotations: Transaction.addToHistory.of(false) })])
   if (!Number.isFinite(initial.scrollTop) || !Number.isFinite(initial.scrollLeft) || initial.scrollTop < 0 || initial.scrollLeft < 0) throw new Error("Invalid native initial viewport codec")
   editor.scrollDOM.scrollTop = initial.scrollTop; editor.scrollDOM.scrollLeft = initial.scrollLeft
   window.requestAnimationFrame(() => {
    if (active && view === editor && !queue.length && revision === initial.revision && sequence === initial.sequence) {
     editor.scrollDOM.scrollTop = initial.scrollTop; editor.scrollDOM.scrollLeft = initial.scrollLeft
    }
   })
   accepted = editor.state
   if (!active) installReadiness()
   queueMicrotask(() => { for (const payload of deferred.splice(0)) projection.receive(payload) })
   return {
    isCurrent: () => active && view === editor && projection.getSnapshot().error === null,
    dispatchTransactions(transactions) {
     const ownsLocalEffect = (effect: StateEffect<unknown>) =>
      effect.is(foldEffect) || effect.is(unfoldEffect) || knownLocalEffect(effect)
     if (!active || view !== editor) { fail("Native projection lease is detached"); return }
     if (workflow && transactions.some(transaction => transaction.docChanged || transaction.selection || transaction.effects.some(effect => effect.is(foldEffect) || effect.is(unfoldEffect)))) cancelWorkflow()
     let encoded: readonly OrgNativeTransaction[]
     try {
      if (transactions.some(transaction => !preflight(transaction))) throw new Error("Window Source preflight rejected input")
      encoded = transactions.map(transaction => {
       const data = encodeOrgNativeTransaction(transaction, ownsLocalEffect)
       // Fold codecs are public, but child presentation never acquires parent view authority.
       return data.effects.length ? { ...data, effects: [] } : data
      })
     } catch (cause) {
      const last = transactions.at(-1)
      fail(cause instanceof Error ? cause.message : String(cause), last ? last.newDoc.sliceString(0, last.newDoc.length, last.startState.lineBreak) : retain())
      return
     }
     // Local presentation never bypasses synchronization of any selection attribute.
     const localOnly = transactions.every((transaction, index) => !transaction.docChanged &&
      encoded[index].semanticHistory === null && transaction.effects.every(ownsLocalEffect) &&
      transaction.startState.selection.eq(transaction.state.selection, true) &&
      transaction.startState.selection.ranges.every((range, rangeIndex) => {
       const next = transaction.state.selection.ranges[rangeIndex]
       return range.bidiLevel === next.bidiLevel && range.goalColumn === next.goalColumn && range.undirectional === next.undirectional
      }))
     editor.update(transactions)
     if (localOnly) {
      if (!queue.length) accepted = editor.state
      notify(); return
     }
     if (error || (readOnly && transactions.some(transaction => transaction.docChanged))) { fail(error ?? "This file is read-only; native input was not submitted", editor.state.sliceDoc()); return }
     void enqueue(encoded, transactions, null)
    },
    async requestHistory(operation) {
     if (!active || view !== editor || error || readOnly) return false
     // Never queue history behind further optimistic input: await the accepted
     // predecessor, then recheck this exact projection lifetime without replay.
     const preceding = queue.at(-1)
     if (preceding) {
      const result = await preceding.result
      if (result.kind !== "success" || !active || view !== editor || error || readOnly || queue.length) return false
     }
     const result = await enqueue([], [], operation)
     return active && view === editor && !error && result.kind === "success"
    },
    detach() {
     active = false; retainedSource = retain()
     cancelWorkflow(); releaseWorkflowConfiguration()
     retireClockReads()
     for (const input of queue) input.resolve({ kind: "cancelled", message: "Native projection lifetime retired" })
     for (const input of saves.values()) input.resolve({ kind: "cancelled", message: "Native projection lifetime retired" })
     view = null; notify()
    },
   }
  },
  receive(payload) {
   if (!active || payload.binding !== bootstrap.binding) return
   if (payload.generation !== initial.generation) {
    if (payload.kind === "initial" && payload.generation > initial.generation) projection.retire()
    return
   }
   if (!view) { deferred.push(payload); return }
   if (payload.kind === "remark-snapshot") {
    const snapshot = payload.snapshot
    if (error || !Number.isSafeInteger(payload.revision) || payload.revision < revision || !snapshot ||
     !Number.isSafeInteger(snapshot.version) || snapshot.version <= receivedRemarkVersion ||
     !Array.isArray(snapshot.marks) || typeof snapshot.needsReload !== "boolean" || typeof snapshot.dirty !== "boolean") return
    receivedRemarkVersion = snapshot.version
    pendingRemarks = payload
    notify(); return
   }
   if (payload.kind === "clock-context") {
    const read = clockReads.get(payload.requestId)
    if (!read) return
    clockReads.delete(payload.requestId)
    const clock = payload.activeClock
    if (payload.error) read.reject(new Error(payload.error))
    else if (payload.includeClockingTask !== true || (clock !== null && (!clock || !Number.isSafeInteger(clock.headingStart) || clock.headingStart < 0 ||
     clock.headingStart > view.state.doc.length + (view.state.doc.lines - 1) * (view.state.lineBreak.length - 1) || !Number.isFinite(clock.startedAtEpochMs))))
     read.reject(new Error("Invalid native root clock context codec"))
    else read.resolve({ includeClockingTask: true, activeClock: clock })
    return
   }
   if (payload.kind === "workflow-result") {
    if (workflow?.requestId !== payload.requestId) return
    message = payload.message
    const resolve = workflow.resolve
    workflow.resolve = null
    resolve?.({ kind: payload.result, message: payload.message })
    notify(); return
   }
   if (payload.kind === "workflow-return") {
    const captured = workflow
    if (!captured) {
     // A deliberate captured navigation may have installed a new generation;
     // its Root-only return focuses that Source, never a newer child control.
     const focused = document.activeElement
     if (payload.restorePresentation === false && !queue.length && !error &&
      (!focused || focused === document.body || view.dom.contains(focused))) view.focus()
     return
    }
    if (captured.requestId !== payload.requestId || queue.length || error) return
    workflow = null
    captured.resolve?.({ kind: "cancelled", message: "Returned to the captured native Source" })
    const focused = document.activeElement
    const mayFocus = !focused || focused === document.body || focused === captured.focus || view.dom.contains(focused)
    if (payload.restorePresentation === false) {
     if (mayFocus) view.focus()
     notify(); return
    }
    const effects: StateEffect<unknown>[] = []
    foldedRanges(view.state).between(0, view.state.doc.length, (from, to) => { effects.push(unfoldEffect.of({ from, to })) })
    effects.push(...captured.folds.map(range => foldEffect.of(range)))
    view.update([authority.update(view.state, { selection: captured.selection, effects, annotations: Transaction.addToHistory.of(false) })])
    accepted = view.state
    view.scrollDOM.scrollTop = captured.scrollTop; view.scrollDOM.scrollLeft = captured.scrollLeft
    if (mayFocus) view.focus()
    notify(); return
   }
   if (payload.kind === "readiness") {
    isDirty = payload.isDirty ?? isDirty
    readOnly = payload.readOnly; installReadiness(); notify(); publish(); return
   }
   if (payload.kind === "close-request") {
    if (queue.length || saves.size || error) {
     retainedSource = retain()
     message = "Window close is blocked until native input is accepted or explicitly copied/discarded"
     notify()
    } else void closeCurrentView().catch(() => undefined)
    return
   }
   if (payload.kind === "rejected" || payload.kind === "retired") {
    if (payload.accepted && payload.requestId === inFlight?.requestId) {
     // Accepted canonical state is never rolled back even if projection failed.
     acceptedProjectionFailure = true
     inFlight?.resolve({ kind: "rejected", message: payload.message })
     queue.shift(); inFlight = null
    }
    fail(payload.message); return
   }
   if (error || !view || !accepted || payload.kind === "initial") return
   try {
    if (payload.kind === "save-result") {
     const save = saves.get(payload.requestId)
     if (!save) throw new Error("Unknown native Save result identity")
     saves.delete(payload.requestId)
     message = payload.message
     save.resolve({ kind: payload.success ? "success" : "rejected", message: payload.message })
     notify(); publish(); return
    }
    if (payload.kind === "accepted") {
     revision = payload.revision; sequence = payload.sequence
     acknowledge(payload.requestId, { kind: "cancelled", message: payload.outcome === "history-noop" ? "Canonical history has no applicable event" : "No canonical mutation was requested" }); return
    }
    if (payload.sequence !== sequence + 1) throw new Error("Native projection sequence gap; draft is retained")
    const own = payload.requestId !== null && payload.requestId === inFlight?.requestId
    if (queue.length && !own) throw new Error("Canonical peer changed while native input was pending; draft is retained without replay")
    if (own && inFlight?.history && queue.length > 1) {
     inFlight?.resolve({ kind: "rejected", message: "Canonical history accepted, but later native input is retained without replay" })
     queue.shift(); inFlight = null
     revision = payload.revision; sequence = payload.sequence
     throw new Error("Canonical history accepted while further native input was pending; later input is retained without replay")
    }
    let next = accepted
    const projected: Transaction[] = []
    for (const transaction of payload.transactions) {
     if (next.lineBreak !== payload.separator) {
      const policy = authority.update(next, { effects: sourcePolicy.reconfigure(EditorState.lineSeparator.of(payload.separator)), annotations: Transaction.addToHistory.of(false) })
      next = policy.state; projected.push(policy)
     }
     const decoded = decodeOrgNativeTransaction(next, transaction, authority.update)
     next = decoded.state; projected.push(decoded)
     if (workflow) {
      workflow.selection = workflow.selection.map(decoded.changes)
      workflow.folds = workflow.folds.map(range => ({ from: decoded.changes.mapPos(range.from, 1), to: decoded.changes.mapPos(range.to, -1) })).filter(range => range.to >= range.from)
     }
    }
    if (own && inFlight && !inFlight.history) {
     const optimistic = inFlight.transactions.at(-1)?.state
     if (!optimistic || !optimistic.doc.eq(next.doc) || optimistic.lineBreak !== next.lineBreak || !optimistic.selection.eq(next.selection, true)) throw new Error("Canonical acceptance differs from retained native input")
     accepted = queue.length === 1 ? view.state : optimistic
    } else {
     view.update(projected); accepted = view.state
    }
    revision = payload.revision; sequence = payload.sequence
    readOnly = payload.readOnly; installReadiness()
    isDirty = payload.isDirty ?? isDirty
    if (own && payload.requestId !== null) acknowledge(payload.requestId)
    else notify()
   } catch (cause) {
    if (payload.kind === "update" && payload.requestId !== null && payload.requestId === inFlight?.requestId) {
     acceptedProjectionFailure = true
     inFlight?.resolve({ kind: "rejected", message: "Canonical input accepted but window projection failed" })
     revision = payload.revision; sequence = payload.sequence
     queue.shift(); inFlight = null
    }
    fail(cause instanceof Error ? cause.message : String(cause))
   }
  },
  getSnapshot: () => status,
  subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
  requestSave() {
   if (!active || error || readOnly) return Promise.resolve({ kind: "rejected", message: error ?? "Native Source lifetime is retired or read-only" })
   return enqueue([], [], "save")
  },
  async captureSubmission(run) {
   if (!active || error || readOnly || submissionCapture) return { kind: "rejected", message: error ?? "Native Source cannot currently accept this command" }
   const captured: PendingInput[] = []
   submissionCapture = captured
   let submitted = false
   try { submitted = run() }
   catch (cause) { fail(cause instanceof Error ? cause.message : String(cause)) }
   finally { submissionCapture = null }
   if (!submitted || error) return { kind: "rejected", message: error ?? "Source command target rejected this invocation" }
   if (!captured.length) return { kind: "cancelled", message: "Command opened local input; no canonical mutation has been accepted" }
   const results = await Promise.all(captured.map(input => input.result))
   if (!active) return { kind: "cancelled", message: "Native command projection lifetime retired" }
   return results.find(result => result.kind !== "success") ?? results[results.length - 1]
  },
  captureWorkflow(command, visibleRanges, linkPosition) {
   if (!active || !view || error || queue.length || saves.size || workflow) return null
   const editor = view, state = view.state, capturedRevision = revision, capturedSequence = sequence
   const settings = useSettings.getState()
   const inputConfiguration = settings.orgKeymapConfigurationJson, behaviorConfiguration = settings.orgBehaviorConfigurationJson
   const inputGeneration = getOrgInputConfiguration().generation, behaviorGeneration = behaviorIdentity
   const folds: { from: number; to: number }[] = []
   foldedRanges(state).between(0, state.doc.length, (from, to) => { folds.push({ from, to }) })
   const { scrollTop, scrollLeft } = editor.scrollDOM
   return async () => {
    if (!active || view !== editor || view.state !== state || revision !== capturedRevision || sequence !== capturedSequence || workflow ||
     queue.length || saves.size || error || getOrgInputConfiguration().generation !== inputGeneration ||
     behaviorIdentity !== behaviorGeneration) return { kind: "rejected", message: "The native workflow origin changed before invocation" }
    const pending = Promise.withResolvers<OrgNativeSubmissionResult>()
    const id = ++requestId
    workflow = { requestId: id, inputConfiguration, behaviorConfiguration, selection: state.selection, folds, scrollTop, scrollLeft, focus: document.activeElement, resolve: pending.resolve }
    notify()
    try {
     await sendIntent(id, { kind: "workflow", generation: initial.generation, revision, sequence, command,
      capture: { selection: encodeOrgNativeSelection(state.selection), folds, visibleRanges, scrollTop, scrollLeft, inputConfiguration, behaviorConfiguration,
       ...(linkPosition === undefined ? {} : { linkPosition }) } })
    } catch (cause) {
     if (workflow?.requestId === id) {
      workflow = null
      pending.resolve({ kind: "rejected", message: cause instanceof Error ? cause.message : String(cause) })
      notify()
     }
    }
    return pending.promise
   }
  },
  async requestWindowAction(kind) {
   if (!active || queue.length || saves.size || error) throw new Error("Native projection retired or has unaccepted input; retain/copy it before attaching or closing")
   if (kind === "close-window") await closeCurrentView()
   else await sendIntent(++requestId, { kind, generation: initial.generation })
  },
  async discardRetainedAndClose(expected, source) {
   if (!active || status !== expected || retain() !== source || retainedSource === null) return false
   await closeCurrentView()
   for (const input of queue) input.resolve({ kind: "cancelled", message: "Unaccepted input explicitly discarded with the native view" })
   for (const input of saves.values()) input.resolve({ kind: "cancelled", message: "Native view closed; canonical Save belongs to the retained main owner" })
   notify()
   return true
  },
  retire() {
   if (!active) return
   active = false; retainedSource = retain()
   cancelWorkflow(); releaseWorkflowConfiguration()
   retireClockReads()
   for (const input of queue) input.resolve({ kind: "cancelled", message: "Native Source projection rebound" })
   for (const input of saves.values()) input.resolve({ kind: "cancelled", message: "Native Source projection rebound" })
   installReadiness(); notify()
  },
  retainDraft: retain,
 }
 return projection
}
