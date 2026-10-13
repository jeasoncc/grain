import { undoDepth } from "@codemirror/commands"
import { EditorSelection, EditorState, Text, Transaction } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgBufferWindowHandle } from "@/flows/org-editor-runtime"
import { orgCompositionHistory } from "@/flows/org-editor-runtime/org-composition-history"
import { createOrgModalAdapter, type OrgModalPorts, type OrgModalPrompt } from "./org-modal-adapter"

const cleanups: (() => void)[] = []
const geometry = ["getClientRects", "getBoundingClientRect"] as const
const descriptors = geometry.map((key) => Object.getOwnPropertyDescriptor(Range.prototype, key))
beforeEach(() => {
	// JSDOM lacks layout; only the browser geometry boundary is replaced.
	Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] })
	Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => new DOMRect() })
})
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup() })
afterEach(() => {
	for (const [index, key] of geometry.entries()) {
		const descriptor = descriptors[index]
		if (descriptor) Object.defineProperty(Range.prototype, key, descriptor)
		else Reflect.deleteProperty(Range.prototype, key)
	}
})
afterEach(() => vi.useRealTimers())
function mount(source: string, selection = EditorSelection.single(0), overrides: Partial<OrgModalPorts> = {}) {
	const runtime = createOrgBufferRuntime({ key: { workspaceSessionId: "modal-test", bufferId: crypto.randomUUID() }, source, canCommit: () => true, onCommit: () => undefined })
	let handle: OrgBufferWindowHandle | null = null
	let current = true
	const errors: string[] = []
	let request: OrgModalPrompt | null = null
	const root = document.createElement("section")
	const input = document.createElement("input")
	root.append(input); document.body.append(root)
	const adapter = createOrgModalAdapter({
		runtimeScope: {}, isCurrent: () => current, requestHistory: operation => handle?.[operation]() ?? false,
		captureSave: () => () => true, reportError: message => { errors.push(message) },
		echo: result => { errors.push(result.message); return () => undefined }, mode: () => undefined,
		openPrompt(next) {
			request = next; input.value = next.initialInput; input.focus()
			return { close: () => { next.onClose(root); request = null }, setValue: value => { input.value = value }, ownsInput: target => target === input }
		},
		...overrides,
	})
	const view = new EditorView({ state: EditorState.create({ doc: runtime.state.doc, selection, extensions: [EditorState.allowMultipleSelections.of(true), runtime.historyFreeSourceExtensions, adapter.extensions, orgCompositionHistory(() => current)] }), dispatchTransactions: transactions => handle!.dispatchTransactions(transactions) })
	handle = runtime.attachWindow({ windowId: "window", view, knownReconfigure: adapter.ownsEffect })
	cleanups.push(() => { current = false; adapter.destroy(); handle?.detach(); view.destroy(); runtime.close(); root.remove() })
	const key = (value: string, ctrlKey = false) => adapter.modalKey(new KeyboardEvent("keydown", { key: value, ctrlKey }))
	const keys = (value: string) => { for (const character of value) key(character) }
	return { runtime, view, handle, adapter, key, keys, errors, input, prompt: () => request, retire: () => { current = false } }
}

// Real CM + canonical runtime; the DOM lifecycle is modeled, not native proof.
async function compose(view: EditorView, committed: string, settleAfter = 50) {
	const from = view.state.selection.main.from
	const to = view.state.selection.main.to
	view.contentDOM.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
	view.dispatch({ changes: { from, to, insert: "ni" }, selection: EditorSelection.cursor(from + 2), userEvent: "input.type.compose.start" })
	view.dispatch({ selection: EditorSelection.single(from, from + 2), userEvent: "select" })
	view.dispatch({ changes: { from, to: from + 2, insert: "ni hao" }, selection: EditorSelection.cursor(from + 6), userEvent: "input.type.compose" })
	// Preedit deletion is a raw upstream input listener too, not committed text.
	view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, isComposing: true }))
	view.dispatch({ changes: { from, to: from + 6, insert: committed }, selection: EditorSelection.cursor(from + committed.length), userEvent: "input.type.compose" })
	view.contentDOM.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: committed }))
	await vi.advanceTimersByTimeAsync(settleAfter)
}

describe("owned upstream Vim adapter", () => {
	it("undoes an operator to its exact pre-operator cursor metadata and raw source", async () => {
		const source = "alpha\r\n甲\0乙\nlast\r"
		const before = EditorSelection.create([EditorSelection.cursor(3, -1, 2, 27)])
		const { runtime, view, adapter, keys } = mount(source, before)
		keys("dd")
		expect(runtime.source).not.toBe(source)
		keys("u"); await adapter.whenIdle()
		expect(runtime.source).toBe(source)
		expect(view.state.selection.eq(before, true)).toBe(true)
	})
	it("consumes canonical full-selection history without normal-mode caret clipping", async () => {
		const before = EditorSelection.create([EditorSelection.cursor(1, -1, 2, 7), EditorSelection.cursor(5, 1, 3, 19)], 1)
		const { runtime, view, adapter, keys } = mount("abc\nxyz", before)
		keys("x")
		expect(runtime.source).not.toBe("abc\nxyz")
		keys("u"); await adapter.whenIdle()
		expect(runtime.source).toBe("abc\nxyz")
		expect(view.state.selection.eq(before, true)).toBe(true)
	})
	it("groups change operator and nonadjacent typing into one canonical event", async () => {
		const { runtime, view, adapter, keys, key } = mount("one two three", EditorSelection.create([EditorSelection.cursor(5, -1, 1, 9)]))
		const before = view.state.selection
		keys("ciw")
		const insert = (text: string, time: number) => {
			const head = view.state.selection.main.head
			view.dispatch({ changes: { from: head, insert: Text.of([text]) }, selection: EditorSelection.cursor(head + text.length), annotations: [Transaction.userEvent.of("input.type"), Transaction.time.of(time)] })
		}
		insert("甲", 1000); insert("乙\0", 100000)
		key("Escape")
		expect(runtime.source).toBe("one 甲乙\0 three")
		keys("u"); await adapter.whenIdle()
		expect(runtime.source).toBe("one two three")
		expect(view.state.selection.eq(before, true)).toBe(true)
	})
	it("uses real count, dot, named register and macro parsing", async () => {
		const { runtime, adapter, keys } = mount("abcdef")
		keys("2x")
		expect(runtime.source).toBe("cdef")
		keys(".")
		expect(runtime.source).toBe("ef")
		keys("u"); await adapter.whenIdle()
		keys('"ax')
		keys('"ap')
		expect(runtime.source).toContain("c")
		const macro = mount("abcdef")
		macro.keys("qaxq@a")
		expect(macro.runtime.source).toBe("cdef")
	})
	it.each([
		{ source: "one two three", cursor: 0, command: "d2w", after: "three" },
		{ source: "(one two) tail", cursor: 3, command: "di(", after: "() tail" },
		{ source: '"one two" tail', cursor: 3, command: 'da"', after: " tail" },
	])("runs operator/text object $command and exact canonical undo/redo", async ({ source, cursor, command, after }) => {
		const before = EditorSelection.create([EditorSelection.cursor(cursor, -1, 2, 19)])
		const window = mount(source, before)
		window.keys(command)
		expect(window.runtime.source).toBe(after)
		expect(undoDepth(window.runtime.state)).toBe(1)
		window.key("u"); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe(source)
		expect(window.view.state.selection.eq(before, true)).toBe(true)
		window.key("r", true); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe(after)
	})
	it("handles character visual and real multi-line block deletion without a layout probe", async () => {
		const visual = mount("abcd\nefgh")
		visual.keys("vld")
		expect(visual.runtime.source).toBe("cd\nefgh")
		visual.keys("u"); await visual.adapter.whenIdle()
		expect(visual.runtime.source).toBe("abcd\nefgh")
		const source = "abc\r\ndef\r\nghi"
		const before = EditorSelection.create([EditorSelection.cursor(0, -1, 2, 17)])
		const block = mount(source, before)
		block.key("v", true)
		expect(block.view.contentDOM.dataset.modalMode).toBe("visual-block")
		// G is a real document-line motion, so the selected rectangle does not
		// depend on JSDOM's intentionally absent visual-row geometry.
		block.keys("Gl")
		expect(block.view.state.selection.ranges.map(range => block.view.state.sliceDoc(range.from, range.to))).toEqual(["ab", "de", "gh"])
		block.key("d")
		expect(block.runtime.source).toBe("c\r\nf\r\ni")
		expect(undoDepth(block.runtime.state)).toBe(1)
		block.key("u"); await block.adapter.whenIdle()
		expect(block.runtime.source).toBe(source)
		expect(block.view.state.selection.eq(before, true)).toBe(true)
	})
	it("retains a selected Source region and visual mode across focus suspension while retiring its prompt", async () => {
		const source = "Research note\nother\nlast"
		const window = mount(source)
		window.keys("0vewe")
		const captured = window.view.state.selection
		expect(window.view.state.sliceDoc(captured.main.from, captured.main.to)).toBe("Research note")
		expect(window.view.contentDOM.dataset.modalMode).toBe("visual")
		window.key(":")
		const retired = window.prompt()!
		expect(window.adapter.suspendInput()).toBe(true)
		expect(window.prompt()).toBeNull()
		expect((await retired.onAccept("s/Research/replaced/")).ok).toBe(false)
		expect(window.view.contentDOM.dataset.modalMode).toBe("visual")
		expect(window.view.state.selection.eq(captured, true)).toBe(true)
		expect(window.runtime.source).toBe(source)
		expect(undoDepth(window.runtime.state)).toBe(0)
		window.key("2")
		window.adapter.suspendInput()
		expect(window.view.state.selection.eq(captured, true)).toBe(true)
		window.key("G")
		expect(window.view.state.doc.lineAt(window.view.state.selection.main.head).number).toBe(3)
		window.adapter.cancel()
		expect(window.view.contentDOM.dataset.modalMode).toBe("normal")
		expect(window.view.state.selection.main.empty).toBe(true)
	})
	it("clears a focus-lost operator and count without executing a mode or Source edit", () => {
		const operator = mount("one two three")
		operator.key("d")
		const before = operator.view.state.selection
		operator.adapter.suspendInput()
		expect(operator.view.state.selection.eq(before, true)).toBe(true)
		operator.key("w")
		expect(operator.runtime.source).toBe("one two three")
		expect(operator.view.state.selection.main.head).toBe(4)
		const count = mount("abcdef")
		count.key("2")
		count.adapter.suspendInput()
		expect(count.runtime.source).toBe("abcdef")
		expect(undoDepth(count.runtime.state)).toBe(0)
		count.key("x")
		expect(count.runtime.source).toBe("bcdef")
	})
	it("keeps the same insert macro through suspended peer focus and never records projected composition", async () => {
		vi.useFakeTimers()
		const window = mount("alpha")
		window.keys("qai")
		window.view.dispatch({ changes: { from: 0, insert: "X" }, selection: EditorSelection.cursor(1), userEvent: "input.type" })
		const before = window.view.state.selection
		window.adapter.suspendInput(); window.adapter.suspendInput()
		expect(window.view.contentDOM.dataset.modalMode).toBe("insert")
		expect(window.view.state.selection.eq(before, true)).toBe(true)
		expect(undoDepth(window.runtime.state)).toBe(1)
		const peer = new EditorView({ state: EditorState.create({ doc: window.runtime.state.doc,
			extensions: [window.runtime.historyFreeSourceExtensions, orgCompositionHistory(() => true)] }),
			dispatchTransactions: transactions => peerHandle.dispatchTransactions(transactions) })
		const peerHandle = window.runtime.attachWindow({ windowId: "peer", view: peer })
		cleanups.push(() => { peerHandle.detach(); peer.destroy() })
		peer.dispatch({ selection: EditorSelection.cursor(peer.state.doc.length) })
		await compose(peer, "你好")
		window.adapter.suspendInput()
		expect(window.view.contentDOM.dataset.modalMode).toBe("insert")
		expect(window.view.state.selection.eq(before, true)).toBe(true)
		window.view.dispatch({ changes: { from: 1, insert: "Y" }, selection: EditorSelection.cursor(2), userEvent: "input.type" })
		window.key("Escape"); window.key("q")
		expect(window.runtime.source).toBe("XYalpha你好")
		window.keys("@a")
		expect(window.runtime.source).toBe("XXYYalpha你好")
		window.keys('".p')
		expect(window.runtime.source).toBe("XXYXYYalpha你好")
	})
	it("shares named registers, macros and dot only within one application", () => {
		const runtimeScope = {}
		const first = mount("secret", EditorSelection.single(0), { runtimeScope })
		first.keys('"ayiw')
		const second = mount("abc", EditorSelection.single(0), { runtimeScope })
		second.keys('"ap')
		expect(second.runtime.source).toContain("secret")
		const isolated = mount("abc")
		isolated.keys('"ap')
		expect(isolated.runtime.source).not.toContain("secret")
		const recorder = mount("abcdef", EditorSelection.single(0), { runtimeScope })
		recorder.keys("qbxq")
		const player = mount("abcdef", EditorSelection.single(0), { runtimeScope })
		player.keys("@b")
		expect(player.runtime.source).toBe("bcdef")
		const repeat = mount("abcdef", EditorSelection.single(0), { runtimeScope })
		repeat.keys(".")
		expect(repeat.runtime.source).toBe("bcdef")
		first.adapter.destroy()
		expect(first.key("x")).toBe(false)
		expect(first.runtime.source).toBe("secret")
	})
	it("routes real colon input to an acknowledged captured save and drains after retirement", async () => {
		let resolve!: (value: boolean) => void
		let captures = 0, saves = 0
		const pending = new Promise<boolean>(done => { resolve = done })
		const window = mount("one", EditorSelection.single(0), {
			captureSave: () => { captures++; return () => { saves++; return pending } },
		})
		window.keys(":")
		expect(window.prompt()?.prompt).toBe(":")
		window.input.value = "write"
		window.prompt()!.onAccept("write")
		expect(captures).toBe(1); expect(saves).toBe(1)
		expect(window.runtime.source).toBe("one")
		window.retire(); window.adapter.destroy()
		resolve(true); await window.adapter.whenIdle()
		expect(window.errors).not.toContain("Source saved")
	})
	it("returns a failed acknowledged save and explicitly rejects window Ex effects", async () => {
		const failed = mount("one", EditorSelection.single(0), { captureSave: () => () => false })
		failed.keys(":")
		expect(await failed.prompt()!.onAccept("write")).toEqual({ ok: false, message: "Canonical Source save was not acknowledged" })
		await failed.adapter.whenIdle()
		expect(failed.errors).toContain("Canonical Source save was not acknowledged")
		expect(failed.errors).not.toContain("Source saved")
		expect(failed.prompt()).toBeNull()
		const unsupported = mount("one")
		unsupported.keys(":")
		const result = await unsupported.prompt()!.onAccept("quit")
		expect(result.ok).toBe(false)
		expect(unsupported.errors.some(message => message.includes("file/window effects are unavailable"))).toBe(true)
		expect(unsupported.prompt()?.prompt).toBe(":")
		expect(unsupported.runtime.source).toBe("one")
	})
	it("retains one exact reader on file and unknown Ex rejection, then drains one corrected save", async () => {
		let saves = 0
		let resolve!: (value: boolean) => void
		const pending = new Promise<boolean>(done => { resolve = done })
		const source = "alpha\r\n甲\0😀"
		const window = mount(source, EditorSelection.single(0), { captureSave: () => () => { saves++; return pending } })
		window.keys(":")
		const reader = window.prompt()!
		window.input.value = "write other.org"
		expect((await reader.onAccept(window.input.value)).ok).toBe(false)
		expect(window.prompt()).toBe(reader)
		expect(window.input.value).toBe("write other.org")
		window.input.value = "notanorgvimcommand"
		const unknown = await reader.onAccept(window.input.value)
		expect(unknown.ok).toBe(false)
		if (!unknown.ok) expect(unknown.message).toContain(window.input.value)
		expect(window.prompt()).toBe(reader)
		expect(window.input.value).toBe("notanorgvimcommand")
		window.input.value = "write"
		const result = reader.onAccept(window.input.value)
		expect(saves).toBe(1)
		expect(window.prompt()).toBe(reader)
		expect((await reader.onAccept("write")).ok).toBe(false)
		reader.onCancel()
		window.adapter.cancel()
		const held = new KeyboardEvent("keydown", { key: "Enter", repeat: true, cancelable: true })
		expect(reader.onKeyDown(held, window.input)).toBe(true)
		expect(held.defaultPrevented).toBe(true)
		expect(window.prompt()).toBe(reader)
		expect(saves).toBe(1)
		resolve(true)
		expect(await result).toEqual({ ok: true })
		expect(window.prompt()).toBeNull()
		expect(window.runtime.source).toBe(source)
		expect((await reader.onAccept("write")).ok).toBe(false)
		expect(saves).toBe(1)
	})
	it.each(["registers", "set pcre?", "version"])("preserves successful informational Ex semantics: %s", async command => {
		const echoes: { ok: boolean; message: string }[] = []
		const window = mount("raw\r\n甲\0😀", EditorSelection.single(0), { echo: result => { echoes.push(result); return () => undefined } })
		window.keys(":")
		expect((await window.prompt()!.onAccept(command)).ok).toBe(true)
		expect(window.prompt()).toBeNull()
		expect(echoes.at(-1)).toMatchObject({ ok: true })
		expect(window.runtime.source).toBe("raw\r\n甲\0😀")
	})
	it("retires a consumed reader after non-document partial effects rather than granting retry authority", async () => {
		const window = mount("one two")
		window.keys("ma:")
		const reader = window.prompt()!
		const result = await reader.onAccept("delmarks a1")
		expect(result.ok).toBe(false)
		expect(window.prompt()).toBeNull()
		expect((await reader.onAccept("delmarks a")).ok).toBe(false)
		expect(window.runtime.source).toBe("one two")
	})
	it("applies a real Ex substitution once through canonical history", async () => {
		const source = "alpha\r\n甲\0😀 alpha"
		const before = EditorSelection.create([EditorSelection.cursor(0, -1, 1, 9)])
		const window = mount(source, before)
		window.keys(":")
		expect((await window.prompt()!.onAccept("%s/alpha/beta/g")).ok).toBe(true)
		expect(window.prompt()).toBeNull()
		expect(window.runtime.source).toBe("beta\r\n甲\0😀 beta")
		window.keys("u")
		await window.adapter.whenIdle()
		expect(window.runtime.source).toBe(source)
		expect(window.view.state.selection.eq(before, true)).toBe(true)
	})
	it("leaves native Enter acceptance to shared mediation and search cancellation never edits Source", () => {
		const source = "alpha\r\nbeta\0😀 alpha"
		const window = mount(source)
		window.keys(":")
		const reader = window.prompt()!
		window.input.value = "write other.org"
		const enter = new KeyboardEvent("keydown", { key: "Enter", cancelable: true })
		expect(reader.onKeyDown(enter, window.input)).toBe(false)
		expect(enter.defaultPrevented).toBe(false)
		expect(window.prompt()).toBe(reader)
		window.adapter.cancel()
		window.keys("/")
		window.input.value = "beta"
		const search = window.prompt()!
		const keyup = new KeyboardEvent("keyup", { key: "a" })
		Object.defineProperty(keyup, "target", { value: window.input })
		search.onKeyUp(keyup, window.input)
		search.onCancel()
		expect(window.prompt()).toBeNull()
		expect(window.runtime.source).toBe(source)
	})
	it("retires callbacks, rejects file effects and preserves native prompt event semantics", () => {
		const window = mount("alpha beta alpha")
		window.keys("/")
		const old = window.prompt()!
		expect(old.prompt).toBe("/")
		window.input.value = "alpha"
		const event = new KeyboardEvent("keyup", { key: "a" })
		Object.defineProperty(event, "target", { value: window.input })
		old.onKeyUp(event, window.input)
		window.adapter.cancel()
		window.keys(":")
		old.onAccept("alpha")
		expect(window.prompt()?.prompt).toBe(":")
		window.prompt()!.onAccept("write other.org")
		expect(window.errors.some(message => message.includes("file/range effects are unavailable"))).toBe(true)
		expect(window.runtime.source).toBe("alpha beta alpha")
		window.keys("?")
		const stale = window.prompt()!
		window.retire()
		stale.onAccept("beta"); stale.onKeyUp(event, window.input)
		expect(window.runtime.source).toBe("alpha beta alpha")
	})
	it("records only the net own IME commit for dot and keeps one canonical undo event", async () => {
		vi.useFakeTimers()
		const window = mount("alpha")
		window.key("i")
		await compose(window.view, "你好")
		expect(undoDepth(window.runtime.state)).toBe(1)
		window.key("Escape")
		expect(window.view.contentDOM.dataset.modalMode).toBe("normal")
		expect(window.view.state.selection.main.head).toBe(1)
		window.key(".")
		expect(window.runtime.source).toBe("你你好好alpha")
		window.key("u"); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe("你好alpha")
		window.key("u"); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe("alpha")
	})
	it("records one committed glyph event for macro playback and the insert register", async () => {
		vi.useFakeTimers()
		const window = mount("alpha")
		window.keys("qai")
		await compose(window.view, "你好")
		window.key("Escape"); window.key("q")
		window.keys("@a")
		expect(window.runtime.source).toBe("你你好好alpha")
		const register = mount("alpha")
		register.key("i")
		await compose(register.view, "你好")
		register.key("Escape"); register.keys('".p')
		expect(register.runtime.source).toBe("你好你好alpha")
	})
	it("keeps UTF-16/astral boundaries through IME insert exit, register, dot and canonical undo", async () => {
		vi.useFakeTimers()
		const source = "甲\r\nlast\0"
		const before = EditorSelection.create([EditorSelection.cursor(0, -1, 2, 23)])
		const window = mount(source, before)
		window.key("i")
		// i positions its own cursor before native input. Establish the actual
		// composition checkpoint, including metadata, after that engine motion.
		window.view.dispatch({ selection: before, userEvent: "select" })
		await compose(window.view, "你好😀")
		window.key("Escape")
		expect(window.view.state.selection.main.head).toBe(2)
		window.key(".")
		expect(window.runtime.source).toBe("你好你好😀😀甲\r\nlast\0")
		window.key("u"); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe("你好😀甲\r\nlast\0")
		window.key("u"); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe(source)
		expect(window.view.state.selection.eq(before, true)).toBe(true)
		const register = mount(source)
		register.key("i"); await compose(register.view, "你好😀")
		register.key("Escape"); register.keys('".p')
		expect(register.runtime.source).toBe("你好😀你好😀甲\r\nlast\0")
	})
	it("puts a paired astral register after a complete glyph, repeats it and restores exact canonical source", async () => {
		const source = "😀tail\r\nend\0"
		const window = mount(source)
		window.keys('"ayl')
		const before = window.view.state.selection
		window.keys('"ap')
		expect(window.runtime.source).toBe("😀😀tail\r\nend\0")
		expect(window.view.state.selection.main.head).toBe(2)
		window.key(".")
		expect(window.runtime.source).toBe("😀😀😀tail\r\nend\0")
		expect(window.view.state.selection.main.head).toBe(4)
		window.key("u"); await window.adapter.whenIdle()
		window.key("u"); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe(source)
		expect(window.view.state.selection.eq(before, true)).toBe(true)
	})
	it.each(["\ud83d", "\ude00"])("preserves a literal unpaired UTF-16 unit through insert-register put: %j", async literal => {
		const window = mount("alpha")
		window.key("i")
		window.view.dispatch({ changes: { from: 0, insert: literal }, selection: EditorSelection.cursor(1), userEvent: "input.type" })
		window.key("Escape"); window.keys('".p')
		expect(window.runtime.source).toBe(`${literal}${literal}alpha`)
		window.key("u"); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe(`${literal}alpha`)
		window.key("u"); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe("alpha")
	})
	it("deletes a complete astral glyph without altering neighboring literal lone surrogates", async () => {
		const source = "😀\ud83dA\ude00B\r\nend"
		const before = EditorSelection.create([EditorSelection.cursor(0, -1, 2, 23)])
		const window = mount(source, before)
		window.key("x")
		expect(window.runtime.source).toBe("\ud83dA\ude00B\r\nend")
		window.key("u"); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe(source)
		expect(window.view.state.selection.eq(before, true)).toBe(true)
	})
	it("settles at the final body mutation despite later selection and presentation updates", async () => {
		vi.useFakeTimers()
		const window = mount("alpha")
		window.key("i")
		await compose(window.view, "你好", 0)
		await vi.advanceTimersByTimeAsync(40)
		window.view.dispatch({ selection: window.view.state.selection, annotations: Transaction.addToHistory.of(false) })
		await vi.advanceTimersByTimeAsync(10)
		expect(undoDepth(window.runtime.state)).toBe(1)
		window.key("Escape"); window.key(".")
		expect(window.runtime.source).toBe("你你好好alpha")
	})
	it("records consecutive committed compositions but not an intervening canceled preedit", async () => {
		vi.useFakeTimers()
		const window = mount("alpha")
		window.keys("qai")
		await compose(window.view, "你好")
		await compose(window.view, "")
		await compose(window.view, "世界")
		window.key("Escape"); window.key("q")
		expect(window.runtime.source).toBe("你好世界alpha")
		expect(undoDepth(window.runtime.state)).toBe(2)
		window.keys("@a")
		expect(window.runtime.source).toBe("你好世你好世界界alpha")
	})
	it("keeps the previous insert register while recording a truly empty canceled macro", async () => {
		vi.useFakeTimers()
		const window = mount("alpha")
		window.key("i")
		window.view.dispatch({ changes: { from: 0, insert: "X" }, selection: EditorSelection.cursor(1), userEvent: "input.type" })
		window.key("Escape")
		window.keys("qbi")
		await compose(window.view, "")
		window.key("Escape"); window.key("q")
		window.keys('".p')
		expect(window.runtime.source).toBe("XXalpha")
		window.keys("@b")
		expect(window.runtime.source).toBe("XXalpha")
	})
	it("preserves the previous repeat and recorded macro after zero-net IME cancellation", async () => {
		vi.useFakeTimers()
		const window = mount("alpha")
		window.keys("qai")
		window.view.dispatch({ changes: { from: 0, insert: "X" }, selection: EditorSelection.cursor(1), userEvent: "input.type" })
		window.key("Escape"); window.key("q")
		window.key("i")
		await compose(window.view, "")
		window.key("Escape"); window.key(".")
		expect(window.runtime.source).toBe("XXalpha")
		window.keys("@a")
		expect(window.runtime.source).toBe("XXXalpha")
	})
	it("preserves earlier text in the same macro insert when composition is cancelled", async () => {
		vi.useFakeTimers()
		const window = mount("alpha")
		window.keys("qai")
		window.view.dispatch({ changes: { from: 0, insert: "X" }, selection: EditorSelection.cursor(1), userEvent: "input.type" })
		await compose(window.view, "")
		window.key("Escape"); window.key("q"); window.keys("@a")
		expect(window.runtime.source).toBe("XXalpha")
	})
	it.each([false, true])("keeps an accepted ASCII prefix in a mixed IME macro after cancelled preedit=%s", async cancelFirst => {
		vi.useFakeTimers()
		const window = mount("alpha")
		window.keys("qbi")
		if (cancelFirst) await compose(window.view, "", 0)
		window.view.dispatch({ changes: { from: 0, insert: "Q" }, selection: EditorSelection.cursor(1), userEvent: cancelFirst ? "input.type.compose" : "input.type" })
		await compose(window.view, "你好")
		window.key("Escape"); window.key("q")
		expect(window.runtime.source).toBe("Q你好alpha")
		expect(window.view.state.selection.main.head).toBe(2)
		window.keys("@b")
		expect(window.runtime.source).toBe("Q你Q你好好alpha")
		window.key("u"); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe("Q你好alpha")
		window.key("u"); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe("Qalpha")
		window.key("u"); await window.adapter.whenIdle()
		expect(window.runtime.source).toBe("alpha")
	})
	it("does not record peer composition projections into the local insert consumer", async () => {
		vi.useFakeTimers()
		const window = mount("alpha")
		const peer = new EditorView({ state: EditorState.create({ doc: window.runtime.state.doc,
			extensions: [window.runtime.historyFreeSourceExtensions, orgCompositionHistory(() => true)] }),
			dispatchTransactions: transactions => peerHandle.dispatchTransactions(transactions) })
		const peerHandle = window.runtime.attachWindow({ windowId: "peer", view: peer })
		cleanups.push(() => { peerHandle.detach(); peer.destroy() })
		window.key("i")
		window.view.dispatch({ changes: { from: 0, insert: "X" }, selection: EditorSelection.cursor(1), userEvent: "input.type" })
		peer.dispatch({ selection: EditorSelection.cursor(peer.state.doc.length) })
		await compose(peer, "你好")
		window.key("Escape"); window.key(".")
		expect(window.runtime.source).toBe("XXalpha你好")
	})
	it.each(["peer", "controller", "history"] as const)("does not reset own insert/macro/register recording on %s projection", async kind => {
		vi.useFakeTimers()
		const window = mount("alpha")
		window.keys("qai")
		window.view.dispatch({ changes: { from: 0, insert: "X" }, selection: EditorSelection.cursor(1), userEvent: "input.type" })
		if (kind === "peer") {
			const peer = new EditorView({ state: EditorState.create({ doc: window.runtime.state.doc,
				extensions: [window.runtime.historyFreeSourceExtensions, orgCompositionHistory(() => true)] }),
				dispatchTransactions: transactions => peerHandle.dispatchTransactions(transactions) })
			const peerHandle = window.runtime.attachWindow({ windowId: "peer", view: peer })
			cleanups.push(() => { peerHandle.detach(); peer.destroy() })
			peer.dispatch({ selection: EditorSelection.cursor(peer.state.doc.length) })
			await compose(peer, "你好")
		} else {
			window.runtime.applyCommandEdit(window.runtime.source, { from: 6, to: 6, insert: "Q", cursor: 7 })
			if (kind === "history") expect(window.handle.undo()).toBe(true)
		}
		const head = window.view.state.selection.main.head
		window.view.dispatch({ changes: { from: head, insert: "Y" }, selection: EditorSelection.cursor(head + 1), userEvent: "input.type" })
		window.key("Escape"); window.key("q")
		const suffix = kind === "peer" ? "你好" : kind === "controller" ? "Q" : ""
		expect(window.runtime.source).toBe(`XYalpha${suffix}`)
		window.keys("@a")
		expect(window.runtime.source).toBe(`XXYYalpha${suffix}`)
		window.keys('".p')
		expect(window.runtime.source).toBe(`XXYXYYalpha${suffix}`)
	})
	it("discards a composing consumer on controller mutation or retirement without stale recording", async () => {
		vi.useFakeTimers()
		for (const retire of [false, true]) {
			const window = mount("alpha")
			window.key("i")
			window.view.contentDOM.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
			window.view.dispatch({ changes: { from: 0, insert: "ni" }, selection: EditorSelection.cursor(2), userEvent: "input.type.compose.start" })
			if (retire) window.retire()
			else window.runtime.applyCommandEdit(window.runtime.source, { from: 7, to: 7, insert: "Q", cursor: 8 })
			window.view.contentDOM.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "ni" }))
			await vi.advanceTimersByTimeAsync(50)
			if (!retire) {
				window.key("Escape"); window.key(".")
				expect(window.runtime.source).toBe("nialphaQ")
			} else expect(window.runtime.source).toBe("nialpha")
		}
	})
	it("owns exact normal-mode undo across modeled composition and following typing in one insert session", async () => {
		vi.useFakeTimers()
		// Model browser lifecycle only. The document/history transactions and Vim
		// engine are real; this is deliberately not trusted native IME evidence.
		const { runtime, view, adapter, key } = mount("Gather evidence")
		key("i")
		view.dispatch({ changes: { from: 0, insert: "A" }, selection: EditorSelection.cursor(1), userEvent: "input.type" })
		const before = view.state.selection
		view.contentDOM.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
		view.dispatch({ changes: { from: 1, insert: "ni" }, selection: EditorSelection.cursor(3), userEvent: "input.type.compose.start" })
		view.dispatch({ selection: EditorSelection.single(1, 3), userEvent: "select" })
		view.dispatch({ changes: { from: 1, to: 3, insert: "ni hao" }, selection: EditorSelection.cursor(7), userEvent: "input.type.compose" })
		view.dispatch({ changes: { from: 1, to: 7, insert: "你好" }, selection: EditorSelection.cursor(3), userEvent: "input.type.compose" })
		view.contentDOM.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "你好" }))
		await vi.advanceTimersByTimeAsync(50)
		view.dispatch({ changes: { from: 3, insert: "Z" }, selection: EditorSelection.cursor(4), userEvent: "input.type" })
		key("Escape")
		expect(view.contentDOM.dataset.modalMode).toBe("normal")
		key("u"); await adapter.whenIdle()
		expect(runtime.source).toBe("A你好Gather evidence")
		expect(view.contentDOM.dataset.modalMode).toBe("normal")
		key("u"); await adapter.whenIdle()
		expect(runtime.source).toBe("AGather evidence")
		expect(view.state.selection.eq(before, true)).toBe(true)
		expect(view.contentDOM.dataset.modalMode).toBe("normal")
		key("u"); await adapter.whenIdle()
		expect(runtime.source).toBe("Gather evidence")
	})
	it("undoes the unrelated prior Vim edit immediately after modeled IME cancellation", async () => {
		vi.useFakeTimers()
		const { runtime, view, adapter, key } = mount("Gather")
		key("i")
		view.dispatch({ changes: { from: 0, insert: "A" }, selection: EditorSelection.cursor(1), userEvent: "input.type" })
		view.contentDOM.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
		view.dispatch({ changes: { from: 1, insert: "ni" }, selection: EditorSelection.cursor(3), userEvent: "input.type.compose.start" })
		view.dispatch({ changes: { from: 1, to: 3 }, selection: EditorSelection.cursor(1), userEvent: "input.type.compose" })
		view.contentDOM.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "" }))
		await vi.advanceTimersByTimeAsync(50)
		key("Escape"); key("u"); await adapter.whenIdle()
		expect(runtime.source).toBe("Gather")
		expect(view.state.selection.main.empty).toBe(true)
		expect(view.contentDOM.dataset.modalMode).toBe("normal")
	})
})
