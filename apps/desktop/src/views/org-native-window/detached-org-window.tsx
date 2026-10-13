import { ApplicationToolProvider } from "@/views/application/application-tool-provider"
import { invoke } from "@tauri-apps/api/core"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useOrgSourceParameters } from "@/hooks/use-org-source-parameters"
import { createOrgNativeChildProjection, type OrgNativeChildProjection } from "@/flows/org-native-window/org-native-editor-projection"
import { orgNativeWorkflowCommandIds, type DetachedOrgWindowBootstrap, type OrgNativeProjection, type OrgNativeWorkflowCommandId } from "@/flows/org-native-window/org-native-window-protocol"
import { deriveOrgCommands, getOrgCommandDisabledReason, getOrgParameterCommand } from "@/flows/org-command/org-workspace-command"
import { ApplicationCommandProvider, useApplicationCommandHost, useApplicationCommandRegistration, useApplicationParameterRegistration, type ApplicationCommandDescriptor } from "@/views/application/application-command-provider"
import { OrgEditor } from "@/views/org-editor/org-editor.view.fn"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import type { OrgTodoNoteRequest } from "@/flows/org-command/org-todo-note"
import { OrgTodoNote } from "@/views/org-editor/org-todo-note.view.fn"
import { ConfirmProvider, useConfirm } from "@/views/ui/confirm"
import * as E from "fp-ts/Either"
import { useSettings } from "@/hooks/use-settings"
import { parseOrgBehaviorConfiguration } from "@/pipes/org/org-behavior-configuration.pipe"
import type { OrgMinibufferAcceptResult } from "@/types/editor/minibuffer.interface"

export function readDetachedOrgWindowBootstrap(search = window.location.search): DetachedOrgWindowBootstrap | null {
 const parameters = new URLSearchParams(search)
 if (!parameters.has("orgWindow") && !parameters.has("binding")) return null
 const windowId = parameters.get("orgWindow"), binding = parameters.get("binding")
 if (!windowId || !binding || !/^[A-Za-z0-9_-]{1,96}$/.test(windowId) || !/^[A-Za-z0-9_-]{16,128}$/.test(binding) || parameters.getAll("orgWindow").length !== 1 || parameters.getAll("binding").length !== 1) throw new Error("Invalid detached native window identity")
 return { windowId, binding }
}
interface ChildSession { readonly initial: Extract<OrgNativeProjection, { kind: "initial" }>; readonly projection: OrgNativeChildProjection }
function RetainedSource({ source, label }: { readonly source: string; readonly label: string }) {
 const [copyStatus, setCopyStatus] = useState<string | null>(null)
 const copy = async () => {
  try {
   if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable")
   await navigator.clipboard.writeText(source)
   setCopyStatus("Exact retained Source copied.")
  } catch {
   setCopyStatus("Clipboard access failed. Retained Source remains selectable below.")
  }
 }
 return <>
  <pre tabIndex={0} aria-label={label} className="h-28 w-full select-text overflow-auto whitespace-pre font-mono">{source}</pre>
  <button type="button" onClick={() => { void copy() }}>Copy retained Source</button>
  {copyStatus && <p role="status">{copyStatus}</p>}
 </>
}
function DetachedSource({ bootstrap, session, hasRetainedReboundDrafts, hasLoggingNote, onLoggingNote }: {
 readonly bootstrap: DetachedOrgWindowBootstrap; readonly session: ChildSession
 readonly hasRetainedReboundDrafts: boolean; readonly hasLoggingNote: boolean
 readonly onLoggingNote: (request: OrgTodoNoteRequest, target: OrgEditorCommandTarget, session: ChildSession) => void
}) {
 const { projection, initial } = session
 const status = useSyncExternalStore(projection.subscribe, projection.getSnapshot, projection.getSnapshot)
 const host = useApplicationCommandHost()
 const confirm = useConfirm()
 const confirmationAbort = useRef<AbortController | null>(null)
 if (!confirmationAbort.current) confirmationAbort.current = new AbortController()
 useEffect(() => () => { confirmationAbort.current?.abort() }, [projection])
 const [target, setTarget] = useState<OrgEditorCommandTarget | null>(null)
 const [actionError, setActionError] = useState<string | null>(null)
 const [draftAcknowledged, setDraftAcknowledged] = useState(false)
 const currentTarget = useRef(target); currentTarget.current = target
 const recoveryGate = useRef({ hasRetainedReboundDrafts, draftAcknowledged, hasLoggingNote })
 recoveryGate.current = { hasRetainedReboundDrafts, draftAcknowledged, hasLoggingNote }
 const parameters = useOrgSourceParameters({
  current: projection, scope: [projection, initial.generation, bootstrap.binding, bootstrap.windowId],
  isBusy: status.pending !== 0, suspended: status.error !== null || hasLoggingNote, preserveSelection: true,
  readSource: () => {
   const context = currentTarget.current?.getCommandContext()
   return context?.available ? { relativePath: initial.path, content: context.content, filename: initial.filename, savingOrLoading: false } : null
  },
  subscribeOrigin: projection.subscribe,
  submitSource: async run => (await projection.captureSubmission(run)).kind === "success",
  captureClockContext: (source, filename) => projection.captureClockContext(source, filename),
 }, currentTarget)
 useApplicationParameterRegistration(projection, parameters.session, parameters.result)
 const parameterRef = useRef(parameters); parameterRef.current = parameters
 const context = () => ({
  hasWorkspace: true, hasDocument: true, isDirty: projection.getSnapshot().isDirty, isBusy: projection.getSnapshot().pending !== 0,
  sidebarVisible: false, inspectorVisible: false, editor: currentTarget.current?.getCommandContext(),
  blockedReason: projection.getSnapshot().error ?? (hasLoggingNote ? "Finish or cancel the retained logging note first" : null),
 })
 const commands = useMemo<readonly ApplicationCommandDescriptor[]>(() => deriveOrgCommands(context()).filter(command => command.scope === "editor" || command.id === "save" || orgNativeWorkflowCommandIds.includes(command.id as OrgNativeWorkflowCommandId)).map(command => ({
  id: command.id, label: command.label, shortcut: command.shortcut, group: "Org Source",
  getDisabledReason: () => {
   if (command.id === "save") {
    const snapshot = projection.getSnapshot()
    return snapshot.error ?? (snapshot.readOnly ? "This file's Source is currently read-only" : null)
   }
   return getOrgCommandDisabledReason(command.id, context())
  },
  capture: () => {
   const target = currentTarget.current
   if (orgNativeWorkflowCommandIds.includes(command.id as OrgNativeWorkflowCommandId)) {
    const origin = target?.captureSourceTransform?.()
    const run = projection.captureWorkflow(command.id as OrgNativeWorkflowCommandId, target?.getVisibleSourceRanges?.() ?? [])
    if (!origin || !run) return { kind: "rejected", message: "The native workflow origin is unavailable or awaiting canonical acceptance" }
    return () => {
     if (currentTarget.current !== target || !origin.isCurrent()) return { kind: "rejected", message: "The native workflow origin changed before invocation" }
     return run()
    }
   }
   const parameter = getOrgParameterCommand(command.id, "")
   if (parameter && target) {
    const origin = target.captureSourceTransform?.()
    if (!origin) return { kind: "rejected", message: "Source parameter origin is no longer available" }
    return () => {
     if (currentTarget.current !== target || !origin.isCurrent()) return { kind: "rejected", message: "Source parameter origin changed before invocation" }
     const configuration = parseOrgBehaviorConfiguration(useSettings.getState().orgBehaviorConfigurationJson)
     if (E.isLeft(configuration)) return { kind: "rejected", message: configuration.left.message }
     const configured = getOrgParameterCommand(command.id, "", undefined, configuration.right)
     if (!configured) return { kind: "rejected", message: "Source parameter command is unavailable" }
     const result = parameterRef.current.open(configured, origin.snapshot.cursor)
     const describe = (accepted: OrgMinibufferAcceptResult | void) => accepted
      ? accepted.ok ? { kind: "success" as const, message: "Source command accepted" } : { kind: "rejected" as const, message: accepted.message }
      : { kind: "success" as const, message: "Source parameter opened; no Source change has been submitted" }
     return result instanceof Promise ? result.then(describe) : describe(result)
    }
   }
   const captured = target?.captureCommand(command.id)
   if (!captured) return { kind: "rejected", message: "Source command target is no longer available" }
   if (command.id === "clear-sparse-tree") {
    const origin = target?.captureSourceTransform?.()
    return () => {
     if (!origin?.isCurrent() || currentTarget.current !== target) return { kind: "rejected", message: "Source view origin changed before invocation" }
     parameterRef.current.clearSparseTree()
     return { kind: "success", message: "Sparse tree cleared in this Source window" }
    }
   }
   if (command.scope === "editor" && !command.requires.some(requirement => requirement === "writable")) {
    return async () => await captured() ? { kind: "success", message: "Source window presentation updated" } : { kind: "rejected", message: "Source view command was refused" }
   }
   return async () => await captured() ? { kind: "success", message: "Source command accepted by its canonical owner" } : { kind: "rejected", message: "Source command was not accepted" }
  },
 })), [projection, target, hasLoggingNote])
 useApplicationCommandRegistration(projection, commands)
 const act = (kind: "attach" | "close-window") => {
  if (hasLoggingNote) { setActionError("Finish or explicitly close the logging-note tool before attaching/closing this view"); return }
  if (hasRetainedReboundDrafts) { setActionError("Copy or explicitly discard retained rebound input before attaching/closing this view"); return }
  void projection.requestWindowAction(kind).catch(cause => setActionError(cause instanceof Error ? cause.message : String(cause)))
 }
 const revealMain = () => { void invoke("set_org_main_window_visible", { visible: true, binding: bootstrap.binding }).catch(cause => setActionError(String(cause))) }
 const closeDiscardedDraft = async () => {
  if (recoveryGate.current.hasLoggingNote) { setActionError("Finish or explicitly close the retained logging note before discarding Source input"); return }
  if (recoveryGate.current.hasRetainedReboundDrafts) { setActionError("A rebound draft still belongs to this window; copy/acknowledge it first"); return }
  if (!recoveryGate.current.draftAcknowledged) return
  const snapshot = projection.getSnapshot(), source = projection.retainDraft()
  const signal = confirmationAbort.current!.signal
  if (source === null) return
  const confirmed = await confirm({ title: "Close native Source view?", description: "Discard this view's unaccepted input? The canonical logical buffer and shared history will be retained.", confirmText: "Discard input and close view", cancelText: "Keep input", signal })
  if (!confirmed || signal.aborted || recoveryGate.current.hasRetainedReboundDrafts || !recoveryGate.current.draftAcknowledged || recoveryGate.current.hasLoggingNote) return
  try {
   if (!await projection.discardRetainedAndClose(snapshot, source)) setActionError("This native draft or projection changed while confirmation was open; no view was closed")
  } catch (cause) { setActionError(cause instanceof Error ? cause.message : String(cause)) }
 }
 return <section className="flex h-full min-h-0 flex-col" aria-label="Detached Org Source window">
  <header className="flex shrink-0 items-center gap-3 border-b p-2">
   <strong className="min-w-0 flex-1 truncate">{initial.path}</strong>
   <button type="button" onClick={() => host.open()}>Commands</button>
   <button type="button" onClick={() => act("attach")}>Attach to main</button>
   <button type="button" onClick={() => act("close-window")}>Close view</button>
  </header>
  <p role="status" className="shrink-0 px-2 text-sm">{status.acceptedProjectionFailure ? "Canonical input was accepted; projection failed. Later unaccepted input remains local." : status.error ? "Canonical publication paused; unaccepted input remains in this window" : status.pending ? `${status.pending} native input request(s) awaiting canonical acceptance` : `Canonical revision ${status.acceptedRevision}; shared undo/redo, independent window presentation`}</p>
  {status.message && <p role="status" className="shrink-0 px-2 text-sm">{status.message}</p>}
  {status.error && <p role="alert" className="shrink-0 px-2 text-red-600">{status.error}</p>}
  {actionError && <p role="alert" className="shrink-0 px-2 text-red-600">{actionError}</p>}
  <div className="min-h-0 flex-1"><OrgEditor nativeProjection={projection} value={initial.source} windowId={bootstrap.windowId} documentPath={initial.path} documentFilename={initial.filename} ariaLabel="Detached Org Source editor" captureClockContext={(source, filename) => projection.captureClockContext(source, filename)} onCommandTarget={setTarget} onOpenOrgLink={(_link, sourcePosition) => {
   const run = projection.captureWorkflow("link", currentTarget.current?.getVisibleSourceRanges?.() ?? [], sourcePosition)
   if (!run) { setActionError("The clicked native link origin is unavailable or awaiting canonical acceptance"); return }
   void run().then(result => { if (result.kind === "rejected") setActionError(result.message) })
  }} onOpenFileLink={() => { void host.execute("link") }} onRefileSubtree={() => { void host.execute("refile") }} onArchiveSubtree={() => { void host.execute("archive") }} onTodoNoteRequest={request => {
   const origin = currentTarget.current
   if (!origin || hasLoggingNote) { request.abort(); return }
   onLoggingNote(request, origin, session)
  }} onInputCommand={(id) => {
   if (id === "execute-command") return host.open()
   if (!host.registry.getSnapshot().commands.some(command => command.id === id)) return false
   void host.execute(id)
   return true
  }} onCommand={(id) => { void host.execute(id); return true }} captureSave={() => {
   if (projection.getSnapshot().readOnly || projection.getSnapshot().error) return null
   return async () => (await projection.requestSave()).kind === "success"
  }} onSave={() => { void projection.requestSave() }} readOnly={status.error !== null || status.readOnly} remarkSnapshot={status.remarkSnapshot} /></div>
  {status.retainedSource !== null && <aside className="shrink-0 border-t p-2" aria-label="Retained unaccepted native input">
   <p>Unaccepted input is retained below. No automatic replay or rollback is performed. Copy it before closing this view.</p>
   <RetainedSource source={status.retainedSource} label="Retained Source text" />
   <label><input type="checkbox" checked={draftAcknowledged} onChange={event => setDraftAcknowledged(event.target.checked)} />I copied this input or explicitly choose to discard it</label>
   <button type="button" disabled={!draftAcknowledged} onClick={() => { void closeDiscardedDraft() }}>Discard unaccepted input and close view</button>
  </aside>}
  <button type="button" className="shrink-0 border-t p-1" onClick={revealMain}>Show canonical main window</button>
 </section>
}
function DetachedOrgWindowContent({ bootstrap }: { readonly bootstrap: DetachedOrgWindowBootstrap }) {
 const current = useRef<ChildSession | null>(null)
 const [session, setSession] = useState<ChildSession | null>(null)
 const [error, setError] = useState<string | null>(null)
 const [retiredDrafts, setRetiredDrafts] = useState<readonly string[]>([])
 const retainedReboundDraftsRef = useRef<readonly string[]>([])
 const [loggingNote, setLoggingNote] = useState<{ readonly request: OrgTodoNoteRequest; readonly target: OrgEditorCommandTarget; readonly session: ChildSession } | null>(null)
 const loggingNoteRef = useRef(loggingNote); loggingNoteRef.current = loggingNote
 const admitLoggingNote = (request: OrgTodoNoteRequest, target: OrgEditorCommandTarget, origin: ChildSession) => {
  if (loggingNoteRef.current || current.current !== origin || !target.getCommandContext().available) { request.abort(); return }
  const note = { request, target, session: origin }
  loggingNoteRef.current = note
  setLoggingNote(note)
 }
 const confirm = useConfirm()
 const recoveryConfirmation = useRef<AbortController | null>(null)
 const acknowledgeRecovery = async (index: number) => {
  if (recoveryConfirmation.current) return
  const controller = new AbortController()
  recoveryConfirmation.current = controller
  const drafts = retainedReboundDraftsRef.current, projection = current.current
  try {
   const approved = await confirm({ title: "Remove retained rebound input?", description: "Confirm that you copied this retained Source input or explicitly choose to discard it. It will not be replayed into another buffer.", confirmText: "Remove recovery copy", cancelText: "Keep input", signal: controller.signal })
   if (!approved || controller.signal.aborted || current.current !== projection || retainedReboundDraftsRef.current !== drafts) return
   retainedReboundDraftsRef.current = drafts.filter((_, draftIndex) => draftIndex !== index)
   setRetiredDrafts(retainedReboundDraftsRef.current); setError(null)
  } finally { if (recoveryConfirmation.current === controller) recoveryConfirmation.current = null }
 }
 const closeUnissuedView = async () => {
  if (current.current || retainedReboundDraftsRef.current.length || recoveryConfirmation.current) return
  const controller = new AbortController()
  recoveryConfirmation.current = controller
  try {
   const approved = await confirm({ title: "Close unbound native view?", description: "No canonical Source projection has been issued to this view. Closing this native window does not close a logical buffer.", confirmText: "Close view", cancelText: "Keep view", signal: controller.signal })
   if (!approved || controller.signal.aborted || current.current || retainedReboundDraftsRef.current.length) return
   await invoke("close_org_detached_window", { label: `org-detached-${bootstrap.windowId}`, binding: bootstrap.binding })
  } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
  finally { if (recoveryConfirmation.current === controller) recoveryConfirmation.current = null }
 }
 useEffect(() => {
  let active = true
  const receive = (event: Event) => {
   if (!(event instanceof CustomEvent)) return
   const payload: OrgNativeProjection = event.detail
   if (!active || payload.binding !== bootstrap.binding) return
   if (payload.kind === "initial") {
    if (current.current?.initial.generation === payload.generation) return
    const previous = current.current
    if (previous && (previous.projection.getSnapshot().pending || previous.projection.getSnapshot().error)) {
     const draft = previous.projection.retainDraft()
     if (draft !== null) {
      retainedReboundDraftsRef.current = [...retainedReboundDraftsRef.current, draft]
      setRetiredDrafts(retainedReboundDraftsRef.current)
     }
    }
    previous?.projection.retire()
    const next = { initial: payload, projection: createOrgNativeChildProjection(bootstrap, payload) }
    current.current = next; setSession(next)
   } else if (payload.kind === "close-request" && (retainedReboundDraftsRef.current.length || loggingNoteRef.current)) {
    setError(loggingNoteRef.current ? "Native window close blocked: finish or explicitly close the retained logging-note tool first" : "Native window close blocked: copy or explicitly discard the retained rebound input first")
   } else if (!current.current && (payload.kind === "retired" || payload.kind === "rejected")) {
    setError(payload.message)
   } else current.current?.projection.receive(payload)
  }
  window.addEventListener("grain:org-window-projection", receive)
  void invoke("post_org_window_intent", { binding: bootstrap.binding, requestId: 1, payload: { kind: "ready" } })
   .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : String(cause)) })
  return () => { active = false; window.removeEventListener("grain:org-window-projection", receive); recoveryConfirmation.current?.abort() }
 }, [bootstrap.binding, bootstrap.windowId])
 return <ApplicationCommandProvider><div className="flex h-full min-h-0 flex-col">
  {error && <p role="alert">{error}</p>}
  {retiredDrafts.map((draft, index) => <details key={`${index}:${draft.length}`} className="shrink-0 border-b p-2"><summary>Retained input from a rebound window (not replayed)</summary><RetainedSource source={draft} label="Retained rebound Source input" /><button type="button" onClick={() => { void acknowledgeRecovery(index) }}>Acknowledge copied/discarded recovery input</button></details>)}
  <div className="min-h-0 flex-1">{session ? <DetachedSource key={session.initial.generation} bootstrap={bootstrap} session={session} hasRetainedReboundDrafts={retiredDrafts.length > 0} hasLoggingNote={loggingNote !== null} onLoggingNote={admitLoggingNote} /> : <p role="status">Waiting for the canonical workspace to issue this window projection…</p>}</div>
  {loggingNote && <OrgTodoNote request={loggingNote.request} closeFence={String(loggingNote.session.initial.generation)}
   origin={{ isLive: () => current.current === loggingNote.session && loggingNote.target.getCommandContext().available,
    restore: () => { if (current.current === loggingNote.session && loggingNote.target.getCommandContext().available) loggingNote.target.restoreFocus() } }}
   onClose={host => {
    if (loggingNoteRef.current !== loggingNote) return
    const ownsFocus = host?.isConnected && host.contains(document.activeElement)
    loggingNoteRef.current = null; setLoggingNote(null); setError(null)
    if (ownsFocus && current.current === loggingNote.session && loggingNote.target.getCommandContext().available) loggingNote.target.restoreFocus()
   }} />}
  {!session && <button type="button" onClick={() => { void closeUnissuedView() }}>Close unbound native view</button>}
 </div></ApplicationCommandProvider>
}

export function DetachedOrgWindow({ bootstrap }: { readonly bootstrap: DetachedOrgWindowBootstrap }) {
 return <ConfirmProvider><ApplicationToolProvider><DetachedOrgWindowContent bootstrap={bootstrap} /></ApplicationToolProvider></ConfirmProvider>
}
