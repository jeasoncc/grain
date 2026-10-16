import { afterEach, describe, expect, it, vi } from "vitest"
import { EditorState, EditorSelection } from "@codemirror/state"
import { isolateHistory } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgBufferRuntime, OrgBufferWindowHandle } from "@/flows/org-editor-runtime"
import type { OrgCapturedSourceTransform } from "@/views/org-editor/org-editor.types"
import { parseOrgClocks } from "@/pipes/org/org-clock.pipe"
import { captureOrgSparseSpecialProperties } from "@/pipes/org/org-sparse-special-properties.pipe"
import { readOrgSparseClockContext } from "@/io/api/org-clock-context.api"
import { createOrgClockOwner } from "./org-clock-owner"

vi.mock("@/io/api/org-clock-context.api", () => ({ readOrgSparseClockContext: vi.fn() }))
const epoch = Date.UTC(2026, 9, 9, 10, 0)
let now = epoch
const disposers: (() => void)[] = []
afterEach(() => { for (const dispose of disposers.splice(0)) dispose(); vi.clearAllMocks() })
function setup(sources: readonly string[]) {
	now = epoch
	vi.mocked(readOrgSparseClockContext).mockImplementation(async () => ({ nowEpochMs: now, todayStartEpochMs: epoch - 36000000, todayEndEpochMs: epoch + 50400000,
		durationFormat: "gnu-default", includeClockingTask: false, activeClock: null, localTimeToEpochMs: () => { throw new Error("No calendar conversion requested") } }))
	const buffers = sources.map((source, index) => ({ relativePath: `${index}.org`, runtime: createOrgBufferRuntime({ key: { workspaceSessionId: "session", bufferId: String(index) }, source, canCommit: () => true, onCommit: () => undefined }) }))
	let current = true
	const owner = createOrgClockOwner()
	owner.configure({ scope: {}, rootPath: "/workspace", isCurrent: () => current, buffers: () => buffers,
		available: () => current, commit: (runtime, source, edits, guard) => guard() && runtime.applyCommandEdits(source, edits),
		agenda: async () => { throw new Error("Source test must not invoke Agenda") } })
	const capture = (runtime: OrgBufferRuntime, cursor: number): OrgCapturedSourceTransform => {
		const source = runtime.source, revision = runtime.revision
		return { snapshot: { content: source, relativePath: buffers.find(buffer => buffer.runtime === runtime)!.relativePath, windowId: "source", revision,
			configurationGeneration: {}, readOnly: false, cursor, selection: { mainIndex: 0, ranges: [] } },
			isCurrent: () => current && runtime.source === source && runtime.revision === revision,
			apply: async batch => runtime.applyCommandEdits(source, batch.changes.map(change => ({ ...change, cursor: batch.cursor }))) }
	}
	const attach = (runtime: OrgBufferRuntime, cursor: number) => {
		let handle!: OrgBufferWindowHandle
		const view = new EditorView({ state: EditorState.create({ doc: runtime.state.doc, selection: EditorSelection.cursor(cursor), extensions: runtime.historyFreeSourceExtensions }),
			dispatchTransactions: transactions => handle.dispatchTransactions(transactions) })
		handle = runtime.attachWindow({ windowId: `view-${disposers.length}`, view })
		disposers.push(() => { handle.detach(); view.destroy() })
		return { view, handle }
	}
	disposers.push(() => { for (const buffer of buffers) buffer.runtime.close() })
	return { owner, buffers, capture, attach, retire: () => { current = false } }
}
const active = (runtime: OrgBufferRuntime) => {
	const result = parseOrgClocks(runtime.source)
	if (result.kind !== "snapshot") throw new Error(result.message)
	return result.active
}
describe("root-owned canonical Clock epoch identity", () => {
	it("switches headings in one history event, restores known epochs on undo/redo and leaves raw foreign selections mapped", async () => {
		const original = "outside\0\r\n* A 😀\r\nbody\r\n* B\r\nforeign 😀\0"
		const { owner, buffers, capture, attach } = setup([original])
		const runtime = buffers[0].runtime
		const peer = attach(runtime, runtime.state.doc.length)
		const start = owner.captureSource("clock-in", capture(runtime, original.indexOf("* A")), runtime, () => true)!
		expect(await start()).toMatchObject({ kind: "success" })
		const first = runtime.source
		expect(active(runtime)?.headingFrom).toBe(original.indexOf("* A"))
		now += 120000
		const native = await readOrgSparseClockContext([])
		const clock = owner.captureSparseContext(runtime.source, "/workspace/0.org")(native)
		const sums = captureOrgSparseSpecialProperties(runtime.source,
			{ properties: ["CLOCKSUM", "CLOCKSUM_T"], headingStarts: [original.indexOf("* A")] }, { clock })
		expect(sums.get("CLOCKSUM")?.get(original.indexOf("* A"))).toBeUndefined()
		expect(sums.get("CLOCKSUM_T")?.get(original.indexOf("* A"))).toBe("0:02")
		const switchClock = owner.captureSource("clock-in", capture(runtime, runtime.source.indexOf("* B")), runtime, () => true)!
		expect(await switchClock()).toMatchObject({ kind: "success" })
		expect(runtime.source).toContain("=> 0:02")
		expect(runtime.source.startsWith("outside\0\r\n")).toBe(true)
		expect(runtime.source.endsWith("foreign 😀\0")).toBe(true)
		expect(peer.view.state.selection.main.head).toBe(peer.view.state.doc.length)
		expect(peer.handle.undo()).toBe(true)
		expect(runtime.source).toBe(first)
		const report = await owner.captureSource("clock-report", capture(runtime, 0), runtime, () => true)!()
		expect(report).toMatchObject({ kind: "report", runningMinutes: 2, report: { totalMinutes: 0 } })
		expect(peer.handle.redo()).toBe(true)
		expect(active(runtime)?.headingFrom).toBe(runtime.source.indexOf("* B"))
		const out = owner.captureSource("clock-out", capture(runtime, 0), runtime, () => true)!
		expect(await out()).toMatchObject({ kind: "success" })
		expect(active(runtime)).toBeNull()
		expect(peer.handle.undo()).toBe(true)
		expect(active(runtime)?.headingFrom).toBe(runtime.source.indexOf("* B"))
		expect(await owner.captureSource("cancel-clock", capture(runtime, 0), runtime, () => true)!()).toMatchObject({ kind: "success" })
		expect(active(runtime)).toBeNull()
	})
	it("out follows the identified canonical buffer after focus switches; abandoned/replaced row text never invents an epoch", async () => {
		const { owner, buffers, capture, attach } = setup(["* A\nbody", "* B\nbody"])
		const [a, b] = buffers.map(buffer => buffer.runtime)
		expect(await owner.captureSource("clock-in", capture(a, 0), a, () => true)!()).toMatchObject({ kind: "success" })
		now += 180000
		expect(await owner.captureSource("clock-out", capture(b, 0), b, () => true)!()).toMatchObject({ kind: "success" })
		expect(a.source).toContain("=> 0:03")
		expect(b.source).toBe("* B\nbody")
		expect(await owner.captureSource("clock-in", capture(a, 0), a, () => true)!()).toMatchObject({ kind: "success" })
		const peer = attach(a, 0)
		peer.view.dispatch({ changes: { from: 0, to: peer.view.state.doc.length, insert: peer.view.state.doc } })
		const result = await owner.captureSource("clock-report", capture(a, 0), a, () => true)!()
		expect(result).toMatchObject({ kind: "report", runningMinutes: null })
		expect(peer.handle.undo()).toBe(true)
		expect(await owner.captureSource("clock-report", capture(a, 0), a, () => true)!()).toMatchObject({ kind: "report", runningMinutes: 0 })
	})
	it("does not revive a discarded epoch when ordinary input recreates its row on a history branch", async () => {
		const { owner, buffers, capture, attach } = setup(["* A\nbody"])
		const runtime = buffers[0].runtime
		const peer = attach(runtime, runtime.state.doc.length)
		peer.view.dispatch({ changes: { from: peer.view.state.doc.length, insert: "\nordinary 😀\0" } })
		const unclocked = runtime.source
		expect(await owner.captureSource("clock-in", capture(runtime, 0), runtime, () => true)!()).toMatchObject({ kind: "success" })
		const clocked = runtime.source
		expect(peer.handle.undo()).toBe(true)
		expect(runtime.source).toBe(unclocked)
		expect(owner.captureSparseClock(runtime.source, "/workspace/0.org").activeClock).toBeNull()
		expect(peer.handle.redo()).toBe(true)
		expect(owner.captureSparseClock(runtime.source, "/workspace/0.org").activeClock?.startedAtEpochMs).toBe(epoch)
		expect(peer.handle.undo()).toBe(true)
		peer.view.dispatch({ changes: { from: 0, to: peer.view.state.doc.length, insert: clocked }, annotations: isolateHistory.of("full") })
		expect(peer.handle.redo()).toBe(false)
		expect(runtime.source).toBe(clocked)
		expect(await owner.captureSource("clock-report", capture(runtime, 0), runtime, () => true)!()).toMatchObject({ kind: "report", runningMinutes: null })
		expect(peer.handle.undo()).toBe(true)
		expect(runtime.source).toBe(unclocked)
		expect(peer.handle.redo()).toBe(true)
		expect(owner.captureSparseClock(runtime.source, "/workspace/0.org").activeClock).toBeNull()
		// Epoch-free commits must not make command ownership or ambiguity checks stale.
		expect(runtime.applyCommandEdit(runtime.source, { from: runtime.source.length, to: runtime.source.length,
			insert: "\n* B\nCLOCK: [2026-10-09 Fri 10:00]\n", cursor: 0 })).toBe(true)
		const ambiguous = runtime.source
		expect(await owner.captureSource("clock-out", capture(runtime, 0), runtime, () => true)!()).toMatchObject({ kind: "rejected" })
		expect(runtime.source).toBe(ambiguous)
		expect(peer.handle.undo()).toBe(true)
		expect(runtime.source).toBe(clocked)
		expect(await owner.captureSource("cancel-clock", capture(runtime, 0), runtime, () => true)!()).toMatchObject({ kind: "success" })
		expect(active(runtime)).toBeNull()
	})
	it.each(["\n", "\r\n", "\r"])("maps raw UTF-16 edits at Clock row boundaries and invalidates a replaced %j break", async separator => {
		const original = `outside\0😀${separator}* A${separator}body${separator}tail\0`
		const { owner, buffers, capture, attach } = setup([original])
		const runtime = buffers[0].runtime
		const peer = attach(runtime, 0)
		expect(await owner.captureSource("clock-in", capture(runtime, original.indexOf("* A")), runtime, () => true)!()).toMatchObject({ kind: "success" })
		const clocked = runtime.source
		const row = active(runtime)!
		const prefix = `prefix😀\0${separator}`, before = `note😀${separator}`, after = `after\0${separator}`
		expect(runtime.applyCommandEdits(clocked, [
			{ from: 0, to: 0, insert: prefix, cursor: 0 },
			{ from: row.from, to: row.from, insert: before, cursor: 0 },
			{ from: row.breakTo, to: row.breakTo, insert: after, cursor: 0 },
		])).toBe(true)
		const mapped = prefix + clocked.slice(0, row.from) + before + clocked.slice(row.from, row.breakTo) + after + clocked.slice(row.breakTo)
		expect(runtime.source).toBe(mapped)
		expect(active(runtime)?.from).toBe(row.from + prefix.length + before.length)
		now += 120000
		expect(await owner.captureSource("clock-report", capture(runtime, 0), runtime, () => true)!()).toMatchObject({ kind: "report", runningMinutes: 2 })
		expect(peer.handle.undo()).toBe(true)
		expect(runtime.source).toBe(clocked)
		expect(peer.handle.redo()).toBe(true)
		expect(runtime.source).toBe(mapped)
		const clockLine = peer.view.state.doc.lineAt(peer.view.state.doc.toString().indexOf("CLOCK:"))
		peer.view.dispatch({ changes: { from: clockLine.to, to: clockLine.to + 1, insert: separator } })
		expect(runtime.source).toBe(mapped)
		expect(await owner.captureSource("clock-report", capture(runtime, 0), runtime, () => true)!()).toMatchObject({ kind: "report", runningMinutes: null })
		expect(peer.handle.undo()).toBe(true)
		expect(owner.captureSparseClock(runtime.source, "/workspace/0.org").activeClock?.startedAtEpochMs).toBe(epoch)
		expect(peer.handle.redo()).toBe(true)
		expect(owner.captureSparseClock(runtime.source, "/workspace/0.org").activeClock).toBeNull()
	})
	it("retires delayed Source and captured native sparse contexts on exact runtime revision drift", async () => {
		const { owner, buffers, capture } = setup(["* A\nbody"])
		const runtime = buffers[0].runtime
		const delayed = owner.captureSource("clock-in", capture(runtime, 0), runtime, () => true)!
		const sparse = owner.captureSparseContext(runtime.source, "/workspace/0.org")
		expect(runtime.applyCommandEdit(runtime.source, { from: runtime.source.length, to: runtime.source.length, insert: "\nnew", cursor: 0 })).toBe(true)
		expect(await delayed()).toMatchObject({ kind: "rejected" })
		const clock = await readOrgSparseClockContext([])
		expect(() => sparse(clock)).toThrow(/context changed/)
		expect(active(runtime)).toBeNull()
	})
	it("identifies the real Clock epoch before a native-style ACK and never reattaches it to a replacement row afterward", async () => {
		const { owner, buffers, capture, attach } = setup(["* A\nbody"])
		const runtime = buffers[0].runtime
		const accepted = Promise.withResolvers<void>()
		const ack = Promise.withResolvers<boolean>()
		const original = capture(runtime, 0)
		const transform: OrgCapturedSourceTransform = { ...original, apply: async batch => {
			expect(runtime.applyCommandEdits(original.snapshot.content, batch.changes.map(change => ({ ...change, cursor: batch.cursor })))).toBe(true)
			accepted.resolve()
			return ack.promise
		} }
		const pending = owner.captureSource("clock-in", transform, runtime, () => true)!()
		await accepted.promise
		expect(owner.captureSparseClock(runtime.source, "/workspace/0.org").activeClock?.startedAtEpochMs).toBe(epoch)
		const peer = attach(runtime, 0)
		peer.view.dispatch({ changes: { from: 0, to: peer.view.state.doc.length, insert: peer.view.state.doc } })
		expect(owner.captureSparseClock(runtime.source, "/workspace/0.org").activeClock).toBeNull()
		ack.resolve(true)
		expect(await pending).toMatchObject({ kind: "success" })
		expect(await owner.captureSource("clock-report", capture(runtime, 0), runtime, () => true)!()).toMatchObject({ kind: "report", runningMinutes: null })
		expect(peer.handle.undo()).toBe(true)
		expect(owner.captureSparseClock(runtime.source, "/workspace/0.org").activeClock?.startedAtEpochMs).toBe(epoch)
	})
	it("rejects a backwards native epoch for Clock out but explicit cancellation remains available", async () => {
		const { owner, buffers, capture } = setup(["* A\nbody"])
		const runtime = buffers[0].runtime
		expect(await owner.captureSource("clock-in", capture(runtime, 0), runtime, () => true)!()).toMatchObject({ kind: "success" })
		const before = runtime.source
		now = epoch - 60000
		expect(await owner.captureSource("clock-out", capture(runtime, 0), runtime, () => true)!()).toMatchObject({ kind: "rejected" })
		expect(runtime.source).toBe(before)
		expect(await owner.captureSource("cancel-clock", capture(runtime, 0), runtime, () => true)!()).toMatchObject({ kind: "success" })
		expect(active(runtime)).toBeNull()
	})
	it("fails closed after per-buffer Undo reopens two clocks and explicit cancellation removes only its captured Source owner", async () => {
		const { owner, buffers, capture, attach } = setup(["* A\nbody", "* B\nbody"])
		const [a, b] = buffers.map(buffer => buffer.runtime)
		expect(await owner.captureSource("clock-in", capture(a, 0), a, () => true)!()).toMatchObject({ kind: "success" })
		const first = a.source
		const peer = attach(a, 0)
		now += 60000
		expect(await owner.captureSource("clock-in", capture(b, 0), b, () => true)!()).toMatchObject({ kind: "success" })
		expect(active(a)).toBeNull()
		expect(active(b)).not.toBeNull()
		expect(peer.handle.undo()).toBe(true)
		expect(a.source).toBe(first)
		const beforeB = b.source
		expect(await owner.captureSource("clock-out", capture(b, 0), b, () => true)!()).toMatchObject({ kind: "rejected" })
		expect(b.source).toBe(beforeB)
		expect(await owner.captureSource("cancel-clock", capture(a, 0), a, () => true)!()).toMatchObject({ kind: "success" })
		expect(active(a)).toBeNull()
		expect(b.source).toBe(beforeB)
		expect(await owner.captureSource("clock-out", capture(b, 0), b, () => true)!()).toMatchObject({ kind: "success" })
		expect(active(b)).toBeNull()
	})
	it.each([
		"* A\nbody",
		"* A\n:LOGBOOK:\nCLOCK: [2026-10-09 Fri 10:00]\n:END:\nbody",
	])("retires captured null-epoch Sparse contexts when the live Source leaves the root without closing", async original => {
		const { owner, buffers } = setup([original])
		const runtime = buffers[0].runtime
		disposers.push(() => runtime.close())
		const sparse = owner.captureSparseClock(original, "/workspace/0.org")
		const adapt = owner.captureSparseContext(original, "/workspace/0.org")
		expect(sparse.activeClock).toBeNull()
		expect(sparse.isCurrent()).toBe(true)
		buffers.splice(0, 1)
		expect(runtime.closed).toBe(false)
		expect(sparse.isCurrent()).toBe(false)
		const clock = await readOrgSparseClockContext([])
		expect(() => adapt(clock)).toThrow(/context changed/)
		expect(runtime.source).toBe(original)
	})
	it("retires a Sparse disk snapshot on live promotion and a recovered runtime on same-text replacement", async () => {
		const original = "* A\n:LOGBOOK:\nCLOCK: [2026-10-09 Fri 10:00]\n:END:\nbody"
		const { owner, buffers } = setup([original, original])
		const retired = buffers[0].runtime
		disposers.push(() => retired.close())
		const recovered = owner.captureSparseClock(original, "/workspace/0.org")
		const disk = owner.captureSparseClock(original, "/workspace/new.org")
		expect(recovered.isCurrent()).toBe(true)
		expect(disk.isCurrent()).toBe(true)
		const replacement = buffers[1].runtime
		buffers.splice(0, 1, { relativePath: "0.org", runtime: replacement })
		expect(recovered.isCurrent()).toBe(false)
		buffers.push({ relativePath: "new.org", runtime: replacement })
		expect(disk.isCurrent()).toBe(false)
		expect(retired.source).toBe(original)
		expect(replacement.source).toBe(original)
	})
	it("retains readable accepted Clock reports and epoch snapshots after root retirement without granting another operation", async () => {
		const original = "outside\0\r\n* A 😀\r\nbody"
		const { owner, buffers, capture, retire } = setup([original])
		const runtime = buffers[0].runtime
		expect(await owner.captureSource("clock-in", capture(runtime, original.indexOf("* A")), runtime, () => true)!()).toMatchObject({ kind: "success" })
		now += 120000
		const report = await owner.captureSource("clock-report", capture(runtime, 0), runtime, () => true)!()
		const sparse = owner.captureSparseClock(runtime.source, "/workspace/0.org")
		const before = runtime.source
		retire()
		expect(sparse.isCurrent()).toBe(false)
		expect(sparse.activeClock?.startedAtEpochMs).toBe(epoch)
		expect(report).toMatchObject({ kind: "report", runningMinutes: 2, report: { totalMinutes: 0 } })
		expect(owner.captureSource("clock-out", capture(runtime, 0), runtime, () => true)).toBeNull()
		expect(runtime.source).toBe(before)
	})
})
