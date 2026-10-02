import { undo, undoDepth } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useBlocker } from "@tanstack/react-router"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	captureOrgEntryFlow,
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	saveOrgDocumentFlow,
	scanOrgWorkspaceFlow,
} from "@/flows/org-workspace"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { appendOrgCaptureEntry, newOrgCaptureDocumentSource } from "@/pipes/org/org-capture.pipe"
import {
	releaseOrgWorkspace,
	unwatchOrgWorkspace,
	watchOrgWorkspace,
} from "@/io/file/org-file.repository"
import { registerOrgWindowClose } from "@/io/event/org-window-close.adapter"
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

const rawA = "* A :raw:\r\n#+begin_export html\r\n<b>untouched</b>\r\n#+end_export\r\n"
const rawB = "* B\nindependent\n"
let disk: Map<string, OrgDocumentInterface>
let workspace: OrgWorkspaceInterface
function editor(name = `Editing ${controller.activeDocument?.relativePath}`) {
	const view = EditorView.findFromDOM(screen.getByRole("textbox", { name }))
	if (!view) throw new Error("Missing production CodeMirror")
	return view
}
const scratch = () => editor("Capture Org draft")
function replaceDraft(content: string) {
	act(() =>
		scratch().dispatch({ changes: { from: 0, to: scratch().state.doc.length, insert: content } }),
	)
}
async function setup(path = "a.org") {
	render(<OrgWorkspaceContainer />)
	await act(async () => {
		await controller.openDefaultWorkspace()
	})
	await act(async () => {
		expect(await controller.openDocumentPath(path)).toBe(true)
	})
}
async function capture(palette = false) {
	if (palette) {
		fireEvent.keyDown(editor().contentDOM, { key: "p", ctrlKey: true })
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "Capture" } })
		fireEvent.keyDown(input, { key: "Enter" })
	} else fireEvent.click(screen.getByRole("button", { name: "Quick capture" }))
	const chooser = screen.getByRole("combobox")
	expect(document.querySelector("[data-org-capture-template-minibuffer]")).not.toBeNull()
	fireEvent.change(chooser, { target: { value: "TODO" } })
	await act(async () => {
		fireEvent.keyDown(chooser, { key: "Enter" })
	})
	expect(screen.getByRole("region", { name: "Org capture tool buffer" })).toBeInTheDocument()
	expect(scratch().contentDOM).toHaveFocus()
	expect(scratch().state.selection.main.head).toBe(7)
}
function deferredCapture() {
	let resolve!: (result: Awaited<ReturnType<ReturnType<typeof captureOrgEntryFlow>>>) => void
	const promise = new Promise<Awaited<ReturnType<ReturnType<typeof captureOrgEntryFlow>>>>((r) => {
		resolve = r
	})
	vi.mocked(captureOrgEntryFlow).mockReturnValueOnce(() => promise)
	return resolve
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
	vi.mocked(captureOrgEntryFlow).mockImplementation((input) => async () => {
		const previous = disk.get(input.relativePath)
		const prepared = previous
			? appendOrgCaptureEntry(previous.content, input.entrySource)
			: newOrgCaptureDocumentSource(input.relativePath, input.entrySource)
		if (E.isLeft(prepared))
			return E.left({
				type: "ORG_CAPTURE_REJECTED_ERROR",
				phase: "preparation",
				noWrite: true,
				cause: prepared.left,
				message: `Capture rejected before writing (preparation): ${prepared.left.message}`,
			})
		const confirmed = {
			relativePath: input.relativePath,
			content: prepared.right,
			revision: "capture-confirmed",
		}
		disk.set(input.relativePath, confirmed)
		return E.right(confirmed)
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

describe("production root capture runtime (real hook, pane, workflow and CodeMirror)", () => {
	it("dispatches palette Capture into TODO scratch, writes raw multiline source only on Finish and restores origin history/focus", async () => {
		await setup()
		act(() =>
			editor().dispatch({
				changes: { from: editor().state.doc.length, insert: "origin edit" },
				selection: { anchor: 5 },
			}),
		)
		const before = editor().state.sliceDoc()
		await capture(true)
		const entry = "* TODO 中文\u0000 title\nbody %?\n** child without EOF"
		replaceDraft(entry)
		expect(vi.mocked(useBlocker).mock.lastCall?.[0]).toMatchObject({ enableBeforeUnload: true })
		expect(vi.mocked(registerOrgWindowClose).mock.lastCall?.[0].getState().hasDirtyBuffers).toBe(
			true,
		)
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		const finish = deferredCapture()
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish" }))
		})
		expect(controller.isSaving).toBe(true)
		expect(scratch().state.facet(EditorState.readOnly)).toBe(true)
		expect(captureOrgEntryFlow).toHaveBeenCalledExactlyOnceWith({
			entrySource: entry,
			relativePath: "inbox.org",
			workspaceRoot: "/notes",
			capabilityToken: "G1",
		})
		fireEvent.keyDown(scratch().contentDOM, { key: "g", ctrlKey: true })
		expect(screen.getByRole("textbox", { name: "Capture Org draft" })).toBeInTheDocument()
		await act(async () => {
			const confirmed = {
				relativePath: "inbox.org",
				content: "#+title: inbox\n\n" + entry,
				revision: "capture-1",
			}
			disk.set("inbox.org", confirmed)
			finish(E.right(confirmed))
		})
		expect(screen.queryByRole("textbox", { name: "Capture Org draft" })).not.toBeInTheDocument()
		expect(disk.get("inbox.org")?.content).toBe("#+title: inbox\n\n" + entry)
		expect(editor().state.sliceDoc()).toBe(before)
		expect(editor().state.selection.main.head).toBe(5)
		expect(editor().contentDOM).toHaveFocus()
		expect(undoDepth(editor().state)).toBe(1)
		act(() => {
			expect(undo(editor())).toBe(true)
		})
		expect(controller.content).toBe(rawA)
	})
	it("appends into the clean source Inbox with minimal external update, keeping EOF caret and existing undo history; Org prefixes still work in scratch", async () => {
		disk.set("inbox.org", {
			relativePath: "inbox.org",
			content: "* Inbox\noriginal",
			revision: "inbox-1",
		})
		workspace = {
			...workspace,
			documents: [...disk.values()].map(({ relativePath, revision }) => ({
				relativePath,
				revision,
			})),
		}
		await setup("inbox.org")
		act(() => editor().dispatch({ changes: { from: editor().state.doc.length, insert: " saved" } }))
		await act(async () => {
			await controller.saveDocument()
		})
		const before = editor().state.sliceDoc()
		act(() => editor().dispatch({ selection: { anchor: before.length } }))
		expect(undoDepth(editor().state)).toBe(1)
		await capture()
		replaceDraft("* TODO child\nraw body")
		act(() => scratch().dispatch({ selection: { anchor: 3 } }))
		fireEvent.keyDown(scratch().contentDOM, { key: "c", ctrlKey: true })
		fireEvent.keyDown(scratch().contentDOM, { key: "t", ctrlKey: true })
		expect(scratch().state.sliceDoc()).toBe("* DONE child\nraw body")
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
		fireEvent.keyDown(scratch().contentDOM, { key: "c", ctrlKey: true })
		await act(async () => {
			fireEvent.keyDown(scratch().contentDOM, { key: "c", ctrlKey: true })
		})
		// Preserve the raw entry's missing EOF newline; only the separator is added.
		expect(editor().state.sliceDoc()).toBe(before + "\n* DONE child\nraw body")
		expect(editor().state.selection.main.head).toBe(before.length)
		expect(disk.get("inbox.org")?.content).toBe(before + "\n* DONE child\nraw body")
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(editor().state)).toBe(1)
		act(() => {
			expect(undo(editor())).toBe(true)
		})
		expect(editor().state.sliceDoc()).toBe("* Inbox\noriginal\n* DONE child\nraw body")
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})
	it.each([
		3,
		"EOF",
	] as const)("restores parked clean capture target A by logical ID with saved history and cursor %s, without writing on reactivation", async (cursor) => {
		await setup()
		act(() =>
			editor().dispatch({
				changes: { from: editor().state.doc.length, insert: "saved local edit" },
			}),
		)
		await act(async () => {
			await controller.saveDocument()
		})
		const before = editor().state.sliceDoc()
		const position = cursor === "EOF" ? editor().state.doc.length : cursor
		const originId = controller.activeBufferId
		act(() => editor().dispatch({ selection: { anchor: position } }))
		editor().scrollDOM.scrollTop = 123
		editor().scrollDOM.scrollLeft = 17
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(editor().state)).toBe(1)
		await capture()
		// The real sidebar event calls openDocument (not a forced save or a test activation).
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /^b$/ }))
		})
		expect(controller.activeDocument?.relativePath).toBe("b.org")
		expect(controller.openBuffers.find((buffer) => buffer.bufferId === originId)).toMatchObject({
			relativePath: "a.org",
			isDirty: false,
		})
		fireEvent.change(screen.getByRole("textbox", { name: "Capture target file" }), {
			target: { value: "a.org" },
		})
		const entry = "* TODO parked capture\nraw body"
		replaceDraft(entry)
		const finish = deferredCapture()
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish" }))
		})
		expect(captureOrgEntryFlow).toHaveBeenCalledExactlyOnceWith({
			entrySource: entry,
			relativePath: "a.org",
			workspaceRoot: "/notes",
			capabilityToken: "G1",
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		const appended = "\n" + entry
		const confirmed = {
			relativePath: "a.org",
			content: before + appended,
			revision: "capture-confirmed",
		}
		await act(async () => {
			disk.set("a.org", confirmed)
			finish(E.right(confirmed))
		})
		expect(screen.queryByRole("textbox", { name: "Capture Org draft" })).not.toBeInTheDocument()
		expect(controller.activeBufferId).toBe(originId)
		expect(controller.activeDocument?.relativePath).toBe("a.org")
		expect(controller.content).toBe(confirmed.content)
		expect(editor().state.sliceDoc()).toBe(confirmed.content)
		expect(editor().state.sliceDoc().slice(0, before.length)).toBe(before)
		expect(before.startsWith(rawA)).toBe(true)
		expect(editor().state.selection.main.head).toBe(position)
		expect(editor().contentDOM).toHaveFocus()
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(editor().state)).toBe(1)
		// Only run the scroll-restore frame; leave debounce/autosave timers paused.
		// These are JSDOM scroll properties, not evidence of native layout/geometry.
		act(() => vi.advanceTimersByTime(32))
		expect(editor().scrollDOM.scrollTop).toBe(123)
		expect(editor().scrollDOM.scrollLeft).toBe(17)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(captureOrgEntryFlow).toHaveBeenCalledTimes(1)
		fireEvent.keyDown(editor().contentDOM, { key: "z", ctrlKey: true })
		expect(editor().state.sliceDoc()).toBe(rawA + appended)
		expect(controller.content).toBe(rawA + appended)
		expect(controller.isDirty).toBe(true)
		expect(undoDepth(editor().state)).toBe(0)
		expect(disk.get("a.org")?.content).toBe(confirmed.content)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})
	it("rejects an inactive dirty capture target before flow IO after real sidebar navigation", async () => {
		await setup()
		act(() => editor().dispatch({ changes: { from: 0, insert: "parked local" } }))
		const originId = controller.activeBufferId
		await capture()
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /^b$/ }))
		})
		expect(controller.activeDocument?.relativePath).toBe("b.org")
		expect(controller.isDirty).toBe(false)
		expect(controller.openBuffers.find((buffer) => buffer.bufferId === originId)).toMatchObject({
			relativePath: "a.org",
			isDirty: true,
		})
		fireEvent.change(screen.getByRole("textbox", { name: "Capture target file" }), {
			target: { value: "a.org" },
		})
		replaceDraft("* TODO retained inactive")
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish" }))
		})
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(scratch().state.sliceDoc()).toBe("* TODO retained inactive")
		expect(scratch().state.facet(EditorState.readOnly)).toBe(false)
		expect(
			screen.getAllByRole("alert").some((node) => node.textContent?.includes("Save or reconcile")),
		).toBe(true)
		expect(disk.get("a.org")?.content).toBe(rawA)
	})
	it("C-g cancels both template and typed draft, clearing transient dirty state without writing and restoring origin focus", async () => {
		await setup()
		fireEvent.click(screen.getByRole("button", { name: "Quick capture" }))
		await act(async () => {
			fireEvent.keyDown(screen.getByRole("combobox"), { key: "g", ctrlKey: true })
		})
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(editor().contentDOM).toHaveFocus()
		await capture()
		replaceDraft("* TODO cancelled\n中文")
		expect(controller.isDirty).toBe(false)
		expect(vi.mocked(registerOrgWindowClose).mock.lastCall?.[0].getState().hasDirtyBuffers).toBe(
			true,
		)
		expect(vi.mocked(useBlocker).mock.lastCall?.[0]).toMatchObject({ enableBeforeUnload: true })
		await act(async () => {
			fireEvent.keyDown(scratch().contentDOM, { key: "g", ctrlKey: true })
		})
		expect(screen.queryByRole("textbox", { name: "Capture Org draft" })).not.toBeInTheDocument()
		expect(vi.mocked(useBlocker).mock.lastCall?.[0]).toMatchObject({ enableBeforeUnload: false })
		expect(editor().contentDOM).toHaveFocus()
		expect(vi.mocked(registerOrgWindowClose).mock.lastCall?.[0].getState().hasDirtyBuffers).toBe(
			false,
		)
		expect(controller.content).toBe(rawA)
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("keeps deferred uncertain writes visible and retired/read-only, never retries or closes on pending C-g", async () => {
		await setup()
		await capture()
		replaceDraft("* TODO uncertain\nretain me")
		const finish = deferredCapture()
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish" }))
		})
		fireEvent.keyDown(scratch().contentDOM, { key: "g", ctrlKey: true })
		expect(scratch().state.facet(EditorState.readOnly)).toBe(true)
		await act(async () => {
			finish(
				E.left({
					type: "ORG_CAPTURE_UNCERTAIN_WRITE_ERROR",
					message: "Target may already contain entry. Do not retry.",
					targetRelativePath: "inbox.org",
					cause: null,
				}),
			)
		})
		expect(controller.isSaving).toBe(false)
		expect(scratch().state.sliceDoc()).toBe("* TODO uncertain\nretain me")
		expect(scratch().state.facet(EditorState.readOnly)).toBe(true)
		expect(screen.queryByRole("button", { name: "Finish" })).not.toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Dismiss (no rollback)" })).toBeInTheDocument()
		await act(async () => {
			fireEvent.keyDown(scratch().contentDOM, { key: "s", ctrlKey: true })
		})
		expect(captureOrgEntryFlow).toHaveBeenCalledTimes(1)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("rejects dirty existing targets before filesystem dispatch while retaining the editable draft", async () => {
		await setup()
		act(() => editor().dispatch({ changes: { from: 0, insert: "local" } }))
		await capture()
		replaceDraft("* TODO retained")
		fireEvent.change(screen.getByRole("textbox", { name: "Capture target file" }), {
			target: { value: "a.org" },
		})
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish" }))
		})
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
		expect(scratch().state.sliceDoc()).toBe("* TODO retained")
		expect(scratch().state.facet(EditorState.readOnly)).toBe(false)
		expect(
			screen.getAllByRole("alert").some((node) => node.textContent?.includes("Save or reconcile")),
		).toBe(true)
		expect(controller.content).toBe("local" + rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
})
