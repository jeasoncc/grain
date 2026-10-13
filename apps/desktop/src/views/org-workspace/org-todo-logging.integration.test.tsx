import { undoDepth, redoDepth } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { act, cleanup, createEvent, fireEvent, screen, within } from "@testing-library/react"
import { render } from "@/test/application-providers"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	scanOrgWorkspaceFlow,
	saveOrgDocumentFlow,
} from "@/flows/org-workspace/org-workspace.flow"
import { loadOrgAgendaFlow } from "@/flows/org-workspace/org-agenda.flow"
import type * as agendaFlows from "@/flows/org-workspace/org-agenda.flow"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import * as orgClock from "@/utils/org-date-clock"
import {
	orgFileRepository,
	watchOrgWorkspace,
	unwatchOrgWorkspace,
	releaseOrgWorkspace,
} from "@/io/file/org-file.repository"
import { OrgWorkspaceContainer } from "./org-workspace.container.fn"
import { OrgWorkspaceProvider } from "@/views/application/org-workspace-provider"

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
	useNavigate: () => nativeWindow.navigate,
	Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
// Keep the production close adapter and hook; replace only the native window.
const nativeWindow = vi.hoisted(() => ({
	onCloseRequested: vi.fn(),
	destroy: vi.fn(),
	navigate: vi.fn(),
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
vi.mock("@/flows/org-workspace/org-agenda.flow", () => ({ loadOrgAgendaFlow: vi.fn() }))
const { loadOrgAgendaFlow: productionLoadAgenda } =
	await vi.importActual<typeof agendaFlows>("@/flows/org-workspace/org-agenda.flow")
const source =
	"#+STARTUP: logdone logdrawer\r\n#+TODO: NEXT | FINISHED(!)\r\n* NEXT café 😀\r\n:PROPERTIES:\r\n:ID: untouched\r\n:END:\r\nbody\r\n"
const workspace = {
	rootPath: "/notes",
	capabilityToken: "G1",
	directories: [],
	documents: [{ relativePath: "a.org", revision: "a-1" }],
}
const editor = () => EditorView.findFromDOM(screen.getByRole("textbox", { name: "Editing a.org" }))!
const key = (key: string, ctrlKey = true) => {
	const result = fireEvent.keyDown(editor().contentDOM, { key, ctrlKey })
	fireEvent.keyUp(window, { key, ctrlKey })
	return result
}
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
		(grant, _repository, _cache, overlays, metadata, signal) =>
			productionLoadAgenda(grant, undefined, new Map(), overlays, metadata, signal),
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
	render(<OrgWorkspaceProvider><OrgWorkspaceContainer /></OrgWorkspaceProvider>)
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
	return screen.getByRole("textbox", { name: /TODO.*note/ })
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
	return screen.getByRole("textbox", { name: /TODO.*note/ }) as HTMLTextAreaElement
}

async function expectProtectedDraft() {
	const focusBefore = document.activeElement
	const preventDefault = vi.fn()
	act(() => requestNativeClose({ preventDefault }))
	expect(preventDefault).toHaveBeenCalledOnce()
	expect(screen.getByRole("dialog")).toBeInTheDocument()
	expect(nativeWindow.destroy).not.toHaveBeenCalled()
	await act(async () => {
		fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep editing" }))
	})
	await act(async () => { await vi.advanceTimersByTimeAsync(1) })
	expect(nativeWindow.destroy).not.toHaveBeenCalled()
	if (focusBefore instanceof HTMLElement && focusBefore !== document.body)
		expect(focusBefore).toHaveFocus()
}

async function confirmNoteDisposal() {
	const dialog = screen.getByRole("dialog")
	await act(async () => {
		fireEvent.click(within(dialog).getByRole("button", { name: "Close tool" }))
		await vi.advanceTimersByTimeAsync(0)
	})
}

function expectReleasedDraft() {
	const preventDefault = vi.fn()
	act(() => requestNativeClose({ preventDefault }))
	expect(preventDefault).not.toHaveBeenCalled()
}

describe("production Root TODO logging", () => {
	it.each([
		["Schedule", "invalid Date"],
		["Deadline", "invalid Date"],
		["Schedule", "throw"],
		["Deadline", "throw"],
	] as const)("document pane %s clock preparation rejects %s without editing or native reads", async (command, failure) => {
		await setup()
		const runtime = controller.activeBufferRuntime!
		vi.mocked(orgFileRepository.readDocument).mockClear()
		vi.spyOn(orgClock, "systemOrgNow").mockImplementation(() => {
			if (failure === "throw") throw new Error("Clock unavailable")
			return new Date(Number.NaN)
		})
		act(() => {
			key("c")
			key(command === "Schedule" ? "s" : "d")
		})
		expect(screen.getByRole("alert")).toBeVisible()
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(controller.content).toBe(source)
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(redoDepth(runtime.state)).toBe(0)
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it.each(
		(["Editor", "Agenda"] as const).flatMap((origin) =>
			(["scheduled", "deadline", "closed"] as const).flatMap((field) =>
				(["Schedule", "Deadline", "TODO"] as const).map((command) => ({ origin, field, command })),
			),
		),
	)("fails closed for $field through actual $origin $command without mutation or an input session", async ({
		origin,
		field,
		command,
	}) => {
		const stamp = field === "closed" ? "[2026-07-01 Wed]" : "<2026-07-01 Wed>"
		const raw = `#+STARTUP: logdone\r\n#+TODO: NEXT | FINISHED(@)\r\n* NEXT café 😀\r\n${field}: ${stamp} SCHEDULED: <2026-07-01 Wed>\r\nbody\r\n`
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: raw, relativePath: "a.org", revision: "a-1" }),
		)
		await setup()
		const runtime = controller.activeBufferRuntime!
		vi.mocked(orgFileRepository.readDocument).mockClear()
		if (origin === "Agenda")
			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Agenda" }))
			})
		for (let attempt = 0; attempt < 2; attempt++) {
			if (origin === "Agenda")
				await act(async () => {
					fireEvent.click(
						screen.getAllByRole("button", {
							name: command === "TODO" ? /Cycle TODO/ : new RegExp(`${command} for`),
						})[0],
					)
				})
			else
				act(() => {
					key("c")
					key(command === "TODO" ? "t" : command === "Schedule" ? "s" : "d")
				})
			expect(screen.queryByRole("combobox")).toBeNull()
			expect(screen.queryByRole("textbox", { name: /TODO.*note/ })).toBeNull()
			expect(controller.content).toBe(raw)
		}
		expect(runtime.source).toBe(raw)
		expect(controller.activeDocument?.revision).toBe("a-1")
		expect(controller.isDirty).toBe(false)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(redoDepth(runtime.state)).toBe(0)
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		if (origin === "Editor") expect(editor().state.sliceDoc()).toBe(raw)
	})

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
		expect(runtime.source).toBe(noteSource)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(controller.openBuffers.every((buffer) => !buffer.isDirty)).toBe(true)
		await expectProtectedDraft()
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
			await confirmNoteDisposal()
			act(() => {
				editor().focus()
				key("c")
				key("t")
			})
			fireEvent.change(screen.getByRole("textbox", { name: /TODO.*note/ }), {
				target: { value: "retained late-conflict note" },
			})
		} else expect(input).not.toHaveAttribute("readonly")
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		expect(screen.queryByRole("textbox", { name: /TODO.*note/ })).toBeNull()
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
		const input = screen.getByRole("textbox", { name: /TODO.*note/ })
		fireEvent.change(input, { target: { value: "pause-only scratch" } })
		const runtime = controller.activeBufferRuntime!
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
		expect(runtime.source).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
		await expectProtectedDraft()
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
		await confirmNoteDisposal()
		act(() => {
			editor().focus()
			key("c")
			key("t")
		})
		fireEvent.change(screen.getByRole("textbox", { name: /TODO.*note/ }), {
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
		await expectProtectedDraft()
		// Even a duplicate source command delivered to the inert editor cannot replace the draft.
		act(() => {
			key("c")
			key("t")
		})
		expect(screen.getByRole("textbox", { name: /TODO.*note/ })).toBe(input)
		expect(input).toHaveValue("first café 😀\nsecond literal line")
		await act(async () => {
			fireEvent.keyDown(input, { key: "s", ctrlKey: true })
		})
		expect(screen.queryByRole("textbox", { name: /TODO.*note/ })).toBeNull()
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
		const runtime = controller.activeBufferRuntime!
		const sourceGeneration = runtime.revision
		await expectProtectedDraft()
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: origin === "Editor" ? "Agenda" : "a.org" }))
		})
		expect(screen.getByRole("textbox", { name: /TODO.*note/ })).toBe(input)
		expect(input).toHaveValue("keep café 😀\ncopy me")
		expect(input).toHaveAttribute("readonly")
		expect(within(screen.getByRole("group", { name: /TODO.*note/ })).getByRole("status")).toBeVisible()
		fireEvent.change(input, { target: { value: "must not replace retained draft" } })
		expect(input).toHaveValue("keep café 😀\ncopy me")
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		expect(screen.getByRole("textbox", { name: /TODO.*note/ })).toBe(input)
		expect(input).toHaveAttribute("readonly")
		expect(runtime.source).toBe(noteSource)
		expect(runtime.revision).toBe(sourceGeneration)
		expect(redoDepth(runtime.state)).toBe(0)
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
		await expectProtectedDraft()
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Abort note" }))
		})
		await confirmNoteDisposal()
		expect(screen.queryByRole("textbox", { name: /TODO.*note/ })).toBeNull()
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
			if (action === "Abort note") await confirmNoteDisposal()
			expect(external).toHaveFocus()
			expect(screen.queryByRole("textbox", { name: /TODO.*note/ })).toBeNull()
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
	it("retains an owned Agenda logging draft across row shortcuts and undoes the canonical batch", async () => {
		const input = await setupAgendaNote()
		fireEvent.change(input, { target: { value: "literal café 😀\nAgenda second line" } })
		await expectProtectedDraft()
		const row = screen.getByRole("button", { name: /^DeadlineNEXT/ })
		act(() => {
			fireEvent.keyDown(row, { key: "t" })
			fireEvent.keyDown(row, { key: "t", repeat: true })
		})
		expect(screen.getByRole("textbox", { name: /TODO.*note/ })).toBe(input)
		expect(input).toHaveValue("literal café 😀\nAgenda second line")
		expect(controller.content).toBe(noteSource)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		})
		expect(screen.queryByRole("textbox", { name: /TODO.*note/ })).toBeNull()
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
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Abort note" })) })
		await confirmNoteDisposal()
		expect(screen.queryByRole("textbox", { name: /TODO.*note/ })).toBeNull()
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
				if ("repeat" in guard) {
					const down = createEvent.keyDown(editor().contentDOM, {
						key: prefix ? "t" : "T", code: "KeyT", keyCode: 84,
						ctrlKey: prefix, altKey: !prefix, shiftKey: !prefix,
					})
					down.preventDefault()
					fireEvent(editor().contentDOM, down)
				}
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
				fireEvent.keyUp(window, { key: prefix ? "t" : "T", code: "KeyT", keyCode: 84 })
				key("Escape", false)
			})
		}
		expect(controller.content).toBe(source)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		act(() => {
			if (prefix) {
				key("c")
				key("t")
			} else {
				fireEvent.keyDown(editor().contentDOM, {
					key: "T",
					code: "KeyT",
					keyCode: 84,
					altKey: true,
					shiftKey: true,
				})
				fireEvent.keyUp(window, { key: "T", code: "KeyT", keyCode: 84 })
			}
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
		fireEvent.change(screen.getByRole("textbox", { name: /TODO.*note/ }), {
			target: { value: "inherited Root note" },
		})
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Finish note" })) })
		expect(controller.content).toContain("** FINISHED child\r\nCLOSED: [2026-07-01 Wed 00:01]\r\n")
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
		expect(screen.queryByRole("textbox", { name: /TODO.*note/ })).toBeNull()
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
		const note = screen.getByRole("textbox", { name: /TODO.*note/ }) as HTMLTextAreaElement
		fireEvent.change(note, { target: { value: "retained property note" } })
		const runtime = controller.activeBufferRuntime!
		const revision = runtime.revision
		if (origin === "Agenda")
			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "a.org" }))
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
		await expectProtectedDraft()
		expect(runtime.source).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Abort note" })) })
		await confirmNoteDisposal()
		expect(screen.queryByRole("textbox", { name: /TODO.*note/ })).toBeNull()
		expectReleasedDraft()
		expect(runtime.source).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
	})

	it.each([
		["Schedule", "today", "SCHEDULED"],
		["Deadline", "+0d", "DEADLINE"],
	] as const)("Agenda %s relative acceptance updates canonical day, preserves suffix and disk CAS", async (action, alias, keyword) => {
		const raw = `#+TODO: NEXT | FINISHED\r\n* NEXT task\r\n${keyword}: <2026-07-01 Wed 09:30-10:30 +1w -2d>\r\nbody café 😀\r\n`
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: raw, relativePath: "a.org", revision: "a-1" }),
		)
		vi.setSystemTime(new Date(2026, 6, 1, 23, 59))
		await setup()
		const runtime = controller.activeBufferRuntime!
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Agenda" }))
		})
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: `${action} for task` }))
		})
		const input = screen.getByRole("combobox", { name: /^(Schedule|Deadline) \(/ })
		fireEvent.change(input, { target: { value: alias } })
		vi.setSystemTime(new Date(2026, 6, 2, 0, 1))
		await act(async () => {
			fireEvent.keyDown(input, { key: "Enter" })
		})
		const expected = raw.replace("2026-07-01 Wed", "2026-07-02")
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(controller.content).toBe(expected)
		expect(runtime.source).toBe(expected)
		expect(undoDepth(runtime.state)).toBe(1)
		expect(controller.openBuffers[0]).toMatchObject({ baseRevision: "a-1", isDirty: true })
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "a.org" }))
		})
		expect(editor().state.sliceDoc()).toBe(expected)
		act(() => key("z"))
		expect(runtime.source).toBe(raw)
		expect(controller.content).toBe(raw)
		expect(controller.isDirty).toBe(false)
		// Redo through the Root runtime, then persist against the original disk revision.
		act(() => {
			fireEvent.keyDown(editor().contentDOM, { key: "y", code: "KeyY", ctrlKey: true })
		})
		expect(runtime.source).toBe(expected)
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ relativePath: "a.org", revision: "a-2" }),
		)
		await act(async () => {
			await controller.saveAllDocuments()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ content: expected, expectedRevision: "a-1" }),
		)
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
		const note = screen.getByRole("textbox", { name: /TODO.*note/ })
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
