import { redoDepth, undoDepth } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { EditorSelection } from "@codemirror/state"
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react"
import { ApplicationTestDocumentPane, render } from "@/test/application-providers"
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
import { ConfirmProvider } from "../ui"
import { OrgWorkspaceProvider, useOrgWorkspaceController } from "@/views/application/org-workspace-provider"
import { OrgWorkspaceContainer } from "./org-workspace.container.fn"
import { useSettings } from "@/hooks/use-settings"

const savedAutosavePreferences = {
	autoSave: useSettings.getState().autoSave,
	autoSaveInterval: useSettings.getState().autoSaveInterval,
	orgBehaviorConfigurationJson: useSettings.getState().orgBehaviorConfigurationJson,
}

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
vi.mock("@tanstack/react-router", () => ({
	useBlocker: vi.fn(), useNavigate: () => vi.fn(),
	Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
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
const configuredRefiling = JSON.stringify({
	version: 1,
	refile: { files: ["source.org", "target.org"], maxDepth: 1, includeRoot: false, match: "+work+LEVEL=1" },
	inheritance: { tags: true, tagExclusions: [], properties: ["EFFORT", "REPEAT_TO_STATE"], propertyExclusions: [] },
})
let disk: Map<string, OrgDocumentInterface>
let controller: OrgWorkspaceController
let events: string[]
let uncertain: boolean
let sourceRemovalFails: boolean
let lateRead: Promise<E.Either<OrgFileError, OrgDocumentInterface>> | undefined
function absentError(relativePath: string): OrgFileError {
	return {
		type: "ORG_FILE_ERROR", operation: "read", command: "read_org_document",
		message: `Org document path is absent: ${relativePath}`,
		cause: { kind: "document-path-absent", relativePath, authorizedObservation: true },
	}
}
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
			<ApplicationTestDocumentPane
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
			/>
		</>
	)
}
function ReviewRuntime() {
	controller = useOrgWorkspaceController()
	return <OrgWorkspaceContainer />
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
async function setup(reviewWorkspace = false) {
	render(reviewWorkspace ? <OrgWorkspaceProvider><ReviewRuntime /></OrgWorkspaceProvider> : <Runtime />, { wrapper: ConfirmProvider })
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
	fireEvent.keyDown(view().contentDOM, { ctrlKey: true, shiftKey: true, key: "r" })
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
async function confirmRefile() {
	const confirmation = screen.getByRole("combobox", { name: "Confirm Refile (yes/no):" })
	fireEvent.change(confirmation, { target: { value: "yes" } })
	await accept(confirmation)
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.resetAllMocks()
	vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: noop,
		removeListener: noop,
		addEventListener: noop,
		removeEventListener: noop,
		dispatchEvent: () => true,
	}))
	// jsdom has no layout; supply only the Range geometry boundary used by CM RAF.
	Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] })
	Object.defineProperty(Range.prototype, "getBoundingClientRect", {
		configurable: true,
		value: () => new DOMRect(),
	})
	window.localStorage.clear()
	useSettings.setState({ autoSave: false, orgBehaviorConfigurationJson: "" })
	uncertain = false
	sourceRemovalFails = false
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
		if (!disk.has(input.relativePath)) return E.left(absentError(input.relativePath))
		return E.right({ ...disk.get(input.relativePath)! })
	})
	boundary.write.mockImplementation((input: WriteOrgDocumentInput) => async () => {
		expect(input.workspaceRoot).toBe(root)
		expect(input.capabilityToken).toBe(token)
		expect(input.expectedRevision).toBe(disk.get(input.relativePath)?.revision ?? "<missing>")
		events.push(`write:${input.relativePath}`)
		if (sourceRemovalFails && input.relativePath === "source.org")
			return E.left({
				type: "ORG_FILE_ERROR",
				operation: "write",
				command: "synthetic-write",
				cause: null,
				message: "source removal refused; original Source retained",
			})
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
	useSettings.setState(savedAutosavePreferences)
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
	it.each(["local", "transfer"] as const)("uses explicit configured files/depth/root/match and inherited target metadata through %s preview/confirmation", async (mode) => {
		const moving = "* TODO Move 😀\r\n[[file:target.org::*Projects][destination]]\r\nbody\0\r\n** Child\r\nliteral\r\n"
		const destination = "#+FILETAGS: :work:\r\n* Projects\r\n:PROPERTIES:\r\n:EFFORT: 0:30\r\n:REPEAT_TO_STATE: NEXT\r\n:END:\r\n** Existing\r\nkeep\r\n* Peer\r\npeer\r\n"
		const directive = "#+FILETAGS: :work:\r\n"
		const before = mode === "local" ? directive + moving + destination.slice(directive.length) : moving
		const payload = "** TODO Move 😀\r\n[[file:target.org::*Projects][destination]]\r\nbody\0\r\n*** Child\r\nliteral\r\n"
		const expected = destination.replace("* Peer", payload + "* Peer")
		disk.set("source.org", { relativePath: "source.org", content: before, revision: "source-1" })
		disk.set("target.org", { relativePath: "target.org", content: destination, revision: "target-1" })
		disk.set("outside.org", { relativePath: "outside.org", content: "* Excluded :work:\r\n", revision: "outside-1" })
		useSettings.setState({ orgBehaviorConfigurationJson: configuredRefiling })
		await setup()
		act(() => view().dispatch({ selection: { anchor: before.indexOf("* TODO") + 2 } }))
		const depth = undoDepth(controller.activeBufferRuntime!.state)
		fireEvent.keyDown(view().contentDOM, { ctrlKey: true, shiftKey: true, key: "r" })
		const file = screen.getByRole("combobox", { name: "Refile to Org file:" })
		expect(screen.queryByRole("option", { name: "outside.org" })).toBeNull()
		fireEvent.change(file, { target: { value: mode === "local" ? "source.org" : "target.org" } })
		await accept(file)
		const headingInput = screen.getByRole("combobox", { name: "Refile under heading:" })
		expect(screen.queryByRole("option", { name: /\(file root\)/ })).toBeNull()
		expect(screen.queryByRole("option", { name: /Existing|Child|Move 😀/ })).toBeNull()
		fireEvent.change(headingInput, { target: { value: "Projects" } })
		fireEvent.keyDown(headingInput, { key: "Tab" })
		await accept(headingInput)
		expect(screen.getByLabelText("Refile insertion preview").textContent).toContain(payload)
		expect(controller.content).toBe(before)
		expect(boundary.write).not.toHaveBeenCalled()
		expect(disk.get("target.org")!.content).toBe(destination)
		await confirmRefile()
		if (mode === "local") {
			expect(controller.content).toBe(expected)
			expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(depth + 1)
			expect(boundary.write).not.toHaveBeenCalled()
			expect(disk.get("source.org")!.content).toBe(before)
			fireEvent.keyDown(view().contentDOM, { ctrlKey: true, key: "z" })
			await flush()
			expect(controller.content).toBe(before)
			expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(depth)
			expect(boundary.write).not.toHaveBeenCalled()
		} else {
			expect(disk.get("target.org")!.content).toBe(expected)
			expect(disk.get("source.org")!.content).toBe("")
			expect(boundary.write.mock.calls.map(([write]) => write.relativePath)).toEqual(["target.org", "source.org"])
		}
	})

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
		expect(controller.content).toBe(original)
		expect(boundary.write).not.toHaveBeenCalled()
		await confirmRefile()
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
			useSettings.setState({ autoSave: true, autoSaveInterval: 1 })
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
			target: { value: 'match: todo:TODO AND (tag:work OR text:"Destination") AND NOT tag:blocked' },
		})
		await accept(sparseInput)
		expect(view().state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([
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
		await confirmRefile()
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
		const readsBeforeAccept = boundary.read.mock.calls.length
		await accept(file)
		if (malformed === "incoming") {
			// Payload validation rejects before target lookup or preview.
			expect(screen.getByRole("combobox", { name: "Refile to Org file:" })).toBe(file)
			expect(screen.queryByRole("combobox", { name: "Refile under heading:" })).toBeNull()
			expect(boundary.read).toHaveBeenCalledTimes(readsBeforeAccept)
		} else {
			const input = screen.getByRole("combobox", { name: "Refile under heading:" })
			fireEvent.change(input, { target: { value: "Projects" } })
			fireEvent.keyDown(input, { key: "Tab" })
			await accept(input)
		}
		expect(screen.queryByRole("combobox", { name: "Confirm Refile (yes/no):" })).toBeNull()
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
		await confirmRefile()
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
		expect(screen.getByLabelText("Refile insertion preview").textContent).toBe(inserted)
		expect(boundary.write).not.toHaveBeenCalled()
		expect(disk.get("source.org")!.content).toBe(source)
		await confirmRefile()
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
		await confirmRefile()
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
		expect(boundary.scan).not.toHaveBeenCalled()
		expect(boundary.read).not.toHaveBeenCalled()
		expect(boundary.write).not.toHaveBeenCalled()
		expect(disk.get("source.org")!.content).toBe(source)
	})

	it.each(["confirmed", "uncertain"] as const)("settles one Source Refile note continuation after a %s target acknowledgement without retry", async (outcome) => {
		const startup = "#+STARTUP: lognoterefile\r\n"
		const initial = startup + source
		disk.set("source.org", { relativePath: "source.org", content: initial, revision: "source-1" })
		await setup()
		act(() => { view().dispatch({ selection: { anchor: initial.indexOf("* TODO") + 2 } }); view().focus() })
		await accept(await heading())
		await confirmRefile()
		const note = screen.getByRole("textbox", { name: "Refile note" })
		fireEvent.change(note, { target: { value: "literal\0😀\n* not a heading" } })
		expect(controller.content).toBe(initial)
		expect(boundary.write).not.toHaveBeenCalled()
		const entered = Promise.withResolvers<void>()
		const acknowledgement = Promise.withResolvers<E.Either<OrgFileError, { relativePath: string; revision: string }>>()
		boundary.write.mockImplementationOnce((write: WriteOrgDocumentInput) => async () => {
			expect(write.relativePath).toBe("target.org")
			disk.set("target.org", { relativePath: "target.org", content: write.content, revision: "target-note-accepted" })
			entered.resolve()
			return acknowledgement.promise
		})
		const finish = screen.getByRole("button", { name: "Finish note" })
		fireEvent.click(finish)
		fireEvent.click(finish)
		await act(async () => { await entered.promise })
		expect(boundary.write).toHaveBeenCalledTimes(1)
		expect(screen.getByRole("textbox", { name: "Refile note" })).toBe(note)
		await act(async () => {
			acknowledgement.resolve(outcome === "confirmed"
				? E.right({ relativePath: "target.org", revision: "target-note-accepted" })
				: E.left({ type: "ORG_FILE_ERROR", operation: "write", command: "synthetic-write", cause: null, message: "installed note copy; acknowledgement lost" }))
		})
		await flush()
		expect(screen.queryByRole("textbox", { name: "Refile note" })).toBeNull()
		const copied = disk.get("target.org")!.content
		expect(copied.match(/Refiled on/g)).toHaveLength(1)
		expect(copied).toContain('"literal\\u0000😀\\n"')
		expect(copied).toContain("body\0\r\n*** child\r\n")
		expect(disk.get("source.org")!.content).toBe(outcome === "confirmed" ? startup : initial)
		expect(boundary.write.mock.calls.map(([write]) => write.relativePath)).toEqual(
			outcome === "confirmed" ? ["target.org", "source.org"] : ["target.org"],
		)
		const writes = boundary.write.mock.calls.length
		fireEvent.click(finish)
		await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
		expect(boundary.write).toHaveBeenCalledTimes(writes)
	})

	it.each(["source", "target"] as const)("rejects %s edits during an accepted target write and settles the acknowledged transfer once", async (changed) => {
		await setup()
		await open("target.org")
		const targetRuntime = controller.activeBufferRuntime!
		await open("source.org")
		const sourceRuntime = controller.activeBufferRuntime!
		act(() => { view().dispatch({ selection: { anchor: 2 } }); view().focus() })
		await accept(await heading())
		const entered = Promise.withResolvers<void>()
		const acknowledgement = Promise.withResolvers<E.Either<OrgFileError, { relativePath: string; revision: string }>>()
		boundary.write.mockImplementationOnce((write: WriteOrgDocumentInput) => async () => {
			expect(write.relativePath).toBe("target.org")
			disk.set("target.org", { relativePath: "target.org", content: write.content, revision: "target-accepted" })
			entered.resolve()
			return acknowledgement.promise
		})
		const confirmation = screen.getByRole("combobox", { name: "Confirm Refile (yes/no):" })
		fireEvent.change(confirmation, { target: { value: "yes" } })
		fireEvent.keyDown(confirmation, { key: "Enter" })
		await act(async () => { await entered.promise })
		const runtime = changed === "source" ? sourceRuntime : targetRuntime
		const baseline = runtime.source
		const insertion = "retained\0😀\r\n"
		const revision = runtime.revision, history = undoDepth(runtime.state)
		act(() => {
			expect(() => runtime.applyCommandEdit(baseline, {
				from: baseline.length, to: baseline.length, insert: insertion, cursor: baseline.length + insertion.length,
			})).toThrowError(/Commit guard rejected source/)
		})
		expect(runtime.source).toBe(baseline)
		expect(runtime.revision).toBe(revision)
		expect(undoDepth(runtime.state)).toBe(history)
		await act(async () => {
			acknowledgement.resolve(E.right({ relativePath: "target.org", revision: "target-accepted" }))
		})
		await flush()
		expect(boundary.write.mock.calls.map(([write]) => write.relativePath)).toEqual(["target.org", "source.org"])
		expect(disk.get("source.org")!.content).toBe("")
		expect(disk.get("target.org")!.content).toBe(target.replace("* Peer", inserted + "* Peer"))
		expect(sourceRuntime.source).toBe("")
		expect(targetRuntime.source).toBe(target.replace("* Peer", inserted + "* Peer"))
		expect(controller.protectedPaths).not.toContain("source.org")
		expect(controller.protectedPaths).not.toContain("target.org")
		await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
		expect(boundary.write).toHaveBeenCalledTimes(2)
	})

	it("latches both paths after an installed-but-uncertain target write, including new commands after undo and manual save", async () => {
		await setup()
		uncertain = true
		await accept(await heading())
		await confirmRefile()
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

describe("production per-file reconciliation after uncertain Refile", () => {
	async function partialTransfer(confirmedTargetCopy = false) {
		await setup(true)
		await open("target.org")
		await open("source.org")
		act(() => { view().dispatch({ selection: { anchor: 2 } }); view().focus() })
		uncertain = !confirmedTargetCopy
		sourceRemovalFails = confirmedTargetCopy
		await accept(await heading())
		await confirmRefile()
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "source.org")?.hasConflict).toBe(true)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "target.org")?.hasConflict).toBe(true)
		expect(disk.get("target.org")!.content).toContain(inserted)
		expect(disk.get("source.org")!.content).toBe(source)
	}
	async function reviewCurrent() {
		fireEvent.click(screen.getByRole("button", { name: "Review / reconcile file" }))
		await flush()
		expect(screen.getByRole("complementary", { name: "Review protected Org file" })).toBeTruthy()
	}
	async function unopenedMissingTarget() {
		await setup(true)
		uncertain = true
		await accept(await heading())
		await confirmRefile()
		expect(controller.protectedPaths).toEqual(expect.arrayContaining(["source.org", "target.org"]))
		expect(controller.liveBuffers.some((buffer) => buffer.document.relativePath === "target.org")).toBe(false)
		disk.delete("target.org")
		fireEvent.click(screen.getByRole("button", { name: "Review protected path: target.org" }))
		await flush()
		expect(screen.getByRole("button", { name: "Acknowledge missing unopened path" })).toBeEnabled()
		expect(screen.queryByLabelText("Reviewed disk Org Source")).toBeNull()
	}
	it("represents uncertain unopened target absence and acknowledges only that path without inventing transfer success", async () => {
		await unopenedMissingTarget()
		const writes = boundary.write.mock.calls.length
		const history = controller.activeBufferRuntime!.state
		fireEvent.click(screen.getByRole("button", { name: "Acknowledge missing unopened path" }))
		await flush()
		fireEvent.click(screen.getByRole("button", { name: "Acknowledge absent path" }))
		await flush()
		expect(controller.protectedPaths).toEqual(["source.org"])
		expect(controller.content).toBe(source)
		expect(controller.activeBufferRuntime!.state).toBe(history)
		expect(disk.has("target.org")).toBe(false)
		expect(boundary.write).toHaveBeenCalledTimes(writes)
		expect(screen.getByText(/no transfer success was inferred/i)).toBeTruthy()
	})
	it("invalidates an unopened-path review when its captured Source origin changes", async () => {
		await unopenedMissingTarget()
		const writes = boundary.write.mock.calls.length
		act(() => view().dispatch({ changes: { from: view().state.doc.length, insert: "retained newer input😀\0\r\n" } }))
		await flush()
		expect(screen.getByRole("button", { name: "Acknowledge missing unopened path" })).toBeDisabled()
		expect(controller.protectedPaths).toEqual(expect.arrayContaining(["source.org", "target.org"]))
		expect(controller.content).toBe(source + "retained newer input😀\0\r\n")
		expect(boundary.write).toHaveBeenCalledTimes(writes)
	})
	it("cannot acknowledge an unopened target while an accepted originating Source save is still draining", async () => {
		await unopenedMissingTarget()
		const { promise, resolve } = Promise.withResolvers<E.Either<OrgFileError, { relativePath: string; revision: string }>>()
		boundary.write.mockImplementationOnce(() => () => promise)
		let saving!: Promise<boolean>
		act(() => { saving = controller.saveDocument() })
		await flush()
		expect(controller.isSaving).toBe(true)
		expect(screen.getByRole("button", { name: "Acknowledge missing unopened path" })).toBeDisabled()
		expect(controller.protectedPaths).toContain("target.org")
		await act(async () => {
			disk.set("source.org", { relativePath: "source.org", content: source, revision: "saved-origin" })
			resolve(E.right({ relativePath: "source.org", revision: "saved-origin" }))
			await saving
		})
		await flush()
		expect(controller.protectedPaths).toContain("target.org")
		expect(disk.has("target.org")).toBe(false)
	})
	it.each(["document", "unknown"] as const)("refuses acknowledging an absent unopened target after %s occupation", async (state) => {
		await unopenedMissingTarget()
		const writes = boundary.write.mock.calls.length
		if (state === "document") disk.set("target.org", { relativePath: "target.org", content: "new owner\r\n", revision: "new-owner" })
		else boundary.read.mockImplementationOnce(() => async () => E.left({ ...absentError("target.org"), cause: "directory, symlink or permission error" }))
		fireEvent.click(screen.getByRole("button", { name: "Acknowledge missing unopened path" }))
		await flush()
		fireEvent.click(screen.getByRole("button", { name: "Acknowledge absent path" }))
		await flush()
		expect(controller.protectedPaths).toEqual(expect.arrayContaining(["source.org", "target.org"]))
		expect(controller.content).toBe(source)
		expect(boundary.write).toHaveBeenCalledTimes(writes)
		expect(screen.getByText(/Disk state changed after review/)).toBeTruthy()
	})
	it("shows non-document recovery truthfully and retains both protections", async () => {
		await setup(true)
		uncertain = true
		await accept(await heading())
		await confirmRefile()
		boundary.read.mockImplementationOnce(() => async () => E.left({
			...absentError("target.org"), cause: "symlink outside workspace", message: "Path is a symlink; safe read refused",
		}))
		fireEvent.click(screen.getByRole("button", { name: "Review protected path: target.org" }))
		await flush()
		expect(screen.getByText(/Path is a symlink; safe read refused/)).toBeTruthy()
		expect(within(screen.getByRole("complementary", { name: "Review protected Org file" })).getByRole("button", { name: "Refresh workspace" })).toBeTruthy()
		expect(screen.queryByRole("button", { name: "Acknowledge missing unopened path" })).toBeNull()
		expect(controller.protectedPaths).toEqual(expect.arrayContaining(["source.org", "target.org"]))
	})
	it("recreates retained raw Source by explicit create-CAS and preserves input/history typed during its ACK", async () => {
		await partialTransfer()
		disk.delete("source.org")
		await reviewCurrent()
		const retainedRuntime = controller.activeBufferRuntime!
		const writes = boundary.write.mock.calls.length
		const { promise, resolve } = Promise.withResolvers<E.Either<OrgFileError, { relativePath: string; revision: string }>>()
		boundary.write.mockImplementationOnce((input: WriteOrgDocumentInput) => () => {
			expect(input).toMatchObject({ content: source, expectedRevision: "<missing>", relativePath: "source.org", capabilityToken: token, workspaceRoot: root })
			return promise
		})
		fireEvent.click(screen.getByRole("button", { name: "Recreate retained Source" }))
		await flush()
		fireEvent.click(screen.getByRole("button", { name: "Create retained Source" }))
		await flush()
		expect(boundary.write).toHaveBeenCalledTimes(writes + 1)
		act(() => view().dispatch({ changes: { from: view().state.doc.length, insert: "newer😀\0\r\n" } }))
		const newerHistory = retainedRuntime.state
		await act(async () => {
			disk.set("source.org", { relativePath: "source.org", content: source, revision: "recreated" })
			resolve(E.right({ relativePath: "source.org", revision: "recreated" }))
		})
		await flush()
		expect(controller.activeBufferRuntime).toBe(retainedRuntime)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(undoDepth(newerHistory))
		expect(redoDepth(controller.activeBufferRuntime!.state)).toBe(redoDepth(newerHistory))
		expect(controller.content).toBe(source + "newer😀\0\r\n")
		expect(controller.activeDocument?.content).toBe(source)
		expect(controller.activeDocument?.revision).toBe("recreated")
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "source.org")?.autosavePaused).toBe(true)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "target.org")?.hasConflict).toBe(true)
		expect(disk.get("source.org")!.content).toBe(source)
	})
	it.each(["occupied", "failure"] as const)("retains missing Source/history on recreation %s", async (state) => {
		await partialTransfer()
		disk.delete("source.org")
		await reviewCurrent()
		const history = controller.activeBufferRuntime!.state
		const writes = boundary.write.mock.calls.length
		if (state === "occupied") disk.set("source.org", { relativePath: "source.org", content: "different owner", revision: "occupied" })
		else boundary.write.mockImplementationOnce(() => async () => E.left({
			type: "ORG_FILE_ERROR", command: "write_org_document", operation: "write", cause: null, message: "Creation failed without confirmation",
		}))
		fireEvent.click(screen.getByRole("button", { name: "Recreate retained Source" }))
		await flush()
		fireEvent.click(screen.getByRole("button", { name: "Create retained Source" }))
		await flush()
		expect(boundary.write).toHaveBeenCalledTimes(writes + (state === "occupied" ? 0 : 1))
		expect(controller.content).toBe(source)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(undoDepth(history))
		expect(redoDepth(controller.activeBufferRuntime!.state)).toBe(redoDepth(history))
		expect(controller.openBuffers.every((buffer) => buffer.hasConflict && buffer.autosavePaused)).toBe(true)
		if (state === "occupied") expect(disk.get("source.org")!.content).toBe("different owner")
		else expect(disk.has("source.org")).toBe(false)
	})
	it("reaches a clean protected source via its review control, cancels without effects, then reconciles only source", async () => {
		await partialTransfer()
		expect(controller.isDirty).toBe(false)
		const selection = EditorSelection.create([EditorSelection.range(2, 4), EditorSelection.range(10, 12)], 1)
		act(() => { view().dispatch({ selection }); view().focus() })
		const revision = controller.activeBufferRuntime!.revision
		const historyDepth = undoDepth(controller.activeBufferRuntime!.state)
		const diskBefore = [...disk.entries()]
		await reviewCurrent()
		expect(screen.getByLabelText("Copy retained working Org Source").textContent).toBe(source)
		fireEvent.click(screen.getByRole("button", { name: "Cancel / close review" }))
		await flush()
		expect(controller.activeDocument?.revision).toBe("source-1")
		expect(controller.content).toBe(source)
		expect(controller.activeBufferRuntime!.revision).toBe(revision)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(historyDepth)
		expect([...disk.entries()]).toEqual(diskBefore)
		expect(controller.openBuffers.every((buffer) => buffer.hasConflict)).toBe(true)
		await reviewCurrent()
		fireEvent.click(screen.getByRole("button", { name: "Adopt reviewed disk Source" }))
		await flush()
		expect(controller.content).toBe(source)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "source.org")?.hasConflict).toBe(false)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "target.org")?.hasConflict).toBe(true)
		expect([...disk.entries()]).toEqual(diskBefore)
		fireEvent.click(screen.getByRole("button", { name: "Return Source" }))
		await flush()
		expect(view().state.selection.eq(selection)).toBe(true)
		expect(document.activeElement).toBe(view().contentDOM)
	})
	it("keeps a protected target review actionable across repeated unchanged native workspace scans", async () => {
		await partialTransfer()
		await open("target.org")
		await reviewCurrent()
		await act(async () => { await controller.refreshWorkspace() })
		await flush()
		expect(screen.getByRole("button", { name: "Keep retained Source" })).toBeEnabled()
		fireEvent.click(screen.getByRole("button", { name: "Keep retained Source" }))
		await flush()
		fireEvent.click(screen.getByRole("button", { name: "Keep Source; require manual Save" }))
		await flush()
		expect(controller.content).toBe(target)
		expect(controller.activeDocument?.revision).toBe(disk.get("target.org")!.revision)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "target.org")?.hasConflict).toBe(false)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "target.org")?.autosavePaused).toBe(true)
	})

	it("opens the exact target by keyboard, rejects disk drift, then adopts reviewed target bytes with discard consent", async () => {
		await partialTransfer()
		await open("target.org")
		const editor = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Editing target.org" }))!
		act(() => editor.focus())
		fireEvent.keyDown(screen.getByRole("textbox", { name: "Editing target.org" }), { ctrlKey: true, altKey: true, key: "r" })
		await flush()
		const retained = controller.content
		expect(retained).toBe(target)
		const copied = disk.get("target.org")!
		disk.set("target.org", { ...copied, revision: "target-later", content: copied.content + "* Later\r\n" })
		fireEvent.click(screen.getByRole("button", { name: "Adopt reviewed disk Source" }))
		await flush()
		fireEvent.click(screen.getByRole("button", { name: "Discard and adopt disk" }))
		await flush()
		expect(controller.content).toBe(retained)
		expect(controller.activeDocument?.revision).toBe("target-1")
		expect(controller.openBuffers.every((buffer) => buffer.hasConflict)).toBe(true)
		fireEvent.click(screen.getByRole("button", { name: "Cancel / close review" }))
		await flush()
		await reviewCurrent()
		fireEvent.click(screen.getByRole("button", { name: "Adopt reviewed disk Source" }))
		await flush()
		fireEvent.click(screen.getByRole("button", { name: "Discard and adopt disk" }))
		await flush()
		expect(controller.content).toBe(disk.get("target.org")!.content)
		expect(controller.activeDocument?.revision).toBe("target-later")
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "target.org")?.hasConflict).toBe(false)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "source.org")?.hasConflict).toBe(true)
		fireEvent.click(screen.getByRole("button", { name: "Return Source" }))
		await flush()
		const freshView = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Editing target.org" }))!
		expect(document.activeElement).toBe(freshView.contentDOM)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
	})
	it("keeps target Source without autosave, then explicit correct CAS retains input typed during Save", async () => {
		await partialTransfer()
		await open("target.org")
		const originalView = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Editing target.org" }))!
		const selection = EditorSelection.create([EditorSelection.range(1, 4), EditorSelection.range(12, 15)], 1)
		act(() => { originalView.dispatch({ selection }); originalView.focus() })
		await reviewCurrent()
		fireEvent.click(screen.getByRole("button", { name: "Keep retained Source" }))
		await flush()
		fireEvent.click(screen.getByRole("button", { name: "Keep Source; require manual Save" }))
		await flush()
		expect(controller.content).toBe(target)
		expect(controller.activeDocument?.revision).toBe(disk.get("target.org")!.revision)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "target.org")?.autosavePaused).toBe(true)
		fireEvent.click(screen.getByRole("button", { name: "Return Source" }))
		await flush()
		expect(originalView.state.selection.eq(selection)).toBe(true)
		expect(document.activeElement).toBe(originalView.contentDOM)
		const copied = disk.get("target.org")!.content
		await act(async () => { vi.advanceTimersByTime(5000); await Promise.resolve() })
		expect(disk.get("target.org")!.content).toBe(copied)
		uncertain = false
		const { promise, resolve } = Promise.withResolvers<E.Either<OrgFileError, { relativePath: string; revision: string }>>()
		const writesBeforeSave = boundary.write.mock.calls.length
		boundary.write.mockImplementationOnce((input: WriteOrgDocumentInput) => () => {
			expect(input.expectedRevision).toBe(disk.get("target.org")!.revision)
			expect(input.content).toBe(target)
			return promise
		})
		fireEvent.click(screen.getByRole("button", { name: "Save document" }))
		await flush()
		const editor = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Editing target.org" }))!
		expect(boundary.write).toHaveBeenCalledTimes(writesBeforeSave + 1)
		expect(controller.isSaving).toBe(true)
		act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "newer" } }))
		await act(async () => {
			disk.set("target.org", { relativePath: "target.org", content: target, revision: "target-manual" })
			resolve(E.right({ relativePath: "target.org", revision: "target-manual" }))
		})
		await flush()
		expect(controller.content).toBe(target + "newer")
		expect(controller.activeDocument?.revision).toBe("target-manual")
		expect(controller.isDirty).toBe(true)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "source.org")?.hasConflict).toBe(true)
	})
	it("reconciles a confirmed copy/source-left outcome independently, adopts post-dedup target Source, then ordinarily saves its fresh CAS baseline", async () => {
		useSettings.setState({ autoSave: true, autoSaveInterval: 1 })
		await partialTransfer(true)
		expect(boundary.write.mock.calls.map(([input]) => input.relativePath)).toEqual(["target.org", "source.org"])
		expect(events).toContain("read:target.org")
		const writes = boundary.write.mock.calls.length
		await reviewCurrent()
		const sourceReads = boundary.read.mock.calls.filter(([input]) => input.relativePath === "source.org").length
		fireEvent.click(screen.getByRole("button", { name: "Adopt reviewed disk Source" }))
		await flush()
		expect(boundary.read.mock.calls.filter(([input]) => input.relativePath === "source.org")).toHaveLength(sourceReads + 1)
		expect(controller.content).toBe(source)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "source.org")).toMatchObject({ hasConflict: false, autosavePaused: false })
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "target.org")).toMatchObject({ hasConflict: true, autosavePaused: true })
		fireEvent.click(screen.getByRole("button", { name: "Cancel / close review" }))
		await flush()
		await open("target.org")
		const retainedRuntime = controller.activeBufferRuntime!
		await reviewCurrent()
		// A human verified both copies, removed the duplicate from target on disk,
		// and retained a separate edit. No application writer participates.
		const deduplicated = target.replace("project body", "manually reviewed body")
		disk.set("target.org", { relativePath: "target.org", content: deduplicated, revision: "target-deduplicated" })
		fireEvent.click(screen.getByRole("button", { name: "Adopt reviewed disk Source" }))
		await flush()
		fireEvent.click(screen.getByRole("button", { name: "Discard and adopt disk" }))
		await flush()
		expect(controller.content).toBe(target)
		expect(controller.activeDocument?.revision).toBe("target-1")
		expect(controller.activeBufferRuntime).toBe(retainedRuntime)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "target.org")?.hasConflict).toBe(true)
		expect(boundary.write).toHaveBeenCalledTimes(writes)
		fireEvent.click(screen.getByRole("button", { name: "Cancel / close review" }))
		await flush()
		await reviewCurrent()
		expect(screen.getByLabelText("Reviewed disk Org Source").textContent).toBe(deduplicated)
		const targetReads = boundary.read.mock.calls.filter(([input]) => input.relativePath === "target.org").length
		fireEvent.click(screen.getByRole("button", { name: "Adopt reviewed disk Source" }))
		await flush()
		fireEvent.click(screen.getByRole("button", { name: "Discard and adopt disk" }))
		await flush()
		expect(boundary.read.mock.calls.filter(([input]) => input.relativePath === "target.org")).toHaveLength(targetReads + 1)
		expect(controller.content).toBe(deduplicated)
		expect(controller.activeDocument?.revision).toBe("target-deduplicated")
		expect(controller.isDirty).toBe(false)
		expect(retainedRuntime.closed).toBe(true)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		expect(controller.openBuffers.every((buffer) => !buffer.hasConflict && !buffer.autosavePaused)).toBe(true)
		fireEvent.click(screen.getByRole("button", { name: "Return Source" }))
		await flush()
		const editor = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Editing target.org" }))!
		expect(editor.state.sliceDoc()).toBe(deduplicated)
		expect(editor.contentDOM.getAttribute("contenteditable")).toBe("true")
		await act(async () => { vi.advanceTimersByTime(60_000); await Promise.resolve() })
		expect(boundary.write).toHaveBeenCalledTimes(writes)
		expect(disk.get("source.org")!.content).toBe(source)
		expect(disk.get("target.org")!.content).toBe(deduplicated)
		act(() => {
			useSettings.setState({ autoSave: false })
			editor.dispatch({ changes: { from: editor.state.doc.length, insert: "* Ordinary edit\r\n" } })
		})
		expect(boundary.write).toHaveBeenCalledTimes(writes)
		fireEvent.click(screen.getByRole("button", { name: "Save document" }))
		await flush()
		expect(boundary.write).toHaveBeenCalledTimes(writes + 1)
		expect(boundary.write).toHaveBeenLastCalledWith({
			workspaceRoot: root, capabilityToken: token, relativePath: "target.org",
			expectedRevision: "target-deduplicated", content: deduplicated + "* Ordinary edit\r\n",
		})
		expect(controller.activeDocument?.revision).toBe("target.org-saved")
		expect(controller.isDirty).toBe(false)
		expect(disk.get("target.org")!.content).toBe(deduplicated + "* Ordinary edit\r\n")
		expect(disk.get("source.org")!.content).toBe(source)
	})
})
