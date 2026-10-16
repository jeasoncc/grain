import { historyField, undoDepth } from "@codemirror/commands"
import { foldEffect, foldedRanges, foldState } from "@codemirror/language"
import { EditorSelection, EditorState, StateEffect, Text, Transaction } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOrgWorkspaceEffectOwner, type OrgWorkspaceEffectOwner } from "@/flows/org-editor-runtime/org-workspace-effect-owner"
import { createOrgWorkspaceSessionOwner } from "@/flows/org-editor-runtime/org-workspace-session-owner"
import { createOrgWindowEffectRegistry, orgSemanticHistory, type OrgBufferWindowHandle } from "@/flows/org-editor-runtime"
import { orgCompositionHistory } from "@/flows/org-editor-runtime/org-composition-history"
import { createOrgModalAdapter } from "@/flows/org-modal/org-modal-adapter"
import type { OrgNativeEditorProjectionHandle } from "./org-native-editor-projection.types"
import { createOrgNativeWindowCoordinator, type OrgNativeWindowTransport } from "./org-native-window-coordinator"
import { createOrgNativeChildProjection, type OrgNativeChildProjection } from "./org-native-editor-projection"
import { encodeOrgNativeSelection, type OrgNativeIntent, type OrgNativeIntentEnvelope, type OrgNativeProjection } from "./org-native-window-protocol"
import { registerOrgNativeClockHandler, registerOrgNativeWorkflowHandler, type OrgNativeWorkflowRequest } from "./org-native-workflow-bridge"
import { useSettings } from "@/hooks/use-settings"
import { createOrgClockOwner } from "@/flows/org-workspace/org-clock-owner"
import type { OrgSparseClockContext } from "@/pipes/org/org-sparse-special-properties.pipe"
import { orgLinkTargetAt } from "@/pipes/org/org-link.pipe"
import { createOrgRemarkTracker } from "@/flows/org-editor-runtime/org-remark-tracker"
import { registerOrgInputCommandMetadata } from "@/flows/org-command/org-input-command-metadata"
import type { OrgCapturedSourceTransform } from "@/views/org-editor/org-editor.types"

class NativeBridge implements OrgNativeWindowTransport {
 listener: ((envelope: OrgNativeIntentEnvelope) => void) | null = null
 readonly windows = new Map<string, { windowId: string; binding: string }>()
 readonly payloads = new Map<string, OrgNativeProjection[]>()
 readonly children = new Map<string, OrgNativeChildProjection>()
 readonly visibility: boolean[] = []
 readonly focusHandoffs: { label: string; generation: number; toMain: boolean }[] = []
 publicationFailure = false
 creationGate: Promise<void> | null = null
 deferDestroy = false
 beforeDelivery: ((label: string, payload: OrgNativeProjection) => void) | null = null
 async listen(listener: (envelope: OrgNativeIntentEnvelope) => void) { this.listener = listener; return () => { this.listener = null } }
 async create(windowId: string, binding: string) { if (this.creationGate) await this.creationGate; const label = `org-detached-${windowId}`; this.windows.set(label, { windowId, binding }); return { windowId, label } }
 async post(label: string, _binding: string, payload: OrgNativeProjection) {
  if (this.publicationFailure) throw new Error("native projection delivery lost")
  this.beforeDelivery?.(label, payload)
  const payloads = this.payloads.get(label) ?? []; payloads.push(payload); this.payloads.set(label, payloads)
  this.children.get(label)?.receive(payload)
 }
 async close(label: string, binding: string) { if (this.deferDestroy) return; this.intent(label, 0, { kind: "window-destroyed" }, binding); this.windows.delete(label) }
 async setMainVisible(visible: boolean) { this.visibility.push(visible) }
 async focus(label: string, _binding: string, generation: number, toMain: boolean) { this.focusHandoffs.push({ label, generation, toMain }) }
 intent(label: string, requestId: number, payload: OrgNativeIntent, binding?: string) {
  const identity = this.windows.get(label)
  if (!identity || !this.listener) throw new Error("Missing native bridge lease")
  this.listener({ label, windowId: identity.windowId, binding: binding ?? identity.binding, requestId, payload })
 }
}
const cleanups: (() => void)[] = []
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup() })
afterEach(() => vi.useRealTimers())
const flush = async () => { for (let turn = 0; turn < 16; turn++) await Promise.resolve() }
interface NativeTestPorts {
 readonly isFileReady?: (bufferId: string, path: string) => boolean
 readonly saveBuffer?: (bufferId: string) => Promise<boolean>
}
const setup = (source = "* A\r\nbody\nLF\r\n* B\r\n", ports: NativeTestPorts = {}) => {
 const onError = vi.fn()
 const effects = createOrgWorkspaceEffectOwner({ emitError: vi.fn() })
 const owner = createOrgWorkspaceSessionOwner({ effects, emitError: vi.fn(), releaseGrant: vi.fn(async () => undefined) })
 owner.setCloseReady(true)
 owner.activateGrant({ rootPath: "/native-test-only", capabilityToken: "native-test-grant", documents: [], directories: [] })
 const scope = owner.scope!
 owner.activateDocument(scope, { relativePath: "a.org", content: source, revision: "a1" }, source)
 const buffer = owner.snapshotLiveBuffers(scope)[0]
 const bridge = new NativeBridge()
 const coordinator = createOrgNativeWindowCoordinator({ getIssuedScope: () => owner.scope, snapshotLiveBuffers: candidate => owner.snapshotLiveBuffers(candidate), windowAuthority: owner, isFileReady: ports.isFileReady ?? (() => true), activateBuffer: id => owner.activateOpenBuffer(scope, id), saveBuffer: ports.saveBuffer ?? (async () => true), onError, transport: bridge })
 cleanups.push(() => owner.dispose(), () => coordinator.dispose())
 return { owner, effects, scope, buffer, bridge, coordinator, onError }
}
const child = async (bridge: NativeBridge, label: string, modal = false, knownLocalEffect?: (effect: StateEffect<unknown>) => boolean) => {
 bridge.intent(label, 1, { kind: "ready" }); await flush()
 const initial = bridge.payloads.get(label)?.filter(payload => payload.kind === "initial").at(-1)
 if (!initial || initial.kind !== "initial") throw new Error("Missing canonical initial projection")
 const identity = bridge.windows.get(label)!
 const projection = createOrgNativeChildProjection(identity, initial, async (id, payload) => { bridge.intent(label, id, payload) }, () => bridge.close(label, identity.binding))
 bridge.children.set(label, projection)
 for (const payload of (bridge.payloads.get(label) ?? []).slice((bridge.payloads.get(label) ?? []).indexOf(initial) + 1)) projection.receive(payload)
 let dispatch: ((transactions: readonly Transaction[]) => void) | undefined
 let attached: OrgNativeEditorProjectionHandle | null = null
 let live = true
 const adapter = modal ? createOrgModalAdapter({
  runtimeScope: {}, isCurrent: () => live && projection.getSnapshot().error === null,
  requestHistory: operation => attached?.requestHistory(operation) ?? false,
  captureSave: () => null, openPrompt: () => null, echo: () => () => undefined, mode: () => undefined,
 }) : null
 const view = new EditorView({ state: EditorState.create({ doc: initial.source,
  extensions: [projection.historyFreeExtensions, foldState, ...(adapter ? [adapter.extensions,
   orgCompositionHistory(() => live && projection.getSnapshot().error === null),
  ] : [])] }), dispatchTransactions: transactions => dispatch?.(transactions) })
 const handle = projection.attach(view, effect => (adapter?.ownsEffect(effect) ?? false) || (knownLocalEffect?.(effect) ?? false), () => true)
 attached = handle; dispatch = handle.dispatchTransactions
 cleanups.push(() => { live = false; adapter?.destroy(); handle.detach(); view.destroy() })
 await flush()
 return { projection, view, handle, initial, adapter }
}

describe("real canonical native window projections", () => {
 it("keeps native reading anchors on canonical edits and undo, and rejects the old buffer's marks after rebind to equal bytes", async () => {
  const source = "* Reading\r\nResearch 😀 note\r\n"
  const { owner, scope, coordinator, bridge, buffer } = setup(source)
  const tracker = createOrgRemarkTracker(buffer.runtime)
  const from = source.indexOf("Research"), text = "Research 😀 note"
  expect(tracker.install(source, 0, [{ id: "1234abcd", from, to: from + text.length, label: "important", kind: "range", originalText: text, line: 2 }])).toBe(true)
  const label = await coordinator.detach(buffer.bufferId), a = await child(bridge, label)
  expect(a.projection.getSnapshot().remarkSnapshot?.marks[0].from).toBe(from)
  expect(buffer.runtime.source).toBe(source)
  expect(undoDepth(buffer.runtime.state)).toBe(0)
  a.view.dispatch({ changes: { from: 0, insert: "X" }, userEvent: "input.type" })
  await flush()
  expect(a.projection.getSnapshot().remarkSnapshot?.marks[0].from).toBe(from + 1)
  const undo = a.handle.requestHistory("undo")
  await flush()
  expect(await undo).toBe(true)
  expect(a.projection.getSnapshot().remarkSnapshot?.source).toBe(source)
  expect(a.projection.getSnapshot().remarkSnapshot?.marks[0].from).toBe(from)
  expect(undoDepth(buffer.runtime.state)).toBe(0)
  const oldMarks = bridge.payloads.get(label)!.filter(payload => payload.kind === "remark-snapshot").at(-1)!
  owner.activateDocument(scope, { relativePath: "b.org", content: source, revision: "b1" }, source)
  const b = owner.snapshotLiveBuffers(scope).find(candidate => candidate.document.relativePath === "b.org")!
  expect(await coordinator.rebind(label, b.bufferId)).toBe(true)
  await flush()
  const rebound = await child(bridge, label)
  rebound.projection.receive(oldMarks)
  expect(rebound.projection.getSnapshot().remarkSnapshot).toBeNull()
  expect(rebound.view.state.sliceDoc()).toBe(source)
  expect(undoDepth(b.runtime.state)).toBe(0)
 })
 it("accepts a native captured edit across tool discovery but rejects a real configuration ABA without altering source or history", async () => {
  const source = "* A\r\nbody\0😀\r\n", raw = useSettings.getState().orgKeymapConfigurationJson
  const { coordinator, bridge, buffer } = setup(source)
  const label = await coordinator.detach(buffer.bufferId), a = await child(bridge, label)
  const captured: { transform: OrgCapturedSourceTransform | null; request: OrgNativeWorkflowRequest | null } = { transform: null, request: null }
  const metadataOwner = {}
  cleanups.push(registerOrgNativeWorkflowHandler(request => {
   captured.request = request
   captured.transform = request.target.captureSourceTransform!()
   cleanups.push(registerOrgInputCommandMetadata(metadataOwner, [{ id: "org-agenda.save", label: "Save current Agenda changes" }]))
   void request.complete({ kind: "success" })
  }))
  const open = a.projection.captureWorkflow("agenda", [{ from: 0, to: source.length }])!
  const opened = open(); await flush()
  expect((await opened).kind).toBe("success")
  expect(captured.transform!.isCurrent()).toBe(true)
  const applied = captured.transform!.apply({ changes: [{ from: 0, to: 0, insert: "Accepted " }], cursor: 9 })
  await flush()
  expect(await applied).toBe(true)
  expect(buffer.runtime.source).toBe(`Accepted ${source}`)
  expect(a.view.state.sliceDoc()).toBe(buffer.runtime.source)
  expect(undoDepth(buffer.runtime.state)).toBe(1)
  const undone = a.handle.requestHistory("undo"); await flush()
  expect(await undone).toBe(true)
  expect(buffer.runtime.source).toBe(source)
  await captured.request!.origin.restore(); await flush()
  const reopen = a.projection.captureWorkflow("agenda", [{ from: 0, to: source.length }])!
  const reopened = reopen(); await flush()
  expect((await reopened).kind).toBe("success")
  const old = captured.transform!
  useSettings.setState({ orgKeymapConfigurationJson: raw === "" ? '{"version":1,"modalEngine":"vim"}' : "" })
  useSettings.setState({ orgKeymapConfigurationJson: raw })
  expect(old.isCurrent()).toBe(false)
  expect(await old.apply({ changes: [{ from: 0, to: 0, insert: "Rejected " }], cursor: 9 })).toBe(false)
  expect(buffer.runtime.source).toBe(source)
  expect(a.view.state.sliceDoc()).toBe(source)
  expect(undoDepth(buffer.runtime.state)).toBe(0)
 })
 it("records doc/selection-free native child IME settlement once for Vim dot through the canonical queue", async () => {
  vi.useFakeTimers()
  // Actual CM, modal engine and canonical queue; modeled DOM is not native IME proof.
  const { coordinator, bridge, buffer } = setup("alpha")
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label, true)
  const adapter = a.adapter!
  const key = (value: string) => adapter.modalKey(new KeyboardEvent("keydown", { key: value }))
  key("i"); await flush()
  a.view.contentDOM.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
  a.view.dispatch({ changes: { from: 0, insert: "ni" }, selection: EditorSelection.cursor(2), userEvent: "input.type.compose.start" }); await flush()
  a.view.dispatch({ changes: { from: 0, to: 2, insert: "ni hao" }, selection: EditorSelection.cursor(6), userEvent: "input.type.compose" }); await flush()
  a.view.dispatch({ changes: { from: 0, to: 6, insert: "你好" }, selection: EditorSelection.cursor(2), userEvent: "input.type.compose" }); await flush()
  a.view.contentDOM.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "你好" }))
  await vi.advanceTimersByTimeAsync(50); await flush()
  expect(undoDepth(buffer.runtime.state)).toBe(1)
  key("Escape"); await flush()
  expect(a.view.contentDOM.dataset.modalMode).toBe("normal")
  expect(a.view.state.selection.main.head).toBe(1)
  key("."); await flush()
  expect(buffer.runtime.source).toBe("你你好好alpha")
  expect(a.view.state.sliceDoc()).toBe(buffer.runtime.source)
  expect(a.projection.getSnapshot().error).toBeNull()
  key("u"); await flush(); await adapter.whenIdle()
  expect(buffer.runtime.source).toBe("你好alpha")
  key("u"); await flush(); await adapter.whenIdle()
  expect(buffer.runtime.source).toBe("alpha")
 })
 it("settles selection-free composition through the child queue and canonical coordinator, with atomic undo and neutral cancellation", async () => {
  const { coordinator, bridge, buffer } = setup("Gather")
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label)
  const before = EditorSelection.create([EditorSelection.cursor(0, -1, 2, 17)])
  a.view.dispatch({ selection: before }); await flush()
  const group = "detached-composition"
  const update = (from: number, to: number, insert: string, head: number) => a.view.dispatch({
   changes: { from, to, insert }, selection: EditorSelection.cursor(head),
   annotations: [Transaction.userEvent.of("input.type.compose"),
    orgSemanticHistory.of({ selection: before, group, composition: "update" })],
  })
  update(0, 0, "ni", 2)
  update(0, 2, "ni hao", 6)
  update(0, 6, "你好", 2)
  // No selection/effects/doc change: this must NOT take the local-only branch.
  a.view.dispatch({ annotations: [Transaction.addToHistory.of(false),
   orgSemanticHistory.of({ selection: before, group, composition: "end" })] })
  await flush()
  expect(buffer.runtime.source).toBe("你好Gather")
  expect(undoDepth(buffer.runtime.state)).toBe(1)
  a.view.dispatch({ changes: { from: 2, insert: "Z" }, selection: EditorSelection.cursor(3), userEvent: "input.type" })
  await flush()
  const undoFollowing = a.handle.requestHistory("undo"); await flush()
  expect(await undoFollowing).toBe(true)
  expect(buffer.runtime.source).toBe("你好Gather")
  const undoComposition = a.handle.requestHistory("undo"); await flush()
  expect(await undoComposition).toBe(true)
  expect(buffer.runtime.source).toBe("Gather")
  expect(a.view.state.selection.eq(before, true)).toBe(true)
  a.view.dispatch({ changes: { from: 0, insert: "A" }, selection: EditorSelection.cursor(1), userEvent: "input.type" })
  await flush()
  const priorSelection = a.view.state.selection
  const cancelled = "detached-cancellation"
  a.view.dispatch({ changes: { from: 1, insert: "ni" }, selection: EditorSelection.cursor(3),
   annotations: [Transaction.userEvent.of("input.type.compose.start"), orgSemanticHistory.of({ selection: priorSelection, group: cancelled, composition: "update" })] })
  a.view.dispatch({ changes: { from: 1, to: 3 }, selection: priorSelection,
   annotations: [Transaction.userEvent.of("input.type.compose"), orgSemanticHistory.of({ selection: priorSelection, group: cancelled, composition: "update" })] })
  a.view.dispatch({ annotations: [Transaction.addToHistory.of(false),
   orgSemanticHistory.of({ selection: priorSelection, group: cancelled, composition: "end" })] })
  await flush()
  expect(undoDepth(buffer.runtime.state)).toBe(1)
  const undoPrior = a.handle.requestHistory("undo"); await flush()
  expect(await undoPrior).toBe(true)
  expect(buffer.runtime.source).toBe("Gather")
  expect(a.projection.getSnapshot().error).toBeNull()
 })
 it("captures the native raw multirange Source rather than the active main buffer and applies one real canonical history event", async () => {
  const source = "* Child\r\nastral 😀\0 body\r\n* Other\r\n"
  const { coordinator, bridge, buffer, owner, scope } = setup(source)
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label)
  owner.activateDocument(scope, { relativePath: "main.org", content: "* Foreign Main\r\n", revision: "main1" }, "* Foreign Main\r\n")
  a.view.dispatch({ selection: EditorSelection.create([EditorSelection.range(14, 9, 11, 1, -1), EditorSelection.range(25, 29, 37, 2, 1)], 1) })
  await flush()
  a.view.dispatch({ effects: foldEffect.of({ from: 7, to: 22 }) })
  a.view.scrollDOM.scrollTop = 87; a.view.scrollDOM.scrollLeft = 13
  const before = a.view.state.selection
  let request!: OrgNativeWorkflowRequest
  cleanups.push(registerOrgNativeWorkflowHandler(value => { request = value; return value.complete({ kind: "success" }) }))
  const run = a.projection.captureWorkflow("roam-insert", [{ from: 0, to: source.length }])!
  const acknowledgment = run()
  await flush()
  expect((await acknowledgment).kind).toBe("success")
  expect(request.bufferId).toBe(buffer.bufferId)
  expect(request.target.getCommandContext().content).toBe(source)
  const captured = request.target.captureSourceTransform!()!
  expect(captured.snapshot.selection.mainIndex).toBe(1)
  expect(captured.snapshot.selection.ranges.map(range => [range.anchor, range.head])).toEqual([[15, 10], [27, 31]])
  expect(captured.snapshot.selection.ranges.map(range => [range.assoc, range.bidiLevel, range.goalColumn, range.undirectional])).toEqual(
   before.ranges.map(range => [range.assoc, range.bidiLevel, range.goalColumn, range.undirectional]))
  expect(captured.snapshot.content).toContain("😀\0")
  const insertion = source.indexOf("body")
  expect(await captured.apply({ changes: [{ from: insertion, to: insertion + 4, insert: "[[id:real-node][body]]" }], cursor: insertion })).toBe(true)
  await flush()
  expect(buffer.runtime.source).toContain("[[id:real-node][body]]")
  expect(owner.document?.relativePath).toBe("main.org")
  expect(undoDepth(buffer.runtime.state)).toBe(1)
  request.origin.restore()
  await flush()
  expect(a.view.scrollDOM.scrollTop).toBe(87)
  expect(a.view.scrollDOM.scrollLeft).toBe(13)
  expect(foldedRanges(a.view.state).size).toBe(1)
  expect(a.projection.getSnapshot().error).toBeNull()
  a.handle.requestHistory("undo")
  await flush()
  expect(buffer.runtime.source).toBe(source)
  expect(a.view.state.selection.eq(before, true)).toBe(true)
 })
 it.each(["configuration", "rebind", "grant", "close"] as const)("retires %s workflow callbacks independently without retargeting Source or focus", async retirement => {
  const { coordinator, bridge, buffer, owner, scope } = setup("* Child\r\n")
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label)
  let request!: OrgNativeWorkflowRequest
  cleanups.push(registerOrgNativeWorkflowHandler(value => { request = value; return value.complete({ kind: "success" }) }))
  void a.projection.captureWorkflow("capture", [{ from: 0, to: buffer.runtime.source.length }])!()
  await flush()
  const transform = request.target.captureSourceTransform!()!
  expect(request.isLive()).toBe(true)
  if (retirement === "configuration") {
   const settings = useSettings.getState().orgBehaviorConfigurationJson
   useSettings.setState({ orgBehaviorConfigurationJson: "configuration-ABA" })
   useSettings.setState({ orgBehaviorConfigurationJson: settings })
  } else if (retirement === "rebind") {
   owner.activateDocument(scope, { relativePath: "new.org", content: "* Rebound\r\n", revision: "n1" }, "* Rebound\r\n")
   const rebound = owner.snapshotLiveBuffers(scope).find(entry => entry.document.relativePath === "new.org")!
   expect(await coordinator.rebind(label, rebound.bufferId)).toBe(true)
   await flush()
   expect(rebound.runtime.source).toBe("* Rebound\r\n")
  } else if (retirement === "grant") {
   owner.activateGrant({ rootPath: "/native-test-only", capabilityToken: "replacement-grant", documents: [], directories: [] })
   coordinator.synchronize()
  } else {
   await coordinator.closeWindow(label); await flush()
  }
  expect(request.isLive()).toBe(false)
  expect(request.target.getCommandContext().available).toBe(false)
  expect(await transform.apply({ changes: [{ from: 0, to: 0, insert: "wrong" }], cursor: 0 })).toBe(false)
  const focuses = bridge.focusHandoffs.length
  request.origin.restore(); await flush()
  expect(bridge.focusHandoffs).toHaveLength(focuses)
 })
 it("drains a canonical native workflow acceptance when the child closes before its result returns", async () => {
  const { coordinator, bridge, buffer } = setup("* Child\r\n")
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label)
  let request!: OrgNativeWorkflowRequest
  cleanups.push(registerOrgNativeWorkflowHandler(value => { request = value }))
  void a.projection.captureWorkflow("roam-insert", [{ from: 0, to: buffer.runtime.source.length }])!()
  await flush()
  expect(await request.target.captureSourceTransform!()!.apply({ changes: [{ from: 0, to: 0, insert: "accepted\r\n" }], cursor: 0 })).toBe(true)
  await coordinator.closeWindow(label)
  await flush()
  await request.complete({ kind: "success" })
  request.origin.restore()
  await flush()
  expect(buffer.runtime.source).toBe("accepted\r\n* Child\r\n")
  expect(undoDepth(buffer.runtime.state)).toBe(1)
  expect(buffer.runtime.closed).toBe(false)
  expect(request.isLive()).toBe(false)
  expect(bridge.focusHandoffs.filter(handoff => !handoff.toMain)).toHaveLength(0)
 })
 it("reads root clock ownership for the exact child and rejects a changed Source without guessing an epoch from a retained row", async () => {
  const source = "* Child\r\nCLOCK: [2026-10-10 Sat 10:00]\r\n"
  const { coordinator, bridge, buffer, owner, scope } = setup(source)
  const a = await child(bridge, await coordinator.detach(buffer.bufferId))
  const clockOwner = createOrgClockOwner()
  clockOwner.configure({ scope, rootPath: scope.grant.rootPath,
   isCurrent: () => owner.scope === scope, buffers: () => owner.snapshotLiveBuffers(scope).map(entry => ({ relativePath: entry.document.relativePath, runtime: entry.runtime })),
   available: () => owner.scope === scope,
   commit: (runtime, expected, edits, current) => current() && runtime.applyCommandEdits(expected, edits),
   agenda: async () => ({ kind: "rejected", message: "This native bridge fixture owns no Agenda window" }),
  })
  cleanups.push(registerOrgNativeClockHandler((source, filename) => clockOwner.captureSparseClock(source, filename)))
  const nativeClock: OrgSparseClockContext = { nowEpochMs: 50_400_000, todayStartEpochMs: 0, todayEndEpochMs: 86_400_000,
   localTimeToEpochMs: (year, month, day, hour, minute) => Date.UTC(year, month - 1, day, hour, minute),
   durationFormat: "gnu-default", includeClockingTask: false, activeClock: null }
  owner.activateDocument(scope, { relativePath: "main.org", content: "* Foreign Main\r\n", revision: "main1" }, "* Foreign Main\r\n")
  const clock = await a.projection.captureClockContext(source, a.initial.filename)(nativeClock)
  expect(clock.includeClockingTask).toBe(true)
  expect(clock.activeClock).toBeNull()
  expect(clock.localTimeToEpochMs).toBe(nativeClock.localTimeToEpochMs)
  const stale = a.projection.captureClockContext(source, a.initial.filename)(nativeClock)
  const refused = expect(stale).rejects.toThrow(/retired|changed/)
  a.view.dispatch({ changes: { from: a.view.state.doc.length, insert: "new input\r\n" } })
  await flush()
  await refused
  expect(a.projection.getSnapshot().error).toBeNull()
  expect(buffer.runtime.source).toBe(source + "new input\r\n")
 })
 it("follows an approved canonical target in the originating native window without activating or closing Main", async () => {
  const { coordinator, bridge, buffer, owner, scope } = setup("* Child\r\n")
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label)
  owner.activateDocument(scope, { relativePath: "target.org", content: "* Target\r\nbody\r\n", revision: "target1" }, "* Target\r\nbody\r\n")
  const destination = owner.snapshotLiveBuffers(scope).find(entry => entry.document.relativePath === "target.org")!
  owner.activateDocument(scope, { relativePath: "main.org", content: "* Foreign Main\r\n", revision: "main1" }, "* Foreign Main\r\n")
  let request!: OrgNativeWorkflowRequest
  cleanups.push(registerOrgNativeWorkflowHandler(value => { request = value }))
  const result = a.projection.captureWorkflow("link", [{ from: 0, to: buffer.runtime.source.length }])!()
  await flush()
  const originalGeneration = a.initial.generation
  expect(await request.navigate(destination.bufferId, 2)).toBe(true)
  await flush()
  expect((await result).kind).toBe("success")
  expect(owner.document?.relativePath).toBe("main.org")
  expect(coordinator.getSnapshot().windows.find(window => window.label === label)?.bufferId).toBe(destination.bufferId)
  const initial = bridge.payloads.get(label)!.findLast(payload => payload.kind === "initial")
  expect(initial?.generation).toBe(originalGeneration + 1)
  const reveal = bridge.payloads.get(label)!.findLast(payload => payload.kind === "update" && payload.generation === initial?.generation)
  expect(reveal?.kind).toBe("update")
  if (reveal?.kind !== "update") throw new Error("Missing canonical native target reveal")
  expect(reveal.transactions.some(transaction => transaction.scrollIntoView)).toBe(true)
  const destinationProjection = destination.runtime.captureWindowProjection(bridge.windows.get(label)!.windowId)!
  expect(destinationProjection.state.selection.main.head).toBe(destinationProjection.state.doc.line(2).from)
  expect(undoDepth(destination.runtime.state)).toBe(0)
  expect(request.isLive()).toBe(false)
  const focuses = bridge.focusHandoffs.length
  request.origin.restore(); await flush()
  expect(bridge.focusHandoffs).toHaveLength(focuses)
 })
 it.each([true, false])("captures a clicked link independently of the original cursor and refuses hidden positions (visible=%s)", async visible => {
  const source = "* Child\r\n[[id:wrong][Wrong]] [[id:chosen][Chosen]]\r\n"
  const { coordinator, bridge, buffer } = setup(source)
  const a = await child(bridge, await coordinator.detach(buffer.bufferId))
  const original = a.view.state.selection
  const clicked = source.indexOf("[[id:chosen")
  const invoked: OrgNativeWorkflowRequest[] = []
  cleanups.push(registerOrgNativeWorkflowHandler(async request => {
   invoked.push(request)
   const context = request.target.getCommandContext()
   expect(orgLinkTargetAt(context.content, context.cursor, context.relativePath)).toEqual(orgLinkTargetAt(source, clicked, "a.org"))
   expect(request.target.captureSourceTransform!()!.snapshot.selection.ranges[0].head).toBe(0)
   await request.complete({ kind: "success" })
   request.origin.restore()
  }))
  const result = a.projection.captureWorkflow("link", [{ from: 0, to: visible ? source.length : clicked }], clicked)!()
  await flush()
  expect((await result).kind).toBe(visible ? "success" : "rejected")
  expect(invoked).toHaveLength(visible ? 1 : 0)
  expect(a.view.state.selection.eq(original, true)).toBe(true)
  expect(buffer.runtime.source).toBe(source)
  expect(undoDepth(buffer.runtime.state)).toBe(0)
  expect(a.projection.captureWorkflow("capture", [{ from: 0, to: source.length }])).not.toBeNull()
 })
 it("rejects a Source changed before delayed workflow invocation without freezing accepted peer input or retargeting the producer", async () => {
  const { coordinator, bridge, buffer } = setup("* Child\r\n")
  const a = await child(bridge, await coordinator.detach(buffer.bufferId))
  const peer = await child(bridge, await coordinator.detach(buffer.bufferId))
  const producer = vi.fn()
  cleanups.push(registerOrgNativeWorkflowHandler(producer))
  const result = a.projection.captureWorkflow("capture", [{ from: 0, to: buffer.runtime.source.length }])!()
  peer.view.dispatch({ changes: { from: 0, insert: "peer\r\n" } })
  await flush()
  expect((await result).kind).toBe("rejected")
  expect(producer).not.toHaveBeenCalled()
  expect(buffer.runtime.source).toBe("peer\r\n* Child\r\n")
  expect(a.view.state.sliceDoc()).toBe(buffer.runtime.source)
  expect(peer.view.state.sliceDoc()).toBe(buffer.runtime.source)
  expect(a.projection.getSnapshot().error).toBeNull()
  expect(a.projection.captureWorkflow("capture", [{ from: 0, to: buffer.runtime.source.length }])).not.toBeNull()
 })
 it("restores the surviving native presentation without taking focus from a newer child control", async () => {
  const { coordinator, bridge, buffer } = setup("* Child\r\nbody\r\n")
  const a = await child(bridge, await coordinator.detach(buffer.bufferId))
  a.view.focus()
  const original = a.view.state.selection
  let request!: OrgNativeWorkflowRequest
  cleanups.push(registerOrgNativeWorkflowHandler(value => { request = value; return value.complete({ kind: "success" }) }))
  const result = a.projection.captureWorkflow("capture", [{ from: 0, to: buffer.runtime.source.length }])!()
  await flush()
  expect((await result).kind).toBe("success")
  const foreign = document.createElement("input")
  document.body.append(foreign); foreign.focus()
  cleanups.push(() => foreign.remove())
  request.origin.restore()
  await flush()
  expect(document.activeElement).toBe(foreign)
  expect(a.view.state.selection.eq(original, true)).toBe(true)
  expect(buffer.runtime.source).toBe("* Child\r\nbody\r\n")
 })
 it("accepts native input asynchronously, preserves raw separators and exact peer selection, and shares the real history", async () => {
  const { coordinator, bridge, buffer, owner, scope } = setup()
  const a = await child(bridge, await coordinator.detach(buffer.bufferId))
  const b = await child(bridge, await coordinator.detach(buffer.bufferId))
  expect(a.view.state.field(historyField, false)).toBeUndefined()
  expect(b.view.state.field(historyField, false)).toBeUndefined()
  const peerSelection = EditorSelection.create([EditorSelection.range(8, 2), EditorSelection.range(12, 15)], 1)
  b.view.dispatch({ selection: peerSelection }); await flush()
  const before = a.view.state.selection
  a.view.dispatch({ changes: { from: 0, insert: Text.of(["X\nraw"]) }, selection: EditorSelection.create([EditorSelection.range(7, 1), EditorSelection.range(15, 18)], 1), userEvent: "input.paste" })
  expect(a.projection.getSnapshot().pending).toBe(1)
  expect(buffer.runtime.source).toContain("X\nraw* A\r\n")
  await flush()
  expect(a.projection.getSnapshot().pending).toBe(0)
  expect(b.view.state.selection.mainIndex).toBe(1)
  expect(b.view.state.selection.ranges.map(range => [range.anchor, range.head])).toEqual([[13, 7], [17, 20]])
  expect(undoDepth(buffer.runtime.state)).toBe(1)
  const release = owner.registerWindow(scope, "main-test", buffer.bufferId)
  let mainHandle: OrgBufferWindowHandle
  const main = new EditorView({ state: EditorState.create({ doc: buffer.runtime.state.doc, extensions: buffer.runtime.historyFreeSourceExtensions }), dispatchTransactions: transactions => mainHandle.dispatchTransactions(transactions) })
  mainHandle = buffer.runtime.attachWindow({ windowId: "main-test", view: main })
  cleanups.push(() => { mainHandle.detach(); release(); main.destroy() })
  expect(mainHandle.undo()).toBe(true); await flush()
  expect(a.view.state.selection.eq(before)).toBe(true)
  expect(a.view.state.sliceDoc()).toBe("* A\r\nbody\nLF\r\n* B\r\n")
  b.handle.requestHistory("redo"); await flush()
  expect(a.view.state.sliceDoc()).toBe(buffer.runtime.source)
  expect(a.view.state.selection.mainIndex).toBe(1)
  expect(a.view.state.selection.ranges.map(range => [range.anchor, range.head])).toEqual([[7, 1], [15, 18]])
 })
 it("accepts queued typing when a peer-only cursor update races the preceding native ACK", async () => {
  const source = "* Heading\r\nbody\nraw LF\r\n"
  const { coordinator, bridge, buffer, owner, scope } = setup(source)
  const a = await child(bridge, await coordinator.detach(buffer.bufferId))
  const release = owner.registerWindow(scope, "main-cursor-race", buffer.bufferId)
  let mainHandle: OrgBufferWindowHandle
  const main = new EditorView({ state: EditorState.create({ doc: buffer.runtime.state.doc, extensions: buffer.runtime.historyFreeSourceExtensions }), dispatchTransactions: transactions => mainHandle.dispatchTransactions(transactions) })
  mainHandle = buffer.runtime.attachWindow({ windowId: "main-cursor-race", view: main })
  cleanups.push(() => { mainHandle.detach(); release(); main.destroy() })
  bridge.beforeDelivery = (_label, payload) => {
   if (payload.kind !== "update" || !payload.transactions.some(transaction => transaction.changes.some(part => Array.isArray(part)))) return
   bridge.beforeDelivery = null
   main.dispatch({ selection: { anchor: 2 }, userEvent: "select" })
  }
  a.view.dispatch({ changes: { from: a.view.state.doc.length, insert: "X" }, selection: { anchor: a.view.state.doc.length + 1 }, userEvent: "input.type" })
  a.view.dispatch({ changes: { from: a.view.state.doc.length, insert: "Y" }, selection: { anchor: a.view.state.doc.length + 1 }, userEvent: "input.type" })
  await flush()
  expect(buffer.runtime.source).toBe(source + "XY")
  expect(a.view.state.sliceDoc()).toBe(buffer.runtime.source)
  expect(a.projection.getSnapshot().error).toBeNull()
  expect(a.projection.getSnapshot().pending).toBe(0)
  expect(main.state.selection.main.head).toBe(2)
  expect(mainHandle.undo()).toBe(true)
  await flush()
  expect(buffer.runtime.source).toBe(source + "X")
  expect(a.view.state.sliceDoc()).toBe(source + "X")
  a.handle.requestHistory("undo")
  await flush()
  expect(buffer.runtime.source).toBe(source)
  expect(a.view.state.sliceDoc()).toBe(source)
 })
 it.each(["fold", "scroll", "registered"] as const)("synchronizes exact queued selections paired with a local %s effect before Agenda capture", async presentation => {
  const source = "* A\nbody\n* B\n"
  const { coordinator, bridge, buffer } = setup(source)
  const label = await coordinator.detach(buffer.bufferId)
  const registry = createOrgWindowEffectRegistry([], [EditorView.announce])
  const a = await child(bridge, label, false, registry.knownEffect)
  a.view.dispatch({ selection: { anchor: 4 } }); await flush()
  const localEffect = presentation === "fold" ? foldEffect.of({ from: 3, to: 8 })
   : presentation === "scroll" ? registry.scrollIntoView(1, { y: "center" })
   : registry.localEffect(EditorView.announce.of("Reading selection"))
  const selected = EditorSelection.create([EditorSelection.cursor(1, -1, 2, 17), EditorSelection.range(10, 12, 37, 1, 1)], 1)
  a.view.dispatch({ selection: selected, effects: localEffect })
  // A second optimistic selection differs only in metadata ignored by Selection.eq.
  const exact = EditorSelection.create([EditorSelection.cursor(1, -1, 3, 19), EditorSelection.range(10, 12, 41, 2, 1)], 1)
  a.view.dispatch({ selection: exact, effects: localEffect })
  expect(a.projection.captureWorkflow("agenda", [{ from: 0, to: source.length }])).toBeNull()
  await flush()
  const canonical = buffer.runtime.captureWindowProjection(bridge.windows.get(label)!.windowId)!
  expect(encodeOrgNativeSelection(canonical.state.selection)).toEqual(encodeOrgNativeSelection(exact))
  expect(encodeOrgNativeSelection(a.view.state.selection)).toEqual(encodeOrgNativeSelection(exact))
  expect(foldedRanges(canonical.state).size).toBe(0)
  expect(foldedRanges(a.view.state).size).toBe(presentation === "fold" ? 1 : 0)
  expect(a.projection.getSnapshot()).toMatchObject({ pending: 0, error: null })
  let request!: OrgNativeWorkflowRequest
  cleanups.push(registerOrgNativeWorkflowHandler(value => { request = value; return value.complete({ kind: "success" }) }))
  const run = a.projection.captureWorkflow("agenda", [{ from: 0, to: source.length }])!
  const result = run(); await flush()
  expect((await result).kind).toBe("success")
  expect(request.target.captureSourceTransform!()!.snapshot.selection.mainIndex).toBe(exact.mainIndex)
  expect(buffer.runtime.source).toBe(source)
  expect(undoDepth(buffer.runtime.state)).toBe(0)
 })
 it("keeps folds local and closes native views without closing logical source/history", async () => {
  const { coordinator, bridge, buffer } = setup()
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label)
  a.view.dispatch({ effects: foldEffect.of({ from: 3, to: 12 }) }); await flush()
  const b = await child(bridge, await coordinator.detach(buffer.bufferId))
  expect(foldedRanges(a.view.state).size).toBe(1)
  expect(foldedRanges(b.view.state).size).toBe(0)
  a.view.dispatch({ changes: { from: a.view.state.doc.length, insert: "tail" }, userEvent: "input.type" }); await flush()
  const state = buffer.runtime.state, source = buffer.runtime.source
  expect(await coordinator.hideMainWithChildren()).toBe(true)
  await coordinator.closeWindow(label); await flush()
  expect(bridge.windows.has(label)).toBe(false)
  expect(buffer.runtime.state).toBe(state)
  expect(buffer.runtime.source).toBe(source)
  expect(buffer.runtime.closed).toBe(false)
  const last = coordinator.getSnapshot().windows[0].label
  await coordinator.closeWindow(last); await flush()
  expect(bridge.visibility.at(-1)).toBe(true)
  expect(buffer.runtime.closed).toBe(false)
  expect(undoDepth(buffer.runtime.state)).toBe(1)
 })
 it("fences failed publication, releases native authority and workflow, and keeps accepted Source and healthy peers live", async () => {
  const source = "* Reading\r\nResearch 😀 note\r\n"
  const { coordinator, bridge, buffer, owner, scope, onError } = setup(source)
  const tracker = createOrgRemarkTracker(buffer.runtime)
  const from = source.indexOf("Research"), text = "Research 😀 note"
  expect(tracker.install(source, 0, [{ id: "1234abcd", from, to: from + text.length, label: "important", kind: "range", originalText: text, line: 2 }])).toBe(true)
  const label = await coordinator.detach(buffer.bufferId), a = await child(bridge, label)
  const healthy = await child(bridge, await coordinator.detach(buffer.bufferId))
  const windowId = bridge.windows.get(label)!.windowId
  const permit = owner.captureReviewWindowPermit(scope, windowId, buffer.bufferId)
  let request!: OrgNativeWorkflowRequest
  cleanups.push(registerOrgNativeWorkflowHandler(value => { request = value; return value.complete({ kind: "success" }) }))
  const opened = a.projection.captureWorkflow("agenda", [{ from: 0, to: source.length }])!()
  await flush()
  expect((await opened).kind).toBe("success")
  expect(request.isLive()).toBe(true)
  // The first native update fails; its following update and remark snapshots
  // have already been queued by these two accepted canonical commands.
  bridge.beforeDelivery = (target, payload) => {
   if (target === label && payload.kind === "update") throw new Error("native projection delivery lost")
  }
  expect(request.target.applyEdit(source, { from: 0, to: 0, insert: "X", cursor: 1 })).toBe(true)
  expect(request.target.applyEdit(buffer.runtime.source, { from: 0, to: 0, insert: "Y", cursor: 1 })).toBe(true)
  await flush()
  expect(buffer.runtime.source).toBe(`YX${source}`)
  expect(healthy.view.state.sliceDoc()).toBe(buffer.runtime.source)
  expect(buffer.runtime.captureWindowProjection(windowId)).toBeNull()
  expect(permit()).toBe(false)
  expect(request.isLive()).toBe(false)
  expect(request.target.getCommandContext().available).toBe(false)
  expect(coordinator.getSnapshot().windows.find(window => window.label === label)?.status).toBe("failed")
  expect(a.view.state.sliceDoc()).toBe(source)
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({
   message: expect.stringContaining("canonical accepted state is retained"),
  }))
  // Even while the transport remains broken, normal peer edits never revisit
  // the failed endpoint and retained recovery-window identity remains physical.
  healthy.view.dispatch({ changes: { from: healthy.view.state.doc.length, insert: "healthy" }, userEvent: "input.type" })
  await flush()
  expect(buffer.runtime.source).toBe(`YX${source}healthy`)
  expect(healthy.projection.getSnapshot()).toMatchObject({ pending: 0, error: null })
  expect(a.view.state.sliceDoc()).toBe(source)
  expect(buffer.runtime.captureWindowProjection(windowId)).toBeNull()
  expect(permit()).toBe(false)
  bridge.beforeDelivery = null
  const retainedState = buffer.runtime.state
  expect(await coordinator.closeWindow(label)).toBe(true)
  await flush()
  expect(bridge.windows.has(label)).toBe(false)
  expect(buffer.runtime.state).toBe(retainedState)
  expect(buffer.runtime.closed).toBe(false)
 })
 it("drops queued initial and remark publication after the first initial transport failure without destroying the native recovery window", async () => {
  const source = "* Reading\nResearch note\n"
  const { coordinator, bridge, buffer, owner, scope, onError } = setup(source)
  const tracker = createOrgRemarkTracker(buffer.runtime)
  const from = source.indexOf("Research"), text = "Research note"
  expect(tracker.install(source, 0, [{ id: "1234abcd", from, to: from + text.length, label: "important", kind: "range", originalText: text, line: 2 }])).toBe(true)
  const label = await coordinator.detach(buffer.bufferId), identity = bridge.windows.get(label)!
  const permit = owner.captureReviewWindowPermit(scope, identity.windowId, buffer.bufferId)
  bridge.publicationFailure = true
  // The transport becomes healthy when the failure is reported, before queued
  // initial/Remark tasks drain: none may reacquire publication authority.
  onError.mockImplementation(() => { bridge.publicationFailure = false })
  bridge.intent(label, 1, { kind: "ready" })
  bridge.intent(label, 2, { kind: "ready" })
  await flush()
  expect(bridge.payloads.get(label)).toBeUndefined()
  expect(buffer.runtime.source).toBe(source)
  expect(buffer.runtime.captureWindowProjection(identity.windowId)).toBeNull()
  expect(permit()).toBe(false)
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({
   message: expect.stringContaining("canonical accepted state is retained"),
  }))
  expect(bridge.windows.has(label)).toBe(true)
  bridge.publicationFailure = false
  bridge.intent(label, 0, { kind: "close-window" })
  await flush()
  expect(bridge.payloads.get(label)?.map(payload => payload.kind)).toEqual(["close-request"])
  expect(bridge.windows.has(label)).toBe(true)
  bridge.intent(label, 3, { kind: "close-window", generation: 1 })
  await flush()
  expect(bridge.windows.has(label)).toBe(false)
  expect(buffer.runtime.source).toBe(source)
  expect(buffer.runtime.closed).toBe(false)
 })
 it("retains rejected input without replay, including native WM close while publication is pending", async () => {
  const { coordinator, bridge, buffer } = setup()
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label)
  bridge.publicationFailure = true
  a.view.dispatch({ changes: { from: 0, insert: "unpublished" } })
  await flush()
  expect(buffer.runtime.source.startsWith("unpublished")).toBe(true)
  expect(a.projection.getSnapshot().pending).toBe(1)
  bridge.publicationFailure = false
  bridge.intent(label, 0, { kind: "close-window" }); await flush()
  expect(bridge.windows.has(label)).toBe(true)
  expect(a.projection.getSnapshot().retainedSource).toBe(a.view.state.sliceDoc())
  expect(buffer.runtime.closed).toBe(false)
  const accepted = buffer.runtime.state
  const retained = a.projection.getSnapshot()
  expect(await a.projection.discardRetainedAndClose(retained, retained.retainedSource!)).toBe(true)
  await flush()
  expect(bridge.windows.has(label)).toBe(false)
  expect(buffer.runtime.state).toBe(accepted)
  expect(buffer.runtime.source.startsWith("unpublished")).toBe(true)
 })
 it("retains unknown-effect native input visibly without committing private effects or source", async () => {
  const { coordinator, bridge, buffer } = setup()
  const a = await child(bridge, await coordinator.detach(buffer.bufferId))
  const previous = buffer.runtime.source
  const unknown = StateEffect.define<string>()
  a.view.dispatch({ changes: { from: 0, insert: "retained" }, effects: unknown.of("private") })
  expect(buffer.runtime.source).toBe(previous)
  expect(a.projection.getSnapshot().error).toContain("Unknown native window effect")
  expect(a.projection.getSnapshot().retainedSource?.startsWith("retained")).toBe(true)
  expect(a.view.state.sliceDoc()).toBe(previous)
 })
 it("fences old grants and rebind generations before delayed input can reach a new canonical owner", async () => {
  const { coordinator, bridge, buffer, owner, scope } = setup("A")
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label)
  owner.activateDocument(scope, { relativePath: "b.org", content: "B", revision: "b1" }, "B")
  const b = owner.snapshotLiveBuffers(scope).find(value => value.document.relativePath === "b.org")!
  expect(await coordinator.rebind(label, b.bufferId)).toBe(true)
  a.view.dispatch({ changes: { from: 0, insert: "old-generation" } }); await flush()
  expect(b.runtime.source).toBe("B")
  expect(a.view.state.sliceDoc()).toBe("A")
  const current = await child(bridge, label)
  current.view.dispatch({ changes: { from: 0, insert: "new-owner" } }); await flush()
  expect(b.runtime.source).toBe("new-ownerB")
  expect(current.projection.getSnapshot().pending).toBe(0)
  bridge.intent(label, Number.MAX_SAFE_INTEGER, { kind: "close-window", generation: 1 }); await flush()
  expect(bridge.windows.has(label)).toBe(true)
  owner.activateGrant({ rootPath: "/native-test-other", capabilityToken: "another-test-grant", documents: [], directories: [] })
  coordinator.synchronize()
  expect(coordinator.getSnapshot().windows[0].status).toBe("retired")
  await flush()
  expect(b.runtime.closed).toBe(true)
 })
 it("rejects a stale peer baseline instead of silently rebasing or dropping native input", async () => {
  const { coordinator, bridge, buffer } = setup("abc")
  const a = await child(bridge, await coordinator.detach(buffer.bufferId))
  const peer = await child(bridge, await coordinator.detach(buffer.bufferId))
  peer.view.dispatch({ changes: { from: 0, insert: "peer" } })
  // Peer update has not reached the child, so this is genuinely stale native input.
  a.view.dispatch({ changes: { from: 0, insert: "draft" } }); await flush()
  expect(buffer.runtime.source).toBe("peerabc")
  expect(a.view.state.sliceDoc()).toBe("draftabc")
  expect(a.projection.getSnapshot().retainedSource).toBe("draftabc")
  expect(a.projection.getSnapshot().error).toMatch(/pending|baseline/)
 })
 it("detaches the exact origin presentation rather than the last peer's canonical selection", async () => {
  const { coordinator, bridge, buffer, owner, scope } = setup()
  const selection = EditorSelection.create([EditorSelection.range(12, 5, 19, 1, -1), EditorSelection.cursor(15, -1, 2, 29)], 1)
  const release = owner.registerWindow(scope, "origin-main", buffer.bufferId)
  const origin = new EditorView({ state: EditorState.create({ doc: buffer.runtime.state.doc, extensions: [buffer.runtime.historyFreeSourceExtensions, foldState], selection }) })
  const handle = buffer.runtime.attachWindow({ windowId: "origin-main", view: origin, readViewport: () => ({ scrollTop: 47, scrollLeft: 13 }) })
  handle.dispatchTransactions([origin.state.update({ effects: foldEffect.of({ from: 3, to: 12 }) })])
  cleanups.push(() => { handle.detach(); release(); origin.destroy() })
  const other = await child(bridge, await coordinator.detach(buffer.bufferId))
  other.view.dispatch({ selection: { anchor: 0 } }); await flush()
  const detached = await child(bridge, await coordinator.detach(buffer.bufferId, "origin-main"))
  expect(detached.view.state.selection.eq(selection, true)).toBe(true)
  expect(foldedRanges(detached.view.state).size).toBe(1)
  expect(detached.initial.scrollTop).toBe(47)
  expect(detached.initial.scrollLeft).toBe(13)
  expect(buffer.runtime.source).toBe("* A\r\nbody\nLF\r\n* B\r\n")
  expect(undoDepth(buffer.runtime.state)).toBe(0)
 })
 it("retains input refused by the real canonical commit context even when the outer file-ready port says true", async () => {
  const { coordinator, bridge, buffer, effects } = setup("abc")
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label)
  const claim = effects.begin({ label: "refused-native-source", kind: "mutation", paths: ["a.org"] })
  const state = buffer.runtime.state
  const result = a.projection.captureSubmission(() => { a.view.dispatch({ changes: { from: 0, insert: "retained" } }); return true })
  await flush()
  expect(await result).toMatchObject({ kind: "rejected" })
  expect(buffer.runtime.state).toBe(state)
  expect(buffer.runtime.source).toBe("abc")
  expect(undoDepth(buffer.runtime.state)).toBe(0)
  expect(a.projection.getSnapshot().pending).toBe(1)
  expect(a.projection.getSnapshot().retainedSource).toBe("retainedabc")
  expect(bridge.payloads.get(label)?.some(payload => payload.kind === "accepted")).toBe(false)
  effects.finish(claim)
 })
 it("drains each Source command and Save result instead of calling submission canonical success", async () => {
  const saved = Promise.withResolvers<boolean>()
  const { coordinator, bridge, buffer } = setup("abc", { saveBuffer: () => saved.promise })
  const a = await child(bridge, await coordinator.detach(buffer.bufferId))
  let settled = false
  const command = a.projection.captureSubmission(() => { a.view.dispatch({ changes: { from: 0, insert: "X" } }); return true }).then(result => { settled = true; return result })
  expect(settled).toBe(false)
  await flush()
  expect(await command).toMatchObject({ kind: "success" })
  expect(buffer.runtime.source).toBe("Xabc")
  const saving = a.projection.captureSubmission(() => { void a.projection.requestSave(); return true })
  let saveSettled = false
  void saving.then(() => { saveSettled = true })
  await flush()
  expect(saveSettled).toBe(false)
  a.view.dispatch({ changes: { from: 0, insert: "Y" } }); await flush()
  expect(buffer.runtime.source).toBe("YXabc")
  expect(saveSettled).toBe(false)
  saved.resolve(false); await flush()
  expect(await saving).toMatchObject({ kind: "rejected", message: "Save rejected; canonical source/history are retained" })
  expect(buffer.runtime.source).toBe("YXabc")
 })
 it("cancels a command result when its projection lifetime retires without dropping the local draft", async () => {
  const { coordinator, bridge, buffer } = setup("abc")
  const a = await child(bridge, await coordinator.detach(buffer.bufferId))
  const command = a.projection.captureSubmission(() => { a.view.dispatch({ changes: { from: 0, insert: "X" } }); return true })
  a.projection.retire()
  expect(await command).toMatchObject({ kind: "cancelled" })
  expect(a.projection.retainDraft()).toBe("Xabc")
  expect(a.view.state.readOnly).toBe(true)
  await expect(a.projection.requestWindowAction("close-window")).rejects.toThrow("Native projection retired")
  expect(bridge.windows.size).toBe(1)
 })
 it("projects per-file readiness before editing, ignores foreign-file work, and stays writable for a captured save", async () => {
  let effects: OrgWorkspaceEffectOwner
  const test = setup("abc", { isFileReady: (_id, path) => {
   const state = effects.getFileSnapshot(path)
   return !state.loading && (!state.busy || state.saveInFlight !== null)
  } })
  effects = test.effects
  const { coordinator, bridge, buffer } = test
  const stop = effects.subscribe(() => coordinator.synchronize())
  cleanups.push(stop)
  const a = await child(bridge, await coordinator.detach(buffer.bufferId))
  const foreign = effects.begin({ label: "foreign-native-file", kind: "mutation", paths: ["b.org"] })
  await flush()
  expect(a.projection.getSnapshot().readOnly).toBe(false)
  expect(a.view.state.readOnly).toBe(false)
  const reader = effects.beginRead("native-source-reader", ["a.org"], "native-source-reader")
  await flush()
  expect(a.projection.getSnapshot().readOnly).toBe(true)
  expect(a.view.state.readOnly).toBe(true)
  expect(a.view.contentDOM.getAttribute("contenteditable")).toBe("false")
  const blocked = vi.fn(() => true)
  expect(await a.projection.captureSubmission(blocked)).toMatchObject({ kind: "rejected" })
  expect(blocked).not.toHaveBeenCalled()
  expect(buffer.runtime.source).toBe("abc")
  reader.finish(); await flush()
  expect(a.view.state.readOnly).toBe(false)
  const saving = effects.begin({ label: "native-captured-save", kind: "save", paths: ["a.org"] })
  await flush()
  expect(a.view.state.readOnly).toBe(true)
  const saved = Promise.withResolvers<boolean>()
  expect(effects.captureSave(saving, saved.promise, buffer.runtime.source, "a.org")).toBe(true)
  await flush()
  expect(a.projection.getSnapshot().readOnly).toBe(false)
  expect(a.view.state.readOnly).toBe(false)
  a.view.dispatch({ changes: { from: 0, insert: "X" } }); await flush()
  expect(buffer.runtime.source).toBe("Xabc")
  a.handle.requestHistory("undo"); await flush()
  expect(buffer.runtime.source).toBe("abc")
  effects.finish(saving); saved.resolve(true)
  effects.finish(foreign)
 })
 it("fences a delayed recovery confirmation against draft/selection changes and a retired projection", async () => {
  const { coordinator, bridge, buffer } = setup("abc")
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label)
  const unknown = StateEffect.define<string>()
  a.view.dispatch({ changes: { from: 0, insert: "withheld" }, effects: unknown.of("private") })
  const snapshot = a.projection.getSnapshot(), draft = a.projection.retainDraft()!
  expect(draft).toBe("withheldabc")
  a.projection.receive({ kind: "readiness", binding: a.initial.binding, generation: a.initial.generation, readOnly: true })
  expect(await a.projection.discardRetainedAndClose(snapshot, draft)).toBe(false)
  expect(bridge.windows.has(label)).toBe(true)
  const latest = a.projection.getSnapshot()
  a.handle.detach()
  expect(await a.projection.discardRetainedAndClose(latest, draft)).toBe(false)
  expect(bridge.windows.has(label)).toBe(true)
 })
 it("retains main for retired physical child recovery windows and never destroys their input on coordinator disposal", async () => {
  const { coordinator, bridge, buffer } = setup("abc")
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label)
  const unknown = StateEffect.define<string>()
  a.view.dispatch({ changes: { from: 0, insert: "recover" }, effects: unknown.of("private") })
  coordinator.dispose(); await flush()
  expect(bridge.windows.has(label)).toBe(true)
  expect(coordinator.getSnapshot().windows[0].status).toBe("retired")
  expect(a.projection.retainDraft()).toBe("recoverabc")
  expect(await coordinator.hideMainWithChildren()).toBe(true)
  bridge.intent(label, 0, { kind: "close-window" }); await flush()
  expect(bridge.windows.has(label)).toBe(true)
  const approved = a.projection.getSnapshot(), draft = a.projection.retainDraft()!
  expect(await a.projection.discardRetainedAndClose(approved, draft)).toBe(true)
  await flush()
  expect(bridge.windows.has(label)).toBe(false)
  expect(coordinator.getSnapshot().windows).toEqual([])
  expect(bridge.visibility.at(-1)).toBe(true)
  expect(buffer.runtime.closed).toBe(false)
 })
 it("cleans an unused StrictMode setup without retaining an event listener", async () => {
  const { coordinator, bridge } = setup("abc")
  coordinator.dispose(); await flush()
  expect(bridge.listener).toBeNull()
  expect(bridge.windows.size).toBe(0)
 })
 it("retains a late-created physical child and its lifecycle-only listener after owner disposal", async () => {
  const { coordinator, bridge, buffer } = setup("abc")
  const creation = Promise.withResolvers<void>(); bridge.creationGate = creation.promise
  const detached = coordinator.detach(buffer.bufferId); await flush()
  coordinator.dispose(); await flush()
  expect(bridge.listener).not.toBeNull()
  creation.resolve(); const label = await detached; await flush()
  expect(bridge.windows.has(label)).toBe(true)
  expect(coordinator.getSnapshot().windows[0].status).toBe("retired")
  bridge.intent(label, 1, { kind: "ready" }); await flush()
  expect(bridge.payloads.get(label)?.some(payload => payload.kind === "initial")).toBe(false)
  expect(await coordinator.hideMainWithChildren()).toBe(true)
  await bridge.close(label, bridge.windows.get(label)!.binding); await flush()
  expect(coordinator.getSnapshot().windows).toEqual([])
  expect(bridge.listener).toBeNull()
  expect(buffer.runtime.source).toBe("abc")
  expect(buffer.runtime.closed).toBe(false)
 })
 it("keeps the main-window child guard until authoritative native Destroyed, not close-command completion", async () => {
  const { coordinator, bridge, buffer } = setup("abc")
  const label = await coordinator.detach(buffer.bufferId)
  const a = await child(bridge, label); bridge.deferDestroy = true
  expect(await coordinator.closeWindow(label)).toBe(true); await flush()
  expect(a.view.state.readOnly).toBe(true)
  expect(coordinator.getSnapshot().windows).toHaveLength(1)
  expect(await coordinator.hideMainWithChildren()).toBe(true)
  bridge.intent(label, 0, { kind: "window-destroyed" }); bridge.windows.delete(label); await flush()
  expect(coordinator.getSnapshot().windows).toEqual([])
  expect(bridge.visibility.at(-1)).toBe(true)
  expect(buffer.runtime.closed).toBe(false)
 })
})
