import { undoDepth, redoDepth } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { act, cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	loadOrgAgendaFlow,
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	scanOrgWorkspaceFlow,
	saveOrgDocumentFlow,
} from "@/flows/org-workspace"
import { loadOrgAgendaFlow as productionLoadAgenda } from "@/flows/org-workspace/org-agenda.flow"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { ORG_WINDOW_CLOSE_DISCARD_MESSAGE } from "@/hooks/use-org-window-close"
import {
	watchOrgWorkspace,
	unwatchOrgWorkspace,
	releaseOrgWorkspace,
} from "@/io/file/org-file.repository"
import { OrgWorkspaceContainer } from "./org-workspace.container.fn"

// Observe the real Root controller; only filesystem and host boundaries are replaced.
let controller: OrgWorkspaceController
let rejectAgendaOnce = false
vi.mock("@/hooks/use-org-workspace", async (original) => {
	const real = await original<typeof import("@/hooks/use-org-workspace")>()
	return {
		...real,
		useOrgWorkspace: () => {
			const current = real.useOrgWorkspace()
			return (controller = {
				...current,
				executeAgendaCommand: (...args) => {
					if (rejectAgendaOnce) {
						rejectAgendaOnce = false
						return Promise.resolve({
							kind: "rejected" as const,
							message: "A workspace operation is running.",
						})
					}
					return current.executeAgendaCommand(...args)
				},
			})
		},
	}
})
vi.mock("@/hooks/use-workspace", () => ({ useAllWorkspaces: () => [] }))
vi.mock("@/io/event", () => ({ listenForOrgDiaryCreation: () => () => undefined }))
vi.mock("@tanstack/react-router", () => ({
	useBlocker: vi.fn(),
	Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
// Keep the production close adapter and hook; replace only the native window.
const nativeWindow = vi.hoisted(() => ({
	onCloseRequested: vi.fn(),
	destroy: vi.fn(),
}))
let requestNativeClose: (event: { preventDefault: () => void }) => void
vi.mock("@tauri-apps/api/core", async (original) => ({
	...(await original<typeof import("@tauri-apps/api/core")>()),
	isTauri: () => true,
}))
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => nativeWindow }))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({
	orgWorkspaceEventAdapter: { listen: async () => () => undefined },
}))
vi.mock("@/io/file/org-file.repository", () => ({
	orgFileRepository: { readDocument: vi.fn() },
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
	loadOrgAgendaFlow: vi.fn(),
	ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE: "duplicate",
	openDefaultOrgWorkspaceFlow: vi.fn(),
	openOrgDocumentFlow: vi.fn(),
	refileOrgSubtreeFlow: vi.fn(),
	readOrgRefileTargetFlow: vi.fn(),
	saveOrgDocumentFlow: vi.fn(),
	scanOrgWorkspaceFlow: vi.fn(),
}))
const source =
	"#+STARTUP: logdone logdrawer\r\n#+TODO: NEXT | FINISHED(!)\r\n* NEXT café 😀\r\n:PROPERTIES:\r\n:ID: untouched\r\n:END:\r\nbody\r\n"
const workspace = {
	rootPath: "/notes",
	capabilityToken: "G1",
	directories: [],
	documents: [{ relativePath: "a.org", revision: "a-1" }],
}
const editor = () => EditorView.findFromDOM(screen.getByRole("textbox", { name: "Editing a.org" }))!
const key = (key: string, ctrlKey = true) =>
	fireEvent.keyDown(editor().contentDOM, { key, ctrlKey })
beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date(2026, 6, 1, 0, 1))
	vi.resetAllMocks()
	nativeWindow.onCloseRequested.mockImplementation(async (listener) => {
		requestNativeClose = listener
		return () => undefined
	})
	nativeWindow.destroy.mockResolvedValue(undefined)
	rejectAgendaOnce = false
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
	vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () => E.right(workspace))
	vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(async () => E.right(workspace))
	vi.mocked(loadOrgAgendaFlow).mockImplementation(
		(grant, _repository, _cache, overlays, metadata) =>
			productionLoadAgenda(grant, undefined, new Map(), overlays, metadata),
	)
	vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
		E.right({ content: source, relativePath: "a.org", revision: "a-1" }),
	)
	vi.mocked(watchOrgWorkspace).mockReturnValue(async () => E.right("watch-G1"))
	vi.mocked(unwatchOrgWorkspace).mockReturnValue(async () => E.right(undefined))
	vi.mocked(releaseOrgWorkspace).mockReturnValue(async () => E.right(undefined))
})
afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
	vi.useRealTimers()
})
async function setup() {
	render(<OrgWorkspaceContainer />)
	// Await the actual adapter's asynchronous native-listener acknowledgement.
	await act(async () => {})
	await act(async () => {
		await controller.openDefaultWorkspace()
	})
	await act(async () => {
		await controller.openDocumentPath("a.org")
	})
	act(() => {
		editor().dispatch({
			selection: { anchor: editor().state.doc.toString().indexOf("* NEXT") + 3 },
		})
		editor().focus()
	})
}
const noteSource = source
	.replace("FINISHED(!)", "FINISHED(@)")
	.replace("* NEXT café 😀\r\n", "* NEXT café 😀\r\nDEADLINE: <2026-07-01 Wed>\r\n")
async function setupAgendaNote() {
	vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
		E.right({ content: noteSource, relativePath: "a.org", revision: "a-1" }),
	)
	await setup()
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Agenda" }))
	})
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: /Cycle TODO/ }))
	})
	return screen.getByRole("textbox", { name: "TODO note" })
}

async function setupEditorNote() {
	vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
		E.right({ content: noteSource, relativePath: "a.org", revision: "a-1" }),
	)
	await setup()
	act(() => {
		key("c")
		key("t")
	})
	return screen.getByRole("textbox", { name: "TODO note" }) as HTMLTextAreaElement
}

function expectProtectedDraft() {
	const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
	const preventDefault = vi.fn()
	act(() => requestNativeClose({ preventDefault }))
	expect(preventDefault).toHaveBeenCalledOnce()
	expect(confirm).toHaveBeenCalledWith(ORG_WINDOW_CLOSE_DISCARD_MESSAGE)
	expect(nativeWindow.destroy).not.toHaveBeenCalled()
	confirm.mockRestore()
}

function expectReleasedDraft() {
	const preventDefault = vi.fn()
	act(() => requestNativeClose({ preventDefault }))
	expect(preventDefault).not.toHaveBeenCalled()
}

describe("production Root TODO logging", () => {
	it.each([
		false,
		true,
	])("rejects late exact-path conflict at Editor note finish (parked=%s) and resumes only after reconciliation", async (parked) => {
		const expanded = {
			...workspace,
			documents: [...workspace.documents, { relativePath: "b.org", revision: "b-1" }],
		}
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () => E.right(expanded))
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(async () => E.right(expanded))
		const input = await setupEditorNote()
		fireEvent.change(input, { target: { value: "retained late-conflict note" } })
		const runtime = controller.activeBufferRuntime!
		const baseline = runtime.state
		controller.registerBufferWindow("test-window", controller.activeBufferId!)
		const permit = controller.captureBufferWindowPermit("test-window", controller.activeBufferId!)
		expect(permit()).toBe(true)
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.left({ type: "IO_ERROR", message: "uncertain write" } as never),
		)
		await act(async () => {
			await controller.saveDocument()
		})
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "a.org")).toMatchObject({
			hasConflict: true,
			autosavePaused: true,
		})
		if (parked) {
			vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () =>
				E.right({ content: "* TODO unrelated\n", relativePath: "b.org", revision: "b-1" }),
			)
			await act(async () => {
				await controller.openDocumentPath("b.org")
			})
		}
		expect(permit()).toBe(false)
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		expect(input).toHaveValue("retained late-conflict note")
		expect(input).toHaveAttribute("readonly")
		expect(runtime.state).toBe(baseline)
		expect(runtime.source).toBe(noteSource)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(controller.openBuffers.every((buffer) => !buffer.isDirty)).toBe(true)
		expectProtectedDraft()
		if (parked)
			await act(async () => {
				await controller.openDocumentPath("a.org")
			})
		// Neither returning to the source nor refreshing its unchanged revision clears pause.
		await act(async () => {
			await controller.refreshWorkspace()
		})
		expect(permit()).toBe(false)
		await act(async () => {
			fireEvent.keyDown(input, { key: "s", ctrlKey: true })
		})
		expect(runtime.source).toBe(noteSource)
		expect(undoDepth(runtime.state)).toBe(0)
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ relativePath: "a.org", revision: "a-2" }),
		)
		await act(async () => {
			await controller.saveDocument()
		})
		expect(permit()).toBe(true)
		await act(async () => {
			vi.advanceTimersByTime(300)
		})
		if (parked) {
			// The old activation is still stale; clearing flags is not a bypass.
			expect(input).toHaveAttribute("readonly")
			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Abort note" }))
			})
			act(() => {
				editor().focus()
				key("c")
				key("t")
			})
			fireEvent.change(screen.getByRole("textbox", { name: "TODO note" }), {
				target: { value: "retained late-conflict note" },
			})
		} else expect(input).not.toHaveAttribute("readonly")
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		expect(controller.content).toContain("retained late-conflict note")
		expect(undoDepth(runtime.state)).toBe(1)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
	})

	it.each([
		false,
		true,
	])("rejects late autosave-pause-only flags without canonical transactions (parked=%s)", async (parked) => {
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({
				...workspace,
				documents: [{ relativePath: "0.org", revision: "0-1" }, ...workspace.documents],
			}),
		)
		vi.mocked(openOrgDocumentFlow).mockImplementation(
			(request) => async () =>
				E.right({
					content: request.relativePath === "a.org" ? noteSource : "* TODO zero\n",
					relativePath: request.relativePath,
					revision: request.relativePath === "a.org" ? "a-1" : "0-1",
				}),
		)
		await setup()
		await act(async () => {
			await controller.openDocumentPath("0.org")
		})
		act(() => controller.updateContent("* TODO dirty zero\n"))
		await act(async () => {
			await controller.openDocumentPath("a.org")
		})
		const raw = noteSource + "working body\r\n"
		act(() => controller.updateContent(raw))
		act(() => {
			editor().dispatch({ selection: { anchor: raw.indexOf("* NEXT") + 3 } })
			editor().focus()
			key("c")
			key("t")
		})
		const input = screen.getByRole("textbox", { name: "TODO note" })
		fireEvent.change(input, { target: { value: "pause-only scratch" } })
		const runtime = controller.activeBufferRuntime!
		const baseline = runtime.state
		controller.registerBufferWindow("pause-window", controller.activeBufferId!)
		const permit = controller.captureBufferWindowPermit("pause-window", controller.activeBufferId!)
		expect(permit()).toBe(true)
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.left({ type: "IO_ERROR", message: "first member failed" } as never),
		)
		await act(async () => {
			await controller.saveAllDocuments()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledOnce()
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "a.org")).toMatchObject({
			hasConflict: false,
			autosavePaused: true,
		})
		if (parked)
			await act(async () => {
				await controller.openDocumentPath("0.org")
			})
		expect(permit()).toBe(false)
		await act(async () => {
			fireEvent.keyDown(input, { key: "s", ctrlKey: true })
		})
		expect(input).toHaveValue("pause-only scratch")
		expect(input).toHaveAttribute("readonly")
		expect(runtime.state).toBe(baseline)
		expect(runtime.source).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
		expectProtectedDraft()
	})

	it("does not revoke an Editor note permit for unrelated-file conflict flags", async () => {
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({
				...workspace,
				documents: [...workspace.documents, { relativePath: "b.org", revision: "b-1" }],
			}),
		)
		const input = await setupEditorNote()
		fireEvent.change(input, { target: { value: "exact-path permission" } })
		const runtime = controller.activeBufferRuntime!
		controller.registerBufferWindow("test-window", controller.activeBufferId!)
		const permit = controller.captureBufferWindowPermit("test-window", controller.activeBufferId!)
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ content: "* TODO other\n", relativePath: "b.org", revision: "b-1" }),
		)
		await act(async () => {
			await controller.openDocumentPath("b.org")
		})
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.left({ type: "IO_ERROR", message: "b conflict" } as never),
		)
		await act(async () => {
			await controller.saveDocument()
		})
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "b.org")).toMatchObject({
			hasConflict: true,
			autosavePaused: true,
		})
		expect(permit()).toBe(true)
		await act(async () => {
			await controller.openDocumentPath("a.org")
		})
		// Returning to an old activation cannot revive its note, even with a valid path permit.
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Abort note" }))
		})
		act(() => {
			editor().focus()
			key("c")
			key("t")
		})
		fireEvent.change(screen.getByRole("textbox", { name: "TODO note" }), {
			target: { value: "exact-path permission" },
		})
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		expect(controller.content).toContain("exact-path permission")
		expect(undoDepth(runtime.state)).toBe(1)
		expect(saveOrgDocumentFlow).toHaveBeenCalledOnce()
	})

	it("owns a typed multiline Editor @ scratch without changing canonical bytes or undo until finish", async () => {
		const input = await setupEditorNote()
		const baseline = controller.activeBufferRuntime!.state
		expect(controller.isEditorReadOnly).toBe(false) // native listener readiness acknowledged
		expect(input).toHaveFocus()
		expect(input.tagName).toBe("TEXTAREA")
		fireEvent.change(input, { target: { value: "first café 😀\nsecond literal line" } })
		// Native textarea undo is not a CodeMirror command or a canonical transaction.
		fireEvent.keyDown(input, { key: "z", ctrlKey: true })
		expect(input).toHaveValue("first café 😀\nsecond literal line")
		expect(controller.content).toBe(noteSource)
		expect(controller.activeBufferRuntime!.source).toBe(noteSource)
		expect(controller.activeBufferRuntime!.state).toBe(baseline)
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(baseline)).toBe(0)
		expectProtectedDraft()
		// Even a duplicate source command delivered to the inert editor cannot replace the draft.
		act(() => {
			key("c")
			key("t")
		})
		expect(screen.getByRole("textbox", { name: "TODO note" })).toBe(input)
		expect(input).toHaveValue("first café 😀\nsecond literal line")
		await act(async () => {
			fireEvent.keyDown(input, { key: "s", ctrlKey: true })
		})
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		expect(controller.content).toContain("first café 😀")
		expect(controller.content).toContain("second literal line")
		expect(controller.content.match(/- State/g)).toHaveLength(1)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(editor().contentDOM).toHaveFocus()
		act(() => key("z"))
		expect(controller.content).toBe(noteSource)
		expect(controller.activeBufferRuntime!.source).toBe(noteSource)
		expect(controller.isDirty).toBe(false)
		expectReleasedDraft()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it.each([
		"Editor",
		"Agenda",
	] as const)("retains a copyable %s draft across mode switch until explicit abort", async (origin) => {
		const input = (
			origin === "Editor" ? await setupEditorNote() : await setupAgendaNote()
		) as HTMLTextAreaElement
		fireEvent.change(input, { target: { value: "keep café 😀\ncopy me" } })
		expectProtectedDraft()
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: origin === "Editor" ? "Agenda" : "a" }))
			vi.advanceTimersByTime(300)
		})
		expect(screen.getByRole("textbox", { name: "TODO note" })).toBe(input)
		expect(input).toHaveValue("keep café 😀\ncopy me")
		expect(input).toHaveAttribute("readonly")
		act(() => {
			input.focus()
			input.setSelectionRange(0, input.value.length)
		})
		const copy = createEvent.keyDown(input, { key: "c", ctrlKey: true })
		fireEvent(input, copy)
		expect(copy.defaultPrevented).toBe(false)
		expect(input.selectionEnd - input.selectionStart).toBe(input.value.length)
		expect(controller.content).toBe(noteSource)
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		expectProtectedDraft()
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Abort note" }))
		})
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		expectReleasedDraft()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it.each([
		["Editor", "Finish note"],
		["Editor", "Abort note"],
		["Agenda", "Finish note"],
		["Agenda", "Abort note"],
	] as const)("does not steal external focus when closing a %s draft via %s", async (origin, action) => {
		const input = origin === "Editor" ? await setupEditorNote() : await setupAgendaNote()
		fireEvent.change(input, { target: { value: "preserve external focus" } })
		const external = document.createElement("button")
		external.textContent = "External focus owner"
		document.body.append(external)
		try {
			act(() => external.focus())
			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: action }))
			})
			expect(external).toHaveFocus()
			expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
			if (action === "Abort note") {
				expect(controller.content).toBe(noteSource)
				expectReleasedDraft()
			} else {
				expect(controller.content).toContain("preserve external focus")
				expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
			}
		} finally {
			external.remove()
		}
	})
	it("keeps a blank Agenda note editable, retries once, and undoes the canonical batch", async () => {
		const input = await setupAgendaNote()
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		expect(input).not.toHaveAttribute("readonly")
		expect(controller.content).toBe(noteSource)
		expect(controller.isDirty).toBe(false)
		fireEvent.change(input, { target: { value: "literal café 😀\nAgenda second line" } })
		expectProtectedDraft()
		const row = screen.getByRole("button", { name: /^DeadlineNEXT/ })
		act(() => {
			fireEvent.keyDown(row, { key: "t" })
			fireEvent.keyDown(row, { key: "t", repeat: true })
		})
		expect(screen.getByRole("textbox", { name: "TODO note" })).toBe(input)
		expect(input).toHaveValue("literal café 😀\nAgenda second line")
		expect(controller.content).toBe(noteSource)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		expect(controller.content).toContain("literal café 😀")
		expect(controller.content.match(/- State/g)).toHaveLength(1)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /^DeadlineFINISHED/ }))
		})
		act(() => {
			editor().focus()
			key("z")
		})
		expect(controller.content).toBe(noteSource)
		expect(controller.isDirty).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("retains Agenda note permission after a temporary workspace rejection", async () => {
		const input = await setupAgendaNote()
		fireEvent.change(input, { target: { value: "retry this draft" } })
		// Inject the hook's recoverable lock outcome; the next call uses the real hook.
		rejectAgendaOnce = true
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		expect(input).not.toHaveAttribute("readonly")
		expect(input).toHaveValue("retry this draft")
		expect(controller.content).toBe(noteSource)
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		expect(controller.content).toContain("retry this draft")
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("retains a readonly copy when an Agenda note's source changes", async () => {
		const input = await setupAgendaNote()
		fireEvent.change(input, { target: { value: "keep this draft" } })
		act(() => {
			controller.updateContent(noteSource + "changed\r\n")
		})
		await act(async () => {
			vi.advanceTimersByTime(300)
		})
		expect(input).toHaveValue("keep this draft")
		expect(input).toHaveAttribute("readonly")
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		fireEvent.click(screen.getByRole("button", { name: "Abort note" }))
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		expect(controller.content).not.toContain("- State")
	})

	it.each([
		false,
		true,
	])("guards consumed/repeated/IME Root source events and commits once (%s)", async (prefix) => {
		await setup()
		for (const guard of [
			{ repeat: true },
			{ isComposing: true },
			{ keyCode: 229 },
			{ consumed: true },
		]) {
			act(() => {
				if (prefix) key("c")
				const event = createEvent.keyDown(editor().contentDOM, {
					key: prefix ? "t" : "T",
					code: "KeyT",
					keyCode: 84,
					ctrlKey: prefix,
					altKey: !prefix,
					shiftKey: !prefix,
					...guard,
				})
				if ("consumed" in guard) event.preventDefault()
				fireEvent(editor().contentDOM, event)
				key("Escape", false)
			})
		}
		expect(controller.content).toBe(source)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		act(() => {
			if (prefix) {
				key("c")
				key("t")
			} else
				fireEvent.keyDown(editor().contentDOM, {
					key: "T",
					code: "KeyT",
					keyCode: 84,
					altKey: true,
					shiftKey: true,
				})
		})
		expect(controller.content.match(/CLOSED:/g)).toHaveLength(1)
		expect(controller.content.match(/- State/g)).toHaveLength(1)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it.each([
		["CLOSED:[2025-04-01]", "CLOSED:[2026-07-01]"],
		["CLOSED: \t[2025-04-01\tTue]", "CLOSED: \t[2026-07-01\tWed]"],
		["CLOSED:\t[2025-04-01\t08:00]", "CLOSED:\t[2026-07-01\t00:01]"],
		["CLOSED:  \t[2025-04-01  Tue\t08:00]", "CLOSED:  \t[2026-07-01  Wed\t00:01]"],
	])("preserves CLOSED shape and spacing with exact Root output and undo (%s)", async (closed, fresh) => {
		const raw = `#+STARTUP: logdone\r\n#+TODO: NEXT | FINISHED\r\n* NEXT café 😀\r\n \t${closed}  DEADLINE: <2026-07-02 Thu>\t\r\nbody\r\n`
		const expected = `#+STARTUP: logdone\r\n#+TODO: NEXT | FINISHED\r\n* FINISHED café 😀\r\n \t${fresh}  DEADLINE: <2026-07-02 Thu>\t\r\nbody\r\n`
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: raw, relativePath: "a.org", revision: "a-1" }),
		)
		await setup()
		act(() => {
			key("c")
			key("t")
		})
		expect(controller.content).toBe(expected)
		expect(controller.activeBufferRuntime!.source).toBe(expected)
		expect(editor().state.sliceDoc()).toBe(expected)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		act(() => {
			key("z")
		})
		expect(controller.content).toBe(raw)
		expect(controller.activeBufferRuntime!.source).toBe(raw)
		expect(editor().state.sliceDoc()).toBe(raw)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		expect(redoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(controller.isDirty).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("refuses an atomic logging batch at a sparse hidden boundary in Root", async () => {
		const raw = "#+STARTUP: logdone\n* TODO task\n* Hidden\nuntouched\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: raw, relativePath: "a.org", revision: "a-1" }),
		)
		await setup()
		act(() => {
			key("c")
			key("/", false)
		})
		const input = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(input, { target: { value: "todo" } })
		fireEvent.keyDown(input, { key: "Enter" })
		act(() => {
			editor().dispatch({ selection: { anchor: editor().state.doc.line(2).from } })
			key("c")
			key("t")
		})
		expect(
			screen
				.getAllByRole("status")
				.some((node) => node.textContent?.includes("TODO change was refused")),
		).toBe(true)
		expect(controller.content).toBe(raw)
		expect(controller.activeBufferRuntime!.source).toBe(raw)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		expect(controller.isDirty).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("owns an inherited parent lognotedone scratch and commits only the child", async () => {
		const raw =
			"#+TODO: NEXT | FINISHED\r\n* Parent\r\n:PROPERTIES:\r\n:LOGGING: lognotedone\r\n:END:\r\n** NEXT child\r\nbody\r\n* Sibling\r\nuntouched\r\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: raw, relativePath: "a.org", revision: "a-1" }),
		)
		await setup()
		act(() => {
			editor().dispatch({ selection: { anchor: raw.indexOf("** NEXT") } })
			key("c")
			key("t")
		})
		expect(controller.content).toBe(raw)
		expect(controller.activeBufferRuntime!.source).toBe(raw)
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		fireEvent.change(screen.getByRole("textbox", { name: "TODO note" }), {
			target: { value: "inherited Root note" },
		})
		fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		expect(controller.content).toContain(
			'** FINISHED child\r\nCLOSED: [2026-07-01 Wed 00:01]\r\n- State "FINISHED"',
		)
		expect(controller.content).toContain("inherited Root note")
		expect(controller.content).toContain(raw.slice(0, raw.indexOf("** NEXT")))
		expect(controller.content).toContain("* Sibling\r\nuntouched\r\n")
		expect(controller.activeBufferRuntime!.source).toBe(controller.content)
		expect(editor().state.sliceDoc()).toBe(controller.content)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(controller.isDirty).toBe(true)
		act(() => {
			key("z")
		})
		expect(controller.content).toBe(raw)
		expect(controller.activeBufferRuntime!.source).toBe(raw)
		expect(controller.isDirty).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it.each([
		{
			name: "local nil suppresses file @",
			raw: "#+TODO: NEXT | FINISHED(@)\r\n#+PROPERTY: LOGGING lognotedone\r\n* NEXT child\r\n:PROPERTIES:\r\n:LOGGING: nil\r\n:END:\r\nbody\r\n",
			insert: "* FINISHED child\r\n",
			heading: "* NEXT child\r\n",
		},
		{
			name: "inherited custom drawer only changes the child",
			raw: "#+TODO: NEXT | FINISHED(!)\r\n* Parent\r\n:PROPERTIES:\r\n:LOG_INTO_DRAWER: HISTORY\r\n:END:\r\n:HISTORY:\r\nparent entry\r\n:END:\r\n** NEXT child\r\nbody\r\n* Sibling\r\nuntouched\r\n",
			insert:
				'** FINISHED child\r\n:HISTORY:\r\n- State "FINISHED"    from "NEXT" [2026-07-01 Wed 00:01]\r\n:END:\r\n',
			heading: "** NEXT child\r\n",
		},
	])("applies PROPERTY inheritance atomically in Root: $name", async ({ raw, insert, heading }) => {
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: raw, relativePath: "a.org", revision: "a-1" }),
		)
		await setup()
		act(() => {
			editor().dispatch({ selection: { anchor: raw.indexOf(heading) } })
			key("c")
			key("t")
		})
		const expected = raw.replace(heading, insert)
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		expect(controller.content).toBe(expected)
		expect(controller.activeBufferRuntime!.source).toBe(expected)
		expect(editor().state.sliceDoc()).toBe(expected)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(controller.isDirty).toBe(true)
		act(() => {
			key("z")
		})
		expect(controller.content).toBe(raw)
		expect(controller.activeBufferRuntime!.source).toBe(raw)
		expect(controller.isDirty).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it.each([
		"Editor",
		"Agenda",
	])("retains a stale PROPERTY draft after canonical edit and undo (%s)", async (origin) => {
		const raw =
			"#+TODO: NEXT | FINISHED\r\n#+PROPERTY: LOGGING lognotedone\r\n* NEXT task\r\nDEADLINE: <2026-07-01 Wed>\r\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: raw, relativePath: "a.org", revision: "a-1" }),
		)
		await setup()
		await act(async () => {
			if (origin === "Agenda") {
				fireEvent.click(screen.getByRole("button", { name: "Agenda" }))
			} else {
				key("c")
				key("t")
			}
		})
		if (origin === "Agenda")
			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: /Cycle TODO/ }))
			})
		const note = screen.getByRole("textbox", { name: "TODO note" }) as HTMLTextAreaElement
		fireEvent.change(note, { target: { value: "retained property note" } })
		const runtime = controller.activeBufferRuntime!
		const revision = runtime.revision
		if (origin === "Agenda")
			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "a" }))
			})
		act(() => {
			const from = editor().state.doc.toString().indexOf("lognotedone")
			editor().dispatch({ changes: { from, to: from + "lognotedone".length, insert: "nil" } })
			key("z")
		})
		expect(runtime.revision).toBeGreaterThan(revision)
		expect(runtime.source).toBe(raw)
		expect(controller.content).toBe(raw)
		expect(controller.isDirty).toBe(false)
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		expect(note).toHaveValue("retained property note")
		expect(note).toHaveAttribute("readonly")
		note.setSelectionRange(0, note.value.length)
		const copy = createEvent.keyDown(note, { key: "c", ctrlKey: true })
		fireEvent(note, copy)
		expect(copy.defaultPrevented).toBe(false)
		expectProtectedDraft()
		expect(runtime.source).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole("button", { name: "Abort note" }))
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		expectReleasedDraft()
		expect(runtime.source).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
	})

	it("refreshes dirty incremental PROPERTY metadata for Agenda and saves against the original disk base", async () => {
		const raw =
			"#+TODO: NEXT | FINISHED\r\n#+PROPERTY: LOGGING nil\r\n* NEXT task\r\nDEADLINE: <2026-07-01 Wed>\r\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: raw, relativePath: "a.org", revision: "a-1" }),
		)
		await setup()
		act(() => {
			const from = editor().state.doc.toString().indexOf("nil")
			editor().dispatch({ changes: { from, to: from + 3, insert: "lognotedone" } })
		})
		const dirty = raw.replace("nil", "lognotedone")
		expect(controller.content).toBe(dirty)
		expect(controller.activeBufferRuntime!.source).toBe(dirty)
		expect(controller.isDirty).toBe(true)
		expect(controller.activeDocument?.revision).toBe("a-1")
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Agenda" }))
		})
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /Cycle TODO/ }))
		})
		const note = screen.getByRole("textbox", { name: "TODO note" })
		expect(controller.content).toBe(dirty)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		fireEvent.change(note, { target: { value: "fresh property policy" } })
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		const completed = controller.content
		expect(completed).toContain("* FINISHED task\r\n")
		expect(completed).toContain("fresh property policy")
		expect(completed).toContain("#+PROPERTY: LOGGING lognotedone\r\n")
		expect(controller.activeBufferRuntime!.source).toBe(completed)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ relativePath: "a.org", revision: "a-2" }),
		)
		await act(async () => {
			await controller.saveAllDocuments()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledOnce()
		expect(saveOrgDocumentFlow).toHaveBeenCalledWith(
			expect.objectContaining({ content: completed, expectedRevision: "a-1" }),
		)
		expect(controller.isDirty).toBe(false)
	})

	it.each([
		"Editor",
		"Agenda",
	])("visibly rejects a malformed applicable parent LOGGING without canonical mutation (%s)", async (origin) => {
		const raw =
			"#+TODO: NEXT | FINISHED\n* Parent\n:PROPERTIES:\n:LOGGING: definitely-not-a-policy\n:END:\n** NEXT child\nDEADLINE: <2026-07-01 Wed>\nbody\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: raw, relativePath: "a.org", revision: "a-1" }),
		)
		await setup()
		if (origin === "Agenda") {
			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Agenda" }))
			})
			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: /Cycle TODO/ }))
			})
		} else
			act(() => {
				editor().dispatch({ selection: { anchor: raw.indexOf("** NEXT") } })
				key("c")
				key("t")
			})
		expect(
			screen
				.getAllByRole("status")
				.some((node) => node.textContent?.includes("Cannot change TODO state")),
		).toBe(true)
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		expect(controller.content).toBe(raw)
		expect(controller.activeBufferRuntime!.source).toBe(raw)
		if (origin === "Editor") expect(editor().state.sliceDoc()).toBe(raw)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		expect(controller.isDirty).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("routes prefix TODO to one canonical batch and restores exact raw bytes with Root undo", async () => {
		await setup()
		act(() => {
			key("c")
			key("t")
		})
		const stamp = "[2026-07-01 Wed 00:01]"
		const expected = source
			.replace("* NEXT café 😀\r\n", `* FINISHED café 😀\r\nCLOSED: ${stamp}\r\n`)
			.replace(
				":END:\r\n",
				`:END:\r\n:LOGBOOK:\r\n- State "FINISHED"    from "NEXT" ${stamp}\r\n:END:\r\n`,
			)
		expect(controller.content).toBe(expected)
		expect(controller.activeBufferRuntime!.source).toBe(expected)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(undoDepth(editor().state)).toBe(0)
		expect(controller.activeDocument?.revision).toBe("a-1")
		expect(editor().contentDOM).toHaveFocus()
		act(() => {
			key("z")
		})
		expect(controller.content).toBe(source)
		expect(controller.activeBufferRuntime!.source).toBe(source)
		expect(redoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(controller.isDirty).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("suppresses source TODO while the Root command overlay owns focus", async () => {
		await setup()
		act(() => {
			key("p")
		})
		const input = screen.getByRole("combobox")
		expect(input).toHaveFocus()
		act(() => {
			fireEvent.keyDown(input, { key: "c", ctrlKey: true })
			fireEvent.keyDown(input, { key: "t", ctrlKey: true })
		})
		expect(controller.content).toBe(source)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		act(() => {
			fireEvent.keyDown(input, { key: "Escape" })
		})
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(editor().contentDOM).toHaveFocus()
	})
})
