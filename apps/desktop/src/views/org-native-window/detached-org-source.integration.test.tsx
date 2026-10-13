import { historyField, undoDepth } from "@codemirror/commands"
import { foldState, foldedRanges } from "@codemirror/language"
import { EditorSelection, EditorState, StateEffect, Transaction } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createOrgBufferRuntime, isOrgRuntimeProjection, type OrgBufferWindowHandle } from "@/flows/org-editor-runtime"
import { createOrgNativeChildProjection } from "@/flows/org-native-window/org-native-editor-projection"
import { decodeOrgNativeTransaction, encodeOrgNativeSelection, encodeOrgNativeTransaction, type OrgNativeIntent, type OrgNativeProjection } from "@/flows/org-native-window/org-native-window-protocol"
import { OrgEditor } from "@/views/org-editor/org-editor.view.fn"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import { DetachedOrgWindow, readDetachedOrgWindowBootstrap } from "./detached-org-window"
import { orgSparseTreeField } from "@/views/org-editor/org-sparse-tree.extension"
import { orgRemarkNoteRangeField } from "@/views/org-editor/org-remark.extension"
import { editorOffsetFromSource } from "@/views/org-editor/org-source-offset.pipe"
import { useSettings } from "@/hooks/use-settings"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION } from "@/pipes/org/org-behavior-configuration.pipe"
import { createOrgClockOwner } from "@/flows/org-workspace/org-clock-owner"
import { createOrgRemarkTracker } from "@/flows/org-editor-runtime/org-remark-tracker"

const nativeInvoke = vi.hoisted(() => vi.fn())
vi.mock("@tauri-apps/api/core", async importOriginal => {
 const actual = await importOriginal<typeof import("@tauri-apps/api/core")>()
 return { ...actual, invoke: nativeInvoke }
})
const flush = async () => { for (let turn = 0; turn < 12; turn++) await Promise.resolve() }
const rangeRects = Object.getOwnPropertyDescriptor(Range.prototype, "getClientRects")
const rangeBounds = Object.getOwnPropertyDescriptor(Range.prototype, "getBoundingClientRect")
beforeEach(() => {
 useSettings.setState({ orgBehaviorConfigurationJson: "", orgKeymapConfigurationJson: "" })
 nativeInvoke.mockImplementation(async () => undefined)
 Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] })
 Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => new DOMRect() })
})
afterEach(() => {
 cleanup(); nativeInvoke.mockReset(); vi.useRealTimers()
 useSettings.setState({ orgBehaviorConfigurationJson: "", orgKeymapConfigurationJson: "" })
 for (const [key, descriptor] of [["getClientRects", rangeRects], ["getBoundingClientRect", rangeBounds]] as const) {
  if (descriptor) Object.defineProperty(Range.prototype, key, descriptor)
  else Reflect.deleteProperty(Range.prototype, key)
 }
})

/** Real runtime/window/codec consumption behind the native transport, never an acceptance echo. */
async function mountCanonicalChild(source: string, filename = "/approved/a.org") {
 const onCommit = vi.fn()
 const runtime = createOrgBufferRuntime({ key: { workspaceSessionId: "native-parameters", bufferId: "source" }, source, canCommit: () => true, onCommit })
 const clockOwner = createOrgClockOwner()
 clockOwner.configure({ scope: {}, rootPath: filename.slice(0, -"/a.org".length),
  isCurrent: () => !runtime.closed, buffers: () => [{ relativePath: "a.org", runtime }], available: () => !runtime.closed,
  commit: (target, expected, edits, current) => current() && target.applyCommandEdits(expected, edits),
  agenda: async () => ({ kind: "rejected", message: "This native Source fixture owns no Agenda window" }),
 })
 const bootstrap = { windowId: "native-parameters", binding: "native-parameters-binding" }
 let state = EditorState.create({ doc: runtime.state.doc, extensions: [runtime.historyFreeSourceExtensions, foldState] })
 let sequence = 0, generation = 1, activeRequest: number | null = null
 const emit = (payload: OrgNativeProjection) => window.dispatchEvent(new CustomEvent("grain:org-window-projection", { detail: payload }))
 const transport = { holdAcceptance: false, held: [] as OrgNativeProjection[] }
 const issueInitial = () => emit({
  kind: "initial", binding: bootstrap.binding, generation, nextRequestId: 2, bufferId: "source",
  path: "a.org", filename, source: runtime.source, separator: state.lineBreak, revision: runtime.revision, sequence,
  selection: encodeOrgNativeSelection(state.selection), folds: [], scrollTop: 0, scrollLeft: 0, readOnly: false,
 })
 const reads: { collation: () => unknown; clock: () => unknown } = {
  collation: () => ({ locale: "C", ranks: [1, 0, 2] }),
  clock: () => ({ nowEpochMs: 50_400_000, todayStartEpochMs: 0, todayEndEpochMs: 86_400_000,
   calendarEpochMs: [36_000_000, 39_600_000, 36_000_000, 43_200_000] }),
 }
 const handle = runtime.attachWindow({ windowId: bootstrap.windowId, view: {
  get state() { return state },
  update(transactions: readonly Transaction[]) {
   state = transactions.at(-1)?.state ?? state
   const payload: OrgNativeProjection = { kind: "update", binding: bootstrap.binding, generation, requestId: activeRequest,
    revision: runtime.revision, sequence: ++sequence, separator: state.lineBreak,
    transactions: transactions.map(transaction => encodeOrgNativeTransaction(transaction, () => isOrgRuntimeProjection(transaction))), readOnly: false }
   queueMicrotask(() => { if (transport.holdAcceptance) transport.held.push(payload); else emit(payload) })
  },
 } })
 nativeInvoke.mockImplementation(async (command: string, arguments_: { binding?: string; requestId?: number; payload?: OrgNativeIntent }) => {
  if (command === "collate_org_match_strings") return reads.collation()
  if (command === "capture_org_match_clock_context") return reads.clock()
  if (command !== "post_org_window_intent" || arguments_.binding !== bootstrap.binding || !arguments_.payload) return
  const intent = arguments_.payload
  if (intent.kind === "ready") { queueMicrotask(issueInitial); return }
  if (intent.kind === "clock-context") {
   const captured = clockOwner.captureSparseClock(runtime.source, filename)
   const requestId = arguments_.requestId!
   queueMicrotask(() => {
    const current = intent.generation === generation && intent.revision === runtime.revision && intent.sequence === sequence && captured.isCurrent()
    emit({ kind: "clock-context", binding: bootstrap.binding, generation: intent.generation, requestId, includeClockingTask: true,
     activeClock: current ? captured.activeClock : null, error: current ? null : "The root native clock identity changed" })
   })
   return
  }
  if (intent.kind === "save") {
   queueMicrotask(() => emit({ kind: "save-result", binding: bootstrap.binding, generation, requestId: arguments_.requestId!, success: true, message: "Saved canonical logical buffer" }))
   return
  }
  const previous = sequence
  activeRequest = arguments_.requestId!
  try {
   if (intent.kind === "transactions") {
    let next = state
    handle.dispatchTransactions(intent.transactions.map(encoded => {
     const transaction = decodeOrgNativeTransaction(next, encoded); next = transaction.state; return transaction
    }))
   } else if (intent.kind === "undo") handle.undo()
   else if (intent.kind === "redo") handle.redo()
   if (sequence === previous && (intent.kind === "transactions" || intent.kind === "undo" || intent.kind === "redo")) {
    const requestId = activeRequest
    queueMicrotask(() => emit({ kind: "accepted", binding: bootstrap.binding, generation, revision: runtime.revision, sequence, requestId,
     outcome: intent.kind === "transactions" ? "empty" : "history-noop" }))
   }
  } finally { activeRequest = null }
 })
 let mainTarget: OrgEditorCommandTarget | null = null
 const rendered = render(<>
  <OrgEditor runtime={runtime} value={source} documentPath="a.org" documentFilename={filename} ariaLabel="Canonical main Source" onSave={() => {}}
   onCommandTarget={target => { mainTarget = target }} />
  <DetachedOrgWindow bootstrap={bootstrap} />
 </>)
 await act(async () => { await flush() })
 const view = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Detached Org Source editor" }))!
 const main = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Canonical main Source" }))!
 return { runtime, onCommit, bootstrap, view, main, reads, rendered, transport,
  releaseAccepted: () => { transport.holdAcceptance = false; for (const payload of transport.held.splice(0)) emit(payload) },
  get mainTarget() { return mainTarget! },
  rebind: () => { generation++; issueInitial() },
  requestClose: () => emit({ kind: "close-request", binding: bootstrap.binding, generation }),
  dispose: () => { rendered.unmount(); handle.detach(); runtime.close() },
 }
}
const sourceParameterName = /^(?:Tags|Property|Schedule|Deadline|TODO state|Active timestamp|Inactive timestamp|Sparse tree)\b/
async function chooseChildCommand(id: string) {
 fireEvent.click(screen.getByRole("button", { name: "Commands" }))
 const input = screen.getByRole("combobox", { name: "Execute command:" })
 fireEvent.change(input, { target: { value: id } })
 fireEvent.keyDown(input, { key: "Enter" })
 await act(async () => { await flush() })
}
async function acceptChildParameter(value: string) {
 const input = screen.getByRole("combobox", { name: sourceParameterName })
 fireEvent.change(input, { target: { value } })
 fireEvent.keyDown(input, { key: "Enter" })
 await act(async () => { await flush() })
}
const nativeSparseSource = "* TODO First\r\n:PROPERTIES:\r\n:NAME: a\r\n:FILE: forged\r\n:BLOCKED: t\r\n:END:\r\nfirst body\0\r\n* DONE Last\r\n:PROPERTIES:\r\n:NAME: z\r\n:END:\r\nlast body\r\n"
const nativeClockSource = "* TODO First\r\nCLOCK: [2026-10-10 Sat 10:00]--[2026-10-10 Sat 11:00] => 99:00\r\nfirst body\r\n* DONE Last\r\nCLOCK: [2026-10-10 Sat 10:00]--[2026-10-10 Sat 12:00] => 0:01\r\nlast body\r\n"

describe("production Org Source in a native child", () => {
 it("preserves the accepted ASCII prefix when a new native composition replaces pending cancelled input", async () => {
  vi.useFakeTimers()
  useSettings.setState({ orgKeymapConfigurationJson: '{"version":1,"modalEngine":"vim"}' })
  const fixture = await mountCanonicalChild("alpha")
  const key = async (value: string) => act(async () => {
   fireEvent.keyDown(fixture.view.contentDOM, { key: value })
   await flush()
  })
  await key("q"); await key("b"); await key("i")
  await act(async () => {
   fireEvent.compositionStart(fixture.view.contentDOM)
   fixture.view.dispatch({ changes: { from: 0, insert: "ni" }, selection: EditorSelection.cursor(2), userEvent: "input.type.compose.start" })
   await flush()
   fixture.view.dispatch({ changes: { from: 0, to: 2, insert: "" }, selection: EditorSelection.cursor(0), userEvent: "input.type.compose" })
   fireEvent.compositionEnd(fixture.view.contentDOM, { data: "" })
   await flush()
   fixture.view.dispatch({ changes: { from: 0, insert: "Q" }, selection: EditorSelection.cursor(1), userEvent: "input.type.compose" })
   await flush()
  })
  expect(fixture.runtime.source).toBe("Qalpha")
  await act(async () => {
   fireEvent.compositionStart(fixture.view.contentDOM)
   fixture.view.dispatch({ changes: { from: 1, to: 1, insert: "ni" }, selection: EditorSelection.cursor(3), userEvent: "input.type.compose.start" })
   await flush()
   fixture.view.dispatch({ selection: EditorSelection.single(1, 3), userEvent: "select" })
   await flush()
   fixture.view.dispatch({ changes: { from: 1, to: 3, insert: "ni hao" }, selection: EditorSelection.cursor(7), userEvent: "input.type.compose" })
   await flush()
   fixture.view.dispatch({ changes: { from: 1, to: 7, insert: "你好" }, selection: EditorSelection.cursor(3), userEvent: "input.type.compose" })
   fireEvent.compositionEnd(fixture.view.contentDOM, { data: "你好" })
   await vi.advanceTimersByTimeAsync(100)
   await flush()
  })
  expect(fixture.runtime.source).toBe("Q你好alpha")
  await key("Escape"); await key("q"); await key("@"); await key("b")
  expect(fixture.runtime.source).toBe("Q你Q你好好alpha")
  await key("u")
  expect(fixture.runtime.source).toBe("Q你好alpha")
  await key("u")
  expect(fixture.runtime.source).toBe("Qalpha")
  await key("u")
  expect(fixture.runtime.source).toBe("alpha")
  expect(fixture.main.state.sliceDoc()).toBe("alpha")
  fixture.dispose()
 })
 it("renders canonical marks only after matching native acceptance and cannot revive them with old revision or rebind metadata", async () => {
  const source = "* Reading\r\nResearch 😀 note\r\n", text = "Research 😀 note"
  const fixture = await mountCanonicalChild(source)
  const tracker = createOrgRemarkTracker(fixture.runtime), from = source.indexOf("Research")
  expect(tracker.install(source, 0, [{ id: "1234abcd", from, to: from + text.length, label: "important", kind: "range", originalText: text, line: 2 }])).toBe(true)
  const emitRemarks = (generation: number, snapshot = tracker.getSnapshot()) => {
   const payload: OrgNativeProjection = { kind: "remark-snapshot", binding: fixture.bootstrap.binding, generation, revision: snapshot.revision,
    snapshot: { marks: snapshot.marks, needsReload: snapshot.needsReload, dirty: snapshot.dirty, version: snapshot.version } }
   window.dispatchEvent(new CustomEvent("grain:org-window-projection", { detail: payload }))
  }
  const initialMarks = tracker.getSnapshot()
  act(() => emitRemarks(1))
  await waitFor(() => expect(fixture.view.contentDOM.querySelector('[data-org-remark-id="1234abcd"]')).toHaveTextContent(text))
  expect(fixture.runtime.source).toBe(source)
  expect(undoDepth(fixture.runtime.state)).toBe(0)
  fixture.transport.holdAcceptance = true
  await act(async () => {
   fixture.view.dispatch({ changes: { from: 0, insert: "X" }, userEvent: "input.type" })
   await flush()
   emitRemarks(1)
  })
  expect(fixture.view.contentDOM.querySelector("[data-org-remark-id]")).toBeNull()
  await act(async () => { fixture.releaseAccepted(); await flush() })
  await waitFor(() => expect(fixture.view.contentDOM.querySelector('[data-org-remark-id="1234abcd"]')).toHaveTextContent(text))
  expect(fixture.runtime.source).toBe(`X${source}`)
  expect(undoDepth(fixture.runtime.state)).toBe(1)
  await act(async () => { fixture.rebind(); await flush(); emitRemarks(1); await flush() })
  const rebound = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Detached Org Source editor" }))!
  expect(rebound.contentDOM.querySelector("[data-org-remark-id]")).toBeNull()
  act(() => emitRemarks(2))
  await waitFor(() => expect(rebound.contentDOM.querySelector('[data-org-remark-id="1234abcd"]')).toHaveTextContent(text))
  act(() => emitRemarks(2, { ...initialMarks, version: tracker.getSnapshot().version + 1 }))
  expect(rebound.contentDOM.querySelector('[data-org-remark-id="1234abcd"]')).toHaveTextContent(text)
  await act(async () => { fireEvent.keyDown(rebound.contentDOM, { key: "z", keyCode: 90, ctrlKey: true }); await flush(); emitRemarks(2) })
  await waitFor(() => expect(rebound.contentDOM.querySelector('[data-org-remark-id="1234abcd"]')).toHaveTextContent(text))
  expect(fixture.runtime.source).toBe(source)
  expect(undoDepth(fixture.runtime.state)).toBe(0)
  fixture.dispose()
 })
 it("keeps actual editor commands and Mod-S/undo/redo on the asynchronous canonical acceptance boundary", async () => {
  const source = "* TODO Heading\r\nbody\nraw LF\r\n"
  const runtime = createOrgBufferRuntime({ key: { workspaceSessionId: "native-source-test", bufferId: "source" }, source, canCommit: () => true, onCommit: () => undefined })
  const bootstrap = { windowId: "native-source-test", binding: "native-source-test-binding" }
  const initial: Extract<OrgNativeProjection, { kind: "initial" }> = { kind: "initial", ...bootstrap, generation: 1, nextRequestId: 2, bufferId: "source", path: "a.org", filename: "/approved/a.org", source, separator: "\r\n", revision: 0, sequence: 0, selection: encodeOrgNativeSelection(runtime.state.selection), folds: [], scrollTop: 0, scrollLeft: 0, readOnly: false }
  let state = EditorState.create({ doc: runtime.state.doc, extensions: [runtime.historyFreeSourceExtensions, foldState] })
  let sequence = 0, activeRequest: number | null = null
  let handle: OrgBufferWindowHandle
  const saved: string[] = []
  const projection = createOrgNativeChildProjection(bootstrap, initial, async (requestId, intent) => {
   if (intent.kind === "save") {
    saved.push(runtime.source)
    queueMicrotask(() => projection.receive({ kind: "save-result", binding: bootstrap.binding, generation: 1, requestId, success: true, message: "Canonical logical buffer saved" }))
    return
   }
   activeRequest = requestId
   try {
    if (intent.kind === "transactions") {
     let next = state
     const transactions = intent.transactions.map(encoded => { const transaction = decodeOrgNativeTransaction(next, encoded); next = transaction.state; return transaction })
     handle.dispatchTransactions(transactions)
    } else if (intent.kind === "undo") handle.undo()
    else if (intent.kind === "redo") handle.redo()
   } finally { activeRequest = null }
  })
  handle = runtime.attachWindow({ windowId: bootstrap.windowId, view: {
   get state() { return state },
   update(transactions: readonly Transaction[]) {
    state = transactions.at(-1)?.state ?? state
    const update: OrgNativeProjection = { kind: "update", binding: bootstrap.binding, generation: 1, requestId: activeRequest, revision: runtime.revision, sequence: ++sequence, separator: state.lineBreak, transactions: transactions.map(transaction => encodeOrgNativeTransaction(transaction, () => isOrgRuntimeProjection(transaction))), readOnly: false }
    queueMicrotask(() => projection.receive(update))
   },
  } })
  let target: OrgEditorCommandTarget | null = null
  render(<OrgEditor nativeProjection={projection} value={source} documentPath="a.org" ariaLabel="Native production Source" onSave={() => { void projection.requestSave() }} onCommandTarget={value => { target = value }} />)
  const view = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Native production Source" }))!
  expect(view.state.field(historyField, false)).toBeUndefined()
  expect(target).not.toBeNull()
  await act(async () => {
   expect(target!.executeCommand("todo")).toBe(true)
   fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "s", keyCode: 83 })
   expect(projection.getSnapshot().pending).toBeGreaterThan(0)
   await flush()
  })
  expect(runtime.source).toContain("* DONE Heading\r\n")
  expect(runtime.source).toContain("body\nraw LF\r\n")
  expect(saved).toEqual([runtime.source])
  expect(undoDepth(runtime.state)).toBe(1)
  await act(async () => { fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 }); await flush() })
  expect(runtime.source).toBe(source)
  expect(view.state.sliceDoc()).toBe(source)
  await act(async () => { fireEvent.keyDown(view.contentDOM, { ctrlKey: true, shiftKey: true, key: "Z", keyCode: 90 }); await flush() })
  expect(runtime.source).toContain("* DONE Heading")
  expect(projection.getSnapshot().pending).toBe(0)
  handle.detach(); runtime.close()
 })
 it("uses the real asynchronous confirmation provider before closing an unissued child", async () => {
  const bootstrap = { windowId: "unissued-test", binding: "unissued-test-binding" }
  render(<DetachedOrgWindow bootstrap={bootstrap} />)
  await act(async () => { await flush() })
  fireEvent.click(screen.getByRole("button", { name: "Close unbound native view" }))
  expect(nativeInvoke).not.toHaveBeenCalledWith("close_org_detached_window", expect.anything())
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep view" }))
  await act(async () => { await flush() })
  expect(nativeInvoke).not.toHaveBeenCalledWith("close_org_detached_window", expect.anything())
  fireEvent.click(screen.getByRole("button", { name: "Close unbound native view" }))
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close view" }))
  await act(async () => { await flush() })
  expect(nativeInvoke).toHaveBeenCalledWith("close_org_detached_window", { label: "org-detached-unissued-test", binding: bootstrap.binding })
 })
 it("fences the real recovery confirmation against a changed projection without dropping its draft", async () => {
  const runtime = createOrgBufferRuntime({ key: { workspaceSessionId: "confirmation-test", bufferId: "source" }, source: "abc", canCommit: () => true, onCommit: () => undefined })
  const bootstrap = { windowId: "confirmation-test", binding: "confirmation-test-binding" }
  const initial: Extract<OrgNativeProjection, { kind: "initial" }> = { kind: "initial", binding: bootstrap.binding, generation: 1, nextRequestId: 2, bufferId: "source", path: "a.org", filename: "/approved/a.org", source: runtime.source, separator: runtime.state.lineBreak, revision: 0, sequence: 0, selection: encodeOrgNativeSelection(runtime.state.selection), folds: [], scrollTop: 0, scrollLeft: 0, readOnly: false }
  const rendered = render(<DetachedOrgWindow bootstrap={bootstrap} />)
  try {
   await act(async () => { window.dispatchEvent(new CustomEvent("grain:org-window-projection", { detail: initial })); await flush() })
   const view = EditorView.findFromDOM(screen.getByLabelText("Detached Org Source editor"))!
   const unknown = StateEffect.define<number>()
   await act(async () => { view.dispatch({ changes: { from: 0, insert: "retained" }, effects: unknown.of(1) }); await flush() })
   fireEvent.click(screen.getByRole("checkbox", { name: "I copied this input or explicitly choose to discard it" }))
   fireEvent.click(screen.getByRole("button", { name: "Discard unaccepted input and close view" }))
   expect(screen.getByRole("dialog")).toBeTruthy()
   await act(async () => { window.dispatchEvent(new CustomEvent("grain:org-window-projection", { detail: { kind: "readiness", binding: bootstrap.binding, generation: 1, readOnly: true } })); await flush() })
   fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Discard input and close view" }))
   await act(async () => { await flush() })
   expect(nativeInvoke).not.toHaveBeenCalledWith("close_org_detached_window", expect.anything())
   expect(screen.getByLabelText("Retained Source text").textContent).toBe("retainedabc")
   expect(screen.getByText("This native draft or projection changed while confirmation was open; no view was closed")).toBeTruthy()
   expect(runtime.source).toBe("abc")
   expect(undoDepth(runtime.state)).toBe(0)
  } finally { rendered.unmount(); runtime.close() }
 })
 it("recognizes only bounded native bootstrap identities and never treats them as workspace grants", () => {
  expect(readDetachedOrgWindowBootstrap("")).toBeNull()
  expect(readDetachedOrgWindowBootstrap("?orgWindow=native-test&binding=abcdefghijklmnop")).toEqual({ windowId: "native-test", binding: "abcdefghijklmnop" })
  expect(() => readDetachedOrgWindowBootstrap("?orgWindow=../../remote&binding=abcdefghijklmnop")).toThrow("Invalid detached native window identity")
  expect(() => readDetachedOrgWindowBootstrap("?orgWindow=native-test&binding=short")).toThrow("Invalid detached native window identity")
  expect(() => readDetachedOrgWindowBootstrap("?orgWindow=a&orgWindow=b&binding=abcdefghijklmnop")).toThrow("Invalid detached native window identity")
 })
})

describe("native Source parameters and owned views", () => {
 it.each([
  ["tags", "work:project", ":work:project:"],
  ["property", "OWNER=literal 😀", ":OWNER: literal 😀"],
  ["scheduled", "2026-10-12 10:30-11:45 +1w -2d", "SCHEDULED: <2026-10-12 10:30-11:45 +1w -2d>"],
  ["deadline", "2026-10-13 09:00", "DEADLINE: <2026-10-13 09:00>"],
  ["todo-state", "DONE", "* DONE First"],
  ["todo-state", "", "* First"],
  ["timestamp-active", "2026-10-14 12:00--2026-10-15 13:00", "<2026-10-14 12:00>--<2026-10-15 13:00>"],
  ["timestamp-inactive", "2026-10-14 12:00 +2w", "[2026-10-14 12:00 +2w]"],
 ])("accepts %s once in canonical history, preserving raw bytes and directional selection", async (id, input, expected) => {
  const source = "* TODO First\r\nraw LF\nNUL\0😀\r\n* DONE Last\r\nlast body\r\n"
  const mounted = await mountCanonicalChild(source)
  try {
   const selection = EditorSelection.create([EditorSelection.range(2, 6, 42, 2), EditorSelection.cursor(16, -1, 2, 31)], 0)
   await act(async () => {
    mounted.main.dispatch({ selection: EditorSelection.create([
     EditorSelection.range(8, 2, 42, 2), EditorSelection.cursor(mounted.main.state.doc.length - 2, -1, 2, 31),
    ], 0) })
    await flush()
   })
   await act(async () => {
    mounted.view.dispatch({ selection }); mounted.view.focus(); await flush()
   })
   const mainSelection = mounted.main.state.selection
   const change = id === "tags" ? { from: 12, to: 12, insert: ` ${expected}` }
    : id === "property" ? { from: 14, to: 14, insert: `:PROPERTIES:\r\n${expected}\r\n:END:\r\n` }
    : id === "scheduled" || id === "deadline" ? { from: 14, to: 14, insert: `${expected}\r\n` }
    : id === "todo-state" ? { from: 2, to: input ? 6 : 7, insert: input }
    : { from: 6, to: 6, insert: expected }
   const accepted = source.slice(0, change.from) + change.insert + source.slice(change.to)
   const editorChanges = mounted.view.state.changes({
    from: editorOffsetFromSource(source, change.from, mounted.view.state.lineBreak),
    to: editorOffsetFromSource(source, change.to, mounted.view.state.lineBreak), insert: change.insert,
   })
   await chooseChildCommand(id)
   expect(mounted.runtime.source).toBe(source)
   expect(undoDepth(mounted.runtime.state)).toBe(0)
   await acceptChildParameter(input)
   await waitFor(() => expect(screen.queryByRole("combobox", { name: sourceParameterName })).toBeNull())
   expect(mounted.runtime.source).toBe(accepted)
   expect(mounted.view.state.sliceDoc()).toBe(accepted)
   expect(mounted.main.state.sliceDoc()).toBe(accepted)
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
   expect(mounted.view.state.selection.eq(selection.map(editorChanges), true)).toBe(true)
   expect(mounted.view.state.selection.ranges).toHaveLength(2)
   expect(mounted.view.state.selection.mainIndex).toBe(selection.mainIndex)
   for (let index = 0; index < 2; index++) {
    const range = mounted.view.state.selection.ranges[index], before = selection.ranges[index]
    expect([range.assoc, range.bidiLevel, range.goalColumn, range.undirectional]).toEqual([before.assoc, before.bidiLevel, before.goalColumn, before.undirectional])
   }
   const expectedMainSelection = mainSelection.map(editorChanges)
   expect(mounted.main.state.selection.eq(expectedMainSelection, true)).toBe(true)
   expect(mounted.main.state.selection.ranges).toEqual(expectedMainSelection.ranges)
   await act(async () => { fireEvent.keyDown(mounted.main.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 }); await flush() })
   expect(mounted.runtime.source).toBe(source)
   expect(mounted.view.state.sliceDoc()).toBe(source)
   await act(async () => { fireEvent.keyDown(mounted.view.contentDOM, { ctrlKey: true, shiftKey: true, key: "Z", keyCode: 90 }); await flush() })
   expect(mounted.runtime.source).toBe(accepted)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
  } finally { mounted.dispose() }
 })

 it.each([
  ["timestamp-active", "left opening", false],
  ["timestamp-inactive", "left interior", false],
  ["timestamp-inactive", "first range dash", false],
  ["timestamp-inactive", "second range dash", true],
  ["timestamp-active", "right opening", true],
  ["timestamp-active", "right after", true],
 ] as const)("replaces only the raw at-point endpoint for %s at %s", async (id, boundary, rightTarget) => {
  const left = "<2026-10-14 Wed 10:00 +1w -2d>", right = "[2026-10-15 Thu 11:00 +2w -3d]"
  const source = `* Heading\r\nraw\0😀\n${left}--${right}\r\ntail\0😀\r\n`
  const from = source.indexOf(rightTarget ? right : left), to = from + (rightTarget ? right.length : left.length)
  const point = boundary === "left opening" ? source.indexOf(left)
   : boundary === "left interior" ? source.indexOf(left) + 5
   : boundary === "first range dash" ? source.indexOf(left) + left.length
   : boundary === "second range dash" ? source.indexOf(left) + left.length + 1
   : boundary === "right opening" ? source.indexOf(right)
   : source.indexOf(right) + right.length
  const mounted = await mountCanonicalChild(source)
  try {
   const offset = editorOffsetFromSource(source, point, mounted.view.state.lineBreak)
   const selection = EditorSelection.create([EditorSelection.range(offset + 1, offset, 42, 2), EditorSelection.cursor(2, -1, 2, 31)], 0)
   await act(async () => { mounted.view.dispatch({ selection }); mounted.view.focus(); await flush() })
   const mainSelection = mounted.main.state.selection
   await chooseChildCommand(id)
   expect((screen.getByRole("combobox", { name: /^(?:Active|Inactive) timestamp\b/ }) as HTMLInputElement).value).toBe(rightTarget ? right : left)
   await acceptChildParameter("2026-10-20")
   const body = rightTarget ? "2026-10-20 11:00 +2w -3d" : "2026-10-20 10:00 +1w -2d"
   const replacement = id === "timestamp-active" ? `<${body}>` : `[${body}]`
   const expected = source.slice(0, from) + replacement + source.slice(to)
   expect(mounted.runtime.source).toBe(expected)
   expect(mounted.main.state.sliceDoc()).toBe(expected)
   expect(mounted.view.state.sliceDoc()).toBe(expected)
   expect(mounted.main.state.selection.eq(mainSelection, true)).toBe(true)
   expect(mounted.view.state.selection.ranges).toHaveLength(2)
   expect(mounted.view.state.selection.mainIndex).toBe(selection.mainIndex)
   for (let index = 0; index < 2; index++) {
    const range = mounted.view.state.selection.ranges[index], before = selection.ranges[index]
    expect([range.assoc, range.bidiLevel, range.goalColumn, range.undirectional]).toEqual([before.assoc, before.bidiLevel, before.goalColumn, before.undirectional])
   }
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
   await act(async () => { fireEvent.keyDown(mounted.main.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 }); await flush() })
   expect(mounted.runtime.source).toBe(source)
   await act(async () => { fireEvent.keyDown(mounted.view.contentDOM, { ctrlKey: true, shiftKey: true, key: "Z", keyCode: 90 }); await flush() })
   expect(mounted.runtime.source).toBe(expected)
  } finally { mounted.dispose() }
 })

 it("chooses the first containing stamp at an adjacent inclusive boundary", async () => {
  const left = "<2026-10-14 Wed>", right = "<2026-10-15 Thu>"
  const source = `* Heading\r\n${left}${right}\r\nraw\0😀\r\n`
  const mounted = await mountCanonicalChild(source)
  try {
   const point = editorOffsetFromSource(source, source.indexOf(right), mounted.view.state.lineBreak)
   await act(async () => { mounted.view.dispatch({ selection: { anchor: point } }); await flush() })
   await chooseChildCommand("timestamp-inactive")
   expect((screen.getByRole("combobox", { name: /^Inactive timestamp\b/ }) as HTMLInputElement).value).toBe(left)
   await acceptChildParameter("2026-10-20")
   expect(mounted.runtime.source).toBe(source.replace(left, "[2026-10-20]"))
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
  } finally { mounted.dispose() }
 })

 it.each([
  "#+begin_src org\r\n<2026-10-14 Wed>\r\n#+end_src\r\n",
  "=<2026-10-14 Wed>=\r\n",
  "[[file:a.org][<2026-10-14 Wed>]]\r\n",
  "# comment <2026-10-14 Wed>\r\n",
 ])("recognizes lexical at-point stamps without inventing heading-context exclusions", async body => {
  const source = `* Heading\r\n${body}raw\0😀\r\n`
  const mounted = await mountCanonicalChild(source)
  try {
   const point = editorOffsetFromSource(source, source.indexOf("<2026-10-14 Wed>") + 3, mounted.view.state.lineBreak)
   await act(async () => { mounted.view.dispatch({ selection: { anchor: point } }); await flush() })
   await chooseChildCommand("timestamp-inactive")
   expect((screen.getByRole("combobox", { name: /^Inactive timestamp\b/ }) as HTMLInputElement).value).toBe("<2026-10-14 Wed>")
   await acceptChildParameter("2026-10-20")
   expect(mounted.runtime.source).toBe(source.replace("<2026-10-14 Wed>", "[2026-10-20]"))
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
  } finally { mounted.dispose() }
 })

 it("rejects an unsupported located stored stamp instead of inserting a guessed replacement beside it", async () => {
  const source = "* Heading\r\n<2026-10-14 Wed 10:00 +1z>\r\nraw\0😀\r\n"
  const mounted = await mountCanonicalChild(source)
  try {
   const point = editorOffsetFromSource(source, source.indexOf("<") + 5, mounted.view.state.lineBreak)
   await act(async () => { mounted.view.dispatch({ selection: { anchor: point } }); await flush() })
   await chooseChildCommand("timestamp-active")
   expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
   expect(mounted.runtime.source).toBe(source)
   expect(mounted.onCommit).not.toHaveBeenCalled()
   expect(undoDepth(mounted.runtime.state)).toBe(0)
  } finally { mounted.dispose() }
 })

 it.each([
  ["remove-scheduled", "SCHEDULED", "DEADLINE"],
  ["remove-deadline", "DEADLINE", "SCHEDULED"],
 ] as const)("executes %s directly through canonical Source without a fake calendar prompt", async (id, removed, retained) => {
  const source = "* TODO First\r\nSCHEDULED: <2026-10-14 Wed 10:00 +1w> \t DEADLINE: <2026-10-15 Thu -2d>\r\nraw\0😀\n"
  const mounted = await mountCanonicalChild(source)
  try {
   await chooseChildCommand(id)
   expect(screen.queryByRole("combobox")).toBeNull()
   expect(mounted.runtime.source).not.toContain(`${removed}:`)
   expect(mounted.runtime.source).toContain(`${retained}: ${retained === "DEADLINE" ? "<2026-10-15 Thu -2d>" : "<2026-10-14 Wed 10:00 +1w>"}`)
   expect(mounted.runtime.source).toContain("raw\0😀\n")
   expect(mounted.main.state.sliceDoc()).toBe(mounted.runtime.source)
   expect(mounted.view.state.sliceDoc()).toBe(mounted.runtime.source)
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
   await act(async () => { fireEvent.keyDown(mounted.main.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 }); await flush() })
   expect(mounted.runtime.source).toBe(source)
  } finally { mounted.dispose() }
 })

 it("finishes a recurring task directly using the first configured done state and zero cookies", async () => {
  const source = "#+TODO: TODO WAIT | FINISHED CANCELLED\r\n* WAIT First\r\nSCHEDULED: <2026-10-14 Wed 10:00 +1w> DEADLINE: <2026-10-15 Thu ++2d>\r\nbody <2026-10-16 Fri .+1m>\r\n#+begin_src org\r\n<2026-10-17 Sat +1y>\r\n#+end_src\r\nraw\0😀\n"
  const mounted = await mountCanonicalChild(source)
  try {
   await act(async () => { mounted.view.dispatch({ selection: { anchor: mounted.view.state.doc.line(2).from + 2 } }); await flush() })
   await chooseChildCommand("complete-repeating")
   expect(screen.queryByRole("combobox")).toBeNull()
   expect(mounted.runtime.source).toContain("* FINISHED First")
   expect(mounted.runtime.source).toContain("SCHEDULED: <2026-10-14 Wed 10:00 +0w>")
   expect(mounted.runtime.source).toContain("DEADLINE: <2026-10-15 Thu ++0d>")
   expect(mounted.runtime.source).toContain("body <2026-10-16 Fri .+0m>")
   expect(mounted.runtime.source).toContain("#+begin_src org\r\n<2026-10-17 Sat +1y>\r\n#+end_src\r\nraw\0😀\n")
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
   await act(async () => { fireEvent.keyDown(mounted.main.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 }); await flush() })
   expect(mounted.runtime.source).toBe(source)
  } finally { mounted.dispose() }
 })

 it.each(["scheduled", "deadline", "timestamp-active", "timestamp-inactive"])("applies the frozen compatible-year policy to absolute %s input", async id => {
  useSettings.setState({ orgBehaviorConfigurationJson: JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION,
   dateReader: { preferFuture: false, forceCompatibleYears: true } }) })
  const source = "* TODO First\r\nraw\0😀\n"
  const mounted = await mountCanonicalChild(source)
  try {
   await chooseChildCommand(id)
   await acceptChildParameter("2040-10-14")
   expect(mounted.runtime.source).toContain(id === "timestamp-inactive" ? "[2037-10-14]" : "<2037-10-14>")
   expect(mounted.runtime.source).not.toContain("2040-10-14")
   expect(mounted.runtime.source).toContain("raw\0😀\n")
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
  } finally { mounted.dispose() }
 })

 it("retains planning prompt omissions, relative setup date, cookies and the logging stamp across midnight", async () => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 9, 14, 23, 55))
  useSettings.setState({ orgBehaviorConfigurationJson: JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION,
   logging: { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.logging, reschedule: "note" } }) })
  const source = "* TODO First\r\nSCHEDULED: <2026-10-14 Wed 10:00 +1w -2d>\r\nraw\0😀\n"
  const mounted = await mountCanonicalChild(source)
  try {
   await chooseChildCommand("scheduled")
   await acceptChildParameter("tomorrow")
   const note = screen.getByRole("textbox", { name: "Reschedule note" })
   fireEvent.change(note, { target: { value: "literal note\0😀" } })
   expect(mounted.runtime.source).toBe(source)
   expect(undoDepth(mounted.runtime.state)).toBe(0)
   vi.setSystemTime(new Date(2026, 9, 15, 0, 5))
   await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Finish note" })); await flush() })
   expect(mounted.runtime.source).toContain("SCHEDULED: <2026-10-15 10:00 +1w -2d>")
   expect(mounted.runtime.source).toContain("[2026-10-14 Wed 23:55]")
   expect(mounted.runtime.source).not.toContain("[2026-10-15 Thu 00:05]")
   expect(mounted.runtime.source).toContain("literal note")
   expect(mounted.runtime.source).toContain("raw\0😀\n")
   expect(mounted.main.state.sliceDoc()).toBe(mounted.runtime.source)
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
   await act(async () => { fireEvent.keyDown(mounted.main.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 }); await flush() })
   expect(mounted.runtime.source).toBe(source)
  } finally { mounted.dispose() }
 })

 it("keeps the TODO completion and relative repeat anchored to note setup rather than Finish", async () => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 9, 14, 23, 55))
  const source = "#+TODO: TODO | DONE(d@)\r\n* TODO First\r\nSCHEDULED: <2026-10-10 Sat 10:00 .+1w>\r\nraw\0😀\n"
  const mounted = await mountCanonicalChild(source)
  try {
   await act(async () => { mounted.view.dispatch({ selection: { anchor: mounted.view.state.doc.line(2).from + 2 } }); await flush() })
   await chooseChildCommand("todo-state")
   await acceptChildParameter("DONE")
   fireEvent.change(screen.getByRole("textbox", { name: "TODO note" }), { target: { value: "repeat note\0😀" } })
   expect(mounted.runtime.source).toBe(source)
   vi.setSystemTime(new Date(2026, 9, 15, 0, 5))
   await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Finish note" })); await flush() })
   expect(mounted.runtime.source).toContain("* TODO First")
   expect(mounted.runtime.source).toContain("SCHEDULED: <2026-10-21")
   expect(mounted.runtime.source).not.toContain("2026-10-22")
   expect(mounted.runtime.source).toContain("[2026-10-14 Wed 23:55]")
   expect(mounted.runtime.source).not.toContain("[2026-10-15 Thu 00:05]")
   expect(mounted.runtime.source).toContain("repeat note")
   expect(mounted.runtime.source).toContain("raw\0😀\n")
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
  } finally { mounted.dispose() }
 })

 it.each(["remove-scheduled", "remove-deadline", "complete-repeating"] as const)("opens only the real logging-note tool for direct %s when configured", async id => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 9, 14, 23, 55))
  useSettings.setState({ orgBehaviorConfigurationJson: JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION,
   logging: { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.logging, reschedule: "note", redeadline: "note", done: "note" } }) })
  const source = "* TODO First\r\nSCHEDULED: <2026-10-14 Wed +1w> DEADLINE: <2026-10-15 Thu ++2d>\r\nraw\0😀\n"
  const mounted = await mountCanonicalChild(source)
  try {
   await chooseChildCommand(id)
   expect(screen.queryByRole("combobox")).toBeNull()
   const label = id === "remove-scheduled" ? "Reschedule note" : id === "remove-deadline" ? "Deadline change note" : "TODO note"
   fireEvent.change(screen.getByRole("textbox", { name: label }), { target: { value: "direct operation note\0😀" } })
   expect(mounted.runtime.source).toBe(source)
   expect(undoDepth(mounted.runtime.state)).toBe(0)
   vi.setSystemTime(new Date(2026, 9, 15, 0, 5))
   await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Finish note" })); await flush() })
   if (id === "complete-repeating") {
    expect(mounted.runtime.source).toContain("* DONE First")
    expect(mounted.runtime.source).toContain("SCHEDULED: <2026-10-14 Wed +0w>")
    expect(mounted.runtime.source).toContain("DEADLINE: <2026-10-15 Thu ++0d>")
   } else expect(mounted.runtime.source).not.toContain(id === "remove-scheduled" ? "SCHEDULED:" : "DEADLINE:")
   expect(mounted.runtime.source).toContain("[2026-10-14 Wed 23:55]")
   expect(mounted.runtime.source).not.toContain("[2026-10-15 Thu 00:05]")
   expect(mounted.runtime.source).toContain("direct operation note")
   expect(mounted.runtime.source).toContain("raw\0😀\n")
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
  } finally { mounted.dispose() }
 })

 it("retires real Source captures on behavior ABA before any parameter lease can retarget them", async () => {
  const mounted = await mountCanonicalChild(nativeSparseSource)
  try {
   const origin = mounted.mainTarget.captureSourceTransform!()!
   const captured = mounted.mainTarget.captureCommand("todo")!
   expect(origin.isCurrent()).toBe(true)
   act(() => {
    useSettings.setState({ orgBehaviorConfigurationJson: JSON.stringify(DEFAULT_ORG_BEHAVIOR_CONFIGURATION) })
    useSettings.setState({ orgBehaviorConfigurationJson: "" })
   })
   expect(origin.isCurrent()).toBe(false)
   expect(captured()).toBe(false)
   let accepted: boolean | undefined
   await act(async () => {
    accepted = await origin.apply({ changes: [{ from: 0, to: 0, insert: "stale" }], cursor: 5 })
    await flush()
   })
   expect(accepted).toBe(false)
   expect(mounted.runtime.source).toBe(nativeSparseSource)
   expect(mounted.runtime.revision).toBe(0)
   expect(mounted.onCommit).not.toHaveBeenCalled()
   expect(undoDepth(mounted.runtime.state)).toBe(0)
  } finally { mounted.dispose() }
 })

 it.each(["/approved/first/a.org", "/approved/second/a.org"])("uses the issued full FILE %s and computed BLOCKED without a native read or canonical view mutation", async filename => {
  const mounted = await mountCanonicalChild(nativeSparseSource, filename)
  try {
   act(() => mounted.mainTarget.applyView!(nativeSparseSource, { kind: "sparse-tree", query: "todo" }))
   const mainQuery = mounted.main.state.field(orgSparseTreeField)
   const mainSelection = mounted.main.state.selection
   await chooseChildCommand("sparse-tree")
   const nativeReads = nativeInvoke.mock.calls.filter(([command]) => command === "collate_org_match_strings" || command === "capture_org_match_clock_context").length
   await acceptChildParameter(`FILE="${filename}" AND BLOCKED=""/TODO`)
   expect(mounted.view.state.field(orgSparseTreeField)!.plan!.matchedHeadingStarts).toEqual([0])
   expect(mounted.view.contentDOM.textContent).not.toContain("last body")
   expect(mounted.runtime.source).toBe(nativeSparseSource)
   expect(mounted.runtime.revision).toBe(0)
   expect(undoDepth(mounted.runtime.state)).toBe(0)
   expect(mounted.onCommit).not.toHaveBeenCalled()
   expect(mounted.main.state.field(orgSparseTreeField)).toBe(mainQuery)
   expect(mounted.main.state.selection.eq(mainSelection, true)).toBe(true)
   expect(nativeInvoke.mock.calls.filter(([command]) => command === "collate_org_match_strings" || command === "capture_org_match_clock_context")).toHaveLength(nativeReads)
   expect(nativeInvoke.mock.calls.filter(([command, args]) => command === "post_org_window_intent" && args.payload.kind === "transactions")).toHaveLength(0)
   await chooseChildCommand("clear-sparse-tree")
   expect(mounted.view.state.field(orgSparseTreeField)).toBeNull()
   expect(mounted.main.state.field(orgSparseTreeField)).toBe(mainQuery)
  } finally { mounted.dispose() }
 })

 it("keeps narrowing and folding in the invoking child, using the existing scoped Source keymap", async () => {
  const mounted = await mountCanonicalChild(nativeSparseSource)
  try {
   useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1, bindings: [
    { scope: "org-source", key: "A-n", command: "narrow-to-subtree" },
    { scope: "org-source", key: "A-w", command: "widen" },
   ] }) })
   await act(async () => { await flush() })
   const mainSelection = mounted.main.state.selection
   act(() => fireEvent.keyDown(mounted.view.contentDOM, { altKey: true, key: "n" }))
   await act(async () => { await flush() })
   expect(mounted.view.state.field(orgRemarkNoteRangeField)).toMatchObject({ from: 0, to: nativeSparseSource.indexOf("* DONE") })
   expect(mounted.view.contentDOM.textContent).not.toContain("last body")
   expect(mounted.main.state.field(orgRemarkNoteRangeField)).toBeNull()
   act(() => fireEvent.keyDown(mounted.view.contentDOM, { altKey: true, key: "w" }))
   await act(async () => { await flush() })
   expect(mounted.view.state.field(orgRemarkNoteRangeField)).toBeNull()
   await chooseChildCommand("fold-all")
   expect(foldedRanges(mounted.view.state).size).toBeGreaterThan(0)
   expect(foldedRanges(mounted.main.state).size).toBe(0)
   await chooseChildCommand("unfold-all")
   expect(foldedRanges(mounted.view.state).size).toBe(0)
   expect(mounted.runtime.source).toBe(nativeSparseSource)
   expect(mounted.runtime.revision).toBe(0)
   expect(undoDepth(mounted.runtime.state)).toBe(0)
   expect(mounted.main.state.selection.eq(mainSelection, true)).toBe(true)
   expect(nativeInvoke.mock.calls.filter(([command, args]) => command === "post_org_window_intent" && args.payload.kind === "transactions")).toHaveLength(0)
  } finally { mounted.dispose() }
 })

 it("applies a held native NLS ordering snapshot only to the originating child and restores every selection range on clear", async () => {
  const mounted = await mountCanonicalChild(nativeSparseSource)
  const pending = Promise.withResolvers<{ locale: string; ranks: number[] }>()
  mounted.reads.collation = () => pending.promise
  try {
   const selection = EditorSelection.create([EditorSelection.range(2, 6, 42, 2), EditorSelection.cursor(16, -1, 2, 31)], 0)
   await act(async () => { mounted.view.dispatch({ selection }); await flush() })
   act(() => mounted.mainTarget.applyView!(nativeSparseSource, { kind: "sparse-tree", query: "todo" }))
   const mainQuery = mounted.main.state.field(orgSparseTreeField)
   const mainSelection = mounted.main.state.selection
   nativeInvoke.mockClear()
   await chooseChildCommand("sparse-tree")
   await acceptChildParameter('NAME>"m"')
   expect(mounted.view.state.field(orgSparseTreeField)).toBeNull()
   await act(async () => { pending.resolve({ locale: "C", ranks: [1, 0, 2] }); await flush() })
   expect(mounted.view.state.field(orgSparseTreeField)!.plan!.matchedHeadingStarts).toEqual([nativeSparseSource.indexOf("* DONE")])
   expect(mounted.view.contentDOM.textContent).not.toContain("first body")
   expect(mounted.main.state.field(orgSparseTreeField)).toBe(mainQuery)
   expect(mounted.main.state.selection.eq(mainSelection, true)).toBe(true)
   await chooseChildCommand("clear-sparse-tree")
   expect(mounted.view.state.selection.eq(selection, true)).toBe(true)
   expect(mounted.view.state.selection.ranges).toEqual(selection.ranges)
   expect(mounted.runtime.source).toBe(nativeSparseSource)
   expect(mounted.runtime.revision).toBe(0)
   expect(undoDepth(mounted.runtime.state)).toBe(0)
   expect(nativeInvoke.mock.calls.filter(([command, args]) => command === "post_org_window_intent" && args.payload.kind === "transactions")).toHaveLength(0)
  } finally { mounted.dispose() }
 })

 it("uses actual CLOCK read results only in the child and leaves the main query/history untouched", async () => {
  const mounted = await mountCanonicalChild(nativeClockSource)
  try {
   act(() => mounted.mainTarget.applyView!(nativeClockSource, { kind: "sparse-tree", query: "todo" }))
   const mainQuery = mounted.main.state.field(orgSparseTreeField)
   await chooseChildCommand("sparse-tree")
   await acceptChildParameter('CLOCKSUM="1:00"')
   expect(mounted.view.state.field(orgSparseTreeField)!.plan!.matchedHeadingStarts).toEqual([0])
   expect(mounted.main.state.field(orgSparseTreeField)).toBe(mainQuery)
   expect(mounted.runtime.source).toBe(nativeClockSource)
   expect(mounted.runtime.revision).toBe(0)
   expect(undoDepth(mounted.runtime.state)).toBe(0)
   expect(nativeInvoke.mock.calls.filter(([command]) => command === "capture_org_match_clock_context")).toHaveLength(1)
  } finally { mounted.dispose() }
 })

 it.each(["cancel", "behavior ABA", "input ABA", "Source ABA", "rebound", "close", "unmount"] as const)(
  "retires held readonly native work on %s without publishing Source/query or stealing the main caret", async drift => {
   const mounted = await mountCanonicalChild(nativeSparseSource)
   const pending = Promise.withResolvers<{ locale: string; ranks: number[] }>()
   mounted.reads.collation = () => pending.promise
   try {
    await chooseChildCommand("sparse-tree")
    await acceptChildParameter('NAME>"m"')
    expect(screen.getByRole("combobox", { name: /^Sparse tree\b/ }).getAttribute("aria-busy")).toBe("true")
    const mainSelection = mounted.main.state.selection
    if (drift === "cancel") {
     fireEvent.click(screen.getByRole("button", { name: "Cancel minibuffer" }))
     await act(async () => { await flush() })
     await chooseChildCommand("sparse-tree")
     await acceptChildParameter("todo")
    } else if (drift === "behavior ABA") {
     act(() => {
      useSettings.setState({ orgBehaviorConfigurationJson: JSON.stringify(DEFAULT_ORG_BEHAVIOR_CONFIGURATION) })
      useSettings.setState({ orgBehaviorConfigurationJson: "" })
     })
    } else if (drift === "input ABA") {
     act(() => {
      useSettings.setState({ orgKeymapConfigurationJson: '{"version":1,"modalEngine":"vim"}' })
      useSettings.setState({ orgKeymapConfigurationJson: "" })
     })
    } else if (drift === "Source ABA") {
     await act(async () => {
      mounted.main.dispatch({ changes: { from: 3, insert: "temporary " } })
      fireEvent.keyDown(mounted.main.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 })
      await flush()
     })
     expect(mounted.runtime.revision).toBe(2)
    } else if (drift === "rebound") act(mounted.rebind)
    else if (drift === "close") act(mounted.requestClose)
    else mounted.rendered.unmount()
    await act(async () => { if (drift !== "unmount") mounted.main.focus(); pending.resolve({ locale: "C", ranks: [1, 0, 2] }); await flush() })
    const nativeView = drift === "rebound" ? EditorView.findFromDOM(screen.getByRole("textbox", { name: "Detached Org Source editor" }))! : mounted.view
    expect(nativeView.state.field(orgSparseTreeField)?.plan?.matchedHeadingStarts ?? null).toEqual(drift === "cancel" ? [0] : null)
    expect(mounted.main.state.field(orgSparseTreeField)).toBeNull()
    expect(mounted.main.state.selection.eq(mainSelection, true)).toBe(true)
    expect(mounted.runtime.source).toBe(nativeSparseSource)
    expect(undoDepth(mounted.runtime.state)).toBe(0)
    if (drift !== "unmount") expect(document.activeElement).toBe(mounted.main.contentDOM)
   } finally { mounted.dispose() }
  },
 )

 it("surfaces a native context read failure without Source/query publication and preserves a retryable owned parameter", async () => {
  const mounted = await mountCanonicalChild(nativeClockSource)
  mounted.reads.clock = () => Promise.reject(new Error("Native calendar context unavailable"))
  try {
   await chooseChildCommand("sparse-tree")
   await acceptChildParameter('CLOCKSUM>"1:30"')
   expect(screen.getByRole("combobox", { name: /^Sparse tree\b/ })).toBeTruthy()
   expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
   expect(mounted.view.state.field(orgSparseTreeField)).toBeNull()
   expect(mounted.runtime.source).toBe(nativeClockSource)
   expect(mounted.runtime.revision).toBe(0)
   expect(undoDepth(mounted.runtime.state)).toBe(0)
  } finally { mounted.dispose() }
 })

 it("retains unknown-effect Source input while retiring a native read instead of publishing a late query", async () => {
  const source = nativeSparseSource.replace("first body\0\r\n", "first body\0😀\nraw CR\rlast CRLF\r\n")
  const mounted = await mountCanonicalChild(source)
  const pending = Promise.withResolvers<{ locale: string; ranks: number[] }>()
  mounted.reads.collation = () => pending.promise
  try {
   await chooseChildCommand("sparse-tree")
   await acceptChildParameter('NAME>"m"')
   const unknown = StateEffect.define<number>()
   act(() => mounted.view.dispatch({ changes: { from: 0, insert: "retained " }, effects: unknown.of(1) }))
   await act(async () => { pending.resolve({ locale: "C", ranks: [1, 0, 2] }); await flush() })
   expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
   expect(screen.getByLabelText("Retained Source text").textContent).toBe("retained " + source)
   expect(mounted.view.state.field(orgSparseTreeField)).toBeNull()
   expect(mounted.runtime.source).toBe(source)
   expect(mounted.runtime.revision).toBe(0)
   expect(undoDepth(mounted.runtime.state)).toBe(0)
   fireEvent.click(screen.getByRole("button", { name: "Close view" }))
   await act(async () => { await flush() })
   expect(nativeInvoke.mock.calls.filter(([command]) => command === "close_org_detached_window")).toHaveLength(0)
  } finally { mounted.dispose() }
 })

 it.each(["todo", "scheduled"])("collects %s logging notes in the shared real tool and waits for canonical acceptance exactly once", async id => {
  const source = id === "todo"
   ? "#+TODO: TODO | DONE(d@)\r\n* TODO First\r\nraw\0😀\r\n"
   : "#+STARTUP: lognotereschedule\r\n* TODO First\r\nSCHEDULED: <2026-10-10 Sat +1w>\r\nraw\0😀\r\n"
  const mounted = await mountCanonicalChild(source)
  try {
   await act(async () => { mounted.view.dispatch({ selection: { anchor: mounted.view.state.doc.line(2).from + 2 } }); await flush() })
   await chooseChildCommand(id)
   if (id === "scheduled") await acceptChildParameter("2026-10-12 10:30")
   expect(mounted.runtime.source).toBe(source)
   expect(undoDepth(mounted.runtime.state)).toBe(0)
   const note = screen.getByRole("textbox", { name: id === "todo" ? "TODO note" : "Reschedule note" })
   fireEvent.change(note, { target: { value: "literal 😀\n* not a heading\0" } })
   fireEvent.click(screen.getByRole("button", { name: "Close view" }))
   await act(async () => { await flush() })
   expect(nativeInvoke.mock.calls.filter(([command]) => command === "close_org_detached_window")).toHaveLength(0)
   await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Finish note" })); await flush() })
   expect(mounted.runtime.source).toContain(id === "todo" ? "* DONE First" : "SCHEDULED: <2026-10-12 10:30")
   expect(mounted.runtime.source).toContain("literal 😀")
   expect(mounted.runtime.source).toContain("raw\0😀\r\n")
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
   await act(async () => { fireEvent.keyDown(mounted.main.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 }); await flush() })
   expect(mounted.runtime.source).toBe(source)
  } finally { mounted.dispose() }
 })

 it("protects the actual logging-note draft across Source rebound and refuses its stale finish", async () => {
  const source = "#+TODO: TODO | DONE(d@)\r\n* TODO First\r\nraw\0😀\r\n"
  const mounted = await mountCanonicalChild(source)
  try {
   await act(async () => { mounted.view.dispatch({ selection: { anchor: mounted.view.state.doc.line(2).from + 2 } }); await flush() })
   await chooseChildCommand("todo")
   const note = screen.getByRole("textbox", { name: "TODO note" }) as HTMLTextAreaElement
   fireEvent.change(note, { target: { value: "copyable draft\0😀" } })
   await act(async () => { mounted.rebind(); await flush() })
   expect(screen.getByRole("textbox", { name: "TODO note" })).toBe(note)
   expect(note.value).toBe("copyable draft\0😀")
   expect(note.readOnly).toBe(true)
   fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
   fireEvent.click(screen.getByRole("button", { name: "Close view" }))
   await act(async () => { await flush() })
   expect(mounted.runtime.source).toBe(source)
   expect(undoDepth(mounted.runtime.state)).toBe(0)
   expect(nativeInvoke.mock.calls.filter(([command]) => command === "close_org_detached_window")).toHaveLength(0)
   expect(note.value).toBe("copyable draft\0😀")
  } finally { mounted.dispose() }
 })
})

describe("native Source acceptance and refresh retirement", () => {
 it("keeps a submitted Source parameter locked in the sole host until its real canonical projection arrives", async () => {
  const mounted = await mountCanonicalChild(nativeSparseSource)
  try {
   await chooseChildCommand("tags")
   mounted.transport.holdAcceptance = true
   await acceptChildParameter("work")
   expect(mounted.runtime.source).toContain(":work:")
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
   const input = screen.getByRole("combobox", { name: /^Tags:/ })
   expect(input.getAttribute("aria-busy")).toBe("true")
   await act(async () => { fireEvent.keyDown(input, { key: "Enter" }); await flush() })
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
   expect((screen.getByRole("button", { name: "Cancel minibuffer" }) as HTMLButtonElement).disabled).toBe(true)
   fireEvent.click(screen.getByRole("button", { name: "Close view" }))
   await act(async () => { await flush() })
   expect(nativeInvoke.mock.calls.filter(([command]) => command === "close_org_detached_window")).toHaveLength(0)
   await act(async () => { mounted.releaseAccepted(); await flush() })
   await waitFor(() => expect(screen.queryByRole("combobox", { name: /^Tags:/ })).toBeNull())
   expect(mounted.view.state.sliceDoc()).toBe(mounted.runtime.source)
   expect(mounted.onCommit).toHaveBeenCalledTimes(1)
   await act(async () => { fireEvent.keyDown(mounted.view.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 }); await flush() })
   expect(mounted.runtime.source).toBe(nativeSparseSource)
   expect(mounted.main.state.sliceDoc()).toBe(nativeSparseSource)
  } finally { mounted.dispose() }
 })

 it.each(["behavior ABA", "input ABA", "close"] as const)("retires an already-accepted sparse view's held CLOCK refresh on %s", async drift => {
  const mounted = await mountCanonicalChild(nativeClockSource)
  const pending = Promise.withResolvers<{ nowEpochMs: number; todayStartEpochMs: number; todayEndEpochMs: number; calendarEpochMs: number[] }>()
  try {
   await chooseChildCommand("sparse-tree")
   await acceptChildParameter('CLOCKSUM="1:00"')
   mounted.reads.clock = () => pending.promise
   const from = editorOffsetFromSource(nativeClockSource, nativeClockSource.indexOf("11:00"), mounted.main.state.lineBreak)
   await act(async () => { mounted.main.dispatch({ changes: { from, to: from + 5, insert: "12:00" } }); await flush() })
   expect(mounted.view.state.field(orgSparseTreeField)!.contextStatus).toBe("pending")
   const accepted = mounted.runtime.source, revision = mounted.runtime.revision
   if (drift === "close") act(mounted.requestClose)
   else act(() => {
    if (drift === "behavior ABA") {
     useSettings.setState({ orgBehaviorConfigurationJson: JSON.stringify(DEFAULT_ORG_BEHAVIOR_CONFIGURATION) })
     useSettings.setState({ orgBehaviorConfigurationJson: "" })
    } else {
     useSettings.setState({ orgKeymapConfigurationJson: '{"version":1,"modalEngine":"vim"}' })
     useSettings.setState({ orgKeymapConfigurationJson: "" })
    }
   })
   await act(async () => {
    pending.resolve({ nowEpochMs: 50_400_000, todayStartEpochMs: 0, todayEndEpochMs: 86_400_000,
     calendarEpochMs: [36_000_000, 43_200_000, 36_000_000, 43_200_000] })
    await flush()
   })
   expect(mounted.view.state.field(orgSparseTreeField)?.plan ?? null).toBeNull()
   expect(mounted.runtime.source).toBe(accepted)
   expect(mounted.runtime.revision).toBe(revision)
   expect(undoDepth(mounted.runtime.state)).toBe(1)
   expect(mounted.main.state.field(orgSparseTreeField)).toBeNull()
  } finally { mounted.dispose() }
 })
})

