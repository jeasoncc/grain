import { undo, undoDepth } from "@codemirror/commands"
import { EditorState, Transaction } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { useEffect, useRef, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	saveOrgDocumentFlow,
	scanOrgWorkspaceFlow,
} from "@/flows/org-workspace"
import { useOrgWorkspace, type OrgWorkspaceController } from "@/hooks/use-org-workspace"
import {
	releaseOrgWorkspace,
	unwatchOrgWorkspace,
	watchOrgWorkspace,
} from "@/io/file/org-file.repository"
import type { OrgDocumentInterface, OrgWorkspaceInterface } from "@/types/org"
import type { OrgEditorSessionSnapshot } from "@/views/org-editor/org-editor.types"
import { OrgBufferSwitch } from "./org-buffer-switch.view.fn"
import { OrgDocumentPane } from "./org-document-pane.view.fn"

// Only filesystem/host boundaries are replaced: hook, pane, editor and CM history are real.
vi.mock("@tanstack/react-router", () => ({ useBlocker: vi.fn() }))
vi.mock("@/io/event/org-window-close.adapter", () => ({
	registerOrgWindowClose: () => () => undefined,
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
	moveOrgDocumentFlow: vi.fn(),
	ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE: "duplicate",
	openDefaultOrgWorkspaceFlow: vi.fn(),
	openOrgDocumentFlow: vi.fn(),
	refileOrgSubtreeFlow: vi.fn(),
	saveOrgDocumentFlow: vi.fn(),
	scanOrgWorkspaceFlow: vi.fn(),
}))

const rawA = "* A :raw:\r\n#+begin_export html\r\n<b>untouched</b>\r\n#+end_export\r\n"
const rawB = "* B\nindependent\n"
let disk: Map<string, OrgDocumentInterface>
let workspace: OrgWorkspaceInterface
let controller: OrgWorkspaceController
let cache: Map<string, OrgEditorSessionSnapshot>
let setAgenda: (value: boolean) => void
let setPickerOpen: (value: boolean) => void
const switchSelectedBuffer = vi.fn((bufferId: string, signal?: AbortSignal) =>
	controller.switchBuffer(bufferId, signal),
)
const noop = () => undefined

function Runtime() {
	controller = useOrgWorkspace()
	const cacheRef = useRef(new Map<string, OrgEditorSessionSnapshot>())
	cache = cacheRef.current
	const [agenda, toggleAgenda] = useState(false)
	setAgenda = toggleAgenda
	const [pickerOpen, togglePicker] = useState(false)
	setPickerOpen = togglePicker
	// Same parent-owned cache and grant/buffer pruning as the production container.
	useEffect(() => {
		const retained = new Set(
			controller.openBuffers.map(
				(buffer) => `${controller.workspaceSessionId}\u0000${buffer.bufferId}`,
			),
		)
		for (const key of cacheRef.current.keys()) if (!retained.has(key)) cacheRef.current.delete(key)
	}, [controller.workspaceSessionId, controller.openBuffers])
	return (
		<>
			{controller.error && <div role="alert">{controller.error}</div>}
			<OrgBufferSwitch
				buffers={controller.openBuffers}
				activeBufferId={controller.activeBufferId}
				open={pickerOpen}
				onOpenChange={togglePicker}
				sessionKey={controller.workspaceSessionId ?? ""}
				onSelect={(buffer, signal) => switchSelectedBuffer(buffer.bufferId, signal)}
			/>
			{agenda ? (
				<div>Workspace agenda</div>
			) : (
				<OrgDocumentPane
					controller={controller}
					editorSessionCache={cacheRef.current}
					isBusy={controller.isLoading || controller.isSaving}
					canGoBack={false}
					canGoForward={false}
					inspectorVisible={false}
					sidebarVisible
					parameterSessionSuspended={false}
					openDocumentPaths={controller.openBuffers.map((buffer) => buffer.relativePath)}
					onCloseTab={(path) => {
						void controller.closeDocumentPath(path)
					}}
					onSelectTab={(path) => {
						void controller.openDocumentPath(path)
					}}
					onGoBack={noop}
					onGoForward={noop}
					onQuickOpen={noop}
					onShowInspector={noop}
					onShowSidebar={noop}
				/>
			)}
		</>
	)
}
function view() {
	const editor = EditorView.findFromDOM(
		screen.getByRole("textbox", { name: `Editing ${controller.activeDocument?.relativePath}` }),
	)
	if (!editor) throw new Error("Missing actual CodeMirror EditorView")
	return editor
}
async function open(path: string) {
	await act(async () => {
		expect(await controller.openDocumentPath(path)).toBe(true)
	})
}
function edit(suffix: string) {
	act(() => {
		view().dispatch({ changes: { from: view().state.doc.length, insert: suffix } })
	})
}
function undoEditor() {
	act(() => {
		expect(undo(view())).toBe(true)
	})
}
async function setup() {
	render(<Runtime />)
	await act(async () => {
		await controller.openDefaultWorkspace()
	})
	await open("a.org")
}
function externalA() {
	disk.set("a.org", {
		relativePath: "a.org",
		content: "* External\r\nreplacement\r\n",
		revision: "external",
	})
	workspace = {
		...workspace,
		documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
	}
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.resetAllMocks()
	switchSelectedBuffer.mockImplementation((bufferId, signal) => controller.switchBuffer(bufferId, signal))
	window.localStorage.clear()
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

describe("production Org buffer runtime", () => {
	it("Save All writes distinct dirty A/B snapshots and preserves both open buffers and CM histories", async () => {
		await setup()
		edit("A batch")
		await open("b.org")
		edit("B batch")
		const ids = controller.openBuffers.map((buffer) => buffer.bufferId)
		const activeId = controller.activeBufferId
		await act(async () => {
			expect(await controller.saveAllDocuments()).toEqual({
				kind: "success", savedPaths: ["a.org", "b.org"], remainingDirtyPaths: [],
			})
		})
		expect(vi.mocked(saveOrgDocumentFlow).mock.calls.map(([input]) => input)).toEqual([
			{ workspaceRoot: "/notes", capabilityToken: "G1", relativePath: "a.org", content: rawA + "A batch", expectedRevision: "a-1" },
			{ workspaceRoot: "/notes", capabilityToken: "G1", relativePath: "b.org", content: rawB + "B batch", expectedRevision: "b-1" },
		])
		expect(controller.activeBufferId).toBe(activeId)
		expect(controller.openBuffers.map((buffer) => buffer.bufferId)).toEqual(ids)
		expect(controller.openBuffers.every((buffer) => !buffer.isDirty)).toBe(true)
		expect(undoDepth(view().state)).toBe(1)
		undoEditor()
		expect(controller.content).toBe(rawB)
		await act(async () => { expect(await controller.switchBuffer(ids[0]!)).toBe(true) })
		expect(view().state.sliceDoc()).toBe(rawA + "A batch")
		expect(undoDepth(view().state)).toBe(1)
		undoEditor()
		expect(controller.content).toBe(rawA)
		expect(controller.isDirty).toBe(true)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
	})

	it("keeps the active CM writable during a deferred Save All and preserves newer input after partial failure and Ctrl-Z", async () => {
		await setup()
		edit("A batch")
		await open("b.org")
		edit("B captured")
		let finish!: (result: Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>) => void
		const pending = new Promise<Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>>((resolve) => { finish = resolve })
		vi.mocked(saveOrgDocumentFlow).mockImplementation((input) => async () => {
			if (input.relativePath === "b.org") return pending
			disk.set(input.relativePath, { relativePath: input.relativePath, content: input.content, revision: "a-confirmed" })
			return E.right({ relativePath: input.relativePath, revision: "a-confirmed" })
		})
		let saving!: ReturnType<typeof controller.saveAllDocuments>
		await act(async () => { saving = controller.saveAllDocuments(); await Promise.resolve() })
		expect(controller.isSaving).toBe(true)
		expect(controller.isEditorReadOnly).toBe(false)
		expect(view().state.facet(EditorState.readOnly)).toBe(false)
		expect(view().contentDOM).toHaveAttribute("contenteditable", "true")
		// A real CM transaction, not a browser/native IME simulation. Separate undo group.
		act(() => view().dispatch({
			changes: { from: view().state.doc.length, insert: " newer input" },
			annotations: Transaction.userEvent.of("input"),
		}))
		await act(async () => {
			finish(E.left({ type: "ORG_FILE_ERROR", operation: "write", command: "write", cause: null, message: "write denied" }))
			expect(await saving).toMatchObject({ kind: "partial", savedPaths: ["a.org"], remainingDirtyPaths: ["b.org"] })
		})
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(expect.objectContaining({
			relativePath: "b.org", content: rawB + "B captured", expectedRevision: "b-1", capabilityToken: "G1",
		}))
		expect(controller.content).toBe(rawB + "B captured newer input")
		expect(view().state.sliceDoc()).toBe(controller.content)
		expect(controller.isEditorReadOnly).toBe(false)
		expect(view().state.facet(EditorState.readOnly)).toBe(false)
		act(() => { fireEvent.keyDown(view().contentDOM, { key: "z", code: "KeyZ", ctrlKey: true }) })
		expect(view().state.sliceDoc()).toBe(rawB + "B captured")
		expect(controller.content).toBe(rawB + "B captured")
		expect(controller.openBuffers).toHaveLength(2)
		expect(controller.isDirty).toBe(true)
	})

	it("switches existing IDs without forcing saves, restores CM cache and rejects late reads after abort", async () => {
		await setup()
		const aId = controller.activeBufferId!
		edit("A parked")
		act(() => view().dispatch({ selection: { anchor: 4 } }))
		await open("b.org")
		edit("B stays")
		const bId = controller.activeBufferId!
		await act(async () => { expect(await controller.switchBuffer(aId)).toBe(true) })
		expect(view().state.sliceDoc()).toBe(rawA + "A parked")
		expect(view().state.selection.main.head).toBe(4)
		expect(undoDepth(view().state)).toBe(1)
		await act(async () => { expect(await controller.switchBuffer(bId)).toBe(true) })
		expect(view().state.sliceDoc()).toBe(rawB + "B stays")
		let finish!: (result: Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>) => void
		const pending = new Promise<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>((resolve) => { finish = resolve })
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => pending)
		const abort = new AbortController()
		let switching!: Promise<boolean>
		act(() => { switching = controller.switchBuffer(aId, abort.signal) })
		expect(controller.isLoading).toBe(true)
		expect(controller.isEditorReadOnly).toBe(true)
		expect(view().state.facet(EditorState.readOnly)).toBe(true)
		expect(view().state.sliceDoc()).toBe(rawB + "B stays")
		act(() => abort.abort())
		expect(controller.isLoading).toBe(false)
		expect(controller.isEditorReadOnly).toBe(false)
		expect(view().state.facet(EditorState.readOnly)).toBe(false)
		await act(async () => {
			finish(E.right(disk.get("a.org")!))
			expect(await switching).toBe(false)
		})
		expect(controller.activeBufferId).toBe(bId)
		expect(view().state.sliceDoc()).toBe(rawB + "B stays")
		undoEditor()
		expect(controller.content).toBe(rawB)
		await act(async () => { expect(await controller.switchBuffer(aId)).toBe(true) })
		undoEditor()
		expect(controller.content).toBe(rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("binds the real Buffer Switch picker to logical IDs and restores a deleted dirty buffer", async () => {
		await setup()
		const aId = controller.activeBufferId!
		edit("deleted but kept")
		await open("b.org")
		disk.delete("a.org")
		workspace = { ...workspace, documents: [{ relativePath: "b.org", revision: "b-1" }] }
		await act(async () => { await controller.refreshWorkspace() })
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () => E.left({
			type: "ORG_FILE_ERROR", operation: "read", command: "read", cause: null, message: "file missing",
		}))
		act(() => setPickerOpen(true))
		const input = screen.getByRole("combobox", { name: "Search open buffers" })
		const selected = () => screen.getAllByRole("option").find((option) => option.getAttribute("aria-selected") === "true")!
		expect(selected()).toHaveAccessibleName("a.org · Unsaved · External conflict")
		fireEvent.keyDown(input, { key: "n", ctrlKey: true })
		expect(selected()).toHaveAccessibleName("b.org · Current")
		fireEvent.keyDown(input, { key: "p", ctrlKey: true })
		fireEvent.keyDown(input, { key: "Enter", isComposing: true })
		expect(switchSelectedBuffer).not.toHaveBeenCalled()
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(switchSelectedBuffer).toHaveBeenCalledExactlyOnceWith(aId, expect.any(AbortSignal))
		expect(screen.queryByRole("combobox", { name: "Search open buffers" })).not.toBeInTheDocument()
		expect(controller.activeBufferId).toBe(aId)
		expect(view().state.sliceDoc()).toBe(rawA + "deleted but kept")
		undoEditor()
		expect(controller.content).toBe(rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("parks dirty A/B without writes, restores raw source, cursor/scroll and independent undo, and rebinds saves", async () => {
		await setup()
		const aId = controller.activeBufferId
		edit("A edit")
		act(() => {
			view().dispatch({ selection: { anchor: 2, head: 5 } })
		})
		view().scrollDOM.scrollTop = 123
		view().scrollDOM.scrollLeft = 17
		await open("b.org")
		edit("B edit")
		act(() => {
			view().dispatch({ selection: { anchor: 3 } })
		})
		await open("a.org")
		expect(controller.activeBufferId).toBe(aId)
		expect(controller.content).toBe(rawA + "A edit")
		expect(view().state.sliceDoc()).toBe(rawA + "A edit")
		expect(view().state.selection.main).toMatchObject({ anchor: 2, head: 5 })
		act(() => vi.advanceTimersByTime(32)) // RAF only, deliberately below autosave delay.
		expect(view().scrollDOM.scrollTop).toBe(123)
		expect(view().scrollDOM.scrollLeft).toBe(17)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(screen.getAllByText("Unsaved changes")).toHaveLength(2)
		expect(cache.has(`G1\u0000${aId}`)).toBe(true)
		// Saving advances the disk baseline without erasing existing editor undo history.
		await act(async () => {
			fireEvent.keyDown(screen.getByRole("textbox"), { key: "s", ctrlKey: true })
		})
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({
				relativePath: "a.org",
				content: rawA + "A edit",
				capabilityToken: "G1",
			}),
		)
		expect(controller.isDirty).toBe(false)
		undoEditor()
		expect(controller.content).toBe(rawA)
		expect(controller.isDirty).toBe(true)
		await open("b.org")
		expect(view().state.selection.main.head).toBe(3)
		expect(view().state.sliceDoc()).toBe(rawB + "B edit")
		await act(async () => {
			fireEvent.keyDown(screen.getByRole("textbox"), { key: "s", ctrlKey: true })
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({
				relativePath: "b.org",
				content: rawB + "B edit",
				capabilityToken: "G1",
			}),
		)
		expect(disk.get("a.org")?.content).toBe(rawA + "A edit")
		undoEditor()
		expect(controller.content).toBe(rawB)
		expect(controller.isDirty).toBe(true)
	})

	it("preserves history across Agenda-style pane removal with the parent memory cache", async () => {
		await setup()
		edit("agenda edit")
		const key = `G1\u0000${controller.activeBufferId}`
		act(() => setAgenda(true))
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
		expect(cache.has(key)).toBe(true)
		act(() => setAgenda(false))
		expect(view().state.sliceDoc()).toBe(rawA + "agenda edit")
		expect(undoDepth(view().state)).toBe(1)
		undoEditor()
		expect(controller.content).toBe(rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("retains a dirty inactive tab and its Unsaved UI when close fails", async () => {
		await setup()
		edit("kept")
		await open("b.org")
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.left({
				type: "ORG_FILE_ERROR",
				operation: "write",
				command: "write",
				cause: null,
				message: "write denied",
			}),
		)
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Close a.org" }))
		})
		expect(screen.getByRole("button", { name: "Close a.org" })).toBeInTheDocument()
		expect(screen.getByText("Unsaved changes")).toBeInTheDocument()
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "a.org")?.isDirty).toBe(
			true,
		)
		expect(controller.activeDocument?.relativePath).toBe("b.org")
		await open("a.org")
		expect(view().state.sliceDoc()).toBe(rawA + "kept")
		undoEditor()
		expect(controller.content).toBe(rawA)
	})

	it("reports an inactive external conflict without replacing dirty A or its history", async () => {
		await setup()
		edit("local")
		await open("b.org")
		externalA()
		await act(async () => {
			await controller.refreshWorkspace()
		})
		expect(screen.getByRole("alert")).toHaveTextContent("External modification")
		await open("a.org")
		expect(
			controller.openBuffers.find((buffer) => buffer.relativePath === "a.org")?.hasConflict,
		).toBe(true)
		expect(view().state.sliceDoc()).toBe(rawA + "local")
		expect(screen.getByRole("button", { name: "a" }).parentElement).toHaveAttribute(
			"title",
			expect.stringContaining("external conflict"),
		)
		undoEditor()
		expect(controller.content).toBe(rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("invalidates cached history when a clean inactive source changes externally", async () => {
		await setup()
		edit("saved")
		await act(async () => {
			await controller.saveDocument()
		})
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(view().state)).toBe(1)
		await open("b.org")
		externalA()
		await act(async () => {
			await controller.refreshWorkspace()
		})
		await open("a.org")
		expect(view().state.sliceDoc()).toBe(disk.get("a.org")?.content)
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(view().state)).toBe(0)
		act(() => {
			expect(undo(view())).toBe(false)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})

	it("never reuses G1 history for an exact G2 grant at the same root and path", async () => {
		await setup()
		edit("saved")
		await act(async () => {
			await controller.saveDocument()
		})
		const oldId = controller.activeBufferId
		act(() => setAgenda(true))
		expect(cache.has(`G1\u0000${oldId}`)).toBe(true)
		workspace = { ...workspace, capabilityToken: "G2" }
		await act(async () => {
			await controller.openDefaultWorkspace()
		})
		expect(controller.workspaceSessionId).toBe("G2")
		expect(controller.workspace?.rootPath).toBe("/notes")
		expect(cache.size).toBe(0)
		await open("a.org")
		act(() => setAgenda(false))
		expect(view().state.sliceDoc()).toBe(rawA + "saved")
		expect(undoDepth(view().state)).toBe(0)
		expect(view().state.selection.main.head).toBe(0)
		act(() => {
			expect(undo(view())).toBe(false)
		})
		expect(openOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({ relativePath: "a.org", capabilityToken: "G2" }),
		)
	})
})
