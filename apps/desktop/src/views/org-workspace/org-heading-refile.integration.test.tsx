import { redoDepth, undoDepth } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { useRef } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useOrgWorkspace, type OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type {
	OrgDocumentInterface,
	OrgFileError,
	OrgWorkspaceInterface,
	WriteOrgDocumentInput,
} from "@/types/org"
import type { OrgEditorSessionSnapshot } from "@/views/org-editor/org-editor.types"
import { orgSparseTreeField } from "../org-editor/org-sparse-tree.extension"
import { OrgDocumentPane } from "./org-document-pane.view.fn"

// Default repository injection only: workspace/target/refile flows, both hooks,
// Pane, minibuffer and CodeMirror are the production implementations.
const boundary = vi.hoisted(() => ({
	open: vi.fn(),
	scan: vi.fn(),
	read: vi.fn(),
	write: vi.fn(),
	watch: vi.fn(),
	unwatch: vi.fn(),
	release: vi.fn(),
	forbidden: vi.fn(),
}))
vi.mock("@/io/file/org-file.repository", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/io/file/org-file.repository")>()
	return {
		...actual,
		orgFileRepository: {
			...actual.orgFileRepository,
			openDefaultWorkspace: boundary.open,
			scanWorkspace: boundary.scan,
			readDocument: boundary.read,
			writeDocument: boundary.write,
			getDerivedIndexStats: boundary.forbidden,
			replaceDerivedIndex: boundary.forbidden,
			clearDerivedIndex: boundary.forbidden,
		},
		watchOrgWorkspace: boundary.watch,
		unwatchOrgWorkspace: boundary.unwatch,
		releaseOrgWorkspace: boundary.release,
	}
})
// SQL/legacy body calls must never participate in an Org source transaction.
vi.mock("@/io/api/client.api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/io/api/client.api")>()
	return {
		...actual,
		api: Object.fromEntries(Object.keys(actual.api).map((key) => [key, boundary.forbidden])),
	}
})
vi.mock("@tauri-apps/api/core", () => ({ invoke: boundary.forbidden, isTauri: () => false }))
vi.mock("@tanstack/react-router", () => ({ useBlocker: vi.fn() }))
vi.mock("@/io/event/org-window-close.adapter", () => ({
	registerOrgWindowClose: () => () => undefined,
}))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({
	orgWorkspaceEventAdapter: { listen: async () => () => undefined },
}))

const root = "/synthetic-heading-refile"
const token = "synthetic-grant-exact"
const source = "* TODO 😀\r\nbody\0\r\n** child\r\n"
const target =
	"#+title: Synthetic\r\n* Projects\r\nproject body\r\n** Existing\r\nkeep\r\n* Peer\r\npeer body\r\n"
const inserted = "** TODO 😀\r\nbody\0\r\n*** child\r\n"
let disk: Map<string, OrgDocumentInterface>
let controller: OrgWorkspaceController
let events: string[]
let uncertain: boolean
let lateRead: Promise<E.Either<OrgFileError, OrgDocumentInterface>> | undefined
const noop = () => undefined
const originalRangeRects = Object.getOwnPropertyDescriptor(Range.prototype, "getClientRects")
const originalRangeBounds = Object.getOwnPropertyDescriptor(
	Range.prototype,
	"getBoundingClientRect",
)
function Runtime() {
	controller = useOrgWorkspace()
	const cache = useRef(new Map<string, OrgEditorSessionSnapshot>())
	return (
		<>
			{controller.error && <div role="alert">{controller.error}</div>}
			<OrgDocumentPane
				controller={controller}
				editorSessionCache={cache.current}
				isBusy={controller.isLoading || controller.isSaving}
				canGoBack={false}
				canGoForward={false}
				inspectorVisible={false}
				sidebarVisible
				parameterSessionSuspended={false}
				openDocumentPaths={controller.openBuffers.map((buffer) => buffer.relativePath)}
				onCloseTab={noop}
				onSelectTab={noop}
				onGoBack={noop}
				onGoForward={noop}
				onQuickOpen={noop}
				onShowInspector={noop}
				onShowSidebar={noop}
			/>
		</>
	)
}
function view() {
	const editor = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Editing source.org" }))
	if (!editor) throw new Error("Missing real CodeMirror")
	return editor
}
function snapshot(): OrgWorkspaceInterface {
	return {
		rootPath: root,
		capabilityToken: token,
		directories: [],
		documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
	}
}
async function flush() {
	await act(async () => {
		for (let i = 0; i < 30; i++) await Promise.resolve()
	})
}
async function open(path: string) {
	await act(async () => {
		expect(await controller.openDocumentPath(path)).toBe(true)
	})
}
async function setup() {
	render(<Runtime />)
	await act(async () => {
		await controller.openDefaultWorkspace()
	})
	await open("source.org")
	act(() => {
		view().dispatch({ selection: { anchor: 2 } })
		view().focus()
	})
	events = []
}
function start() {
	fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, shiftKey: true, key: "r" })
	const input = screen.getByRole("combobox", { name: "Refile to Org file:" })
	fireEvent.change(input, { target: { value: "target.org" } })
	fireEvent.keyDown(input, { key: "Enter" })
	return input
}
async function heading() {
	start()
	await flush()
	const input = screen.getByRole("combobox", { name: "Refile under heading:" })
	expect(boundary.write).not.toHaveBeenCalled()
	expect(controller.isLoading).toBe(false)
	expect(controller.isSaving).toBe(false)
	fireEvent.change(input, { target: { value: "Projects" } })
	fireEvent.keyDown(input, { key: "Tab" })
	return input
}
async function accept(input: HTMLElement) {
	fireEvent.keyDown(input, { key: "Enter" })
	await flush()
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.resetAllMocks()
	// jsdom has no layout; supply only the Range geometry boundary used by CM RAF.
	Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] })
	Object.defineProperty(Range.prototype, "getBoundingClientRect", {
		configurable: true,
		value: () => new DOMRect(),
	})
	window.localStorage.clear()
	uncertain = false
	lateRead = undefined
	events = []
	disk = new Map([
		["source.org", { relativePath: "source.org", content: source, revision: "source-1" }],
		["target.org", { relativePath: "target.org", content: target, revision: "target-1" }],
	])
	boundary.open.mockImplementation(() => async () => E.right(snapshot()))
	boundary.scan.mockImplementation((workspaceRoot, capabilityToken) => async () => {
		expect([workspaceRoot, capabilityToken]).toEqual([root, token])
		events.push("scan")
		return E.right(snapshot())
	})
	boundary.read.mockImplementation((input) => async () => {
		expect(input).toEqual({
			workspaceRoot: root,
			capabilityToken: token,
			relativePath: input.relativePath,
		})
		events.push(`read:${input.relativePath}`)
		if (input.relativePath === "target.org" && lateRead) return lateRead
		return E.right({ ...disk.get(input.relativePath)! })
	})
	boundary.write.mockImplementation((input: WriteOrgDocumentInput) => async () => {
		expect(input.workspaceRoot).toBe(root)
		expect(input.capabilityToken).toBe(token)
		expect(input.expectedRevision).toBe(disk.get(input.relativePath)!.revision)
		events.push(`write:${input.relativePath}`)
		const saved = {
			relativePath: input.relativePath,
			content: input.content,
			revision: `${input.relativePath}-saved`,
		}
		disk.set(input.relativePath, saved)
		if (uncertain && input.relativePath === "target.org")
			return E.left({
				type: "ORG_FILE_ERROR",
				operation: "write",
				command: "synthetic-write",
				cause: null,
				message: "installed but acknowledgement lost",
			})
		return E.right({ relativePath: saved.relativePath, revision: saved.revision })
	})
	boundary.watch.mockReturnValue(async () => E.right("synthetic-watch"))
	boundary.unwatch.mockReturnValue(async () => E.right(undefined))
	boundary.release.mockReturnValue(async () => E.right(undefined))
	boundary.forbidden.mockImplementation(() => {
		throw new Error("No derived/SQL body boundary allowed")
	})
})
afterEach(() => {
	cleanup()
	for (const [key, descriptor] of [
		["getClientRects", originalRangeRects],
		["getBoundingClientRect", originalRangeBounds],
	] as const) {
		if (descriptor) Object.defineProperty(Range.prototype, key, descriptor)
		else Reflect.deleteProperty(Range.prototype, key)
	}
	expect(boundary.forbidden).not.toHaveBeenCalled()
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe("real heading refile runtime with an in-memory filesystem boundary", () => {
	it.each([
		false,
		true,
	])("moves locally from a saved/dirty source (%s) with one canonical undo and deferred CAS", async (dirty) => {
		const initial = source + "* Destination\r\nkeep\r\n* Peer\r\n"
		disk.set("source.org", { relativePath: "source.org", content: initial, revision: "source-1" })
		await setup()
		if (dirty)
			act(() => {
				view().dispatch({
					changes: { from: view().state.doc.toString().indexOf("keep"), insert: "dirty " },
				})
			})
		const original = controller.content
		const originalSelection = view().state.selection
		const depth = undoDepth(controller.activeBufferRuntime!.state)
		const reads = boundary.read.mock.calls.length
		const scans = boundary.scan.mock.calls.length
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, key: "c" })
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, key: "w" })
		const file = screen.getByRole("combobox", { name: "Refile to Org file:" })
		fireEvent.change(file, { target: { value: "source.org" } })
		await accept(file)
		const headingInput = screen.getByRole("combobox", { name: "Refile under heading:" })
		expect(screen.queryByRole("option", { name: /TODO 😀/ })).toBeNull()
		expect(screen.queryByRole("option", { name: /child/ })).toBeNull()
		fireEvent.change(headingInput, { target: { value: "Destination" } })
		fireEvent.keyDown(headingInput, { key: "Tab" })
		await accept(headingInput)
		const expected = `* Destination\r\n${dirty ? "dirty " : ""}keep\r\n${inserted}* Peer\r\n`
		expect(controller.content).toBe(expected)
		expect(controller.isDirty).toBe(true)
		expect(
			controller.openBuffers.find((buffer) => buffer.relativePath === "source.org")?.baseRevision,
		).toBe("source-1")
		expect(boundary.read).toHaveBeenCalledTimes(reads)
		expect(boundary.scan).toHaveBeenCalledTimes(scans)
		expect(boundary.write).not.toHaveBeenCalled()
		expect(disk.get("source.org")!.content).toBe(initial)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(depth + 1)
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, key: "z" })
		await flush()
		expect(controller.content).toBe(original)
		expect(view().state.selection.eq(originalSelection)).toBe(true)
		// Reapply, then allow ordinary native CAS autosave to own the only write.
		act(() => {
			view().dispatch({ changes: { from: 0, to: view().state.doc.length, insert: expected } })
		})
		await act(async () => {
			await vi.advanceTimersByTimeAsync(2000)
		})
		await flush()
		expect(
			boundary.write.mock.calls.map(([input]) => [input.relativePath, input.expectedRevision]),
		).toEqual([["source.org", "source-1"]])
	})
	it("atomically refiles visible ranges across hidden text under an explicit composite match without permitting hidden edits", async () => {
		const moving = "* TODO Move :work:\nmove body\n"
		const hidden = "* DONE Hidden :blocked:\nhidden body\n"
		const destination = "* TODO Destination :work:\ndestination body\n"
		const peer = "* DONE Peer\npeer body\n"
		const initial = moving + hidden + destination + peer
		const expected = hidden + destination + moving.replace("* TODO", "** TODO") + peer
		disk.set("source.org", { relativePath: "source.org", content: initial, revision: "source-1" })
		await setup()
		fireEvent.pointerDown(screen.getByRole("button", { name: "Note actions" }), {
			button: 0,
			ctrlKey: false,
		})
		await flush()
		fireEvent.click(screen.getByRole("menuitem", { name: /^Sparse tree/ }))
		const sparseInput = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(sparseInput, {
			target: { value: 'match: todo AND (tag:work OR text:"Destination") AND NOT tag:blocked' },
		})
		await accept(sparseInput)
		expect(view().state.field(orgSparseTreeField)!.plan.matchedHeadingStarts).toEqual([
			0,
			initial.indexOf(destination),
		])
		expect(view().contentDOM.textContent).not.toContain("hidden body")
		expect(view().contentDOM.textContent).not.toContain("peer body")
		const selection = view().state.selection
		const depth = undoDepth(controller.activeBufferRuntime!.state)
		const reads = boundary.read.mock.calls.length
		const scans = boundary.scan.mock.calls.length
		act(() => {
			view().dispatch({ changes: { from: initial.indexOf("hidden body"), insert: "forbidden" } })
		})
		expect(controller.content).toBe(initial)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(depth)
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, shiftKey: true, key: "r" })
		const file = screen.getByRole("combobox", { name: "Refile to Org file:" })
		fireEvent.change(file, { target: { value: "source.org" } })
		await accept(file)
		const headingInput = screen.getByRole("combobox", { name: "Refile under heading:" })
		fireEvent.change(headingInput, { target: { value: "Destination" } })
		fireEvent.keyDown(headingInput, { key: "Tab" })
		await accept(headingInput)
		expect(screen.queryByRole("alert")).toBeNull()
		expect(controller.content).toBe(expected)
		expect(view().state.sliceDoc()).toBe(expected)
		expect(controller.isDirty).toBe(true)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(depth + 1)
		expect(view().state.field(orgSparseTreeField)).not.toBeNull()
		expect(view().contentDOM.textContent).not.toContain("hidden body")
		act(() => {
			view().dispatch({ changes: { from: expected.indexOf("hidden body"), insert: "forbidden" } })
		})
		expect(controller.content).toBe(expected)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(depth + 1)
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, key: "z" })
		await flush()
		expect(controller.content).toBe(initial)
		expect(view().state.selection.eq(selection)).toBe(true)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(depth)
		expect(redoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(boundary.read).toHaveBeenCalledTimes(reads)
		expect(boundary.scan).toHaveBeenCalledTimes(scans)
		expect(boundary.write).not.toHaveBeenCalled()
		expect(disk.get("source.org")!.content).toBe(initial)
	})
	it.each([
		["same", "incoming"],
		["same", "target"],
		["cross", "incoming"],
		["cross", "target"],
	])("rejects %s-file malformed %s drawers before any mutation", async (scope, malformed) => {
		const incoming = "* Move\n" + (malformed === "incoming" ? ":LOGBOOK:\nunclosed\n" : "body\n")
		const destination =
			"* Projects\n" + (malformed === "target" ? ":LOGBOOK:\nunclosed\n" : "body\n") + "* Peer\n"
		const initial =
			scope === "same"
				? malformed === "incoming"
					? destination + incoming
					: incoming + destination
				: incoming
		disk.set("source.org", { relativePath: "source.org", content: initial, revision: "source-1" })
		disk.set("target.org", {
			relativePath: "target.org",
			content: destination,
			revision: "target-1",
		})
		await setup()
		act(() => view().dispatch({ selection: { anchor: initial.indexOf("* Move") + 2 } }))
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, shiftKey: true, key: "r" })
		const file = screen.getByRole("combobox", { name: "Refile to Org file:" })
		fireEvent.change(file, { target: { value: scope === "same" ? "source.org" : "target.org" } })
		await accept(file)
		const input = screen.getByRole("combobox", { name: "Refile under heading:" })
		fireEvent.change(input, { target: { value: "Projects" } })
		fireEvent.keyDown(input, { key: "Tab" })
		await accept(input)
		expect(controller.content).toBe(initial)
		expect(view().state.sliceDoc()).toBe(initial)
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		expect(boundary.write).not.toHaveBeenCalled()
		expect(disk.get("source.org")!.content).toBe(initial)
		expect(disk.get("target.org")!.content).toBe(destination)
	})
	it("accepts a file-root no-op without history, dirty state, lookup or writes", async () => {
		await setup()
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, shiftKey: true, key: "r" })
		const file = screen.getByRole("combobox", { name: "Refile to Org file:" })
		fireEvent.change(file, { target: { value: "source.org" } })
		await accept(file)
		await accept(screen.getByRole("combobox", { name: "Refile under heading:" }))
		expect(controller.content).toBe(source)
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		expect(events).toEqual([])
	})
	it("separates lookup from writes, confirms target copy before removing source, preserving raw bytes and peer", async () => {
		await setup()
		const input = await heading()
		expect(events).toEqual(["scan", "read:target.org"])
		expect(disk.get("source.org")!.content).toBe(source)
		await accept(input)
		expect(events.slice(0, 7)).toEqual([
			"scan",
			"read:target.org",
			"scan",
			"read:target.org",
			"write:target.org",
			"read:target.org",
			"write:source.org",
		])
		expect(boundary.write.mock.calls.map(([write]) => write)).toEqual([
			{
				workspaceRoot: root,
				capabilityToken: token,
				relativePath: "target.org",
				expectedRevision: "target-1",
				content: target.replace("* Peer", inserted + "* Peer"),
			},
			{
				workspaceRoot: root,
				capabilityToken: token,
				relativePath: "source.org",
				expectedRevision: "source-1",
				content: "",
			},
		])
		expect(disk.get("target.org")!.content).toBe(target.replace("* Peer", inserted + "* Peer"))
		expect(disk.get("source.org")!.content).toBe("")
		expect(view().state.sliceDoc()).toBe("")
		expect(view().state.selection.main.head).toBe(0)
		expect(view().contentDOM).toHaveFocus()
		expect(controller.isDirty).toBe(false)
	})

	it("rejects a revision changed after lookup and rejects a parked dirty target before any lookup", async () => {
		await setup()
		const input = await heading()
		disk.set("target.org", {
			relativePath: "target.org",
			content: target + "external",
			revision: "target-2",
		})
		await accept(input)
		expect(screen.getByRole("alert")).toHaveTextContent(/revision changed/)
		expect(boundary.write).not.toHaveBeenCalled()
		expect(view().state.sliceDoc()).toBe(source)
		expect(screen.queryByRole("combobox")).toBeNull()
		await open("target.org")
		act(() => {
			const editor = EditorView.findFromDOM(screen.getByRole("textbox"))!
			editor.dispatch({ changes: { from: editor.state.doc.length, insert: " local" } })
		})
		await open("source.org")
		boundary.scan.mockClear()
		boundary.read.mockClear()
		start()
		await flush()
		expect(screen.getByRole("alert")).toHaveTextContent(/Save or resolve/)
		expect(boundary.scan).not.toHaveBeenCalled()
		expect(boundary.read).not.toHaveBeenCalled()
		expect(boundary.write).not.toHaveBeenCalled()
		expect(disk.get("source.org")!.content).toBe(source)
	})

	it("latches both paths after an installed-but-uncertain target write, including new commands after undo and manual save", async () => {
		await setup()
		uncertain = true
		await accept(await heading())
		expect(boundary.write).toHaveBeenCalledTimes(1)
		expect(disk.get("target.org")!.content).toContain(inserted)
		expect(disk.get("source.org")!.content).toBe(source)
		expect(controller.openBuffers.find((b) => b.relativePath === "source.org")!.hasConflict).toBe(
			true,
		)
		act(() => {
			view().dispatch({ changes: { from: view().state.doc.length, insert: "local" } })
		})
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(redoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		expect(undoDepth(view().state)).toBe(0)
		expect(redoDepth(view().state)).toBe(0)
		act(() => {
			fireEvent.keyDown(view().contentDOM, { key: "z", code: "KeyZ", ctrlKey: true })
		})
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		expect(redoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(undoDepth(view().state)).toBe(0)
		expect(redoDepth(view().state)).toBe(0)
		expect(controller.content).toBe(source)
		await act(async () => {
			await controller.saveDocument()
		})
		expect(boundary.write).toHaveBeenCalledTimes(2)
		expect(boundary.write).toHaveBeenLastCalledWith({
			workspaceRoot: root,
			capabilityToken: token,
			relativePath: "source.org",
			content: source,
			expectedRevision: "source-1",
		})
		expect(controller.openBuffers.find((b) => b.relativePath === "source.org")!.hasConflict).toBe(
			false,
		)
		const writes = boundary.write.mock.calls.length
		boundary.scan.mockClear()
		boundary.read.mockClear()
		await act(async () => {
			expect((await controller.readRefileTarget("target.org")).kind).toBe("rejected")
		})
		start()
		await flush()
		expect(screen.getByRole("alert")).toHaveTextContent(/Save or resolve/)
		expect(boundary.scan).not.toHaveBeenCalled()
		expect(boundary.read).not.toHaveBeenCalled()
		await act(async () => {
			vi.advanceTimersByTime(60_000)
		})
		expect(boundary.write).toHaveBeenCalledTimes(writes)
		expect(disk.get("source.org")!.content).toBe(source)
	})

	it("C-g releases a hanging native read immediately and ignores its late DTO without global busy or writes", async () => {
		await setup()
		let finish!: (value: E.Either<OrgFileError, OrgDocumentInterface>) => void
		lateRead = new Promise((resolve) => {
			finish = resolve
		})
		const file = start()
		await flush()
		expect(events).toEqual(["scan", "read:target.org"])
		expect(controller.isLoading).toBe(false)
		expect(controller.isSaving).toBe(false)
		fireEvent.keyDown(file, { key: "g", ctrlKey: true })
		await flush()
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(view().contentDOM).toHaveFocus()
		expect(boundary.write).not.toHaveBeenCalled()
		await act(async () => {
			finish(E.right({ ...disk.get("target.org")! }))
			await Promise.resolve()
		})
		await flush()
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(view().state.sliceDoc()).toBe(source)
		expect(controller.activeDocument!.relativePath).toBe("source.org")
		expect(controller.isLoading || controller.isSaving).toBe(false)
		expect(boundary.write).not.toHaveBeenCalled()
	})
})
