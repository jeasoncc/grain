import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { EditorState, type Transaction } from "@codemirror/state"
import { foldEffect, foldedRanges, foldState } from "@codemirror/language"
import { isOrgRuntimeProjection, type OrgBufferRuntime, type OrgBufferWindowHandle } from "@/flows/org-editor-runtime"
import type { OrgWorkspaceSessionScope, OrgWorkspaceSessionWindowAuthority } from "@/flows/org-editor-runtime/org-workspace-session-owner"
import type { OrgDocumentInterface } from "@/types/org"
import { decodeOrgNativeTransaction, encodeOrgNativeSelection, encodeOrgNativeTransaction, isOrgNativeIntent, type OrgNativeIntentEnvelope, type OrgNativeProjection } from "./org-native-window-protocol"
import { dispatchOrgNativeWorkflow, readOrgNativeClockCapture, type OrgNativeWorkflowRequest } from "./org-native-workflow-bridge"
import { createOrgNativeWorkflowTarget } from "./org-native-workflow-target"
import { decodeOrgNativeSelection } from "./org-native-window-protocol"
import { getOrgInputConfiguration } from "@/hooks/use-org-input-configuration"
import { useSettings } from "@/hooks/use-settings"
import { orgLinkTargetAt } from "@/pipes/org/org-link.pipe"
import { createOrgRemarkTracker } from "@/flows/org-editor-runtime/org-remark-tracker"

export interface OrgNativeWindowTransport {
 listen(listener: (envelope: OrgNativeIntentEnvelope) => void): Promise<() => void>
 create(windowId: string, binding: string): Promise<{ windowId: string; label: string }>
 post(label: string, binding: string, payload: OrgNativeProjection): Promise<void>
 close(label: string, binding: string): Promise<void>
 setMainVisible(visible: boolean): Promise<void>
 focus?(label: string, binding: string, generation: number, toMain: boolean, scope: OrgWorkspaceSessionScope): Promise<void>
}
export const orgNativeWindowTransport: OrgNativeWindowTransport = {
 listen: listener => listen<OrgNativeIntentEnvelope>("grain:org-window-intent", event => listener(event.payload)),
 create: (windowId, binding) => invoke("create_org_detached_window", { windowId, binding }),
 post: (label, binding, payload) => invoke("post_org_window_projection", { label, binding, payload }),
 close: (label, binding) => invoke("close_org_detached_window", { label, binding }),
 setMainVisible: visible => invoke("set_org_main_window_visible", { visible }),
 focus: (label, binding, generation, toMain, scope) => invoke("focus_org_detached_window", { label, binding, generation, toMain, rootPath: scope.grant.rootPath, capabilityToken: scope.grant.capabilityToken }),
}
export interface OrgNativeLiveBuffer { readonly bufferId: string; readonly document: OrgDocumentInterface; readonly runtime: OrgBufferRuntime }
export interface OrgNativeWindowPorts {
 readonly getIssuedScope: () => OrgWorkspaceSessionScope | null
 readonly snapshotLiveBuffers: (scope: OrgWorkspaceSessionScope) => readonly OrgNativeLiveBuffer[]
 readonly windowAuthority: OrgWorkspaceSessionWindowAuthority
 readonly isFileReady: (bufferId: string, path: string) => boolean
 readonly activateBuffer: (bufferId: string, targetWindowId?: string) => boolean | Promise<boolean>
 readonly saveBuffer: (bufferId: string) => Promise<boolean>
 readonly onError: (error: Error) => void
 readonly transport?: OrgNativeWindowTransport
}
export interface OrgNativeWindowSnapshot {
 readonly windows: readonly { readonly label: string; readonly windowId: string; readonly bufferId: string; readonly path: string; readonly generation: number; readonly created: boolean; readonly status: "live" | "retired" | "failed" | "closing" }[]
 readonly mainHidden: boolean
}
export interface OrgNativeWindowCoordinator {
 detach(bufferId: string, originWindowId?: string): Promise<string>
 attach(label: string, targetWindowId?: string): Promise<boolean>
 rebind(label: string, bufferId: string): Promise<boolean>
 closeWindow(label: string): Promise<boolean>
 hideMainWithChildren(): Promise<boolean>
 synchronize(): void
 getSnapshot(): OrgNativeWindowSnapshot
 subscribe(listener: () => void): () => void
 dispose(): void
}
interface NativeSlot {
 readonly windowId: string
 readonly label: string
 readonly binding: string
 readonly scope: OrgWorkspaceSessionScope
 bufferId: string
 path: string
 runtime: OrgBufferRuntime
 state: EditorState
 scrollTop: number
 scrollLeft: number
 handle: OrgBufferWindowHandle | null
 release: (() => void) | null
 unsubscribeCommit: (() => void) | null
 unsubscribeRemarks: (() => void) | null
 remarkVersion: number
 commits: number
 generation: number
 sequence: number
 lastRequestId: number
 requestId: number | null
 status: "live" | "retired" | "failed" | "closing"
 ready: boolean
 fileReady: boolean
 fileDirty: boolean
 workflowOwner: object | null
 created: boolean
 creating: boolean
 publication: Promise<boolean>
}
const errorOf = (error: unknown): Error => error instanceof Error ? error : new Error(String(error))

/** Main-only lease coordinator. Its states are genuine runtime projections, not
 * working copies/history engines. Bridge publication cannot unwind a commit. */
export function createOrgNativeWindowCoordinator(ports: OrgNativeWindowPorts): OrgNativeWindowCoordinator {
 const transport = ports.transport ?? orgNativeWindowTransport
 const slots = new Map<string, NativeSlot>()
 const listeners = new Set<() => void>()
 let disposed = false, mainHidden = false
 const workflows = new Map<NativeSlot, { requestId: number; cancel: () => void }>()
 let behaviorConfiguration = useSettings.getState().orgBehaviorConfigurationJson
 let behaviorGeneration = {}
 const releaseConfiguration = useSettings.subscribe(state => {
  if (state.orgBehaviorConfigurationJson !== behaviorConfiguration) {
   behaviorConfiguration = state.orgBehaviorConfigurationJson
   behaviorGeneration = {}
  }
 })
 let snapshot: OrgNativeWindowSnapshot = { windows: [], mainHidden }
 const notify = () => {
  snapshot = Object.freeze({ windows: Object.freeze([...slots.values()].map(slot => Object.freeze({ label: slot.label, windowId: slot.windowId, bufferId: slot.bufferId, path: slot.path, generation: slot.generation, created: slot.created, status: slot.status }))), mainHidden })
  for (const listener of listeners) listener()
 }
 const report = (error: unknown) => { try { ports.onError(errorOf(error)) } catch { /* Observers cannot unwind canonical acceptance. */ } }
 const owns = (slot: NativeSlot) => !disposed && slot.status === "live" && slots.get(slot.label) === slot && ports.getIssuedScope() === slot.scope &&
  ports.windowAuthority.runtimes.get(ports.windowAuthority.key(slot.bufferId, slot.scope)) === slot.runtime && !slot.runtime.closed &&
  ports.snapshotLiveBuffers(slot.scope).some(buffer => buffer.bufferId === slot.bufferId && buffer.runtime === slot.runtime && buffer.document.relativePath === slot.path)
 const isFileDirty = (slot: NativeSlot) => ports.snapshotLiveBuffers(slot.scope).find(buffer => buffer.bufferId === slot.bufferId)?.document.content !== slot.runtime.source
 const release = (slot: NativeSlot) => {
  workflows.get(slot)?.cancel(); workflows.delete(slot)
  slot.handle?.detach(); slot.handle = null
  slot.release?.(); slot.release = null
  slot.unsubscribeCommit?.(); slot.unsubscribeCommit = null
  slot.unsubscribeRemarks?.(); slot.unsubscribeRemarks = null
 }
 const post = (slot: NativeSlot, payload: OrgNativeProjection | (() => OrgNativeProjection)): Promise<boolean> => {
  const generation = slot.generation
  slot.publication = slot.publication.then(async () => {
   const projection = typeof payload === "function" ? payload() : payload
   if (slots.get(slot.label) !== slot || generation !== slot.generation ||
    ((!owns(slot) || disposed) && projection.kind !== "retired" && projection.kind !== "rejected" && projection.kind !== "close-request")) return false
   await transport.post(slot.label, slot.binding, projection)
   return true
  }).catch(error => {
   if (slot.status === "live") {
    slot.status = "failed"
    // Fence publication/input immediately; release only after canonical/session
    // observers have left their synchronous mutation boundary.
    queueMicrotask(() => release(slot))
   }
   report(new Error(`Native projection publication failed; canonical accepted state is retained: ${errorOf(error).message}`))
   notify()
   return false
  })
  return slot.publication
 }
 const publishRemarks = (slot: NativeSlot) => {
  if (!slot.ready || !owns(slot)) return
  const snapshot = createOrgRemarkTracker(slot.runtime).getSnapshot()
  if (snapshot.revision !== slot.runtime.revision || snapshot.source !== slot.runtime.source || snapshot.version === slot.remarkVersion) return
  const hasMarks = !snapshot.needsReload && snapshot.marks.length > 0
  // Clear once after the last mark; unmarked input needs no presentation traffic.
  if (!hasMarks && slot.remarkVersion === -1) return
  slot.remarkVersion = hasMarks ? snapshot.version : -1
  post(slot, { kind: "remark-snapshot", binding: slot.binding, generation: slot.generation, revision: snapshot.revision,
   snapshot: { marks: snapshot.marks, needsReload: snapshot.needsReload, dirty: snapshot.dirty, version: snapshot.version } })
 }
 const initial = (slot: NativeSlot) => {
  const folds: { from: number; to: number }[] = []
  foldedRanges(slot.state).between(0, slot.state.doc.length, (from, to) => { folds.push({ from, to }) })
  slot.fileReady = ports.isFileReady(slot.bufferId, slot.path)
  slot.fileDirty = isFileDirty(slot)
  post(slot, { kind: "initial", binding: slot.binding, generation: slot.generation, nextRequestId: slot.lastRequestId + 1, bufferId: slot.bufferId, path: slot.path, filename: `${slot.scope.grant.rootPath.replace(/[\\/]+$/, "")}/${slot.path}`, source: slot.runtime.source, separator: slot.state.lineBreak, revision: slot.runtime.revision, sequence: slot.sequence, selection: encodeOrgNativeSelection(slot.state.selection), folds, scrollTop: slot.scrollTop, scrollLeft: slot.scrollLeft, readOnly: !slot.fileReady, isDirty: slot.fileDirty })
  slot.remarkVersion = -1
  publishRemarks(slot)
 }
 const attachProjection = (slot: NativeSlot) => {
  slot.release = ports.windowAuthority.registerWindow(slot.scope, slot.windowId, slot.bufferId)
  slot.unsubscribeCommit = slot.runtime.subscribeCommits(() => { slot.commits++ })
  slot.handle = slot.runtime.attachWindow({ windowId: slot.windowId, view: {
   get state() { return slot.state },
   update(transactions: readonly Transaction[]) {
    const encoded = transactions.map(transaction => encodeOrgNativeTransaction(transaction, () => isOrgRuntimeProjection(transaction)))
    slot.state = transactions.at(-1)?.state ?? slot.state
    const fileReady = ports.isFileReady(slot.bufferId, slot.path)
    const fileDirty = isFileDirty(slot)
    const readinessChanged = slot.fileReady !== fileReady || slot.fileDirty !== fileDirty
    slot.fileReady = fileReady; slot.fileDirty = fileDirty
    // Peer cursor/configuration projections still advance the parent view state,
    // but cannot invalidate native input when nothing on its wire changed.
    if (slot.requestId === null && transactions.every((transaction, index) =>
     transaction.changes.empty && transaction.startState.selection === transaction.state.selection &&
     transaction.startState.lineBreak === transaction.state.lineBreak && !transaction.scrollIntoView && encoded[index].effects.length === 0)) {
     if (slot.ready && readinessChanged) post(slot, { kind: "readiness", binding: slot.binding, generation: slot.generation, readOnly: !fileReady, isDirty: fileDirty })
     return
    }
    slot.sequence++
    if (slot.ready) post(slot, { kind: "update", binding: slot.binding, generation: slot.generation, revision: slot.runtime.revision, sequence: slot.sequence, requestId: slot.requestId, separator: slot.state.lineBreak, transactions: encoded, readOnly: !fileReady, isDirty: fileDirty })
   },
  } })
  slot.unsubscribeRemarks = createOrgRemarkTracker(slot.runtime).subscribe(() => publishRemarks(slot))
 }
 const bindBuffer = (slot: NativeSlot, buffer: OrgNativeLiveBuffer) => {
  release(slot)
  slot.generation++; slot.sequence = 0; slot.bufferId = buffer.bufferId; slot.path = buffer.document.relativePath; slot.runtime = buffer.runtime
  slot.state = EditorState.create({ doc: buffer.runtime.state.doc, extensions: [buffer.runtime.historyFreeSourceExtensions, foldState], selection: buffer.runtime.state.selection })
  slot.scrollTop = 0; slot.scrollLeft = 0
  attachProjection(slot)
 }
 const revealIfLast = async () => {
  if (mainHidden && ![...slots.values()].some(slot => slot.created)) { await transport.setMainVisible(true); mainHidden = false; notify() }
 }
 const reject = (slot: NativeSlot, requestId: number | null, message: string, accepted = false) => {
  post(slot, { kind: "rejected", binding: slot.binding, generation: slot.generation, requestId, message, accepted })
  report(new Error(message))
 }
 const destroy = async (slot: NativeSlot) => {
  slot.status = "closing"; notify()
  try {
   if (slots.size === 1 && mainHidden) { await transport.setMainVisible(true); mainHidden = false }
   release(slot)
   await transport.close(slot.label, slot.binding); notify()
  }
  catch (error) { slot.status = "failed"; reject(slot, null, `Window close failed: ${errorOf(error).message}`); notify(); throw error }
 }
 const receive = (envelope: OrgNativeIntentEnvelope) => {
  const slot = slots.get(envelope.label)
  if (!slot || envelope.windowId !== slot.windowId || envelope.binding !== slot.binding || !isOrgNativeIntent(envelope.payload)) return
  const intent = envelope.payload
  if (intent.kind === "window-destroyed") {
   if (envelope.requestId !== 0) return
   release(slot); slots.delete(slot.label); notify()
   if (disposed && ![...slots.values()].some(candidate => candidate.created || candidate.creating)) { unlisten?.(); unlisten = undefined }
   void revealIfLast().catch(report); return
  }
  if (intent.kind === "close-window") {
   if (envelope.requestId === 0) void coordinator.closeWindow(slot.label).catch(report)
   else if (intent.generation === slot.generation && Number.isSafeInteger(envelope.requestId) && envelope.requestId > slot.lastRequestId) {
    slot.lastRequestId = envelope.requestId
    void destroy(slot).catch(report)
   } else reject(slot, envelope.requestId, "Stale native close request cannot close a rebound view")
   return
  }
  if (intent.kind === "ready") {
   slot.created = true
   if (!owns(slot)) { reject(slot, envelope.requestId, "Native window lease has retired"); return }
   slot.lastRequestId = Math.max(slot.lastRequestId, envelope.requestId)
   slot.ready = true; initial(slot); return
  }
  if (!Number.isSafeInteger(envelope.requestId) || envelope.requestId <= slot.lastRequestId) { reject(slot, envelope.requestId, "Stale native window request identity"); return }
  if (intent.generation !== slot.generation) { reject(slot, envelope.requestId, "Native window generation has rebound; old input cannot modify its new owner"); return }
  slot.lastRequestId = envelope.requestId
  if (!owns(slot)) { reject(slot, envelope.requestId, "Native window ownership has retired; unaccepted input remains in this window"); return }
  if (intent.kind === "workflow-cancel") {
   const workflow = workflows.get(slot)
   if (workflow?.requestId === intent.workflowRequestId) { workflow.cancel(); workflows.delete(slot); notify() }
   return
  }
  if (intent.kind === "attach") { void coordinator.attach(slot.label).catch(report); return }
  if (intent.kind !== "transactions" && intent.kind !== "workflow" && intent.kind !== "clock-context" && !ports.isFileReady(slot.bufferId, slot.path)) { reject(slot, envelope.requestId, "This file cannot currently accept canonical Source edits"); return }
  if (intent.generation !== slot.generation || intent.revision !== slot.runtime.revision || intent.sequence !== slot.sequence) {
   if (intent.kind === "workflow") {
    post(slot, { kind: "workflow-result", binding: slot.binding, generation: intent.generation, requestId: envelope.requestId, result: "rejected", message: "The captured native Source baseline changed before invocation" })
    post(slot, { kind: "workflow-return", binding: slot.binding, generation: intent.generation, requestId: envelope.requestId })
   }
   else if (intent.kind === "clock-context") post(slot, { kind: "clock-context", binding: slot.binding, generation: intent.generation, requestId: envelope.requestId, includeClockingTask: true, activeClock: null, error: "The native clock Source baseline changed" })
   else reject(slot, envelope.requestId, "Native Source baseline changed; unaccepted input is retained, not replayed")
   return
  }
  if (intent.kind === "clock-context") {
   const generation = slot.generation, runtime = slot.runtime, source = runtime.source
   const filename = `${slot.scope.grant.rootPath.replace(/[\\/]+$/, "")}/${slot.path}`
   try {
    const clock = readOrgNativeClockCapture(source, filename)
    post(slot, () => {
     const current = owns(slot) && slot.generation === generation && slot.runtime === runtime && runtime.source === source &&
      runtime.revision === intent.revision && slot.sequence === intent.sequence && clock.isCurrent()
     return { kind: "clock-context", binding: slot.binding, generation, requestId: envelope.requestId,
      includeClockingTask: true, activeClock: current ? clock.activeClock : null, error: current ? null : "The root clock identity or captured native Source retired before publication" }
    })
   } catch (cause) {
    post(slot, { kind: "clock-context", binding: slot.binding, generation, requestId: envelope.requestId, includeClockingTask: true, activeClock: null, error: errorOf(cause).message })
   }
   return
  }
  if (intent.kind === "workflow") {
   const configuration = getOrgInputConfiguration()
   const capture = intent.capture
   const result = (outcome: "success" | "rejected" | "cancelled", message: string) => post(slot, {
    kind: "workflow-result", binding: slot.binding, generation: intent.generation, requestId: envelope.requestId, result: outcome, message,
   })
   if (workflows.has(slot) || capture.inputConfiguration !== configuration.raw || capture.behaviorConfiguration !== behaviorConfiguration ||
    !decodeOrgNativeSelection(capture.selection).eq(slot.state.selection, true) ||
    capture.selection.ranges.some((range, index) => range.bidiLevel !== slot.state.selection.ranges[index].bidiLevel ||
     range.goalColumn !== (slot.state.selection.ranges[index].goalColumn ?? null) || range.undirectional !== slot.state.selection.ranges[index].undirectional) ||
    (capture.linkPosition !== undefined && (intent.command !== "link" || !orgLinkTargetAt(slot.runtime.source, capture.linkPosition, slot.path) ||
     !capture.visibleRanges.some(range => capture.linkPosition! >= range.from && capture.linkPosition! < range.to))) ||
    capture.folds.some(range => range.to > slot.state.doc.length) ||
    capture.visibleRanges.some((range, index) => range.to > slot.runtime.source.length || (index > 0 && range.from < capture.visibleRanges[index - 1].to))) {
    void result("rejected", "The native workflow capture is invalid, changed, or already owns a workflow")
    post(slot, { kind: "workflow-return", binding: slot.binding, generation: intent.generation, requestId: envelope.requestId })
    return
   }
   const generation = slot.generation, runtime = slot.runtime, handle = slot.handle
   const revision = runtime.revision, source = runtime.source, ownership = {}
   const configuredBehavior = behaviorGeneration
   let cancelled = false, completed = false, returned = false
   slot.workflowOwner = ownership
   const ownsCapture = () => owns(slot) && slot.workflowOwner === ownership && slot.generation === generation && slot.runtime === runtime && slot.handle === handle &&
    getOrgInputConfiguration().generation === configuration.generation && behaviorGeneration === configuredBehavior
   const isLive = () => !cancelled && !returned && ownsCapture()
   const isCurrent = () => isLive() && runtime.revision === revision && runtime.source === source
   let capturedSelection = slot.state.selection
   const releaseSelection = runtime.subscribeCommits(receipt => {
    for (const transaction of receipt.transactions) capturedSelection = capturedSelection.map(transaction.changes)
   })
   slot.scrollTop = capture.scrollTop; slot.scrollLeft = capture.scrollLeft
   const restore = () => {
    if (!isLive()) return false
    returned = true
    workflows.delete(slot)
    releaseSelection()
    if (!slot.state.selection.eq(capturedSelection, true)) handle?.dispatchTransactions([slot.state.update({ selection: capturedSelection })])
    void post(slot, { kind: "workflow-return", binding: slot.binding, generation, requestId: envelope.requestId }).then(async delivered => {
     if (delivered && !cancelled && ownsCapture()) await transport.focus?.(slot.label, slot.binding, generation, false, slot.scope)
    }).catch(report)
    return true
   }
   const target = createOrgNativeWorkflowTarget({ runtime, path: slot.path, windowId: slot.windowId, ownership,
    state: () => slot.state, handle: () => slot.handle, isLive,
    isWritable: () => isLive() && ports.isFileReady(slot.bufferId, slot.path), restore, visibleRanges: capture.visibleRanges, commandCursor: capture.linkPosition })
   const request: OrgNativeWorkflowRequest = {
    id: intent.command, target, bufferId: slot.bufferId, windowId: slot.windowId, path: slot.path,
    isLive, isCurrent, origin: { isLive, restore: () => { restore() } },
    navigate: async (bufferId, line) => {
     if (!isLive() || !Number.isSafeInteger(line) || line < 1) return false
     const destination = ports.snapshotLiveBuffers(slot.scope).find(buffer => buffer.bufferId === bufferId)
     if (!destination || line > destination.runtime.state.doc.lines || !ports.isFileReady(bufferId, destination.document.relativePath)) return false
     const destinationRuntime = destination.runtime, destinationRevision = destination.runtime.revision
     await listening
     if (!isCurrent() || destination.runtime.closed || destination.runtime.revision !== destinationRevision ||
      !ports.snapshotLiveBuffers(slot.scope).some(buffer => buffer.bufferId === bufferId && buffer.runtime === destinationRuntime) ||
      !ports.isFileReady(bufferId, destination.document.relativePath)) return false
     const rebound = bufferId !== slot.bufferId
     if (rebound) { slot.ready = false; bindBuffer(slot, destination) }
     const navigatedGeneration = slot.generation
     const position = slot.state.doc.line(line).from
     // Acknowledge the accepted navigation before retiring the child's old projection.
     // It has no unaccepted Source draft to retain merely because a workflow was open.
     let navigationAccepted = false
     post(slot, () => ({ kind: "workflow-result", binding: slot.binding, generation, requestId: envelope.requestId,
      result: navigationAccepted ? "success" : "rejected", message: navigationAccepted ? "Opened the captured link in its native Source" : "The native navigation was not accepted" }))
     if (rebound) { slot.ready = true; initial(slot); notify() }
     slot.handle!.dispatchTransactions([slot.state.update({ selection: { anchor: position }, scrollIntoView: true })])
     navigationAccepted = true
     releaseSelection(); workflows.delete(slot)
     returned = true; completed = true
     post(slot, { kind: "workflow-return", binding: slot.binding, generation: navigatedGeneration, requestId: envelope.requestId, restorePresentation: false })
     await slot.publication
     if (owns(slot) && slot.generation === navigatedGeneration && slot.runtime === destinationRuntime && slot.workflowOwner === ownership &&
      getOrgInputConfiguration().generation === configuration.generation && behaviorGeneration === configuredBehavior) await transport.focus?.(slot.label, slot.binding, navigatedGeneration, false, slot.scope)
     return owns(slot) && slot.generation === navigatedGeneration && slot.runtime === destinationRuntime
    },
    complete: async accepted => {
     if (completed) return
     completed = true
     if (!isLive()) {
      releaseSelection()
      if (workflows.get(slot)?.requestId === envelope.requestId) workflows.delete(slot)
      if (owns(slot) && slot.generation === generation) await result("rejected", "The original native workflow lease or configuration retired")
      return
     }
     await result(accepted.kind, accepted.message ?? "")
     if (accepted.kind !== "success") restore()
    },
   }
   workflows.set(slot, { requestId: envelope.requestId, cancel: () => { cancelled = true; releaseSelection() } })
   const begin = async () => {
    await slot.publication
    if (isCurrent()) await transport.focus?.(slot.label, slot.binding, generation, true, slot.scope)
    if (!dispatchOrgNativeWorkflow(request)) {
     workflows.delete(slot)
     await request.complete({ kind: "rejected", message: "The root workspace workflow consumer is unavailable" })
    }
   }
   void begin().catch(cause => request.complete({ kind: "rejected", message: errorOf(cause).message }))
   return
  }
  if (intent.kind === "save") {
   const generation = slot.generation, runtime = slot.runtime, bufferId = slot.bufferId
   const save = async () => {
    try {
     const success = await ports.saveBuffer(bufferId)
     if (!owns(slot) || slot.generation !== generation || slot.runtime !== runtime || slot.bufferId !== bufferId) return
     post(slot, { kind: "save-result", binding: slot.binding, generation, requestId: envelope.requestId, success, message: success ? "Canonical logical buffer saved" : "Save rejected; canonical source/history are retained" })
    } catch (error) {
     if (!owns(slot) || slot.generation !== generation || slot.runtime !== runtime) return
     post(slot, { kind: "save-result", binding: slot.binding, generation, requestId: envelope.requestId, success: false, message: errorOf(error).message })
     report(error)
    }
   }
   void save()
   return
  }
  slot.requestId = envelope.requestId
  const previousSequence = slot.sequence
  const previousCommits = slot.commits
  let historyApplied: boolean | null = null
  try {
   if (intent.kind === "transactions") {
    let state = slot.state
    const transactions = intent.transactions.map(encoded => { const transaction = decodeOrgNativeTransaction(state, encoded); state = transaction.state; return transaction })
    if (transactions.some(transaction => transaction.docChanged) && !ports.isFileReady(slot.bufferId, slot.path)) throw new Error("This file cannot currently accept canonical Source edits")
    if (!slot.handle) throw new Error("Native canonical window handle has retired")
    slot.handle.dispatchTransactions(transactions)
   } else if (intent.kind === "undo") historyApplied = slot.handle?.undo() ?? null
   else historyApplied = slot.handle?.redo() ?? null
   if (slot.sequence === previousSequence) {
    if (slot.commits !== previousCommits) reject(slot, envelope.requestId, "Canonical input accepted, but its window projection failed; accepted state is retained", true)
    else if (intent.kind === "transactions" && intent.transactions.length === 0) post(slot, { kind: "accepted", binding: slot.binding, generation: slot.generation, revision: slot.runtime.revision, sequence: slot.sequence, requestId: envelope.requestId, outcome: "empty" })
    else if (historyApplied === false) post(slot, { kind: "accepted", binding: slot.binding, generation: slot.generation, revision: slot.runtime.revision, sequence: slot.sequence, requestId: envelope.requestId, outcome: "history-noop" })
    else reject(slot, envelope.requestId, "Canonical runtime did not project this request; native input remains unaccepted")
   }
  } catch (error) { reject(slot, envelope.requestId, errorOf(error).message, slot.commits !== previousCommits) }
  finally { slot.requestId = null }
 }
 let unlisten: (() => void) | undefined
 const listening = transport.listen(receive).then(remove => {
  if (disposed && ![...slots.values()].some(slot => slot.created || slot.creating)) remove()
  else unlisten = remove
 })
 // Preserve listener failure as a real failed prerequisite, not a browser fallback.
 void listening.catch(report)
 const coordinator: OrgNativeWindowCoordinator = {
  async detach(bufferId, originWindowId) {
   await listening
   const scope = ports.getIssuedScope()
   if (!scope || disposed) throw new Error("No live issued workspace scope")
   const buffer = ports.snapshotLiveBuffers(scope).find(buffer => buffer.bufferId === bufferId)
   if (!buffer || !ports.isFileReady(bufferId, buffer.document.relativePath)) throw new Error("Buffer is not ready for a native projection")
   const windowId = `native-${crypto.randomUUID()}`, binding = crypto.randomUUID()
   const origin = originWindowId ? buffer.runtime.captureWindowProjection(originWindowId) : null
   if (originWindowId && !origin) throw new Error("Detach origin window is no longer registered to this canonical buffer")
   const folds: { from: number; to: number }[] = []
   if (origin) foldedRanges(origin.state).between(0, origin.state.doc.length, (from, to) => { folds.push({ from, to }) })
   const slot: NativeSlot = { windowId, label: `org-detached-${windowId}`, binding, scope, bufferId, path: buffer.document.relativePath, runtime: buffer.runtime,
    state: EditorState.create({ doc: buffer.runtime.state.doc, extensions: [buffer.runtime.historyFreeSourceExtensions, foldState], selection: origin?.state.selection ?? buffer.runtime.state.selection }).update({ effects: folds.map(range => foldEffect.of(range)) }).state,
    scrollTop: origin?.scrollTop ?? 0, scrollLeft: origin?.scrollLeft ?? 0,
    handle: null, release: null, unsubscribeCommit: null, unsubscribeRemarks: null, remarkVersion: -1, commits: 0, generation: 1, sequence: 0, lastRequestId: 0, requestId: null, status: "live", ready: false, fileReady: ports.isFileReady(bufferId, buffer.document.relativePath), fileDirty: buffer.runtime.source !== buffer.document.content, workflowOwner: null, created: false, creating: false, publication: Promise.resolve(true) }
   slots.set(slot.label, slot)
   try {
    attachProjection(slot)
    if (!owns(slot)) throw new Error("Native detach scope retired before window creation")
    slot.creating = true
    await transport.create(windowId, binding)
    slot.creating = false; slot.created = true
    if (!owns(slot)) {
     slot.status = "retired"
     post(slot, { kind: "retired", binding: slot.binding, generation: slot.generation, requestId: null, message: "Native creation completed after owner retirement; this view has no canonical editing authority", accepted: false })
     queueMicrotask(() => release(slot))
     notify(); return slot.label
    }
    notify(); return slot.label
   } catch (error) {
    const creationWasIssued = slot.creating
    slot.creating = false
    release(slot)
    if (slot.created || slot.ready) {
     slot.status = "retired"
     post(slot, { kind: "retired", binding: slot.binding, generation: slot.generation, requestId: null, message: "Native creation failed after a child became visible; retain/copy any input before explicitly closing it", accepted: false })
    } else {
     slots.delete(slot.label)
     if (creationWasIssued) await transport.close(slot.label, binding).catch(report)
    }
    notify()
    if (disposed && ![...slots.values()].some(candidate => candidate.created || candidate.creating)) { unlisten?.(); unlisten = undefined }
    await revealIfLast()
    throw error
   }
  },
  async attach(label, targetWindowId) {
   const slot = slots.get(label)
   if (!slot || !owns(slot)) return false
   const generation = slot.generation
   if (!await ports.activateBuffer(slot.bufferId, targetWindowId) || !owns(slot) || slot.generation !== generation) return false
   await transport.setMainVisible(true); mainHidden = false; notify()
   if (!owns(slot) || slot.generation !== generation) return false
   return coordinator.closeWindow(label)
  },
  async rebind(label, bufferId) {
   const slot = slots.get(label)
   const generation = slot?.generation
   await listening
   if (!slot || !owns(slot) || slot.generation !== generation) return false
   const buffer = ports.snapshotLiveBuffers(slot.scope).find(buffer => buffer.bufferId === bufferId)
   if (!buffer || !ports.isFileReady(bufferId, buffer.document.relativePath)) return false
   bindBuffer(slot, buffer)
   if (slot.ready) initial(slot)
   notify(); return true
  },
  async closeWindow(label) {
   const slot = slots.get(label)
   if (!slot || !slot.created) return false
   return await post(slot, { kind: "close-request", binding: slot.binding, generation: slot.generation })
  },
  async hideMainWithChildren() {
   if (![...slots.values()].some(slot => slot.created)) return false
   await transport.setMainVisible(false); mainHidden = true; notify()
   // A child can disappear while native hide is pending.
   await revealIfLast()
   return true
  },
  synchronize() {
   for (const slot of slots.values()) if (slot.status === "live" && !owns(slot)) {
    slot.status = "retired"
    post(slot, { kind: "retired", binding: slot.binding, generation: slot.generation, requestId: null, message: "Workspace/window lease retired; unaccepted input is retained locally", accepted: false })
    // The synchronous fence above applies immediately. Session observers must
    // finish before registration authority is released.
    queueMicrotask(() => release(slot))
   }
   for (const slot of slots.values()) if (owns(slot)) {
    const ready = ports.isFileReady(slot.bufferId, slot.path)
    const dirty = isFileDirty(slot)
    if (slot.fileReady !== ready || slot.fileDirty !== dirty) {
     slot.fileReady = ready; slot.fileDirty = dirty
     if (slot.ready) post(slot, { kind: "readiness", binding: slot.binding, generation: slot.generation, readOnly: !ready, isDirty: dirty })
    }
   }
   notify()
  },
  getSnapshot: () => snapshot,
  subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
  dispose() {
   if (disposed) return
   disposed = true
   releaseConfiguration()
   for (const workflow of workflows.values()) workflow.cancel()
   workflows.clear()
   for (const slot of slots.values()) {
    slot.status = "retired"
    if (slot.created || slot.ready || slot.creating) {
     if (slot.ready) slot.created = true
     if (slot.created) post(slot, { kind: "retired", binding: slot.binding, generation: slot.generation, requestId: null, message: "Canonical owner retired; native input is retained. Close only after pending input is acknowledged or explicitly copied/discarded.", accepted: false })
     queueMicrotask(() => release(slot))
    } else {
     slots.delete(slot.label)
     queueMicrotask(() => release(slot))
    }
   }
   notify(); listeners.clear()
   if (![...slots.values()].some(slot => slot.created || slot.creating)) { unlisten?.(); unlisten = undefined }
   if (mainHidden) void transport.setMainVisible(true).catch(report)
  },
 }
 return coordinator
}
