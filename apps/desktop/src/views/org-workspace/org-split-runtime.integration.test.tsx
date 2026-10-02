import { redoDepth, undoDepth } from "@codemirror/commands"
import { foldCode, foldedRanges } from "@codemirror/language"
import { EditorSelection, EditorState, StateEffect } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	saveOrgDocumentFlow,
	scanOrgWorkspaceFlow,
} from "@/flows/org-workspace"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import {
	releaseOrgWorkspace,
	unwatchOrgWorkspace,
	watchOrgWorkspace,
} from "@/io/file/org-file.repository"
import type { OrgDocumentInterface, OrgWorkspaceInterface } from "@/types/org"
import { OrgWorkspaceContainer } from "./org-workspace.container.fn"

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
	Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
vi.mock("@/io/event/org-window-close.adapter", () => ({
	registerOrgWindowClose: vi.fn(() => () => undefined),
}))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({
	orgWorkspaceEventAdapter: { listen: async () => () => undefined },
}))
vi.mock("@/io/file/org-file.repository", () => ({
	releaseOrgWorkspace: vi.fn(),
	unwatchOrgWorkspace: vi.fn(),
	watchOrgWorkspace: vi.fn(),
}))
vi.mock("@/flows/org-workspace", () => ({
	archiveOrgSubtreeFlow: vi.fn(),
	clearOrgDerivedIndexFlow: vi.fn(),
	createOrgDirectoryFlow: vi.fn(),
	deleteOrgDocumentFlow: vi.fn(),
	prepareLegacyMigrationFlow: vi.fn(),
	verifyLegacyMigrationRecoveryFlow: vi.fn(),
	runLegacyMigrationRecoveryDrillFlow: vi.fn(),
	rebuildOrgDerivedIndexFlow: vi.fn(),
	resolveOrgLinkTargetFlow: vi.fn(),
	selectOrgWorkspaceFlow: vi.fn(),
	captureOrgTodoFlow: vi.fn(),
	captureOrgEntryFlow: vi.fn(),
	moveOrgDocumentFlow: vi.fn(),
	ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE: "duplicate",
	openDefaultOrgWorkspaceFlow: vi.fn(),
	openOrgDocumentFlow: vi.fn(),
	refileOrgSubtreeFlow: vi.fn(),
	saveOrgDocumentFlow: vi.fn(),
	scanOrgWorkspaceFlow: vi.fn(),
}))

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
	return screen
		.getAllByRole("textbox", { name: `Editing ${controller.activeDocument?.relativePath}` })
		.map((node) => {
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
	for (const view of views()) {
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
async function setup() {
	render(<OrgWorkspaceContainer />)
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
	vi.spyOn(window, "confirm").mockReturnValue(true)
	disk = new Map([
		["a.org", { relativePath: "a.org", content: rawA, revision: "a-1" }],
		["b.org", { relativePath: "b.org", content: rawB, revision: "b-1" }],
	])
	workspace = {
		rootPath: "/notes",
		capabilityToken: "G1",
		directories: [],
		documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
	}
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
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe("production root same-buffer split (synthetic host IO, real hook/pane/editor/runtime)", () => {
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
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(disk.get("a.org")!.content).toBe(first + "RIGHT")
	})

	it("keeps both windows on B, parks dirty per-ID history and restores individual A/B caret/fold/scroll caches", async () => {
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
		const selectionB = views().map((v) => v.state.selection.toJSON())
		expect(controller.openBuffers.filter((buffer) => buffer.isDirty)).toHaveLength(2)
		await open("a.org")
		act(() => vi.advanceTimersByTime(32))
		expect(controller.activeBufferId).toBe(idA)
		expect(controller.activeBufferRuntime).toBe(runtimeA)
		expect(left()).not.toBe(originalAViews[0])
		expect(right()).not.toBe(originalAViews[1])
		source(rawA + "A edit")
		expect(views().map((v) => v.state.selection.toJSON())).toEqual(selectionA)
		expect(folds(left())).toBe(1)
		expect(folds(right())).toBe(0)
		expect(views().map((v) => v.scrollDOM.scrollTop)).toEqual([44, 99])
		key(right())
		source(rawA)
		expect(runtimeB.source).toBe(rawB + "B edit")
		expect(undoDepth(runtimeB.state)).toBe(1)
		await open("b.org")
		act(() => vi.advanceTimersByTime(32))
		source(rawB + "B edit")
		expect(views().map((v) => v.state.selection.toJSON())).toEqual(selectionB)
		expect(views().map((v) => v.scrollDOM.scrollTop)).toEqual([12, 66])
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
		let saving!: Promise<void>
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

	it("makes both windows read-only during a deferred native document read and rejects direct source dispatch too", async () => {
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
		expect(controller.isEditorReadOnly).toBe(true)
		for (const view of views()) {
			expect(view.state.facet(EditorState.readOnly)).toBe(true)
			expect(() => act(() => view.dispatch({ changes: { from: 0, insert: "denied" } }))).toThrow()
		}
		source(rawA)
		expect(commits).not.toHaveBeenCalled()
		await act(async () => {
			finish(E.right(disk.get("b.org")!))
			expect(await opening).toBe(true)
		})
		source(rawB)
		expect(views()).toHaveLength(2)
		for (const view of views()) expect(view.state.facet(EditorState.readOnly)).toBe(false)
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
		expect(commits).toHaveBeenCalledTimes(2)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
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

	it("fences G1 old runtime/handles/cache after G2 approval even at the same root and path", async () => {
		await setup()
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
