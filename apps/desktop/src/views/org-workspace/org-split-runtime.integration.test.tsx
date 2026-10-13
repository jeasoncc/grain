import { redoDepth, undoDepth } from "@codemirror/commands"
import { foldCode, foldedRanges } from "@codemirror/language"
import { EditorSelection, EditorState, StateEffect } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { OrgWorkspaceProvider } from "@/views/application/org-workspace-provider"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	moveOrgDocumentFlow,
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	saveOrgDocumentFlow,
	scanOrgWorkspaceFlow,
} from "@/flows/org-workspace/org-workspace.flow"
import { resolveOrgLinkTargetFlow } from "@/flows/org-workspace/org-link-target.flow"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import {
	orgFileRepository,
	releaseOrgWorkspace,
	unwatchOrgWorkspace,
	watchOrgWorkspace,
} from "@/io/file/org-file.repository"
import type { OrgDocumentInterface, OrgWorkspaceInterface } from "@/types/org"
import { OrgWorkspaceContainer } from "./org-workspace.container.fn"
import { orgSparseTreeField } from "../org-editor/org-sparse-tree.extension"
import { useSettings } from "@/hooks/use-settings"

const savedAutosavePreferences = {
	autoSave: useSettings.getState().autoSave,
	autoSaveInterval: useSettings.getState().autoSaveInterval,
}

// Observe, but never substitute, the production controller used by the production root.
let controller: OrgWorkspaceController
vi.mock("@/hooks/use-org-workspace", async (original) => {
	const real = await original<typeof import("@/hooks/use-org-workspace")>()
	return {
		...real,
		useOrgWorkspace: () => {
			controller = real.useOrgWorkspace()
			return controller
		},
	}
})
vi.mock("@/hooks/use-workspace", () => ({ useAllWorkspaces: () => [] }))
vi.mock("@/io/event", () => ({ listenForOrgDiaryCreation: () => () => undefined }))
// Only filesystem/host boundaries are replaced: hook, pane, editor and CM history are real.
vi.mock("@tanstack/react-router", () => ({
	useBlocker: vi.fn(),
	useNavigate: () => async () => undefined,
	Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
vi.mock("@/io/event/org-window-close.adapter", () => ({
	registerOrgWindowClose: vi.fn(() => () => undefined),
}))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({
	orgWorkspaceEventAdapter: { listen: async () => () => undefined },
}))
vi.mock("@/io/file/org-file.repository", async (original) => {
	const real = await original<typeof import("@/io/file/org-file.repository")>()
	return {
		...real,
		orgFileRepository: { ...real.orgFileRepository, readDocument: vi.fn() },
		releaseOrgWorkspace: vi.fn(),
		unwatchOrgWorkspace: vi.fn(),
		watchOrgWorkspace: vi.fn(),
	}
})
vi.mock("@/flows/org-workspace/org-workspace.flow", () => ({
	createOrgDirectoryFlow: vi.fn(),
	deleteOrgDocumentFlow: vi.fn(),
	selectOrgWorkspaceFlow: vi.fn(),
	captureOrgTodoFlow: vi.fn(),
	moveOrgDocumentFlow: vi.fn(),
	openDefaultOrgWorkspaceFlow: vi.fn(),
	reopenDefaultOrgWorkspaceFlow: vi.fn(),
	openOrgDocumentFlow: vi.fn(),
	saveOrgDocumentFlow: vi.fn(),
	scanOrgWorkspaceFlow: vi.fn(),
}))
vi.mock("@/flows/org-workspace/org-derived-index.flow", () => ({
	clearOrgDerivedIndexFlow: vi.fn(),
	rebuildOrgDerivedIndexFlow: vi.fn(),
}))
vi.mock("@/flows/org-workspace/org-subtree-refile.flow", () => ({
	archiveOrgSubtreeFlow: vi.fn(),
	refileOrgSubtreeFlow: vi.fn(),
}))
vi.mock("@/flows/org-workspace/org-capture-entry.flow", () => ({ captureOrgEntryFlow: vi.fn(), readOrgCaptureTargetFlow: vi.fn() }))
vi.mock("@/flows/org-workspace/org-link-target.flow", () => ({ resolveOrgLinkTargetFlow: vi.fn() }))
vi.mock("@/flows/org-workspace/org-refile-target.flow", () => ({ readOrgRefileTargetFlow: vi.fn() }))

// CRLF, LF, NUL, surrogate pairs and missing final newline travel as raw source.
const rawA = "* A :raw:\r\nbody\0😀\r\n* Second\r\nsecond body\r\nEOF"
const rawB = "* B\nindependent😀\0\nEOF"
let disk: Map<string, OrgDocumentInterface>
let workspace: OrgWorkspaceInterface
const commits = vi.hoisted(() => vi.fn())
// Instrument the real production writable callback, without substituting runtime DTOs.
vi.mock("@/flows/org-editor-runtime", async (original) => {
	const real = await original<typeof import("@/flows/org-editor-runtime")>()
	return {
		...real,
		createOrgBufferRuntime: (options: Parameters<typeof real.createOrgBufferRuntime>[0]) =>
			real.createOrgBufferRuntime({
				...options,
				onCommit: (event) => {
					commits(event)
					options.onCommit?.(event)
				},
			}),
	}
})
function views() {
	return screen.getAllByRole("textbox", { name: /^Editing / }).map((node) => {
		const view = EditorView.findFromDOM(node)
		if (!view) throw new Error("Missing production EditorView")
		return view
	})
}
const left = () => views()[0]
const right = () => views()[1]
function focus(view: EditorView) {
	act(() => view.focus())
}
function type(view: EditorView, text: string) {
	focus(view)
	act(() =>
		view.dispatch({
			changes: {
				from: view.state.selection.main.from,
				to: view.state.selection.main.to,
				insert: text,
			},
			userEvent: "input.type",
		}),
	)
}
function key(view: EditorView, redo = false) {
	focus(view)
	fireEvent.keyDown(view.contentDOM, {
		key: redo ? "y" : "z",
		code: redo ? "KeyY" : "KeyZ",
		ctrlKey: true,
	})
}
function source(expected: string) {
	expect(controller.content).toBe(expected)
	expect(controller.activeBufferRuntime!.source).toBe(expected)
	for (const view of views().filter(
		(view) =>
			view.contentDOM.getAttribute("aria-label") ===
			`Editing ${controller.activeDocument?.relativePath}`,
	)) {
		expect(view.state.sliceDoc()).toBe(expected)
		expect(undoDepth(view.state)).toBe(0)
		expect(redoDepth(view.state)).toBe(0)
	}
}
function folds(view: EditorView) {
	let count = 0
	foldedRanges(view.state).between(0, view.state.doc.length, () => {
		count++
	})
	return count
}
async function open(path: string) {
	await act(async () => {
		expect(await controller.openDocumentPath(path)).toBe(true)
	})
}
async function localHeading(editor: EditorView, destination = "Second", toolbar = false) {
	if (toolbar) {
		fireEvent.pointerDown(screen.getByRole("button", { name: "Note actions" }), {
			button: 0,
			ctrlKey: false,
		})
		fireEvent.click(screen.getByRole("button", { name: "Note actions" }))
		fireEvent.click(screen.getByRole("menuitem", { name: /Refile subtree/ }))
	} else fireEvent.keyDown(editor.contentDOM, { ctrlKey: true, shiftKey: true, key: "r" })
	const file = screen.getByRole("combobox", { name: "Refile to Org file:" })
	fireEvent.change(file, { target: { value: "a.org" } })
	fireEvent.keyDown(file, { key: "Enter" })
	await act(async () => {
		await Promise.resolve()
	})
	const heading = screen.getByRole("combobox", { name: "Refile under heading:" })
	fireEvent.change(heading, { target: { value: destination } })
	fireEvent.keyDown(heading, { key: "Tab" })
	return heading
}
async function acceptHeading(heading: HTMLElement) {
	await act(async () => {
		fireEvent.keyDown(heading, { key: "Enter" })
	})
	const confirmation = screen.queryByRole("combobox", {
		name: "Confirm Refile (yes/no):",
	})
	if (confirmation) {
		await act(async () => {
			fireEvent.change(confirmation, { target: { value: "yes" } })
			fireEvent.keyDown(confirmation, { key: "Enter" })
		})
	}
}
const rangeRects = Object.getOwnPropertyDescriptor(Range.prototype, "getClientRects")
const rangeBounds = Object.getOwnPropertyDescriptor(Range.prototype, "getBoundingClientRect")
let consumeReactKey = false
async function setup() {
	render(
		<div
			onKeyDownCapture={(event) => {
				if (consumeReactKey) event.preventDefault()
			}}
		>
			<OrgWorkspaceProvider><OrgWorkspaceContainer /></OrgWorkspaceProvider>
		</div>,
	)
	await act(async () => {
		await controller.openDefaultWorkspace()
	})
	await open("a.org")
	fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
	expect(views()).toHaveLength(2)
	commits.mockClear()
}
beforeEach(() => {
	vi.useFakeTimers()
	vi.resetAllMocks()
	consumeReactKey = false
	Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] })
	Object.defineProperty(Range.prototype, "getBoundingClientRect", {
		configurable: true,
		value: () => new DOMRect(),
	})

	window.localStorage.clear()
	vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => undefined,
		removeListener: () => undefined,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
		dispatchEvent: () => true,
	}))
	disk = new Map([
		["a.org", { relativePath: "a.org", content: rawA, revision: "a-1" }],
		["b.org", { relativePath: "b.org", content: rawB, revision: "b-1" }],
		["c.org", { relativePath: "c.org", content: "* C\n", revision: "c-1" }],
	])
	workspace = {
		rootPath: "/notes",
		capabilityToken: "G1",
		directories: [],
		documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
	}
	vi.mocked(orgFileRepository.readDocument).mockImplementation((input) => async () => {
		const document = disk.get(input.relativePath)
		if (!document) throw new Error(`Unexpected fixture document: ${input.relativePath}`)
		return E.right({ ...document })
	})
	vi.mocked(openDefaultOrgWorkspaceFlow).mockImplementation(() => async () => E.right(workspace))
	vi.mocked(scanOrgWorkspaceFlow).mockImplementation(() => async () => E.right(workspace))
	vi.mocked(openOrgDocumentFlow).mockImplementation(
		(input) => async () => E.right({ ...disk.get(input.relativePath)! }),
	)
	vi.mocked(saveOrgDocumentFlow).mockImplementation((input) => async () => {
		const saved = {
			relativePath: input.relativePath,
			content: input.content,
			revision: `${input.relativePath}-saved`,
		}
		disk.set(input.relativePath, saved)
		return E.right({ relativePath: saved.relativePath, revision: saved.revision })
	})
	vi.mocked(watchOrgWorkspace).mockReturnValue(async () => E.right("watch-G1"))
	vi.mocked(unwatchOrgWorkspace).mockReturnValue(async () => E.right(undefined))
	vi.mocked(releaseOrgWorkspace).mockReturnValue(async () => E.right(undefined))
})
afterEach(() => {
	cleanup()
	useSettings.setState(savedAutosavePreferences)
	for (const [key, descriptor] of [
		["getClientRects", rangeRects],
		["getBoundingClientRect", rangeBounds],
	] as const) {
		if (descriptor) Object.defineProperty(Range.prototype, key, descriptor)
		else Reflect.deleteProperty(Range.prototype, key)
	}
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe("production root independently bound split (synthetic host IO, real hook/pane/editor/runtime)", () => {
	it.each([false, true])("returns Capture cancellation to Agenda with an open buffer=%s", async (withBuffer) => {
		await setup()
		if (!withBuffer) {
			await act(async () => {
				expect(await controller.closeDocumentPath("a.org")).toBe(true)
			})
		}
		const originBuffer = controller.activeBufferId
		const runtime = controller.activeBufferRuntime
		const generation = runtime?.revision
		fireEvent.click(screen.getByRole("button", { name: "Agenda" }))
		expect(screen.getByRole("button", { name: "Agenda" })).toHaveAttribute("aria-pressed", "true")
		expect(screen.queryByRole("textbox", { name: /^Editing / })).toBeNull()
		const trigger = screen.getByRole("button", { name: "Quick capture" })
		act(() => trigger.focus())
		fireEvent.click(trigger)
		const input = screen.getByRole("combobox", { name: "Capture template:" })
		await act(async () => {
			fireEvent.keyDown(input, { key: "g", ctrlKey: true })
		})
		expect(screen.queryByRole("combobox", { name: "Capture template:" })).toBeNull()
		expect(screen.getByRole("button", { name: "Agenda" })).toHaveAttribute("aria-pressed", "true")
		expect(screen.queryByRole("textbox", { name: /^Editing / })).toBeNull()
		expect(trigger).toHaveFocus()
		expect(controller.activeBufferId).toBe(originBuffer)
		expect(controller.activeBufferRuntime).toBe(runtime)
		if (runtime) {
			expect(runtime.source).toBe(rawA)
			expect(runtime.revision).toBe(generation)
			expect(undoDepth(runtime.state)).toBe(0)
			expect(redoDepth(runtime.state)).toBe(0)
		}
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it.each([
		false,
		true,
	])("SAMEBUFFER refile maps intervening peer multi-selection and fold; undo/redo from either window (%s)", async (peerUndo) => {
		const raw = "* Move\nmove😀\n* Middle\nunchanged body\n** Child\nchild body\n* Second\nend\n"
		disk.set("a.org", { relativePath: "a.org", content: raw, revision: "a-1" })
		await setup()
		const a = left(),
			peer = right(),
			runtime = controller.activeBufferRuntime!
		act(() => {
			peer.dispatch({ selection: { anchor: raw.indexOf("** Child") } })
			foldCode(peer)
			peer.dispatch({
				selection: EditorSelection.create(
					[
						EditorSelection.cursor(raw.indexOf("unchanged") + 3),
						EditorSelection.range(raw.indexOf("Child"), raw.indexOf("Child") + 4),
					],
					1,
				),
			})
		})
		const selection = peer.state.selection
		const oldFolds: [number, number][] = []
		foldedRanges(peer.state).between(0, raw.length, (from, to) => {
			oldFolds.push([from, to])
		})
		expect(oldFolds).toHaveLength(1)
		focus(a)
		act(() => a.dispatch({ selection: { anchor: 2 } }))
		const originSelection = runtime.state.selection
		await acceptHeading(await localHeading(a))
		const removed = raw.indexOf("* Middle")
		const expected = raw.slice(removed) + "** Move\nmove😀\n"
		source(expected)
		expect(peer.state.selection.ranges.map(({ anchor, head }) => [anchor, head])).toEqual(
			selection.ranges.map(({ anchor, head }) => [anchor - removed, head - removed]),
		)
		expect(peer.state.selection.mainIndex).toBe(1)
		const mappedFolds: [number, number][] = []
		foldedRanges(peer.state).between(0, expected.length, (from, to) => {
			mappedFolds.push([from, to])
		})
		expect(mappedFolds).toEqual(oldFolds.map(([from, to]) => [from - removed, to - removed]))
		expect(a.state.selection.main.head).toBe(expected.indexOf("** Move"))
		expect(undoDepth(runtime.state)).toBe(1)
		key(peerUndo ? peer : a)
		source(raw)
		expect(runtime.state.selection.eq(originSelection)).toBe(true)
		key(peerUndo ? a : peer, true)
		source(expected)
		expect(runtime.state.selection.main.head).toBe(expected.indexOf("** Move"))
		expect(undoDepth(runtime.state)).toBe(1)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each([
		"visible",
		"mixed-boundary",
		"no-change-hidden-source",
		"hidden-target",
		"hidden-source",
	])("sparse refile %s retains unrelated hidden bytes and rejects hidden participants without history", async (mode) => {
		const raw =
			mode === "no-change-hidden-source"
				? "* Second :keep:\nbody\n** Move :keep:\nmove\n*** Hidden child :other:\nretained child\n"
				: mode === "mixed-boundary"
					? "* Move :keep:\r\nmove\r\n* Hidden :other:\r\nuntouched\0😀\r\n* Second :keep:\r\nend\r* Peer :other:\r\npeer\r\n"
					: "* Move :keep:\nmove\n" +
						(mode === "hidden-source" ? "** Hidden child :other:\nretained child\n" : "") +
						"* Hidden :other:\nuntouched\0😀\n* Second :keep:\nend\n"
		disk.set("a.org", { relativePath: "a.org", content: raw, revision: "a-1" })
		await setup()
		const a = left(),
			runtime = controller.activeBufferRuntime!
		focus(a)
		fireEvent.keyDown(a.contentDOM, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(a.contentDOM, { key: "/" })
		const sparse = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(sparse, { target: { value: "tag:keep" } })
		fireEvent.keyDown(sparse, { key: "Enter" })
		expect(a.state.field(orgSparseTreeField)?.plan?.hiddenRanges.length).toBeGreaterThan(0)
		const reads = vi.mocked(openOrgDocumentFlow).mock.calls.length
		const scans = vi.mocked(scanOrgWorkspaceFlow).mock.calls.length
		act(() => a.dispatch({ selection: { anchor: raw.indexOf("Move") } }))
		const heading = await localHeading(a, mode === "hidden-target" ? "Hidden" : "Second")
		if (mode === "hidden-source") {
			// The heading is visible, but its full moved subtree includes hidden bytes.
			expect(a.contentDOM).not.toHaveTextContent("Hidden child")
		}
		const transactions = vi.spyOn(a, "update")
		await acceptHeading(heading)
		if (mode === "visible" || mode === "mixed-boundary") {
			const expected =
				mode === "mixed-boundary"
					? "* Hidden :other:\r\nuntouched\0😀\r\n* Second :keep:\r\nend\r** Move :keep:\r\nmove\r\n* Peer :other:\r\npeer\r\n"
					: raw.slice(raw.indexOf("* Hidden")) + "** Move :keep:\nmove\n"
			source(expected)
			const changed = transactions.mock.calls.flatMap(([txs]) => txs).filter((tr) => tr.docChanged)
			expect(changed).toHaveLength(1)
			const ranges: [number, number, string][] = []
			changed[0].changes.iterChanges((from, to, _a, _b, insert) =>
				ranges.push([from, to, insert.toString()]),
			)
			expect(ranges).toHaveLength(2)
			expect(ranges[0]).toEqual([0, 19, ""])
			if (mode === "mixed-boundary")
				expect(ranges[1]).toEqual([
					raw.replace(/\r\n/g, "\n").indexOf("* Peer") - 1,
					raw.replace(/\r\n/g, "\n").indexOf("* Peer"),
					"\r** Move :keep:\nmove\n",
				])
			else expect(ranges[1]).toEqual([raw.length, raw.length, "** Move :keep:\nmove\n"])
			expect(undoDepth(runtime.state)).toBe(1)
		} else {
			source(raw)
			expect(undoDepth(runtime.state)).toBe(0)
			expect(controller.isDirty).toBe(false)
			expect(redoDepth(runtime.state)).toBe(0)
		}
		expect(openOrgDocumentFlow).toHaveBeenCalledTimes(reads)
		expect(scanOrgWorkspaceFlow).toHaveBeenCalledTimes(scans)
		expect(disk.get("a.org")!.content).toBe(raw)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("metadata toolbar then refile toolbar uses fresh source and places destination caret", async () => {
		await setup()
		const a = left(),
			runtime = controller.activeBufferRuntime!
		focus(a)
		act(() => a.dispatch({ selection: { anchor: 2 } }))
		fireEvent.pointerDown(screen.getByRole("button", { name: "Note actions" }), {
			button: 0,
			ctrlKey: false,
		})
		fireEvent.click(screen.getByRole("button", { name: "Note actions" }))
		fireEvent.click(screen.getByRole("menuitem", { name: /Heading tags/ }))
		const tags = screen.getByRole("combobox", { name: /^Tags/ })
		fireEvent.change(tags, { target: { value: "fresh" } })
		fireEvent.keyDown(tags, { key: "Enter" })
		expect(runtime.source).toContain("* A :fresh:")
		await acceptHeading(await localHeading(a, "Second", true))
		expect(runtime.source).toBe("* Second\r\nsecond body\r\nEOF\r\n** A :fresh:\r\nbody\0😀\r\n")
		expect(a.state.selection.main.head).toBe(a.state.doc.toString().indexOf("** A"))
		expect(a.contentDOM).toHaveFocus()
		expect(undoDepth(runtime.state)).toBe(2)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("late production conflict/autosave pause fences local heading acceptance", async () => {
		await setup()
		const a = left(),
			runtime = controller.activeBufferRuntime!
		focus(a)
		act(() => a.dispatch({ changes: { from: a.state.doc.length, insert: " dirty" } }))
		act(() => a.dispatch({ selection: { anchor: 2 } }))
		const heading = await localHeading(a)
		const before = runtime.source,
			depth = undoDepth(runtime.state)
		disk.set("a.org", { relativePath: "a.org", content: rawA + " external", revision: "a-2" })
		workspace = {
			...workspace,
			documents: workspace.documents.map((entry) =>
				entry.relativePath === "a.org" ? { ...entry, revision: "a-2" } : entry,
			),
		}
		await act(async () => {
			await controller.refreshWorkspace()
		})
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "a.org")).toMatchObject({
			hasConflict: true,
			autosavePaused: true,
		})
		await acceptHeading(heading)
		source(before)
		expect(undoDepth(runtime.state)).toBe(depth)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(2000)
		})
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("focusing a SAMEBUFFER peer cancels the originating local heading session", async () => {
		await setup()
		const a = left(),
			runtime = controller.activeBufferRuntime!
		focus(a)
		act(() => a.dispatch({ selection: { anchor: 2 } }))
		const heading = await localHeading(a)
		focus(right())
		expect(screen.queryByRole("combobox", { name: "Refile under heading:" })).toBeNull()
		await acceptHeading(heading)
		source(rawA)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it.each([
		false,
		true,
	])("same-file refile in independent A/B changes only A and autosaves its original CAS base (%s)", async (dirty) => {
		await setup()
		const a = left(),
			runtimeA = controller.activeBufferRuntime!
		focus(right())
		await open("b.org")
		const b = right(),
			runtimeB = controller.activeBufferRuntime!
		focus(a)
		if (dirty) {
			act(() => a.dispatch({ selection: { anchor: a.state.doc.length } }))
			type(a, " dirty")
		}
		act(() => a.dispatch({ selection: { anchor: 2 } }))
		const origin = runtimeA.source
		const depth = undoDepth(runtimeA.state)
		const reads = vi.mocked(openOrgDocumentFlow).mock.calls.length
		const scans = vi.mocked(scanOrgWorkspaceFlow).mock.calls.length
		fireEvent.keyDown(a.contentDOM, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(a.contentDOM, { ctrlKey: true, key: "w" })
		const file = screen.getByRole("combobox", { name: "Refile to Org file:" })
		fireEvent.change(file, { target: { value: "a.org" } })
		fireEvent.keyDown(file, { key: "Enter" })
		await act(async () => {
			await Promise.resolve()
		})
		const heading = screen.getByRole("combobox", { name: "Refile under heading:" })
		act(() => a.dispatch({ selection: EditorSelection.range(0, 2) }))
		const selection = runtimeA.state.selection
		fireEvent.change(heading, { target: { value: "Second" } })
		fireEvent.keyDown(heading, { key: "Tab" })
		await acceptHeading(heading)
		const expected = `* Second\r\nsecond body\r\nEOF${dirty ? " dirty" : ""}\r\n** A :raw:\r\nbody\0😀\r\n`
		expect(runtimeA.source).toBe(expected)
		expect(runtimeB.source).toBe(rawB)
		expect(b.state.sliceDoc()).toBe(rawB)
		expect(undoDepth(runtimeB.state)).toBe(0)
		expect(undoDepth(runtimeA.state)).toBe(depth + 1)
		expect(openOrgDocumentFlow).toHaveBeenCalledTimes(reads)
		expect(scanOrgWorkspaceFlow).toHaveBeenCalledTimes(scans)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(disk.get("a.org")!.content).toBe(rawA)
		expect(
			controller.openBuffers.find((buffer) => buffer.relativePath === "a.org")?.baseRevision,
		).toBe("a-1")
		key(a)
		expect(runtimeA.source).toBe(origin)
		expect(runtimeA.state.selection.eq(selection)).toBe(true)
		key(a, true)
		expect(runtimeA.source).toBe(expected)
		act(() => useSettings.setState({ autoSave: true, autoSaveInterval: 1 }))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(2000)
		})
		expect(
			vi
				.mocked(saveOrgDocumentFlow)
				.mock.calls.map(([input]) => [input.relativePath, input.expectedRevision]),
		).toEqual([["a.org", "a-1"]])
	})
	it.each([
		"edit",
		"peer-focus",
		"grant",
		"retire",
		"reincarnate",
	])("refuses stale local heading selection after %s", async (change) => {
		await setup()
		const a = left(),
			peer = right(),
			runtime = controller.activeBufferRuntime!
		focus(a)
		act(() => a.dispatch({ selection: { anchor: 2 } }))
		fireEvent.keyDown(a.contentDOM, { ctrlKey: true, shiftKey: true, key: "r" })
		const file = screen.getByRole("combobox", { name: "Refile to Org file:" })
		fireEvent.change(file, { target: { value: "a.org" } })
		fireEvent.keyDown(file, { key: "Enter" })
		await act(async () => {
			await Promise.resolve()
		})
		const heading = screen.getByRole("combobox", { name: "Refile under heading:" })
		fireEvent.change(heading, { target: { value: "Second" } })
		fireEvent.keyDown(heading, { key: "Tab" })
		if (change === "edit")
			act(() => peer.dispatch({ changes: { from: peer.state.doc.length, insert: " peer" } }))
		if (change === "peer-focus") {
			focus(peer)
			await open("b.org")
		}
		if (change === "grant") {
			workspace = { ...workspace, capabilityToken: "G2" }
			await act(async () => {
				await controller.openDefaultWorkspace()
			})
		}
		if (change === "retire" || change === "reincarnate") {
			await act(async () => {
				await controller.closeDocumentPath("a.org")
			})
			if (change === "reincarnate") await open("a.org")
		}
		fireEvent.keyDown(heading, { key: "Enter" })
		await act(async () => {
			await Promise.resolve()
		})
		expect(runtime.source).toBe(rawA + (change === "edit" ? " peer" : ""))
		expect(undoDepth(runtime.state)).toBe(change === "edit" ? 1 : 0)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("same-file file/heading stages ignore held, consumed and IME Enter and cancel without mutation", async () => {
		await setup()
		const a = left(),
			runtime = controller.activeBufferRuntime!
		focus(a)
		act(() => a.dispatch({ selection: { anchor: 2 } }))
		fireEvent.keyDown(a.contentDOM, { ctrlKey: true, shiftKey: true, key: "r" })
		const file = screen.getByRole("combobox", { name: "Refile to Org file:" })
		fireEvent.change(file, { target: { value: "a.org" } })
		fireEvent.compositionStart(file)
		fireEvent.keyDown(file, { key: "Enter", isComposing: true })
		expect(screen.queryByRole("combobox", { name: "Refile under heading:" })).toBeNull()
		fireEvent.compositionEnd(file)
		const consume = (event: Event) => event.preventDefault()
		document.addEventListener("keydown", consume, true)
		try {
			fireEvent.keyDown(file, { key: "Enter" })
			expect(screen.queryByRole("combobox", { name: "Refile under heading:" })).toBeNull()
		} finally {
			document.removeEventListener("keydown", consume, true)
		}
		fireEvent.keyDown(file, { key: "Enter" })
		await act(async () => {
			await Promise.resolve()
		})
		const heading = screen.getByRole("combobox", { name: "Refile under heading:" })
		fireEvent.keyDown(heading, { key: "Enter", repeat: true })
		expect(screen.getByRole("combobox", { name: "Refile under heading:" })).toBe(heading)
		fireEvent.compositionStart(heading)
		fireEvent.keyDown(heading, { key: "Enter", isComposing: true })
		fireEvent.compositionEnd(heading)
		fireEvent.keyDown(heading, { key: "Escape" })
		expect(runtime.source).toBe(rawA)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each([
		["todo", "TODO Work", "DONE Needle"],
		["tag:work", "TODO Work", "DONE Needle"],
		["text:Needle", "DONE Needle", "TODO Work"],
	])("production sparse %s changes only the originating window presentation and clears via catalog", async (query, visible, hidden) => {
		const raw = "Preamble\r\n* TODO Work :work:\r\nbody\0😀\r\n* DONE Needle :home:\r\nOther text"
		disk.set("a.org", { relativePath: "a.org", content: raw, revision: "a-1" })
		await setup()
		const a = left(),
			peer = right(),
			runtime = controller.activeBufferRuntime!
		act(() => a.dispatch({ selection: { anchor: a.state.doc.length } }))
		type(a, " seed")
		await act(async () => {
			await controller.saveDocument()
		})
		const before = runtime.source
		const writes = vi.mocked(saveOrgDocumentFlow).mock.calls.length
		const committed = commits.mock.calls.length
		const depth = undoDepth(runtime.state)
		expect(depth).toBe(1)
		fireEvent.keyDown(a.contentDOM, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(a.contentDOM, { key: "/" })
		const input = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(input, { target: { value: query } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(a.contentDOM).toHaveFocus()
		expect(a.state.field(orgSparseTreeField)?.plan?.hiddenRanges.length).toBeGreaterThan(0)
		expect(a.contentDOM).toHaveTextContent(visible)
		expect(a.contentDOM).not.toHaveTextContent(hidden)
		expect(peer.state.field(orgSparseTreeField)).toBeNull()
		expect(peer.contentDOM).toHaveTextContent(hidden)
		source(before)
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(runtime.state)).toBe(depth)
		expect(commits).toHaveBeenCalledTimes(committed)
		expect(disk.get("a.org")!.content).toBe(before)
		fireEvent.keyDown(a.contentDOM, { key: "p", ctrlKey: true })
		const palette = screen.getByRole("combobox")
		fireEvent.change(palette, { target: { value: "Clear sparse tree" } })
		await act(async () => { fireEvent.keyDown(palette, { key: "Enter" }) })
		expect(a.state.field(orgSparseTreeField)).toBeNull()
		expect(a.contentDOM).toHaveTextContent(visible)
		expect(a.contentDOM).toHaveTextContent(hidden)
		expect(a.contentDOM).toHaveFocus()
		source(before)
		expect(undoDepth(runtime.state)).toBe(depth)
		expect(commits).toHaveBeenCalledTimes(committed)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(writes)
		expect(disk.get("a.org")!.content).toBe(before)
	})

	it("refuses a peer-staled sparse prompt and routes a parked independent-window prefix to its own buffer", async () => {
		await setup()
		const a = left(),
			peer = right(),
			runtimeA = controller.activeBufferRuntime!
		focus(a)
		fireEvent.keyDown(a.contentDOM, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(a.contentDOM, { key: "/" })
		const input = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(input, { target: { value: "tag:raw" } })
		// The other real CM projection edits the same canonical buffer while the prompt is open.
		act(() => peer.dispatch({ changes: { from: peer.state.doc.length, insert: " peer edit" } }))
		expect(screen.queryByRole("combobox", { name: /^Sparse tree/ })).toBeNull()
		expect(input.isConnected).toBe(false)
		// Delivery to the detached input cannot resurrect or accept its old source.
		fireEvent.keyDown(input, { key: "Enter" })
		source(rawA + " peer edit")
		expect(a.state.field(orgSparseTreeField)).toBeNull()
		expect(peer.state.field(orgSparseTreeField)).toBeNull()
		expect(undoDepth(runtimeA.state)).toBe(1)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		focus(peer)
		await open("b.org")
		const b = right(),
			runtimeB = controller.activeBufferRuntime!
		// No helper focus: production key handoff must choose parked A, not focused B.
		fireEvent.keyDown(a.contentDOM, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(a.contentDOM, { key: "/" })
		const fresh = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(fresh, { target: { value: "tag:raw" } })
		fireEvent.keyDown(fresh, { key: "Enter" })
		expect(controller.activeBufferRuntime).toBe(runtimeA)
		expect(a.contentDOM).toHaveFocus()
		expect(a.state.field(orgSparseTreeField)).not.toBeNull()
		expect(a.contentDOM).not.toHaveTextContent("Second")
		expect(b.state.field(orgSparseTreeField)).toBeNull()
		expect(runtimeB.source).toBe(rawB)
		expect(b.state.sliceDoc()).toBe(rawB)
		expect(runtimeA.source).toBe(rawA + " peer edit")
		expect(controller.content).toBe(runtimeA.source)
		expect(undoDepth(runtimeA.state)).toBe(1)
		expect(undoDepth(runtimeB.state)).toBe(0)
		expect(disk.get("a.org")!.content).toBe(rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("ordinary parked-window key hands off before input, and immediate metadata/save use fresh A source and target", async () => {
		await setup()
		const a = left()
		act(() => a.dispatch({ selection: { anchor: a.state.doc.length } }))
		type(a, "A edit")
		const runtimeA = controller.activeBufferRuntime!
		focus(right())
		await open("b.org")
		const b = right(),
			runtimeB = controller.activeBufferRuntime!
		type(b, "B edit")
		// Deliver directly to the parked DOM: no helper focus/activation before the key.
		await act(async () => {
			fireEvent.keyDown(a.contentDOM, { key: "s", ctrlKey: true })
			await Promise.resolve()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(saveOrgDocumentFlow).toHaveBeenCalledWith(
			expect.objectContaining({ relativePath: "a.org", content: rawA + "A edit" }),
		)
		focus(a)
		focus(b)
		act(() => a.dispatch({ selection: { anchor: 2 } }))
		fireEvent.keyDown(a.contentDOM, { key: "c", ctrlKey: true })
		fireEvent.keyDown(a.contentDOM, { key: "q", ctrlKey: true })
		const input = screen.getByRole("combobox", { name: "Tags:" })
		fireEvent.change(input, { target: { value: "freshA" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(runtimeA.source).toBe(rawA.replace(":raw:", ":freshA:") + "A edit")
		expect(runtimeB.source).toBe("B edit" + rawB)
		focus(b)
		const typing = new KeyboardEvent("keydown", { key: "x", bubbles: true, cancelable: true })
		fireEvent(a.contentDOM, typing)
		expect(typing.defaultPrevented).toBe(false)
		expect(controller.activeBufferRuntime).toBe(runtimeA)
		expect(a.state.facet(EditorState.readOnly)).toBe(false)
		// jsdom has no native text insertion; deliver the browser's subsequent transaction.
		const before = runtimeA.source
		const at = a.state.selection.main.from
		act(() => a.dispatch({ changes: { from: at, insert: "x" }, userEvent: "input.type" }))
		expect(runtimeA.source).toBe(before.slice(0, at) + "x" + before.slice(at))
		expect(runtimeB.source).toBe("B edit" + rawB)
	})

	it("actual focused B tab close keeps parked A mounted, usable and its history intact", async () => {
		await setup()
		const a = left()
		const runtimeA = controller.activeBufferRuntime!
		type(a, "kept")
		focus(right())
		await open("b.org")
		const runtimeB = controller.activeBufferRuntime!
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Close b.org" }))
		})
		expect(runtimeB.closed).toBe(true)
		expect(controller.activeBufferRuntime).toBe(runtimeA)
		expect(left()).toBe(a)
		expect(views().every((view) => view.state.sliceDoc() === "kept" + rawA)).toBe(true)
		expect(undoDepth(runtimeA.state)).toBe(1)
		key(a)
		expect(runtimeA.source).toBe(rawA)
		type(a, "usable")
		expect(runtimeA.source).toBe("usable" + rawA)
	})

	it("secondary close all tabs, open C and close split retains exactly one working C lease/target", async () => {
		await setup()
		focus(right())
		await open("b.org")
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Close b.org" }))
		})
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Close a.org" }))
		})
		expect(controller.activeDocument).toBeNull()
		expect(screen.queryAllByRole("textbox", { name: /^Editing / })).toHaveLength(0)
		await open("c.org")
		fireEvent.click(screen.getByRole("button", { name: "Close editor split" }))
		expect(views()).toHaveLength(1)
		expect(left().contentDOM.getAttribute("aria-label")).toBe("Editing c.org")
		type(left(), "C edit")
		expect(controller.activeBufferRuntime!.source).toBe("C edit* C\n")
		fireEvent.keyDown(left().contentDOM, { ctrlKey: true, key: "s" })
		await act(async () => {
			await Promise.resolve()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledWith(
			expect.objectContaining({ relativePath: "c.org", content: "C edit* C\n" }),
		)
	})

	it.each([
		"ctrlKey",
		"metaKey",
	] as const)("real CM %s mousedown link on unfocused A navigates independently of B save and preserves both bodies", async (modifier) => {
		const linkedA = "* A\n[[file:c.org][C]]\n"
		disk.set("a.org", { relativePath: "a.org", content: linkedA, revision: "a-1" })
		await setup()
		const a = left(), runtimeA = controller.activeBufferRuntime!
		focus(right())
		await open("b.org")
		const b = right(),
			runtimeB = controller.activeBufferRuntime!
		vi.spyOn(a, "posAtCoords").mockReturnValue(linkedA.indexOf("file:") + 2)
		vi.mocked(resolveOrgLinkTargetFlow).mockReturnValue(() =>
			Promise.resolve(E.right({
				relativePath: "c.org",
				line: 1,
				expectedRevision: "c-1",
				source: "disk",
				workspaceRoot: workspace.rootPath,
				capabilityToken: workspace.capabilityToken,
				workspaceSessionId: controller.workspaceSessionId!,
				sourceRevision: "c-1",
				diskRevision: "c-1",
			})),
		)
		type(b, "dirty")
		let finish!: (result: Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>) => void
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve
				}),
		)
		let saving!: Promise<boolean>
		await act(async () => {
			saving = controller.saveDocument()
			await Promise.resolve()
		})
		await act(async () => {
			fireEvent.mouseDown(a.contentDOM, { button: 0, [modifier]: true })
		})
		expect(controller.activeDocument!.relativePath).toBe("c.org")
		expect(runtimeA.source).toBe(linkedA)
		expect(runtimeB.source).toBe("dirty" + rawB)
		await act(async () => {
			finish(E.right({ relativePath: "b.org", revision: "b-saved" }))
			await saving
		})
		expect(controller.activeDocument!.relativePath).toBe("c.org")
		expect(left().contentDOM.getAttribute("aria-label")).toBe("Editing c.org")
		expect(right()).toBe(b)
		expect(runtimeB.source).toBe("dirty" + rawB)
	})

	it("commits ordinary left/right input once, restores origin range on peer undo, and closes focused secondary without losing history", async () => {
		await setup()
		const a = left(),
			b = right()
		const initialRevision = controller.activeBufferRuntime!.revision
		act(() => {
			a.dispatch({ selection: EditorSelection.range(2, 3) })
			b.dispatch({ selection: { anchor: rawA.indexOf("* Second") } })
			foldCode(b)
		})
		b.scrollDOM.scrollTop = 91
		type(a, "LEFT")
		expect(commits).toHaveBeenCalledTimes(1)
		expect(controller.activeBufferRuntime!.revision).toBe(initialRevision + 1)
		expect(commits.mock.calls[0][0]).toMatchObject({
			previousSource: rawA,
			source: rawA.slice(0, 2) + "LEFT" + rawA.slice(3),
		})
		const first = controller.content
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		source(first)
		const peerSelection = b.state.selection.toJSON()
		key(b)
		source(rawA)
		expect(a.state.selection.main).toMatchObject({ anchor: 2, head: 3 })
		expect(b.state.selection.main.head).toBe(rawA.indexOf("* Second"))
		expect(folds(b)).toBe(1)
		expect(folds(a)).toBe(0)
		expect(b.scrollDOM.scrollTop).toBe(91)
		expect(peerSelection).not.toEqual(a.state.selection.toJSON())
		key(b, true)
		source(first)
		act(() => b.dispatch({ selection: { anchor: b.state.doc.length } }))
		const baseline = commits.mock.calls.length
		type(b, "RIGHT")
		expect(commits).toHaveBeenCalledTimes(baseline + 1)
		source(first + "RIGHT")
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(2)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(disk.get("a.org")!.content).toBe(rawA)
		fireEvent.click(screen.getByRole("button", { name: "Close editor split" }))
		expect(views()).toHaveLength(1)
		expect(left().contentDOM).toHaveFocus()
		key(left())
		source(first)
		key(left(), true)
		source(first + "RIGHT")
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(2)
		act(() => useSettings.setState({ autoSave: true, autoSaveInterval: 1 }))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(disk.get("a.org")!.content).toBe(first + "RIGHT")
	})

	it("navigates only the focused window and retains independent A/B source, history and view caches", async () => {
		await setup()
		const runtimeA = controller.activeBufferRuntime!,
			idA = controller.activeBufferId
		const oldAUpdate = controller.updateContent
		act(() => {
			left().dispatch({ selection: { anchor: 0 } })
			foldCode(left())
			right().dispatch({ selection: { anchor: right().state.doc.length } })
		})
		type(right(), "A edit")
		left().scrollDOM.scrollTop = 44
		right().scrollDOM.scrollTop = 99
		const selectionA = views().map((v) => v.state.selection.toJSON())
		const originalAViews = views()
		await open("b.org")
		const runtimeB = controller.activeBufferRuntime!,
			idB = controller.activeBufferId
		expect(idB).not.toBe(idA)
		expect(runtimeB).not.toBe(runtimeA)
		expect(views()).toHaveLength(2)
		source(rawB)
		act(() => oldAUpdate("stale A command"))
		source(rawB)
		expect(runtimeA.source).toBe(rawA + "A edit")
		act(() => {
			left().dispatch({ selection: { anchor: 2 } })
			right().dispatch({ selection: { anchor: right().state.doc.length } })
		})
		type(right(), "B edit")
		left().scrollDOM.scrollTop = 12
		right().scrollDOM.scrollTop = 66
		const selectionB = right().state.selection.toJSON()
		expect(controller.openBuffers.filter((buffer) => buffer.isDirty)).toHaveLength(2)
		await open("a.org")
		act(() => vi.advanceTimersByTime(32))
		expect(controller.activeBufferId).toBe(idA)
		expect(controller.activeBufferRuntime).toBe(runtimeA)
		expect(left()).toBe(originalAViews[0])
		expect(right()).not.toBe(originalAViews[1])
		source(rawA + "A edit")
		expect(right().state.selection.toJSON()).toEqual(selectionA[1])
		expect(left().state.selection.main.head).toBe(2)
		expect(folds(left())).toBe(1)
		expect(folds(right())).toBe(0)
		expect(views().map((v) => v.scrollDOM.scrollTop)).toEqual([12, 99])
		key(right())
		source(rawA)
		expect(runtimeB.source).toBe(rawB + "B edit")
		expect(undoDepth(runtimeB.state)).toBe(1)
		await open("b.org")
		act(() => vi.advanceTimersByTime(32))
		source(rawB + "B edit")
		expect(right().state.selection.toJSON()).toEqual(selectionB)
		expect(right().scrollDOM.scrollTop).toBe(66)
		expect(left().state.sliceDoc()).toBe(rawA)
		expect(left().scrollDOM.scrollTop).toBe(12)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("routes independent edits, undo, focus metadata and save to the focused buffer without reopening IO", async () => {
		await setup()
		focus(right())
		await open("b.org")
		const a = left(),
			b = right()
		const runtimeB = controller.activeBufferRuntime!
		const idB = controller.activeBufferId
		const runtimeA = controller.liveBuffers.find(
			(buffer) => buffer.document.relativePath === "a.org",
		)!.runtime
		const reads = vi.mocked(openOrgDocumentFlow).mock.calls.length
		act(() => a.dispatch({ selection: { anchor: a.state.doc.length } }))
		type(a, "A edit")
		expect(controller.activeBufferRuntime).toBe(runtimeA)
		act(() => b.dispatch({ selection: { anchor: b.state.doc.length } }))
		type(b, "B edit")
		expect(controller.activeBufferId).toBe(idB)
		expect(a.state.sliceDoc()).toBe(rawA + "A edit")
		expect(b.state.sliceDoc()).toBe(rawB + "B edit")
		key(a)
		expect(runtimeA.source).toBe(rawA)
		expect(runtimeB.source).toBe(rawB + "B edit")
		key(b)
		expect(runtimeB.source).toBe(rawB)
		key(a, true)
		expect(runtimeA.source).toBe(rawA + "A edit")
		expect(views()).toEqual([a, b])
		act(() => b.dispatch({ selection: { anchor: 2 } }))
		focus(b)
		expect(controller.activeBufferRuntime).toBe(runtimeB)
		fireEvent.keyDown(b.contentDOM, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(b.contentDOM, { ctrlKey: true, key: "q" })
		const input = screen.getByRole("combobox", { name: "Tags:" })
		fireEvent.change(input, { target: { value: "b:focused" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(runtimeB.source).toBe(rawB.replace("* B", "* B :b:focused:"))
		expect(runtimeA.source).toBe(rawA + "A edit")
		focus(a)
		await act(async () => {
			fireEvent.keyDown(a.contentDOM, { ctrlKey: true, key: "s" })
			await Promise.resolve()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(saveOrgDocumentFlow).toHaveBeenCalledWith(
			expect.objectContaining({ relativePath: "a.org", content: rawA + "A edit" }),
		)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "b.org")!.isDirty).toBe(
			true,
		)
		expect(openOrgDocumentFlow).toHaveBeenCalledTimes(reads)
		expect(views()).toEqual([a, b])
	})

	it("focuses A independently while B save drains and preserves native copy and arrow input", async () => {
		await setup()
		focus(right())
		await open("b.org")
		const a = left(),
			b = right()
		act(() => b.dispatch({ selection: { anchor: b.state.doc.length } }))
		type(b, "captured")
		let finish!: (result: Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>) => void
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve
				}),
		)
		let saving!: Promise<boolean>
		await act(async () => {
			saving = controller.saveDocument()
			await Promise.resolve()
		})
		focus(a)
		expect(controller.activeDocument!.relativePath).toBe("a.org")
		act(() => a.dispatch({ selection: { anchor: 0, head: 3 } }))
		const copy = new KeyboardEvent("keydown", {
			key: "c",
			ctrlKey: true,
			bubbles: true,
			cancelable: true,
		})
		fireEvent(a.contentDOM, copy)
		expect(copy.defaultPrevented).toBe(false)
		const nativeArrow = vi.fn((event: Event) => expect(event.defaultPrevented).toBe(false))
		a.contentDOM.addEventListener("keydown", nativeArrow, true)
		const arrow = new KeyboardEvent("keydown", {
			key: "ArrowRight",
			bubbles: true,
			cancelable: true,
		})
		fireEvent(a.contentDOM, arrow)
		a.contentDOM.removeEventListener("keydown", nativeArrow, true)
		expect(nativeArrow).toHaveBeenCalledTimes(1)
		const skippedKeys = () => {
			fireEvent.keyDown(a.contentDOM, { key: "中", isComposing: true })
			fireEvent.keyDown(a.contentDOM, { key: "Process", keyCode: 229 })
			consumeReactKey = true
			fireEvent.keyDown(a.contentDOM, { key: "s", ctrlKey: true })
			consumeReactKey = false
			const consume = (event: Event) => event.preventDefault()
			document.addEventListener("keydown", consume, true)
			try {
				fireEvent.keyDown(a.contentDOM, { key: "s", metaKey: true })
			} finally {
				document.removeEventListener("keydown", consume, true)
			}
			expect(controller.activeDocument!.relativePath).toBe("a.org")
		}
		skippedKeys()
		const save = new KeyboardEvent("keydown", {
			key: "s",
			ctrlKey: true,
			bubbles: true,
			cancelable: true,
		})
		fireEvent(a.contentDOM, save)
		expect(save.defaultPrevented).toBe(true)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		await act(async () => {
			finish(E.right({ relativePath: "b.org", revision: "b-saved" }))
			await saving
		})
		// ACK and consumed/composing keys cannot change the independent A origin.
		skippedKeys()
		act(() => a.dispatch({ selection: { anchor: 0, head: 3 } }))
		const copyAfterAck = new KeyboardEvent("keydown", {
			key: "c",
			ctrlKey: true,
			bubbles: true,
			cancelable: true,
		})
		fireEvent(a.contentDOM, copyAfterAck)
		expect(copyAfterAck.defaultPrevented).toBe(false)
		a.contentDOM.addEventListener("keydown", nativeArrow, true)
		fireEvent.keyDown(a.contentDOM, { key: "ArrowLeft", shiftKey: true })
		a.contentDOM.removeEventListener("keydown", nativeArrow, true)
		expect(nativeArrow).toHaveBeenCalledTimes(2)
		expect(a.state.facet(EditorState.readOnly)).toBe(false)
		expect(controller.activeDocument!.relativePath).toBe("a.org")
		// Selected copy after ACK still belongs to A and is not a command prefix.
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		focus(b)
		focus(a)
		expect(controller.activeDocument!.relativePath).toBe("a.org")
		expect(views()).toEqual([a, b])
		expect(a.state.sliceDoc()).toBe(rawA)
		expect(b.state.sliceDoc()).toBe(rawB + "captured")
	})

	it.each([
		"save",
		"retire",
		"G2",
	] as const)("actual toolbar Save stays bound to A while B ACK drains (%s)", async (outcome) => {
		await setup()
		const a = left()
		type(a, "dirty A")
		const aSource = a.state.sliceDoc()
		const runtimeA = controller.activeBufferRuntime!
		focus(right())
		await open("b.org")
		const b = right()
		type(b, "dirty B")
		const bSource = b.state.sliceDoc()
		let finish!: (result: Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>) => void
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve
				}),
		)
		let saving!: Promise<boolean>
		await act(async () => {
			saving = controller.saveDocument()
			await Promise.resolve()
		})
		focus(a)
		act(() => a.dispatch({ selection: { anchor: 2, head: 3 } }))
		fireEvent.keyDown(a.contentDOM, { key: "c", ctrlKey: true })
		const selection = a.state.selection.main
		expect(controller.activeDocument!.relativePath).toBe("a.org")
		await act(async () => {
			finish(E.right({ relativePath: "b.org", revision: "b-saved" }))
			await saving
		})
		expect(controller.activeDocument!.relativePath).toBe("a.org")
		expect(controller.isDirty).toBe(true)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		if (outcome === "save") {
			const save = screen.getByRole("button", { name: "Save document" })
			expect(save.hasAttribute("disabled")).toBe(false)
			await act(async () => {
				fireEvent.click(save)
				await Promise.resolve()
			})
			expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
			expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
				expect.objectContaining({
					relativePath: "a.org",
					content: aSource,
					expectedRevision: "a-1",
					capabilityToken: "G1",
					workspaceRoot: "/notes",
				}),
			)
			expect(
				vi
					.mocked(saveOrgDocumentFlow)
					.mock.calls.filter(([input]) => input.relativePath === "b.org"),
			).toHaveLength(1)
			expect(controller.activeDocument!.relativePath).toBe("a.org")
			expect(controller.activeDocument!.revision).toBe("a.org-saved")
			expect(controller.isDirty).toBe(false)
			expect(controller.content).toBe(aSource)
			expect(a.state.selection.main.anchor).toBe(selection.anchor)
			expect(a.state.selection.main.head).toBe(selection.head)
			expect(b.state.sliceDoc()).toBe(bSource)
		} else {
			if (outcome === "retire") {
				await act(async () => { expect(await controller.closeDocumentPath("a.org")).toBe(true) })
			} else {
				workspace = { ...workspace, capabilityToken: "G2" }
				let opening!: Promise<void>
				act(() => { opening = controller.openDefaultWorkspace() })
				await act(async () => {
					fireEvent.click(screen.getByRole("button", { name: "Discard and open" }))
					await opening
				})
			}
			if (outcome === "G2") await open("a.org")
			expect(runtimeA.closed).toBe(true)
			const calls = vi.mocked(saveOrgDocumentFlow).mock.calls.length
			const save = screen.getByRole("button", { name: "Save document" })
			expect(save.hasAttribute("disabled")).toBe(true)
			fireEvent.click(save)
			expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(calls)
		}
	})

	it("toolbar mutates A independently while B save drains without replacing its origin", async () => {
		await setup()
		const a = left()
		focus(right())
		await open("b.org")
		const b = right()
		type(b, "saved B")
		const bSource = b.state.sliceDoc()
		let finish!: (result: Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>) => void
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve
				}),
		)
		let saving!: Promise<boolean>
		await act(async () => {
			saving = controller.saveDocument()
			await Promise.resolve()
		})
		focus(a)
		act(() => a.dispatch({ selection: { anchor: 2, head: 3 } }))
		fireEvent.keyDown(a.contentDOM, { key: "c", ctrlKey: true })
		const selection = a.state.selection.main
		expect(controller.activeDocument!.relativePath).toBe("a.org")
		const trigger = screen.getByRole("button", { name: "Note actions" })
		fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
		fireEvent.click(trigger)
		fireEvent.click(screen.getByRole("menuitem", { name: /Heading tags/ }))
		const input = screen.getByRole("combobox", { name: "Tags:" })
		input.focus()
		fireEvent.change(input, { target: { value: "toolbarA" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(a.state.sliceDoc()).toContain("* A :toolbarA:")
		await act(async () => {
			finish(E.right({ relativePath: "b.org", revision: "b-saved" }))
			await saving
		})
		expect(b.state.sliceDoc()).toBe(bSource)
		expect(controller.activeDocument!.relativePath).toBe("a.org")
		expect(a.state.selection.main.anchor).toBe(selection.anchor)
		expect(a.state.selection.main.head).toBe(selection.head)
		expect(a.hasFocus).toBe(true)
	})

	it("save all ACK retains newer input committed through the mounted parked A lease", async () => {
		await setup()
		act(() => left().dispatch({ selection: { anchor: left().state.doc.length } }))
		type(left(), "captured A")
		focus(right())
		await open("b.org")
		const a = left(),
			b = right()
		act(() => b.dispatch({ selection: { anchor: b.state.doc.length } }))
		type(b, "captured B")
		const runtimeA = controller.liveBuffers.find(
			(buffer) => buffer.document.relativePath === "a.org",
		)!.runtime
		let finish!: (result: Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>) => void
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve
				}),
		)
		let saving!: ReturnType<OrgWorkspaceController["saveAllDocuments"]>
		await act(async () => {
			saving = controller.saveAllDocuments()
			await Promise.resolve()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledWith(
			expect.objectContaining({ relativePath: "a.org", content: rawA + "captured A" }),
		)
		// Direct CM dispatch represents already-delivered/in-flight input, not typing into the busy read-only pane.
		act(() =>
			a.dispatch({
				changes: { from: a.state.doc.length, insert: " newer A" },
				userEvent: "input.type",
			}),
		)
		expect(controller.activeDocument!.relativePath).toBe("b.org")
		await act(async () => {
			finish(E.right({ relativePath: "a.org", revision: "a-captured-saved" }))
			expect(await saving).toMatchObject({
				kind: "partial",
				savedPaths: ["a.org", "b.org"],
				remainingDirtyPaths: ["a.org"],
			})
		})
		expect(runtimeA.source).toBe(rawA + "captured A newer A")
		expect(a.state.sliceDoc()).toBe(runtimeA.source)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "a.org")).toMatchObject({
			isDirty: true,
			baseRevision: "a-captured-saved",
		})
		expect(views()).toEqual([a, b])
		focus(a)
		key(a)
		// The two adjacent synthetic input.type transactions form one canonical undo group.
		expect(runtimeA.source).toBe(rawA)
		expect(b.state.sliceDoc()).toBe(rawB + "captured B")
	})

	it("renames a bound buffer without changing identity and closes it without retiring the peer", async () => {
		await setup()
		focus(right())
		await open("b.org")
		const a = left(),
			b = right(),
			runtimeB = controller.activeBufferRuntime!,
			idB = controller.activeBufferId
		vi.mocked(moveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ relativePath: "renamed.org", revision: "b-1" }),
		)
		await act(async () => {
			await controller.moveActiveDocument("renamed.org")
		})
		expect(controller.activeDocument!.relativePath).toBe("renamed.org")
		expect(controller.activeBufferId).toBe(idB)
		expect(controller.activeBufferRuntime).toBe(runtimeB)
		expect(views()).toEqual([a, b])
		expect(b.contentDOM).toHaveAttribute("aria-label", "Editing renamed.org")
		focus(a)
		await act(async () => {
			expect(await controller.closeDocumentPath("renamed.org")).toBe(true)
		})
		expect(runtimeB.closed).toBe(true)
		expect(left()).toBe(a)
		source(rawA)
		expect(controller.openBuffers.map((buffer) => buffer.relativePath)).toEqual(["a.org"])
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("captures r1 for deferred save while both windows commit newer r2 exactly once without clobbering its baseline", async () => {
		await setup()
		act(() => left().dispatch({ selection: { anchor: left().state.doc.length } }))
		type(left(), "r1")
		const captured = controller.content
		let finish!: (result: Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>) => void
		const pending = new Promise<Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>>(
			(resolve) => {
				finish = resolve
			},
		)
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending)
		let saving!: Promise<boolean>
		await act(async () => {
			saving = controller.saveDocument()
			await Promise.resolve()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledWith(
			expect.objectContaining({ content: captured, expectedRevision: "a-1" }),
		)
		expect(controller.isEditorReadOnly).toBe(false)
		act(() => right().dispatch({ selection: { anchor: right().state.doc.length } }))
		type(right(), "r2-right")
		type(left(), "r2-left")
		expect(commits).toHaveBeenCalledTimes(3)
		const newer = controller.content
		await act(async () => {
			finish(E.right({ relativePath: "a.org", revision: "r1-saved" }))
			await saving
		})
		source(newer)
		expect(controller.activeDocument).toMatchObject({ content: captured, revision: "r1-saved" })
		expect(controller.isDirty).toBe(true)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(3)
		await act(async () => {
			await controller.saveDocument()
		})
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({ content: newer, expectedRevision: "r1-saved" }),
		)
	})

	it("pending native B read cannot replace newer independent A input or its canonical undo", async () => {
		await setup()
		let finish!: (result: Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>) => void
		const pending = new Promise<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>(
			(resolve) => {
				finish = resolve
			},
		)
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => pending)
		let opening!: Promise<boolean>
		await act(async () => {
			opening = controller.openDocumentPath("b.org")
			await Promise.resolve()
		})
		const runtimeA = controller.activeBufferRuntime!
		act(() => left().dispatch({
			changes: { from: left().state.doc.length, insert: " newer A" },
			userEvent: "input.type",
		}))
		source(rawA + " newer A")
		expect(undoDepth(runtimeA.state)).toBe(1)
		await act(async () => {
			finish(E.right(disk.get("b.org")!))
			expect(await opening).toBe(false)
		})
		expect(controller.activeDocument!.relativePath).toBe("a.org")
		source(rawA + " newer A")
		key(left())
		source(rawA)
	})

	it("installs clean external watcher source minimally in both windows without stealing focused caret", async () => {
		await setup()
		focus(right())
		act(() => right().dispatch({ selection: EditorSelection.range(2, 3) }))
		const oldViews = views()
		disk.set("a.org", { relativePath: "a.org", content: rawA + "external", revision: "a-external" })
		workspace = {
			...workspace,
			documents: [...disk.values()].map(({ relativePath, revision }) => ({
				relativePath,
				revision,
			})),
		}
		await act(async () => {
			await controller.refreshWorkspace()
		})
		source(rawA + "external")
		expect(views()).toEqual(oldViews)
		expect(right().state.selection.main).toMatchObject({ anchor: 2, head: 3 })
		expect(right().contentDOM).toHaveFocus()
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("routes Tags from focused RIGHT to its heading as one canonical undo", async () => {
		await setup()
		act(() => {
			left().dispatch({ selection: { anchor: 2 } })
			right().dispatch({ selection: { anchor: rawA.indexOf("Second") } })
		})
		focus(right())
		fireEvent.keyDown(right().contentDOM, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(right().contentDOM, { ctrlKey: true, key: "q" })
		const input = screen.getByRole("combobox", { name: "Tags:" })
		fireEvent.change(input, { target: { value: "right:focused" } })
		fireEvent.keyDown(input, { key: "Enter" })
		source(rawA.replace("* Second", "* Second :right:focused:"))
		expect(commits).toHaveBeenCalledTimes(1)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		key(right())
		source(rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("routes synthetic Chinese composition-group input through root once (not a real native IME claim)", async () => {
		await setup()
		focus(right())
		act(() => right().dispatch({ selection: { anchor: right().state.doc.length } }))
		fireEvent.compositionStart(right().contentDOM, { data: "" })
		act(() =>
			right().dispatch({
				changes: { from: right().state.doc.length, insert: "中" },
				userEvent: "input.type.compose",
			}),
		)
		act(() =>
			right().dispatch({
				changes: { from: right().state.doc.length, insert: "文" },
				userEvent: "input.type.compose",
			}),
		)
		fireEvent.compositionEnd(right().contentDOM, { data: "中文" })
		source(rawA + "中文")
		key(left())
		source(rawA)
	})

	it("rejects batched unknown effects atomically and resets both same-key projections without residual history", async () => {
		await setup()
		const unknown = StateEffect.define<boolean>()
		const before = views(),
			runtime = controller.activeBufferRuntime!,
			bufferId = controller.activeBufferId
		expect(() =>
			act(() => {
				const first = right().state.update({ changes: { from: 0, insert: "bad" } })
				const second = first.state.update({ effects: unknown.of(true) })
				right().dispatch([first, second])
			}),
		).toThrow("Unregistered window effect")
		source(rawA)
		expect(commits).not.toHaveBeenCalled()
		act(() => controller.updateContent("* reset\nbody"))
		source("* reset\nbody")
		expect(controller.activeBufferId).toBe(bufferId)
		expect(controller.activeBufferRuntime).toBe(runtime)
		expect(views()).toHaveLength(2)
		expect(views()).toEqual(before)
		expect(undoDepth(runtime.state)).toBe(0)
		act(() => right().dispatch({ selection: { anchor: right().state.doc.length } }))
		type(right(), " valid")
		source("* reset\nbody valid")
		expect(undoDepth(runtime.state)).toBe(1)
		key(left())
		source("* reset\nbody")
	})

	it("fences both independent G1 bindings and caches after G2 approval even at the same root and path", async () => {
		await setup()
		const oldPeerRuntime = controller.activeBufferRuntime!
		focus(right())
		await open("b.org")
		const oldRuntime = controller.activeBufferRuntime!,
			oldSession = controller.workspaceSessionId,
			oldViews = views()
		const oldUpdate = controller.updateContent
		act(() => {
			left().dispatch({ selection: { anchor: 0 } })
			foldCode(left())
		})
		left().scrollDOM.scrollTop = 77
		workspace = { ...workspace, capabilityToken: "G2" }
		await act(async () => {
			await controller.openDefaultWorkspace()
		})
		await open("a.org")
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		expect(controller.workspaceSessionId).not.toBe(oldSession)
		expect(oldRuntime.closed).toBe(true)
		expect(oldPeerRuntime.closed).toBe(true)
		expect(controller.activeBufferRuntime).not.toBe(oldRuntime)
		expect(views()).toHaveLength(2)
		expect(folds(left())).toBe(0)
		expect(left().scrollDOM.scrollTop).not.toBe(77)
		const baseline = commits.mock.calls.length
		act(() => oldUpdate("stale G1 command target"))
		source(rawA)
		expect(() => oldRuntime.applyControllerSource(rawA, "stale")).toThrow()
		expect(() => oldViews[1].dispatch({ changes: { from: 0, insert: "stale" } })).toThrow()
		source(rawA)
		expect(commits).toHaveBeenCalledTimes(baseline)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
})
