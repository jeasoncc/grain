import { undo, undoDepth } from "@codemirror/commands"
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
const noop = () => undefined

function Runtime() {
	controller = useOrgWorkspace()
	const cacheRef = useRef(new Map<string, OrgEditorSessionSnapshot>())
	cache = cacheRef.current
	const [agenda, toggleAgenda] = useState(false)
	setAgenda = toggleAgenda
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
