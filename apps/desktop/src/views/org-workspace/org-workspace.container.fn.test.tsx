import { redoDepth, undoDepth } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { orgRemarkEditorOffset } from "@/flows/org-editor-runtime/org-remark-tracker"
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react"
import { useBlocker } from "@tanstack/react-router"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { StrictMode } from "react"
import { render } from "@/test/application-providers"
import { OrgWorkspaceProvider } from "@/views/application/org-workspace-provider"
import { useApplicationCommandHost, type ApplicationCommandHost, type ApplicationCommandResult } from "@/views/application/application-command-provider"
import { useApplicationTools } from "@/views/application/application-tool-provider"
import type { ApplicationToolRegistry } from "@/flows/application/application-tool-registry"
import { clearOrgDerivedIndexFlow } from "@/flows/org-workspace/org-derived-index.flow"
import {
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	saveOrgDocumentFlow,
	scanOrgWorkspaceFlow,
} from "@/flows/org-workspace/org-workspace.flow"
import { captureOrgEntryFlow, readOrgCaptureTargetFlow } from "@/flows/org-workspace/org-capture-entry.flow"
import type { OrgCaptureEntryFlowError, OrgCaptureEntryResult } from "@/types/editor/org-capture.interface"
import { loadOrgAgendaFlow } from "@/flows/org-workspace/org-agenda.flow"
import { resolveOrgLinkTargetFlow } from "@/flows/org-workspace/org-link-target.flow"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { orgCaptureDocumentHeader } from "@/pipes/org/org-capture.pipe"
import { parseOrgRemarkNotes } from "@/pipes/org/org-remark.pipe"
import {
	orgFileRepository,
	releaseOrgWorkspace,
	unwatchOrgWorkspace,
	watchOrgWorkspace,
} from "@/io/file/org-file.repository"
import { registerOrgWindowClose } from "@/io/event/org-window-close.adapter"
import { requestOrgDiaryCreation } from "@/io/event"
import type {
	OrgDocumentInterface,
	OrgDocumentWriteResultInterface,
	OrgFileError,
	OrgWorkspaceInterface,
} from "@/types/org"
import { OrgWorkspaceContainer } from "./org-workspace.container.fn"
import { useSettings } from "@/hooks"
import { previewOrgCaptureTarget, planOrgCapturePlacement } from "@/pipes/org/org-capture-target.pipe"
import { createOrgNativeWorkflowTarget } from "@/flows/org-native-window/org-native-workflow-target"
import { dispatchOrgNativeWorkflow, type OrgNativeWorkflowRequest } from "@/flows/org-native-window/org-native-workflow-bridge"
import { orgSparseTreeField } from "../org-editor/org-sparse-tree.extension"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { parseOrgPlanningLine } from "@/pipes/org/org-planning-line.pipe"
const rangeRects = Object.getOwnPropertyDescriptor(Range.prototype, "getClientRects")
const rangeBounds = Object.getOwnPropertyDescriptor(Range.prototype, "getBoundingClientRect")

// Observe, but never substitute, the production controller used by the production root.
let controller: OrgWorkspaceController
let applicationHost: ApplicationCommandHost
let applicationToolRegistry: ApplicationToolRegistry
function ObserveApplication() {
	applicationHost = useApplicationCommandHost()
	applicationToolRegistry = useApplicationTools().registry
	return null
}
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
// Only filesystem/host boundaries are replaced: hook, pane, editor and CM history are real.
vi.mock("@tanstack/react-router", () => ({
	useBlocker: vi.fn(),
	useNavigate: () => async () => undefined,
	Link: ({ children, ref }: { children: React.ReactNode; ref?: React.Ref<HTMLAnchorElement> }) => <a ref={ref}>{children}</a>,
}))
vi.mock("@/io/event/org-window-close.adapter", () => ({
	registerOrgWindowClose: vi.fn(() => () => undefined),
}))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({
	orgWorkspaceEventAdapter: { listen: async () => () => undefined },
}))
vi.mock("@/io/file/org-file.repository", () => ({
	orgFileRepository: { createDirectory: vi.fn(), readDocument: vi.fn(), writeDocument: vi.fn(), scanWorkspace: vi.fn() },
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
vi.mock("@/flows/org-workspace/org-capture-entry.flow", () => ({ captureOrgEntryFlow: vi.fn(), readOrgCaptureTargetFlow: vi.fn() }))
vi.mock("@/flows/org-workspace/org-link-target.flow", () => ({ resolveOrgLinkTargetFlow: vi.fn() }))
vi.mock("@/flows/org-workspace/org-agenda.flow", () => ({ loadOrgAgendaFlow: vi.fn() }))

const rawA = "* A :raw:\r\n#+begin_export html\r\n<b>untouched</b>\r\n#+end_export\r\n"
const rawB = "* B\nindependent\n"
let disk: Map<string, OrgDocumentInterface>
let workspace: OrgWorkspaceInterface
// Live file history belongs to the canonical runtime, never its CM projection.
function expectHistory(undoCount: number, redoCount = 0) {
	expect(controller.activeBufferRuntime).not.toBeNull()
	expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(undoCount)
	expect(redoDepth(controller.activeBufferRuntime!.state)).toBe(redoCount)
	expect(undoDepth(editor().state)).toBe(0)
	expect(redoDepth(editor().state)).toBe(0)
}
function pressKey(target: Element, input: KeyboardEventInit) {
	const accepted = fireEvent.keyDown(target, input)
	// A prompt may detach its input during keydown; the native window still gets keyup.
	fireEvent.keyUp(window, input)
	return accepted
}
function routeUndo() {
	const runtime = controller.activeBufferRuntime!
	const beforeUndo = undoDepth(runtime.state)
	const beforeRedo = redoDepth(runtime.state)
	act(() => {
		pressKey(editor().contentDOM, { key: "z", code: "KeyZ", ctrlKey: true })
	})
	expectHistory(Math.max(0, beforeUndo - 1), beforeRedo + (beforeUndo > 0 ? 1 : 0))
}
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
let queryClient: QueryClient
function renderWorkspace(strict = false) {
	const view = <QueryClientProvider client={queryClient}>
		<OrgWorkspaceProvider><ObserveApplication /><OrgWorkspaceContainer /></OrgWorkspaceProvider>
	</QueryClientProvider>
	return render(strict ? <StrictMode>{view}</StrictMode> : view)
}
async function setup(path = "a.org") {
	renderWorkspace()
	await act(async () => {
		await controller.openDefaultWorkspace()
	})
	await act(async () => {
		expect(await controller.openDocumentPath(path)).toBe(true)
	})
}
async function acceptParameter(input: HTMLElement, observe: () => void) {
	await act(async () => { pressKey(input, { key: "Enter" }) })
	await vi.waitFor(observe, { interval: 1 })
}
async function capture(palette = false) {
	if (palette) {
		await executeWorkspaceCommand("Capture")
	} else fireEvent.click(screen.getByRole("button", { name: "Quick capture" }))
	const chooser = screen.getByRole("combobox", { name: "Capture template:" })
	expect(document.querySelector("[data-org-capture-template-minibuffer]")).not.toBeNull()
	fireEvent.change(chooser, { target: { value: "TODO" } })
	await acceptParameter(chooser, () => {
		expect(screen.getByRole("region", { name: "Org capture tool buffer" })).toBeInTheDocument()
		expect(scratch().contentDOM).toHaveFocus()
	})
	expect(scratch().state.selection.main.head).toBe(7)
}
async function executeWorkspaceCommand(label: string) {
	act(() => editor().focus())
	pressKey(editor().contentDOM, { key: "x", code: "KeyX", altKey: true })
	const input = screen.getByRole("combobox", { name: "Execute command:" })
	fireEvent.change(input, { target: { value: label } })
	await acceptParameter(input, () => {
		expect(screen.queryByRole("combobox", { name: "Execute command:" })).not.toBeInTheDocument()
	})
}
function deferredCapture() {
	const { promise, resolve } = Promise.withResolvers<E.Either<OrgCaptureEntryFlowError, OrgCaptureEntryResult>>()
	vi.mocked(captureOrgEntryFlow).mockReturnValueOnce(() => promise)
	return resolve
}
function tool(id: string) {
	const owned = applicationToolRegistry.getSnapshot().find((entry) => entry.lease.id === id)
	if (!owned) throw new Error(`Missing real application tool: ${id}`)
	return owned
}
beforeEach(() => {
	Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] })
	Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => new DOMRect() })
	vi.useFakeTimers()
	vi.resetAllMocks()
	queryClient = new QueryClient()

	window.localStorage.clear()
	useSettings.setState({ orgCaptureConfigurationJson: "", applicationPopupConfigurationJson: "", orgKeymapConfigurationJson: "" })
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
	])
	workspace = {
		rootPath: "/notes",
		capabilityToken: "G1",
		directories: [],
		documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
	}
	vi.mocked(openDefaultOrgWorkspaceFlow).mockImplementation(() => async () => E.right(workspace))
	vi.mocked(scanOrgWorkspaceFlow).mockImplementation(() => async () => E.right(workspace))
	vi.mocked(loadOrgAgendaFlow).mockReturnValue(async () => E.right([]))
	vi.mocked(openOrgDocumentFlow).mockImplementation(
		(input) => async () => E.right({ ...disk.get(input.relativePath)! }),
	)
	vi.mocked(saveOrgDocumentFlow).mockImplementation((input) => async () => {
		const previous = disk.get(input.relativePath)
		if ((previous?.revision ?? "<missing>") !== input.expectedRevision)
			return E.left({
				type: "ORG_FILE_ERROR",
				operation: "write",
				command: "write_org_document",
				message: "The disk revision changed before writing.",
				cause: { kind: "revision-conflict", relativePath: input.relativePath, noWrite: true },
			})
		const saved = {
			relativePath: input.relativePath,
			content: input.content,
			revision: `${input.relativePath}-saved-${vi.mocked(saveOrgDocumentFlow).mock.calls.length}`,
		}
		disk.set(input.relativePath, saved)
		return E.right({ relativePath: saved.relativePath, revision: saved.revision })
	})
	vi.mocked(readOrgCaptureTargetFlow).mockImplementation((input, options) => async () => {
		const previous = disk.get(input.target.relativePath)
		const source = previous ? E.right(previous.content) : orgCaptureDocumentHeader(input.target.relativePath)
		const preview = E.isLeft(source) ? source : previewOrgCaptureTarget(source.right, input.target)
		if (!options.isCurrent() || E.isLeft(preview)) return E.left({
			type: "ORG_CAPTURE_REJECTED_ERROR", phase: "preparation", noWrite: true,
			cause: null, message: E.isLeft(preview) ? preview.left.message : "Capture preview retired.",
		})
		return E.right({ target: input.target, expectedRevision: previous?.revision ?? "<missing>", preview: preview.right })
	})
	vi.mocked(captureOrgEntryFlow).mockImplementation((input, options) => async () => {
		const previous = disk.get(input.target.relativePath)
		const source = previous ? E.right(previous.content) : orgCaptureDocumentHeader(input.target.relativePath)
		const prepared = E.isLeft(source) ? source : planOrgCapturePlacement(source.right, input)
		if (!options.isCurrent() || E.isLeft(prepared) ||
			(input.expectedRevision !== undefined && input.expectedRevision !== (previous?.revision ?? "<missing>")))
			return E.left({
				type: "ORG_CAPTURE_REJECTED_ERROR", phase: "preparation", noWrite: true,
				cause: null, message: E.isLeft(prepared) ? prepared.left.message : "Capture target changed.",
			})
		const confirmed = {
			relativePath: input.target.relativePath,
			content: prepared.right.content,
			revision: "capture-confirmed",
		}
		disk.set(input.target.relativePath, confirmed)
		return E.right(confirmed)
	})
	vi.mocked(watchOrgWorkspace).mockReturnValue(async () => E.right("watch-G1"))
	vi.mocked(unwatchOrgWorkspace).mockReturnValue(async () => E.right(undefined))
	vi.mocked(releaseOrgWorkspace).mockReturnValue(async () => E.right(undefined))
	vi.mocked(orgFileRepository.createDirectory).mockReturnValue(async () => E.right(undefined))
	vi.mocked(orgFileRepository.readDocument).mockImplementation((input) => async () => {
		const document = disk.get(input.relativePath)
		return document ? E.right({ ...document }) : E.left({
			type: "ORG_FILE_ERROR", operation: "read", command: "read_org_document",
			message: "The fixture document is missing.", cause: null,
		})
	})
	vi.mocked(orgFileRepository.writeDocument).mockImplementation((input) => async () => {
		if (disk.has(input.relativePath)) return E.left({
			type: "ORG_FILE_ERROR", operation: "write", command: "write_org_document",
			message: "occupied", cause: { kind: "creation-collision", relativePath: input.relativePath, noWrite: true },
		})
		const document = { relativePath: input.relativePath, revision: `diary-${disk.size}`, content: input.content }
		disk.set(input.relativePath, document)
		return E.right({ relativePath: document.relativePath, revision: document.revision })
	})
})
afterEach(() => {
	cleanup()
	queryClient.clear()
	for (const [key, descriptor] of [["getClientRects", rangeRects], ["getBoundingClientRect", rangeBounds]] as const) {
		if (descriptor) Object.defineProperty(Range.prototype, key, descriptor)
		else Reflect.deleteProperty(Range.prototype, key)
	}
	vi.useRealTimers()
	vi.restoreAllMocks()
})
describe("workspace preference restoration", () => {
	it.each([false, true])("restores the selected document before admitting its inspector (StrictMode: %s)", async (strict) => {
		const saved = JSON.stringify({ activePath: "a.org", inspectorVisible: true, openPaths: ["a.org"], sidebarVisible: false })
		window.localStorage.setItem("grain:org-session:/notes", saved)
		const read = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentInterface>>()
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => read.promise)
		renderWorkspace(strict)
		await act(async () => { await controller.openDefaultWorkspace() })
		expect(openOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(controller.activeDocument).toBeNull()
		expect(screen.queryByRole("complementary", { name: "Note inspector" })).not.toBeInTheDocument()
		expect(window.localStorage.getItem("grain:org-session:/notes")).toBe(saved)
		await act(async () => { read.resolve(E.right(disk.get("a.org")!)); await read.promise })
		expect(controller.content).toBe(rawA)
		expect(screen.getByRole("complementary", { name: "Note inspector" })).toBeInTheDocument()
		expect(screen.queryByRole("complementary", { name: "Workspace files" })).not.toBeInTheDocument()
		expect(JSON.parse(window.localStorage.getItem("grain:org-session:/notes")!)).toMatchObject({
			activePath: "a.org", inspectorVisible: true, sidebarVisible: false,
		})
	})

	it.each(["read-failure", "missing-document"] as const)("retains saved choices after %s without retrying or persisting the empty state", async (failure) => {
		const path = failure === "missing-document" ? "missing.org" : "a.org"
		const saved = JSON.stringify({ activePath: path, inspectorVisible: true, openPaths: [path], sidebarVisible: false })
		window.localStorage.setItem("grain:org-session:/notes", saved)
		if (failure === "read-failure") vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () => E.left({
			type: "ORG_FILE_ERROR", operation: "read", command: "read_org_document",
			message: "The saved document could not be read.", cause: null,
		}))
		renderWorkspace()
		await act(async () => { await controller.openDefaultWorkspace() })
		expect(controller.activeDocument).toBeNull()
		expect(controller.error).toBeTruthy()
		expect(window.localStorage.getItem("grain:org-session:/notes")).toBe(saved)
		await act(async () => { await controller.openDocumentPath("b.org") })
		expect(controller.activeDocument?.relativePath).toBe("b.org")
		expect(window.localStorage.getItem("grain:org-session:/notes")).toBe(saved)
		expect(vi.mocked(openOrgDocumentFlow).mock.calls.filter(([input]) => input.relativePath === path)).toHaveLength(failure === "read-failure" ? 1 : 0)
	})

	it("cancels a restore on same-root grant replacement and never applies its document or inspector to the new session", async () => {
		const saved = JSON.stringify({ activePath: "a.org", inspectorVisible: true, openPaths: ["a.org"], sidebarVisible: true })
		window.localStorage.setItem("grain:org-session:/notes", saved)
		const retired = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentInterface>>()
		const current = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentInterface>>()
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => retired.promise).mockReturnValueOnce(() => current.promise)
		renderWorkspace()
		await act(async () => { await controller.openDefaultWorkspace() })
		const previousSession = controller.workspaceSessionId
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(async () => E.right({ ...workspace, capabilityToken: "G2" }))
		await act(async () => { await controller.openDefaultWorkspace() })
		expect(controller.workspaceSessionId).not.toBe(previousSession)
		await act(async () => { retired.resolve(E.right(disk.get("a.org")!)); await retired.promise })
		expect(controller.activeDocument).toBeNull()
		expect(screen.queryByRole("complementary", { name: "Note inspector" })).not.toBeInTheDocument()
		expect(window.localStorage.getItem("grain:org-session:/notes")).toBe(saved)
		await act(async () => { current.resolve(E.right({ ...disk.get("a.org")!, content: "* New grant\n" })); await current.promise })
		expect(controller.content).toBe("* New grant\n")
		expect(screen.getByRole("complementary", { name: "Note inspector" })).toBeInTheDocument()
		expect(controller.activeBufferRuntime?.key.workspaceSessionId).toBe(controller.workspaceSessionId)
	})
})

describe("real application discard decisions", () => {
	it("allows departure with dirty canonical Source while retaining its exact runtime and history", async () => {
		await setup()
		act(() => editor().dispatch({ changes: { from: editor().state.doc.length, insert: "unsaved source" }, userEvent: "input.type" }))
		const runtime = controller.activeBufferRuntime!
		const source = runtime.source
		const blocker = vi.mocked(useBlocker).mock.lastCall![0] as unknown as { shouldBlockFn: () => Promise<boolean> }
		await act(async () => { expect(await blocker.shouldBlockFn()).toBe(false) })
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		expect(controller.activeBufferRuntime).toBe(runtime)
		expect(runtime.source).toBe(source)
		expectHistory(1)
		expect(disk.get("a.org")?.content).toBe(rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it.each(["cancel", "accept", "draft-edit", "source-edit"] as const)("router departure binds dirty tool permission through %s without discarding Source", async (decision) => {
		await setup()
		act(() => editor().dispatch({ changes: { from: editor().state.doc.length, insert: "unsaved source" }, userEvent: "input.type" }))
		const runtime = controller.activeBufferRuntime!
		const source = runtime.source
		await capture()
		replaceDraft("* TODO unsaved draft")
		const draftView = scratch()
		const blocker = vi.mocked(useBlocker).mock.lastCall![0] as unknown as { shouldBlockFn: () => Promise<boolean> }
		let leaving!: Promise<boolean>
		act(() => { leaving = blocker.shouldBlockFn() })
		const dialog = screen.getByRole("dialog")
		if (decision === "draft-edit") act(() => draftView.dispatch({ changes: { from: 0, to: draftView.state.doc.length, insert: "* TODO newer draft" } }))
		if (decision === "source-edit") act(() => controller.updateContent(source + "newer source"))
		await act(async () => {
			fireEvent.click(within(dialog).getByRole("button", { name: decision === "cancel" ? "Cancel" : "Discard" }))
			expect(await leaving).toBe(decision === "cancel" || decision === "draft-edit")
		})
		expect(controller.activeBufferRuntime).toBe(runtime)
		expect(runtime.source).toBe(decision === "source-edit" ? source + "newer source" : source)
		expect(scratch().state.sliceDoc()).toBe(decision === "draft-edit" ? "* TODO newer draft" : "* TODO unsaved draft")
		expect(disk.get("a.org")?.content).toBe(rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
	})

	it.each(["cancel", "accept", "edit", "grant"] as const)("derived index clearing binds the exact controller through %s", async (decision) => {
		await setup()
		vi.mocked(clearOrgDerivedIndexFlow).mockReturnValue(async () => E.right({
			agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0,
		}))
		const source = controller.content
		fireEvent.keyDown(screen.getByRole("button", { name: "Workspace tools" }), { key: "ArrowDown" })
		await act(async () => { await vi.advanceTimersByTimeAsync(0) })
		fireEvent.click(screen.getByRole("menuitem", { name: "Clear derived index" }))
		const dialog = screen.getByRole("dialog")
		const accept = within(dialog).getByRole("button", { name: "Clear" })
		expect(clearOrgDerivedIndexFlow).not.toHaveBeenCalled()
		if (decision === "edit") act(() => controller.updateContent("newer source"))
		if (decision === "grant") {
			vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(async () => E.right({ ...workspace, capabilityToken: "G2" }))
			await act(async () => { await controller.openDefaultWorkspace() })
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		}
		await act(async () => {
			fireEvent.click(decision === "cancel" ? within(dialog).getByRole("button", { name: "Cancel" }) : accept)
		})
		expect(clearOrgDerivedIndexFlow).toHaveBeenCalledTimes(decision === "accept" || decision === "edit" ? 1 : 0)
		if (decision !== "grant") expect(controller.content).toBe(decision === "edit" ? "newer source" : source)
		expect(disk.get("a.org")?.content).toBe(rawA)
	})
})

describe("document navigation surfaces", () => {
	it("distinguishes same-name notes and preserves dirty canonical history when switching from the open-note list", async () => {
		disk.set("notes/overview.org", { relativePath: "notes/overview.org", revision: "notes-1", content: rawA })
		disk.set("projects/overview.org", { relativePath: "projects/overview.org", revision: "projects-1", content: rawB })
		workspace = {
			...workspace,
			directories: ["notes", "projects"],
			documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
		}
		await setup("notes/overview.org")
		const runtime = controller.activeBufferRuntime
		act(() => editor().dispatch({ changes: { from: editor().state.doc.length, insert: "unsaved overview" }, userEvent: "input.type" }))
		await act(async () => { await controller.openDocumentPath("projects/overview.org") })
		const tabs = within(screen.getByRole("navigation", { name: "Open documents" }))
		expect(tabs.getByRole("button", { name: "overview notes" })).toBeInTheDocument()
		expect(tabs.getByRole("button", { name: "overview projects" })).toHaveAttribute("aria-current", "page")
		await act(async () => { fireEvent.keyDown(screen.getByRole("button", { name: "Open notes" }), { key: "ArrowDown" }) })
		const personal = screen.getByRole("menuitemradio", { name: "notes/overview.org" })
		expect(personal).toHaveAttribute("aria-checked", "false")
		await act(async () => { fireEvent.click(personal) })
		await vi.waitFor(() => expect(controller.activeDocument?.relativePath).toBe("notes/overview.org"), { interval: 1 })
		expect(controller.activeBufferRuntime).toBe(runtime)
		expect(controller.content).toBe(`${rawA}unsaved overview`)
		expectHistory(1)
		await vi.waitFor(() => expect(editor().contentDOM).toHaveFocus(), { interval: 1 })
		routeUndo()
		expect(controller.content).toBe(rawA)
		expect(disk.get("notes/overview.org")?.content).toBe(rawA)
		expect(disk.get("projects/overview.org")?.content).toBe(rawB)
	})

	it("focuses a restored note on its first editor mount from the open-note list", async () => {
		localStorage.setItem(`grain:org-session:${workspace.rootPath}`, JSON.stringify({
			activePath: "a.org",
			openPaths: ["a.org", "b.org"],
			inspectorVisible: false,
			sidebarVisible: true,
		}))
		await setup()
		await act(async () => { fireEvent.keyDown(screen.getByRole("button", { name: "Open notes" }), { key: "ArrowDown" }) })
		await act(async () => { fireEvent.click(screen.getByRole("menuitemradio", { name: "b.org" })) })
		await vi.waitFor(() => {
			expect(controller.activeDocument?.relativePath).toBe("b.org")
			expect(editor("Editing b.org").contentDOM).toHaveFocus()
		}, { interval: 1 })
		expect(controller.content).toBe(rawB)
	})
})

describe("production diary actions and editor placement", () => {
	it("collapses the real inspector allocation on main Agenda and configured docks while retaining the tool body and Source", async () => {
		// jsdom has no flex layout: supply native-like measured widths to the real
		// panel library, rather than replacing Panel or its imperative API.
		vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
			if (this.hasAttribute("data-panel")) {
				const grow = this.style.flexGrow
				if (grow && (grow !== "1" || this.id !== "org-main")) return 1400 * Number(grow) / 100
				return this.id === "org-main" ? 820 : Number.parseFloat(this.style.flexBasis) || 0
			}
			if (this.hasAttribute("data-separator")) return this.style.display === "none" ? 0 : 4
			return 0
		})
		await setup()
		const source = editor()
		const runtime = controller.activeBufferRuntime
		act(() => source.dispatch({ changes: { from: source.state.doc.length, insert: "unsaved" }, userEvent: "input.type" }))
		fireEvent.click(screen.getByRole("button", { name: "Show note inspector" }))
		const inspector = screen.getByRole("complementary", { name: "Note inspector" })
		const filter = within(inspector).getByRole("textbox", { name: "Filter outline as sparse tree" })
		const allocation = document.getElementById("org-inspector")!
		expect(allocation.offsetWidth).toBeGreaterThanOrEqual(240)
		const width = allocation.offsetWidth
		fireEvent.change(filter, { target: { value: "A" } })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Agenda" })) })
		expect(allocation.offsetWidth).toBe(0)
		await act(async () => { await applicationHost.execute("editor") })
		expect(allocation.offsetWidth).toBeCloseTo(width)
		expect(screen.getByRole("complementary", { name: "Note inspector" })).toBe(inspector)
		expect(filter).toHaveValue("A")
		for (const layout of ["side", "bottom"] as const) {
			act(() => useSettings.setState({ applicationPopupConfigurationJson: JSON.stringify({ version: 1, rules: [{ id: "inspector", layout }] }) }))
			expect(allocation.offsetWidth).toBe(0)
			expect(screen.getByRole("complementary", { name: "Note inspector" })).toBe(inspector)
			expect(inspector.closest("[data-application-tool-dock]")).toHaveAttribute("data-application-tool-dock", layout)
		}
		act(() => useSettings.setState({ applicationPopupConfigurationJson: "" }))
		expect(allocation.offsetWidth).toBeCloseTo(width)
		expect(editor()).toBe(source)
		expect(controller.activeBufferRuntime).toBe(runtime)
		expectHistory(1)
	})
	it("keeps dirty canonical Source visible beside non-main Agenda and preserves both projections while moving the tool", async () => {
		await setup()
		const sourceView = editor()
		act(() => sourceView.dispatch({ changes: { from: sourceView.state.doc.length, insert: "unsaved exact source" }, userEvent: "input.type" }))
		const runtime = controller.activeBufferRuntime!
		const source = runtime.source
		const selection = sourceView.state.selection.toJSON()
		act(() => useSettings.setState({ applicationPopupConfigurationJson: JSON.stringify({ version: 1, rules: [{ id: "agenda", layout: "side" }] }) }))
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "Agenda" })))
		const agenda = screen.getByRole("main", { name: "Org agenda" })
		const toolWindow = agenda.closest("[data-application-tool]")!.getAttribute("data-application-tool-window")
		for (const layout of ["side", "popup", "bottom"]) {
			act(() => useSettings.setState({ applicationPopupConfigurationJson: JSON.stringify({ version: 1, rules: [{ id: "agenda", layout }] }) }))
			expect(editor()).toBe(sourceView)
			expect(sourceView.dom.closest("[hidden]")).toBeNull()
			expect(screen.getByRole("main", { name: "Org agenda" })).toBe(agenda)
			expect(agenda.closest("[data-application-tool-dock]")?.getAttribute("data-application-tool-dock")).toBe(layout)
			expect(agenda.closest("[data-application-tool]")!.getAttribute("data-application-tool-window")).toBe(toolWindow)
			expect(runtime.source).toBe(source)
			expect(sourceView.state.selection.toJSON()).toEqual(selection)
		}
		act(() => useSettings.setState({ applicationPopupConfigurationJson: JSON.stringify({ version: 1, rules: [{ id: "agenda", layout: "main" }] }) }))
		expect(sourceView.dom.closest("[hidden]")).not.toBeNull()
		expect(agenda.closest("[data-application-tool-dock]")).toBeNull()
		act(() => useSettings.setState({ applicationPopupConfigurationJson: JSON.stringify({ version: 1, rules: [{ id: "agenda", layout: "side" }] }) }))
		act(() => sourceView.focus())
		routeUndo()
		expect(controller.content).toBe(rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("ribbon, execute-command and native diary event create distinct same-second entries at EOF", async () => {
		const instant = new Date(2026, 9, 6, 12, 34, 56, 987)
		vi.setSystemTime(instant)
		const stem = `ا-diary/year-2026-Horse/month-10-October/day-06-Tuesday/diary-${Math.floor(instant.getTime() / 1000)}-12-34-56`
		await setup()
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "New diary entry" })) })
		expect(controller.activeDocument?.relativePath).toBe(`${stem}.org`)
		expect(editor().state.selection.main.head).toBe(controller.content.length)
		expect(editor().contentDOM).toHaveFocus()
		await executeWorkspaceCommand("New diary entry")
		await vi.waitFor(() => { expect(controller.activeDocument?.relativePath).toBe(`${stem}-2.org`) }, { interval: 1 })
		expect(editor().state.selection.main.head).toBe(controller.content.length)
		await act(async () => { requestOrgDiaryCreation() })
		expect(controller.activeDocument?.relativePath).toBe(`${stem}-3.org`)
		expect(editor().state.selection.main.head).toBe(controller.content.length)
		expect(editor().contentDOM).toHaveFocus()
		const entries = [disk.get(`${stem}.org`)!, disk.get(`${stem}-2.org`)!, disk.get(`${stem}-3.org`)!]
		expect(new Set(entries.map((entry) => entry.content.match(/^:ID:       (.+)$/m)?.[1])).size).toBe(3)
		for (const entry of entries) {
			expect(entry.content).toContain("#+TITLE: 日记 2026-10-06 12:34:56\n#+DATE: 2026-10-06\n#+TIME: 2026-10-06 12:34:56\n")
			expect(entry.content.endsWith("\n\n* 今日记录\n\n")).toBe(true)
		}
		expect(disk.get("a.org")?.content).toBe(rawA)
		expect(disk.get("b.org")?.content).toBe(rawB)
	})

	it("opens the diary in the focused secondary pane without changing either dirty source/history", async () => {
		await setup()
		const first = editor()
		act(() => first.dispatch({ changes: { from: first.state.doc.length, insert: "dirty a" }, userEvent: "input.type" }))
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		const secondaryNode = screen.getAllByRole("textbox", { name: "Editing a.org" })[1]
		const secondary = EditorView.findFromDOM(secondaryNode)!
		act(() => secondary.focus())
		await act(async () => { await controller.openDocumentPath("b.org") })
		const bView = editor()
		act(() => bView.dispatch({ changes: { from: bView.state.doc.length, insert: "dirty b" }, userEvent: "input.type" }))
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "New diary entry" })) })
		const panes = screen.getAllByRole("textbox", { name: /^Editing / })
		expect(panes[0]).toHaveAttribute("aria-label", "Editing a.org")
		expect(panes[1]).toHaveAttribute("aria-label", `Editing ${controller.activeDocument!.relativePath}`)
		expect(editor().contentDOM).toHaveFocus()
		expect(editor().state.selection.main.head).toBe(controller.content.length)
		expect(controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a.org")).toMatchObject({ isDirty: true, content: `${rawA}dirty a` })
		expect(controller.liveBuffers.find((buffer) => buffer.document.relativePath === "b.org")).toMatchObject({ isDirty: true, content: `${rawB}dirty b` })
		expect(disk.get("a.org")?.content).toBe(rawA)
		expect(disk.get("b.org")?.content).toBe(rawB)
		act(() => editor("Editing a.org").focus())
		routeUndo()
		expect(controller.content).toBe(rawA)
		act(() => fireEvent.keyDown(editor().contentDOM, { key: "y", code: "KeyY", ctrlKey: true }))
		expect(controller.content).toBe(`${rawA}dirty a`)
		await act(async () => { await controller.openDocumentPath("b.org") })
		routeUndo()
		expect(controller.content).toBe(rawB)
		act(() => fireEvent.keyDown(editor().contentDOM, { key: "y", code: "KeyY", ctrlKey: true }))
		expect(controller.content).toBe(`${rawB}dirty b`)
	})
})

describe("production root execute-command boundary", () => {
	async function surface(context: "editor" | "agenda" | "no-document") {
		if (context === "editor") {
			await setup()
			act(() => editor().focus())
			return editor().contentDOM
		}
		renderWorkspace()
		await act(async () => {
			await controller.openDefaultWorkspace()
		})
		if (context === "agenda") {
			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Agenda" }))
			})
			return screen.getByRole("main", { name: "Org agenda" })
		}
		return screen.getByRole("button", { name: "Execute command (Alt-x)" })
	}

	it.each([
		"editor",
		"agenda",
		"no-document",
	] as const)("opens shared Alt-x from %s and executes a mounted view command without file IO", async (context) => {
		const target = await surface(context)
		const source = controller.content
		const admission = vi.spyOn(applicationHost.registry, "execute")
		const event = new KeyboardEvent("keydown", {
			key: "x",
			code: "KeyX",
			altKey: true,
			bubbles: true,
			cancelable: true,
		})
		fireEvent(target, event)
		expect(event.defaultPrevented).toBe(true)
		const input = screen.getByRole("combobox", { name: "Execute command:" })
		expect(input).toHaveFocus()
		expect(applicationHost.isOpen).toBe(true)
		const command = applicationHost.registry.getSnapshot().commands.find((entry) => entry.id === "toggle-sidebar")!
		expect(command.getDisabledReason()).toBeNull()
		fireEvent.change(input, { target: { value: command.label } })
		await acceptParameter(input, () => {
			expect(screen.queryByRole("combobox", { name: "Execute command:" })).not.toBeInTheDocument()
			expect(applicationHost.registry.getSnapshot().busy).toBe(false)
		})
		expect(screen.queryByRole("button", { name: "Hide sidebar" })).not.toBeInTheDocument()
		expect(admission).toHaveBeenCalledExactlyOnceWith("toggle-sidebar", expect.any(Function))
		admission.mockClear()
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Show sidebar" })) })
		expect(admission).toHaveBeenCalledExactlyOnceWith("toggle-sidebar", expect.any(Function))
		expect(screen.getByRole("button", { name: "Hide sidebar" })).toBeInTheDocument()
		expect(controller.content).toBe(source)
		if (context === "editor") expectHistory(0)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
	})

	it.each([
		"editor",
		"agenda",
		"no-document",
	] as const)("ignores held repeat, IME, consumed and AltGraph Alt-x from %s", async (context) => {
		const target = await surface(context)
		for (const blocked of ["repeat", "composition", "ime-keycode", "consumed", "altgraph"]) {
			if (blocked === "repeat") {
				const initial = new KeyboardEvent("keydown", { key: "x", altKey: true, bubbles: true, cancelable: true })
				initial.preventDefault()
				fireEvent(target, initial)
			}
			const event = new KeyboardEvent("keydown", {
				key: "x",
				altKey: true,
				bubbles: true,
				cancelable: true,
				repeat: blocked === "repeat",
				isComposing: blocked === "composition",
				keyCode: blocked === "ime-keycode" ? 229 : 0,
			})
			if (blocked === "consumed") event.preventDefault()
			if (blocked === "altgraph")
				Object.defineProperty(event, "getModifierState", {
					value: (key: string) => key === "AltGraph",
				})
			fireEvent(target, event)
			expect(screen.queryByRole("combobox"), blocked).not.toBeInTheDocument()
			expect(event.defaultPrevented, blocked).toBe(blocked === "consumed" || blocked === "repeat")
			fireEvent.keyUp(window, { key: "x", altKey: true })
		}
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
		expect(openOrgDocumentFlow).toHaveBeenCalledTimes(context === "editor" ? 1 : 0)
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("refuses unavailable mounted command clicks and Enter without dispatching file IO", async () => {
		renderWorkspace()
		fireEvent.keyDown(screen.getByRole("button", { name: "Execute command (Alt-x)" }), { key: "x", altKey: true })
		const command = applicationHost.registry.getSnapshot().commands.find((entry) => entry.id === "quick-open")!
		expect(command.getDisabledReason()).not.toBeNull()
		const input = screen.getByRole("combobox", { name: "Execute command:" })
		fireEvent.change(input, { target: { value: command.label } })
		const option = screen.getByRole("option")
		expect(option).toHaveAttribute("aria-disabled", "true")
		fireEvent.click(option)
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(input).toBeInTheDocument()
		expect(applicationHost.isOpen).toBe(true)
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("retains independent file authority and Quick open while another buffer's accepted save drains", async () => {
		await setup()
		const a = controller.activeBufferId!
		const aRuntime = controller.activeBufferRuntime!
		act(() => editor().dispatch({ changes: { from: 0, insert: "local" }, userEvent: "input.type" }))
		const { promise, resolve } = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentWriteResultInterface>>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => promise)
		let save!: Promise<boolean>
		act(() => { save = controller.saveDocument() })
		expect(controller.getBufferEffectState(a)?.saving).toBe(true)
		await act(async () => { expect(await controller.openDocumentPath("b.org")).toBe(true) })
		const bRuntime = controller.activeBufferRuntime!
		expect(controller.isSaving).toBe(false)
		expect(controller.isWorkspaceBusy).toBe(true)
		expect(controller.getBufferEffectState(controller.activeBufferId!)?.busy).toBe(false)
		expect(editor().state.facet(EditorState.readOnly)).toBe(false)
		act(() => editor().dispatch({ changes: { from: editor().state.doc.length, insert: "independent edit" }, userEvent: "input.type" }))
		await executeWorkspaceCommand("Quick open")
		expect(screen.getByRole("combobox", { name: "Search workspace notes" })).toBeInTheDocument()
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		await act(async () => {
			resolve(E.right({ relativePath: "a.org", revision: "a-saved" }))
			expect(await save).toBe(true)
		})
		expect(controller.activeBufferRuntime).toBe(bRuntime)
		expect(bRuntime.source).toBe(rawB + "independent edit")
		expect(undoDepth(bRuntime.state)).toBe(1)
		expect(aRuntime.source).toBe("local" + rawA)
		expect(undoDepth(aRuntime.state)).toBe(1)
		expect(controller.getBufferEffectState(a)?.busy).toBe(false)
		expect(disk.get("b.org")?.content).toBe(rawB)
	})

	it("preserves the exact active Quick open reader when Header Commands and Source Alt-x request the shared palette", async () => {
		await setup()
		await act(async () => { expect((await applicationHost.execute("quick-open")).kind).toBe("success") })
		const reader = screen.getByRole("combobox", { name: "Search workspace notes" })
		fireEvent.change(reader, { target: { value: "exact pending query" } })
		const owned = applicationHost.session
		fireEvent.click(screen.getByRole("button", { name: "Execute command (Alt-x)" }))
		expect(applicationHost.session?.id).toBe(owned?.id)
		expect(reader).toHaveValue("exact pending query")
		expect(reader).toHaveFocus()
		act(() => pressKey(editor().contentDOM, { key: "x", code: "KeyX", altKey: true }))
		expect(applicationHost.session?.id).toBe(owned?.id)
		expect(reader).toHaveValue("exact pending query")
		expect(screen.queryByRole("combobox", { name: "Execute command:" })).not.toBeInTheDocument()
		act(() => pressKey(reader, { key: "Escape" }))
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(controller.activeBufferRuntime!.source).toBe(rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
	})

	it.each(["source", "toolbar", "execute"] as const)("captures %s Save once, drains its exact file ACK after origin rebind, and refuses its late echo", async (ingress) => {
		await setup()
		const source = editor()
		const runtime = controller.activeBufferRuntime!
		act(() => {
			source.focus()
			source.dispatch({ changes: { from: source.state.doc.length, insert: "\0😀 exact dirty\r\n" }, userEvent: "input.type" })
		})
		const raw = runtime.source
		const acknowledgement = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentWriteResultInterface>>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => acknowledgement.promise)
		const admission = vi.spyOn(applicationHost.registry, "execute")
		if (ingress === "execute") {
			act(() => pressKey(source.contentDOM, { key: "x", code: "KeyX", altKey: true }))
			const input = screen.getByRole("combobox", { name: "Execute command:" })
			fireEvent.change(input, { target: { value: "Save current note" } })
			act(() => pressKey(input, { key: "Enter" }))
		} else {
			act(() => {
				if (ingress === "source") pressKey(source.contentDOM, { key: "s", code: "KeyS", ctrlKey: true })
				else fireEvent.click(screen.getByRole("button", { name: "Save document" }))
			})
		}
		expect(admission).toHaveBeenCalledOnce()
		expect(admission.mock.calls[0][0]).toBe("save")
		expect(applicationHost.registry.getSnapshot().busy).toBe(true)
		expect(saveOrgDocumentFlow).toHaveBeenCalledOnce()
		expect(vi.mocked(saveOrgDocumentFlow).mock.calls[0][0]).toMatchObject({ relativePath: "a.org", content: raw })
		await act(async () => { expect(await controller.openDocumentPath("b.org")).toBe(true) })
		const peer = controller.activeBufferRuntime!
		await act(async () => { expect((await applicationHost.execute("toggle-sidebar")).kind).toBe("success") })
		const newerResult = applicationHost.registry.getSnapshot().result
		await act(async () => { acknowledgement.resolve(E.right({ relativePath: "a.org", revision: "captured-save" })) })
		expect(applicationHost.registry.getSnapshot().busy).toBe(false)
		expect(applicationHost.registry.getSnapshot().result).toBe(newerResult)
		expect(controller.activeBufferRuntime).toBe(peer)
		expect(peer.source).toBe(rawB)
		expect(runtime.source).toBe(raw)
		expect(controller.openBuffers.find((buffer) => buffer.relativePath === "a.org")?.isDirty).toBe(false)
		expect(saveOrgDocumentFlow).toHaveBeenCalledOnce()
	})

	it("keeps the real modal write reader until one shared registry Save receives its canonical file ACK", async () => {
		useSettings.setState({ orgKeymapConfigurationJson: '{"version":1,"modalEngine":"vim"}' })
		await setup()
		const runtime = controller.activeBufferRuntime!
		act(() => {
			editor().dispatch({ changes: { from: 0, insert: "dirty " }, userEvent: "input.type" })
			editor().focus()
		})
		const source = runtime.source
		const acknowledgement = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentWriteResultInterface>>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => acknowledgement.promise)
		const admission = vi.spyOn(applicationHost.registry, "execute")
		act(() => pressKey(editor().contentDOM, { key: ":", code: "Semicolon", shiftKey: true }))
		const reader = screen.getByRole("combobox", { name: "Vim command or search" })
		const readerId = applicationHost.session!.id
		fireEvent.change(reader, { target: { value: "write" } })
		act(() => pressKey(reader, { key: "Enter" }))
		expect(admission).toHaveBeenCalledExactlyOnceWith("save")
		expect(saveOrgDocumentFlow).toHaveBeenCalledOnce()
		expect(vi.mocked(saveOrgDocumentFlow).mock.calls[0][0]).toMatchObject({ relativePath: "a.org", content: source })
		expect(applicationHost.registry.getSnapshot().busy).toBe(true)
		expect(applicationHost.session?.id).toBe(readerId)
		expect(screen.getByRole("combobox", { name: "Vim command or search" })).toBe(reader)
		act(() => {
			pressKey(reader, { key: "Enter" })
			pressKey(reader, { key: "Escape" })
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledOnce()
		expect(applicationHost.session?.id).toBe(readerId)
		await act(async () => { acknowledgement.resolve(E.right({ relativePath: "a.org", revision: "modal-save-ack" })) })
		await vi.waitFor(() => expect(screen.queryByRole("combobox", { name: "Vim command or search" })).not.toBeInTheDocument(), { interval: 1 })
		expect(applicationHost.registry.getSnapshot().busy).toBe(false)
		expect(controller.activeDocument?.revision).toBe("modal-save-ack")
		expect(controller.isDirty).toBe(false)
		expect(runtime.source).toBe(source)
		expectHistory(1)
	})

	it.each(["source", "execute"] as const)("admits %s Save All once and drains its captured A/B acknowledgements without a late echo", async (ingress) => {
		await setup()
		const a = controller.activeBufferRuntime!
		act(() => editor().dispatch({ changes: { from: editor().state.doc.length, insert: "A dirty" }, userEvent: "input.type" }))
		await act(async () => { expect(await controller.openDocumentPath("b.org")).toBe(true) })
		const b = controller.activeBufferRuntime!
		act(() => {
			editor().focus()
			editor().dispatch({ changes: { from: editor().state.doc.length, insert: "B dirty" }, userEvent: "input.type" })
		})
		const acknowledgement = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentWriteResultInterface>>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => acknowledgement.promise)
		const admission = vi.spyOn(applicationHost.registry, "execute")
		if (ingress === "execute") {
			act(() => pressKey(editor().contentDOM, { key: "x", code: "KeyX", altKey: true }))
			const input = screen.getByRole("combobox", { name: "Execute command:" })
			const command = applicationHost.registry.getSnapshot().commands.find((entry) => entry.id === "save-all")!
			fireEvent.change(input, { target: { value: command.label } })
			act(() => pressKey(input, { key: "Enter" }))
		} else {
			act(() => pressKey(editor().contentDOM, { key: "s", code: "KeyS", ctrlKey: true, shiftKey: true }))
		}
		expect(admission).toHaveBeenCalledOnce()
		expect(admission.mock.calls[0][0]).toBe("save-all")
		expect(applicationHost.registry.getSnapshot().busy).toBe(true)
		expect(saveOrgDocumentFlow).toHaveBeenCalledOnce()
		const firstWrite = vi.mocked(saveOrgDocumentFlow).mock.calls[0][0]
		act(() => { expect(controller.activateOpenBuffer(a.key.bufferId)).toBe(true) })
		await act(async () => { expect((await applicationHost.execute("toggle-sidebar")).kind).toBe("success") })
		const newerResult = applicationHost.registry.getSnapshot().result
		await act(async () => { acknowledgement.resolve(E.right({ relativePath: firstWrite.relativePath, revision: "save-all-ack" })) })
		await vi.waitFor(() => expect(applicationHost.registry.getSnapshot().busy).toBe(false), { interval: 1 })
		expect(applicationHost.registry.getSnapshot().result).toBe(newerResult)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
		expect(vi.mocked(saveOrgDocumentFlow).mock.calls.map(([input]) => [input.relativePath, input.content])).toEqual(
			expect.arrayContaining([["a.org", rawA + "A dirty"], ["b.org", rawB + "B dirty"]]),
		)
		expect(controller.openBuffers.every((buffer) => !buffer.isDirty)).toBe(true)
		expect(controller.activeBufferRuntime).toBe(a)
		expect(a.source).toBe(rawA + "A dirty")
		expect(b.source).toBe(rawB + "B dirty")
		expect(undoDepth(a.state)).toBe(1)
		expect(undoDepth(b.state)).toBe(1)
	})

	it("keeps a Source unbind authoritative and blocks every ingress behind the same exact parameter", async () => {
		await setup()
		act(() => {
			editor().focus()
			editor().dispatch({ changes: { from: editor().state.doc.length, insert: " dirty" }, selection: { anchor: 2 }, userEvent: "input.type" })
			useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1, bindings: [{ scope: "org-source", key: "Mod-s", command: null }] }) })
		})
		const raw = controller.activeBufferRuntime!.source
		const admission = vi.spyOn(applicationHost.registry, "execute")
		act(() => pressKey(editor().contentDOM, { key: "s", code: "KeyS", ctrlKey: true }))
		expect(admission).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		await act(async () => { expect((await applicationHost.execute("tags")).kind).toBe("success") })
		const reader = screen.getByRole("combobox")
		fireEvent.change(reader, { target: { value: "exact pending tags" } })
		const owned = applicationHost.session
		await act(async () => {
			pressKey(editor().contentDOM, { key: "s", code: "KeyS", ctrlKey: true, shiftKey: true })
			fireEvent.click(screen.getByRole("button", { name: "Save document" }))
			expect(await applicationHost.execute("save")).toMatchObject({ kind: "rejected" })
		})
		expect(applicationHost.session?.id).toBe(owned?.id)
		expect(reader).toHaveValue("exact pending tags")
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(controller.activeBufferRuntime!.source).toBe(raw)
		act(() => pressKey(reader, { key: "Escape" }))
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(controller.activeBufferRuntime!.source).toBe(raw)
	})

	it.each(["source", "note-actions", "execute"] as const)("uses the captured %s Schedule reader for rejection, acknowledged edit and exact canonical Undo", async (ingress) => {
		await setup()
		act(() => {
			editor().dispatch({ changes: { from: editor().state.doc.length, insert: "\0😀 raw tail\r\n" }, selection: { anchor: 2 }, userEvent: "input.type" })
			editor().focus()
		})
		const runtime = controller.activeBufferRuntime!
		const raw = runtime.source
		const revision = runtime.revision
		const admission = vi.spyOn(applicationHost.registry, "execute")
		if (ingress === "execute") await executeWorkspaceCommand("Schedule")
		else if (ingress === "source") await act(async () => {
			pressKey(editor().contentDOM, { key: "c", code: "KeyC", ctrlKey: true })
			pressKey(editor().contentDOM, { key: "s", code: "KeyS", ctrlKey: true })
		})
		else {
			const trigger = screen.getByRole("button", { name: "Note actions" })
			fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
			fireEvent.click(trigger)
			await act(async () => { await vi.advanceTimersByTimeAsync(0) })
			const item = screen.getByRole("menuitem", { name: /Schedule/ })
			await act(async () => { fireEvent.click(item) })
		}
		expect(admission).toHaveBeenCalledOnce()
		expect(admission.mock.calls[0][0]).toBe("scheduled")
		const reader = screen.getByRole("combobox", { name: /^Schedule/ })
		fireEvent.change(reader, { target: { value: "not-a-date" } })
		await act(async () => { pressKey(reader, { key: "Enter" }) })
		expect(reader).toBeInTheDocument()
		expect(reader).toHaveValue("not-a-date")
		expect(runtime.source).toBe(raw)
		expect(runtime.revision).toBe(revision)
		fireEvent.change(reader, { target: { value: "2026-10-10" } })
		await acceptParameter(reader, () => { expect(screen.queryByRole("combobox")).not.toBeInTheDocument() })
		expect(parseOrgPlanningLine(runtime.source.split(/\r\n|\r|\n/)[1])).toMatchObject({
			kind: "planning", fields: [{ kind: "SCHEDULED", date: "2026-10-10" }],
		})
		expect(runtime.source).toContain("\0😀 raw tail\r\n")
		expect(runtime.revision).toBe(revision + 1)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		routeUndo()
		expect(runtime.source).toBe(raw)
		await act(async () => { expect((await applicationHost.execute("scheduled")).kind).toBe("success") })
		act(() => pressKey(screen.getByRole("combobox", { name: /^Schedule/ }), { key: "Escape" }))
		expect(runtime.source).toBe(raw)
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
	})

	it("keeps a captured Clock report current across same-grant metadata refresh but retires it on Source edits", async () => {
		const nativeClock = await import("@/io/api/org-clock-context.api")
		vi.spyOn(nativeClock, "readOrgSparseClockContext").mockResolvedValue({
			nowEpochMs: Date.UTC(2026, 9, 10, 11),
			todayStartEpochMs: Date.UTC(2026, 9, 10),
			todayEndEpochMs: Date.UTC(2026, 9, 11),
			durationFormat: "gnu-default", includeClockingTask: false, activeClock: null,
			localTimeToEpochMs: (year, month, day, hour, minute) => Date.UTC(year, month - 1, day, hour, minute),
		})
		await setup()
		const runtime = controller.activeBufferRuntime!
		act(() => {
			editor().dispatch({ selection: { anchor: 2 } })
			editor().focus()
		})
		await executeWorkspaceCommand("Org clock: report totals")
		const report = await vi.waitFor(() => screen.getByRole("complementary", { name: "Org clock report" }), { interval: 1 })
		const literal = within(report).getByRole("textbox", { name: "Copy exact Org clock report" })
		const captured = literal.textContent
		expect(within(report).getByRole("button", { name: "Return source" })).toBeEnabled()
		workspace = { ...workspace, documents: [...workspace.documents.map(document => ({ ...document })),
			{ relativePath: "scan-discovered.org", revision: "scan-1" }] }
		await executeWorkspaceCommand("Refresh workspace")
		await vi.waitFor(() => expect(controller.workspace?.documents.some(document => document.relativePath === "scan-discovered.org")).toBe(true), { interval: 1 })
		expect(controller.activeBufferRuntime).toBe(runtime)
		expect(runtime.source).toBe(rawA)
		expectHistory(0)
		expect(literal.textContent).toBe(captured)
		const returnSource = within(report).getByRole("button", { name: "Return source" })
		expect(returnSource).toBeEnabled()
		await act(async () => { fireEvent.click(returnSource) })
		expect(editor().contentDOM).toHaveFocus()
		expect(editor().state.selection.main.anchor).toBe(2)
		act(() => editor().dispatch({ changes: { from: editor().state.doc.length, insert: "\0😀 unsaved" }, userEvent: "input.type" }))
		expect(returnSource).toBeDisabled()
		expect(literal.textContent).toBe(captured)
		expect(runtime.source).toBe(rawA + "\0😀 unsaved")
		expectHistory(1)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("opens native Refile from its parked captured Source without activating or editing the later Main buffer", async () => {
		await setup()
		const a = controller.activeBufferId!
		const runtime = controller.activeBufferRuntime!
		await act(async () => { expect(await controller.openDocumentPath("b.org")).toBe(true) })
		const mainBuffer = controller.activeBufferId!
		const mainRuntime = controller.activeBufferRuntime!
		act(() => editor().focus())
		const windowId = "captured-native-refile"
		const release = controller.registerBufferWindow(windowId, a)
		let state = EditorState.create({ doc: runtime.state.doc, extensions: runtime.historyFreeSourceExtensions, selection: { anchor: 2 } })
		const handle = runtime.attachWindow({ windowId, view: {
			get state() { return state },
			update: (transactions) => { state = transactions.at(-1)?.state ?? state },
		} })
		const permit = controller.captureBufferWindowPermit(windowId, a)
		const restore = vi.fn(() => true)
		const target = createOrgNativeWorkflowTarget({
			runtime, windowId, path: "a.org", ownership: {}, state: () => state, handle: () => handle,
			isLive: permit, isWritable: () => !controller.getBufferEffectState(a)?.readOnly, restore,
			visibleRanges: [{ from: 0, to: rawA.length }],
		})
		const origin = target.captureSourceTransform!()!
		const completion = Promise.withResolvers<ApplicationCommandResult>()
		const request: OrgNativeWorkflowRequest = {
			id: "refile", target, bufferId: a, windowId, path: "a.org",
			origin: { isLive: permit, restore: () => { restore() } }, isLive: permit, isCurrent: origin.isCurrent,
			navigate: async () => { throw new Error("Refile reader must not navigate Main or Native Source") },
			complete: async (result) => { completion.resolve(result) },
		}
		const admission = vi.spyOn(applicationHost.registry, "execute")
		await act(async () => {
			expect(dispatchOrgNativeWorkflow(request)).toBe(true)
			expect((await completion.promise).kind).toBe("success")
		})
		expect(admission).toHaveBeenCalledOnce()
		expect(admission.mock.calls[0][0]).toBe("refile")
		const reader = screen.getByRole("combobox", { name: "Refile to Org file:" })
		expect(controller.activeBufferId).toBe(mainBuffer)
		expect(controller.activeBufferRuntime).toBe(mainRuntime)
		expect(mainRuntime.source).toBe(rawB)
		expect(runtime.source).toBe(rawA)
		act(() => pressKey(reader, { key: "Escape" }))
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(controller.activeBufferId).toBe(mainBuffer)
		expect(mainRuntime.source).toBe(rawB)
		expect(runtime.source).toBe(rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		act(() => { handle.detach(); release() })
	})

	it("freezes native Capture region and buffer ownership, then retains its dirty original Source when the origin retires during accepted publication", async () => {
		useSettings.setState({ orgCaptureConfigurationJson: JSON.stringify({
			version: 1, draftRecovery: false,
			templates: [{ id: "native", label: "Native", entryType: "entry", target: { kind: "file", relativePath: "inbox.org" },
				source: "* TODO Native captured\n%i" }],
		}) })
		await setup()
		const a = controller.activeBufferId!
		const runtime = controller.activeBufferRuntime!
		await act(async () => { expect(await controller.openDocumentPath("b.org")).toBe(true) })
		const mainBuffer = controller.activeBufferId!
		const mainRuntime = controller.activeBufferRuntime!
		const windowId = "captured-native-capture"
		const release = controller.registerBufferWindow(windowId, a)
		let state = EditorState.create({ doc: runtime.state.doc, extensions: runtime.historyFreeSourceExtensions,
			selection: { anchor: 0, head: runtime.state.doc.length } })
		const handle = runtime.attachWindow({ windowId, view: {
			get state() { return state },
			update: (transactions) => { state = transactions.at(-1)?.state ?? state },
		} })
		const permit = controller.captureBufferWindowPermit(windowId, a)
		const target = createOrgNativeWorkflowTarget({
			runtime, windowId, path: "a.org", ownership: {}, state: () => state, handle: () => handle,
			isLive: permit, isWritable: () => !controller.getBufferEffectState(a)?.readOnly, restore: () => true,
			visibleRanges: [{ from: 0, to: rawA.length }],
		})
		const origin = target.captureSourceTransform!()!
		const completion = Promise.withResolvers<ApplicationCommandResult>()
		await act(async () => {
			expect(dispatchOrgNativeWorkflow({
				id: "capture", target, bufferId: a, windowId, path: "a.org",
				origin: { isLive: permit, restore: () => undefined }, isLive: permit, isCurrent: origin.isCurrent,
				navigate: async () => { throw new Error("Capture publication must not activate Main or navigate Native Source") },
				complete: async (result) => { completion.resolve(result) },
			})).toBe(true)
			expect((await completion.promise).kind).toBe("success")
		})
		const chooser = screen.getByRole("combobox", { name: "Capture template:" })
		fireEvent.change(chooser, { target: { value: "native" } })
		await acceptParameter(chooser, () => { expect(screen.getByRole("textbox", { name: "Capture Org draft" })).toBeInTheDocument() })
		const view = scratch()
		const content = view.contentDOM
		const tail = "Native user tail \0😀\n"
		act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: tail }, userEvent: "input.type" }))
		const retained = view.state.doc
		const selection = view.state.selection
		const finish = deferredCapture()
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "Finish" })))
		const expected = "* TODO Native captured\n" + rawA + tail
		expect(vi.mocked(captureOrgEntryFlow).mock.calls[0][0].entrySource).toBe(expected)
		expect(tool("capture").state.pending).toBe(true)
		await act(async () => {
			handle.detach()
			release()
			const confirmed = { relativePath: "inbox.org", content: "#+title: inbox\n\n" + expected, revision: "native-capture-confirmed" }
			disk.set("inbox.org", confirmed)
			finish(E.right(confirmed))
		})
		expect(screen.getByRole("textbox", { name: "Capture Org draft" })).toBe(content)
		expect(view.state.doc).toBe(retained)
		expect(view.state.selection.eq(selection)).toBe(true)
		expect(view.state.readOnly).toBe(true)
		expect(tool("capture").state).toMatchObject({ dirty: true, pending: false, readOnly: true })
		expect(disk.get("inbox.org")?.content).toBe("#+title: inbox\n\n" + expected)
		expect(controller.activeBufferId).toBe(mainBuffer)
		expect(controller.activeBufferRuntime).toBe(mainRuntime)
		expect(mainRuntime.source).toBe(rawB)
		expect(runtime.source).toBe(rawA)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(captureOrgEntryFlow).toHaveBeenCalledOnce()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
})

describe("production root capture runtime (real hook, pane, workflow and CodeMirror)", () => {
	it("dispatches sparse tree and clear from the catalog without changing the working copy or history", async () => {
		await setup()
		const source = controller.content
		await executeWorkspaceCommand("Sparse tree")
		const input = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(input, { target: { value: "tag:raw" } })
		await acceptParameter(input, () => { expect(editor().state.field(orgSparseTreeField)).not.toBeNull() })
		expect(controller.content).toBe(source)
		expect(controller.isDirty).toBe(false)
		expectHistory(0)
		await executeWorkspaceCommand("Clear sparse tree")
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(editor().state.field(orgSparseTreeField)).toBeNull()
		expect(controller.content).toBe(source)
		expectHistory(0)
	})
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
		expect(tool("capture").state.pending).toBe(true)
		expect(controller.isWorkspaceBusy).toBe(true)
		expect(controller.getBufferEffectState(controller.activeBufferId!)?.saving).toBe(false)
		expect(editor().state.facet(EditorState.readOnly)).toBe(false)
		expect(scratch().state.facet(EditorState.readOnly)).toBe(true)
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
		expectHistory(1)
		routeUndo()
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
		expectHistory(1)
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
		expectHistory(1)
		routeUndo()
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
		expectHistory(1)
		await capture()
		// The real sidebar event calls openDocument (not a forced save or a test activation).
		await act(async () => {
			fireEvent.click(screen.getByRole("treeitem", { name: "b.org" }))
		})
		expect(controller.activeDocument?.relativePath).toBe("b.org")
		expect(controller.openBuffers.find((buffer) => buffer.bufferId === originId)).toMatchObject({
			relativePath: "a.org",
			isDirty: false,
		})
		fireEvent.change(screen.getByRole("textbox", { name: "Capture target file" }), {
			target: { value: "a.org" },
		})
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "Preview target" })))
		const entry = "* TODO parked capture\nraw body"
		replaceDraft(entry)
		const finish = deferredCapture()
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Finish" }))
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
		expectHistory(1)
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
		expectHistory(0, 1)
		expect(disk.get("a.org")?.content).toBe(confirmed.content)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})
	it("rejects an inactive dirty capture target before flow IO after real sidebar navigation", async () => {
		await setup()
		act(() => editor().dispatch({ changes: { from: 0, insert: "parked local" } }))
		const originId = controller.activeBufferId
		await capture()
		await act(async () => {
			fireEvent.click(screen.getByRole("treeitem", { name: "b.org" }))
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
			fireEvent.click(screen.getByRole("button", { name: "Preview target" }))
		})
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(scratch().state.sliceDoc()).toBe("* TODO retained inactive")
		expect(scratch().state.facet(EditorState.readOnly)).toBe(false)
		expect(disk.get("a.org")?.content).toBe(rawA)
	})
	it("C-g cancels the template and confirms typed-draft disposal without writing, clearing transient dirty state and restoring origin focus", async () => {
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
		await act(async () => {
			fireEvent.keyDown(scratch().contentDOM, { key: "g", ctrlKey: true })
		})
		await act(async () => {
			fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close tool" }))
		})
		expect(screen.queryByRole("textbox", { name: "Capture Org draft" })).not.toBeInTheDocument()
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
		expect(tool("capture").state.pending).toBe(false)
		expect(controller.isWorkspaceBusy).toBe(false)
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
			fireEvent.click(screen.getByRole("button", { name: "Preview target" }))
		})
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
		expect(scratch().state.sliceDoc()).toBe("* TODO retained")
		expect(scratch().state.facet(EditorState.readOnly)).toBe(false)
		expect(controller.content).toBe("local" + rawA)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
})

describe("production root Org-remark sidecar runtime", () => {
	it.each(["source", "body", "other-input"] as const)("preserves %s focus ownership across its deferred sidecar CAS", async (destination) => {
		await setup()
		const sourceRuntime = controller.activeBufferRuntime!
		const from = rawA.indexOf("untouched")
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from), head: orgRemarkEditorOffset(editor().state, from + "untouched".length) } }))
		let finish!: (result: E.Either<OrgFileError, OrgDocumentWriteResultInterface>) => void
		const pending = new Promise<E.Either<OrgFileError, OrgDocumentWriteResultInterface>>((resolve) => { finish = resolve })
		vi.mocked(saveOrgDocumentFlow).mockImplementationOnce((input) => () => {
			disk.set(input.relativePath, { relativePath: input.relativePath, content: input.content, revision: "remark-focus" })
			return pending
		})
		await executeWorkspaceCommand("Org-remark: mark region or word")
		expect(controller.isSaving).toBe(true)
		const original = editor().contentDOM
		const other = screen.getByRole("textbox", { name: "Filter workspace files" })
		act(() => {
			if (destination === "body") original.blur()
			else if (destination === "other-input") other.focus()
		})
		await act(async () => { finish(E.right({ relativePath: "a-notes.org", revision: "remark-focus" })) })
		expect(controller.isSaving).toBe(false)
		expect(destination === "source" ? original : destination === "body" ? document.body : other).toHaveFocus()
		expect(sourceRuntime.source).toBe(rawA)
		expect(sourceRuntime.revision).toBe(0)
		expectHistory(0)
		const notes = controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a-notes.org")!
		expect(notes.document.content).toBe(disk.get("a-notes.org")?.content)
		expect(undoDepth(notes.runtime.state)).toBe(1)
	})

	it("executes consecutive M-x mark, line and remove commands while preserving source bytes and saved undo history", async () => {
		await setup()
		act(() => editor().dispatch({ changes: { from: editor().state.doc.length, insert: "saved local" }, userEvent: "input.type" }))
		await act(async () => { await controller.saveDocument() })
		const source = controller.content
		const runtime = controller.activeBufferRuntime!
		const generation = runtime.revision
		const from = source.indexOf("untouched")
		const to = from + "untouched".length
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from), head: orgRemarkEditorOffset(editor().state, to) } }))
		await executeWorkspaceCommand("Org-remark: mark region or word")
		const firstNotes = disk.get("a-notes.org")!
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, source.indexOf("<b>")) } }))
		await executeWorkspaceCommand("Org-remark: mark line")
		const bothNotes = disk.get("a-notes.org")!
		expect(bothNotes.revision).not.toBe(firstNotes.revision)
		const parsed = parseOrgRemarkNotes(bothNotes.content, "a.org", source)
		expect(parsed.kind).toBe("ready")
		if (parsed.kind !== "ready") throw new Error("Saved sidecar cannot be read as Org-remark notes")
		expect(parsed.diagnostics).toEqual([])
		expect(parsed.marks).toEqual([
			expect.objectContaining({ from, to, kind: "range", label: "nil" }),
			expect.objectContaining({ from: source.indexOf("<b>"), to: source.indexOf("<b>"), kind: "line", label: "line" }),
		])
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from) } }))
		await executeWorkspaceCommand("Org-remark: remove highlight")
		const remaining = parseOrgRemarkNotes(disk.get("a-notes.org")!.content, "a.org", source)
		expect(remaining.kind).toBe("ready")
		if (remaining.kind !== "ready") throw new Error("Removed highlight left invalid notes")
		expect(remaining.marks).toEqual([expect.objectContaining({ kind: "line" })])
		expect(controller.activeBufferRuntime).toBe(runtime)
		expect(runtime.source).toBe(source)
		expect(runtime.revision).toBe(generation)
		expect(editor().state.sliceDoc()).toBe(source)
		expect(disk.get("a.org")?.content).toBe(source)
		expectHistory(1)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(4)
		routeUndo()
		expect(runtime.source).toBe(rawA)
		expect(disk.get("a.org")?.content).toBe(source)
	})

	it("keeps edited live highlights through a deferred source-save sync, metadata refresh and subsequent pen change without replacing creation text or prose", async () => {
		vi.mocked(scanOrgWorkspaceFlow).mockImplementation(() => async () => E.right({
			...workspace, documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
		}))
		await setup()
		const sourceRuntime = controller.activeBufferRuntime!
		const from = rawA.indexOf("untouched")
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from), head: orgRemarkEditorOffset(editor().state, from + "untouched".length) } }))
		await executeWorkspaceCommand("Org-remark: important")
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from) } }))
		await executeWorkspaceCommand("Org-remark: open notes")
		const noteView = editor("Remark notes for a.org")
		const bodyFrom = noteView.state.selection.main.head
		act(() => noteView.dispatch({ changes: { from: bodyFrom, insert: "Marginal prose 中文🐉\n" }, userEvent: "input.type" }))
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save notes" })) })
		act(() => fireEvent.click(screen.getByRole("button", { name: /^Source$/ })))
		const save = vi.mocked(saveOrgDocumentFlow).getMockImplementation()!
		let completeSync!: () => void
		let deferSync = true
		vi.mocked(saveOrgDocumentFlow).mockImplementation((input) => {
			const write = save(input)
			if (input.relativePath !== "a-notes.org" || !deferSync) return write
			deferSync = false
			const { promise, resolve, reject } = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentWriteResultInterface>>()
			completeSync = () => { void write().then(resolve, reject) }
			return () => promise
		})
		act(() => editor().dispatch({ changes: [
			{ from: 0, insert: "🐉 中文\r\n" },
			{ from: orgRemarkEditorOffset(editor().state, from + 3), insert: " edited " },
		], userEvent: "input.type" }))
		const edited = controller.content
		const generation = sourceRuntime.revision
		expect(edited).toBe("🐉 中文\r\n" + rawA.replace("untouched", "unt edited ouched"))
		await act(async () => { await controller.saveDocument() })
		expect(controller.isSaving).toBe(true)
		expect(editor().state.facet(EditorState.readOnly)).toBe(true)
		await act(async () => { completeSync() })
		await act(async () => { await controller.refreshWorkspace() })
		const notes = disk.get("a-notes.org")!
		const parsed = parseOrgRemarkNotes(notes.content, "a.org", edited)
		expect(parsed.kind).toBe("ready")
		if (parsed.kind !== "ready") throw new Error("Source-save sync produced invalid notes")
		const mark = parsed.marks[0]
		expect(mark).toMatchObject({ from: edited.indexOf("unt edited ouched"), to: edited.indexOf("unt edited ouched") + "unt edited ouched".length, originalText: "untouched", label: "important" })
		expect(Array.from(editor().dom.querySelectorAll("[data-org-remark-id]")).map((node) => node.textContent).join("")).toBe("unt edited ouched")
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, mark.from) } }))
		await executeWorkspaceCommand("Org-remark: change pen")
		const pen = screen.getByRole("combobox")
		fireEvent.change(pen, { target: { value: "quote" } })
		await act(async () => { fireEvent.keyDown(pen, { key: "Enter" }) })
		const changed = disk.get("a-notes.org")!.content
		const result = parseOrgRemarkNotes(changed, "a.org", edited)
		expect(result.kind).toBe("ready")
		if (result.kind !== "ready") throw new Error("Changed pen produced invalid notes")
		expect(result.marks[0]).toMatchObject({ ...mark, label: "quote" })
		expect(changed).toContain("Marginal prose 中文🐉")
		expect(sourceRuntime.source).toBe(edited)
		expect(sourceRuntime.revision).toBe(generation)
		expectHistory(1)
		routeUndo()
		expect(sourceRuntime.source).toBe(rawA)
		expect(disk.get("a.org")?.content).toBe(edited)
		expect(controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a-notes.org")?.runtime.source).toBe(changed)
	})

	it("keeps source focus when removing the open remark entry, retaining its body and CATEGORY instead of refocusing the widened notes window", async () => {
		await setup()
		const runtime = controller.activeBufferRuntime!
		const from = rawA.indexOf("untouched")
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from), head: orgRemarkEditorOffset(editor().state, from + "untouched".length) } }))
		await executeWorkspaceCommand("Org-remark: important")
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from) } }))
		await executeWorkspaceCommand("Org-remark: open notes")
		const noteView = editor("Remark notes for a.org")
		act(() => noteView.dispatch({ changes: { from: noteView.state.selection.main.head, insert: "Keep this marginal prose\n" }, userEvent: "input.type" }))
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save notes" })) })
		await executeWorkspaceCommand("Org-remark: remove highlight")
		expect(editor().contentDOM).toHaveFocus()
		const notes = controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a-notes.org")!
		expect(notes.runtime.source).toBe(disk.get("a-notes.org")?.content)
		expect(notes.runtime.source).toContain("Keep this marginal prose")
		expect(notes.runtime.source).toContain(":CATEGORY: important")
		expect(notes.runtime.source).not.toContain(":org-remark-id:")
		expect(runtime.source).toBe(rawA)
		expect(runtime.revision).toBe(0)
		expectHistory(0)
		act(() => fireEvent.keyDown(editor("Remark notes for a.org").contentDOM, { key: "z", code: "KeyZ", ctrlKey: true }))
		expect(notes.runtime.source).toContain(":org-remark-id:")
		expect(notes.runtime.source).toContain("Keep this marginal prose")
		expect(runtime.source).toBe(rawA)
	})

	it("edits and undoes marginal note body in the canonical narrowed sidecar independently from dirty source history", async () => {
		await setup()
		act(() => editor().dispatch({ changes: { from: editor().state.doc.length, insert: "local source" }, userEvent: "input.type" }))
		const source = controller.content
		const sourceRuntime = controller.activeBufferRuntime!
		const from = source.indexOf("untouched")
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from), head: orgRemarkEditorOffset(editor().state, from + "untouched".length) } }))
		await executeWorkspaceCommand("Org-remark: mark region or word")
		act(() => editor().dispatch({ selection: { anchor: 2 } }))
		await executeWorkspaceCommand("Org-remark: mark line")
		const savedNotes = disk.get("a-notes.org")!.content
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from) } }))
		await executeWorkspaceCommand("Org-remark: open notes")
		const noteView = editor("Remark notes for a.org")
		const note = controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a-notes.org")!
		const body = `Personal marginal note: 中文 and [[file:b.org][related]].${noteView.state.lineBreak}`
		expect(noteView.contentDOM).toHaveFocus()
		expect(controller.activeBufferRuntime).toBe(sourceRuntime)
		expect(noteView.state.sliceDoc()).toBe(savedNotes)
		expect(undoDepth(note.runtime.state)).toBe(2)
		act(() => noteView.dispatch({ changes: { from: 0, insert: "hidden entry damage" } }))
		expect(note.runtime.source).toBe(savedNotes)
		expect(undoDepth(note.runtime.state)).toBe(2)
		const bodyFrom = noteView.state.selection.main.head
		const rawBodyFrom = bodyFrom + (noteView.state.doc.lineAt(bodyFrom).number - 1) * (noteView.state.lineBreak.length - 1)
		act(() => noteView.dispatch({ changes: { from: bodyFrom, insert: body }, userEvent: "input.type" }))
		const editedNotes = savedNotes.slice(0, rawBodyFrom) + body + savedNotes.slice(rawBodyFrom)
		expect(note.runtime.source).toBe(editedNotes)
		expect(editor("Remark notes for a.org").state.sliceDoc()).toBe(editedNotes)
		expect(controller.liveBuffers.find((buffer) => buffer.bufferId === note.bufferId)?.isDirty).toBe(true)
		expect(undoDepth(note.runtime.state)).toBe(3)
		expect(sourceRuntime.source).toBe(source)
		expectHistory(1)
		act(() => fireEvent.keyDown(editor("Remark notes for a.org").contentDOM, { key: "z", code: "KeyZ", ctrlKey: true }))
		expect(note.runtime.source).toBe(savedNotes)
		expect(undoDepth(note.runtime.state)).toBe(2)
		expect(redoDepth(note.runtime.state)).toBe(1)
		expect(sourceRuntime.source).toBe(source)
		expectHistory(1)
		act(() => fireEvent.keyDown(editor("Remark notes for a.org").contentDOM, { key: "y", code: "KeyY", ctrlKey: true }))
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save notes" })) })
		expect(disk.get("a-notes.org")?.content).toBe(editedNotes)
		expect(note.runtime.source).toBe(editedNotes)
		expect(undoDepth(note.runtime.state)).toBe(3)
		expect(controller.liveBuffers.find((buffer) => buffer.bufferId === note.bufferId)?.isDirty).toBe(false)
		act(() => fireEvent.click(screen.getByRole("button", { name: /^Source$/ })))
		routeUndo()
		expect(sourceRuntime.source).toBe(rawA)
		expect(note.runtime.source).toBe(editedNotes)
		expect(disk.get("a.org")?.content).toBe(rawA)
		expect(disk.get("a-notes.org")?.content).toBe(editedNotes)
	})

	it("retains dirty canonical notes and live anchors after an external sidecar revision, returning to an interactive read-only panel instead of reloading the stale baseline or retrying writes", async () => {
		vi.mocked(scanOrgWorkspaceFlow).mockImplementation(() => async () => E.right({
			...workspace, documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
		}))
		await setup()
		const sourceRuntime = controller.activeBufferRuntime!
		const from = rawA.indexOf("untouched")
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from), head: orgRemarkEditorOffset(editor().state, from + "untouched".length) } }))
		await executeWorkspaceCommand("Org-remark: important")
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from) } }))
		await executeWorkspaceCommand("Org-remark: open notes")
		const noteView = editor("Remark notes for a.org")
		act(() => noteView.dispatch({ changes: { from: noteView.state.selection.main.head, insert: "Local unsaved marginal prose\n" }, userEvent: "input.type" }))
		const note = controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a-notes.org")!
		const draft = note.runtime.source
		const generation = note.runtime.revision
		const external = { ...disk.get("a-notes.org")!, content: disk.get("a-notes.org")!.content + "External marginal prose\n", revision: "external-sidecar" }
		disk.set("a-notes.org", external)
		await act(async () => { await controller.refreshWorkspace() })
		expect(controller.openBuffers.find((buffer) => buffer.bufferId === note.bufferId)).toMatchObject({ isDirty: true, hasConflict: true, autosavePaused: true })
		expect(editor("Remark notes for a.org").state.facet(EditorState.readOnly)).toBe(true)
		expect(note.runtime.source).toBe(draft)
		expect(note.runtime.revision).toBe(generation)
		expect(Array.from(editor().dom.querySelectorAll("[data-org-remark-id]")).map((node) => node.textContent).join("")).toBe("untouched")
		act(() => editor().dispatch({ selection: { anchor: 2 } }))
		await executeWorkspaceCommand("Org-remark: mark line")
		expect(note.runtime.source).toBe(draft)
		expect(note.runtime.revision).toBe(generation)
		let result!: Awaited<ReturnType<OrgWorkspaceController["saveRemarkNotes"]>>
		await act(async () => { result = await controller.saveRemarkNotes({
			workspaceSessionId: controller.workspaceSessionId!, rootPath: controller.workspace!.rootPath,
			document: note.document, content: note.runtime.source, bufferId: note.bufferId,
			runtime: note.runtime, runtimeIncarnation: note.runtimeIncarnation, sourceGeneration: note.runtime.revision,
		}) })
		expect(result.kind).toBe("rejected")
		expect(disk.get("a-notes.org")).toEqual(external)
		expect(note.runtime.source).toBe(draft)
		expect(sourceRuntime.source).toBe(rawA)
		expect(sourceRuntime.revision).toBe(0)
		expectHistory(0)
		expect(undoDepth(note.runtime.state)).toBe(2)
	})

	it("retains the canonical sidecar draft and conflict protection after an unconfirmed CAS without retrying or mutating source", async () => {
		await setup()
		const sourceRuntime = controller.activeBufferRuntime!
		const from = rawA.indexOf("untouched")
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from), head: orgRemarkEditorOffset(editor().state, from + "untouched".length) } }))
		const { promise: pending, resolve: finish } = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentWriteResultInterface>>()
		vi.mocked(saveOrgDocumentFlow).mockImplementationOnce((input) => () => {
			// Disk accepted the CAS, but the transport cannot deliver a reliable receipt.
			expect(input.expectedRevision).toBe("<missing>")
			disk.set(input.relativePath, { relativePath: input.relativePath, content: input.content, revision: "accepted-without-receipt" })
			return pending
		})
		await executeWorkspaceCommand("Org-remark: mark region or word")
		const note = controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a-notes.org")!
		const draft = note.runtime.source
		expect(draft).toBe(disk.get("a-notes.org")?.content)
		const parsedDraft = parseOrgRemarkNotes(draft, "a.org", rawA)
		expect(parsedDraft.kind).toBe("ready")
		if (parsedDraft.kind !== "ready") throw new Error("Retained sidecar draft is not readable")
		expect(parsedDraft.marks).toEqual([expect.objectContaining({ from, to: from + "untouched".length, originalText: "untouched" })])
		expect(undoDepth(note.runtime.state)).toBe(1)
		expect(controller.isSaving).toBe(true)
		await act(async () => {
			fireEvent.keyDown(editor().contentDOM, { key: "g", ctrlKey: true })
			finish(E.left({
				type: "ORG_FILE_ERROR",
				operation: "write",
				command: "write_org_document",
				message: "Connection lost after the sidecar CAS.",
				cause: { kind: "transport", noWrite: false },
			}))
		})
		expect(controller.isSaving).toBe(false)
		expect(note.runtime.source).toBe(draft)
		expect(controller.openBuffers.find((buffer) => buffer.bufferId === note.bufferId)).toMatchObject({
			isDirty: true, hasConflict: true, autosavePaused: true,
		})
		expect(vi.mocked(useBlocker).mock.lastCall?.[0]).toMatchObject({ enableBeforeUnload: true })
		expect(vi.mocked(registerOrgWindowClose).mock.lastCall?.[0].getState().hasDirtyBuffers).toBe(true)
		await executeWorkspaceCommand("Org-remark: open notes")
		expect(editor("Remark notes for a.org").state.sliceDoc()).toBe(draft)
		expect(editor("Remark notes for a.org").state.facet(EditorState.readOnly)).toBe(true)
		expect(screen.getByRole("button", { name: "Save notes" })).toBeDisabled()
		await act(async () => { vi.advanceTimersByTime(5_000) })
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(note.runtime.source).toBe(draft)
		expect(note.document.content).toBe("")
		expect(undoDepth(note.runtime.state)).toBe(1)
		expect(controller.activeBufferRuntime).toBe(sourceRuntime)
		expect(sourceRuntime.source).toBe(rawA)
		expect(editor().state.sliceDoc()).toBe(rawA)
		expect(disk.get("a.org")?.content).toBe(rawA)
		expectHistory(0)
	})
	it.each(["file", "id"] as const)("follows a %s link from the narrowed notes body to its entry without losing the dirty sidecar or editing source history", async (kind) => {
		const real = await vi.importActual<typeof import("@/flows/org-workspace/org-link-target.flow")>("@/flows/org-workspace/org-link-target.flow")
		vi.mocked(resolveOrgLinkTargetFlow).mockImplementation(real.resolveOrgLinkTargetFlow)
		vi.mocked(scanOrgWorkspaceFlow).mockImplementation(() => async () => E.right({
			...workspace, documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
		}))
		const targetSource = kind === "file" ? rawB : "* B\n:PROPERTIES:\n:ID: target%node\n:END:\nindependent\n"
		if (kind === "id") disk.set("b.org", { relativePath: "b.org", content: targetSource, revision: "b-id-1" })
		const link = kind === "file" ? "[[file:b.org::2][related]]" : "[[id:target%node][related]]"
		await setup()
		const sourceRuntime = controller.activeBufferRuntime!
		const from = rawA.indexOf("untouched")
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from), head: orgRemarkEditorOffset(editor().state, from + "untouched".length) } }))
		await executeWorkspaceCommand("Org-remark: mark region or word")
		await executeWorkspaceCommand("Org-remark: open notes")
		const noteView = editor("Remark notes for a.org")
		const notes = controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a-notes.org")!
		const at = noteView.state.selection.main.head
		act(() => {
			noteView.dispatch({ changes: { from: at, insert: link }, selection: { anchor: at + 5 }, userEvent: "input.type" })
			noteView.focus()
		})
		const draft = notes.runtime.source
		await act(async () => {
			fireEvent.keyDown(noteView.contentDOM, { key: "c", code: "KeyC", ctrlKey: true })
			fireEvent.keyDown(noteView.contentDOM, { key: "Control", ctrlKey: true })
			fireEvent.keyDown(noteView.contentDOM, { key: "o", code: "KeyO", ctrlKey: true })
		})
		await vi.waitFor(() => { expect(controller.activeDocument?.relativePath).toBe("b.org") }, { interval: 1 })
		expect(editor().state.selection.main.head).toBe(editor().state.doc.line(kind === "file" ? 2 : 1).from)
		expect(editor().contentDOM).toHaveFocus()
		expect(sourceRuntime.source).toBe(rawA)
		expect(sourceRuntime.revision).toBe(0)
		expect(undoDepth(sourceRuntime.state)).toBe(0)
		expect(controller.liveBuffers.find((buffer) => buffer.bufferId === notes.bufferId)?.isDirty).toBe(true)
		expect(notes.runtime.source).toBe(draft)
		expect(undoDepth(notes.runtime.state)).toBe(2)
		expect(disk.get("a.org")?.content).toBe(rawA)
		expect(disk.get("b.org")?.content).toBe(targetSource)
	})
})

describe("production root Org-roam publication", () => {
	it.each(["scratch", "finish-button", "other-input"] as const)("settles its owned publication lock with %s focus without confusing it with a source change", async (destination) => {
		await setup()
		const sourceRuntime = controller.activeBufferRuntime!
		const from = rawA.indexOf("untouched")
		act(() => editor().dispatch({ selection: { anchor: orgRemarkEditorOffset(editor().state, from), head: orgRemarkEditorOffset(editor().state, from + "untouched".length) } }))
		const { promise, resolve } = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentWriteResultInterface>>()
		vi.mocked(orgFileRepository.writeDocument).mockImplementationOnce((input) => () => {
			disk.set(input.relativePath, { relativePath: input.relativePath, content: input.content, revision: "roam-confirmed" })
			return promise
		})
		await executeWorkspaceCommand("Org-roam: insert node link")
		const chooser = screen.getByRole("combobox")
		fireEvent.change(chooser, { target: { value: "Create new node" } })
		await act(async () => { fireEvent.keyDown(chooser, { key: "Enter" }) })
		const title = screen.getByRole("combobox", { name: "New Org-roam node title:" })
		fireEvent.change(title, { target: { value: "Captured node" } })
		await act(async () => { fireEvent.keyDown(title, { key: "Enter" }) })
		const draftView = editor("Org-roam capture draft")
		const draft = draftView.state.sliceDoc().replace("#+TITLE: Captured node", "#+TITLE: Edited node") + "Captured body 中文\n"
		act(() => draftView.dispatch({ changes: { from: 0, to: draftView.state.doc.length, insert: draft } }))
		if (destination === "finish-button") {
			const finish = screen.getByRole("button", { name: "Finish" })
			act(() => finish.focus())
			await act(async () => { fireEvent.click(finish) })
			// Native WebKit blurs a connected focused control when it becomes disabled.
			act(() => finish.blur())
		} else {
			await act(async () => { fireEvent.keyDown(draftView.contentDOM, { key: "s", code: "KeyS", ctrlKey: true }) })
		}
		expect(tool("org-roam").state.pending).toBe(true)
		expect(controller.isWorkspaceBusy).toBe(true)
		expect(controller.getBufferEffectState(controller.activeBufferId!)?.saving).toBe(false)
		expect(sourceRuntime.source).toBe(rawA)
		expectHistory(0)
		const created = [...disk.values()].find((document) => document.relativePath !== "a.org" && document.relativePath !== "b.org")!
		expect(created.content).toBe(draft)
		const id = draft.match(/^:ID:\s+(.+)$/m)![1]
		const other = screen.getByRole("textbox", { name: "Filter workspace files" })
		if (destination === "other-input") act(() => other.focus())
		await act(async () => { resolve(E.right({ relativePath: created.relativePath, revision: created.revision })) })
		expect(controller.isWorkspaceBusy).toBe(false)
		expect(applicationToolRegistry.getSnapshot().some((entry) => entry.lease.id === "org-roam" && entry.state.pending)).toBe(false)
		expect(disk.get(created.relativePath)?.content).toBe(draft)
		expect(disk.get("a.org")?.content).toBe(rawA)
		if (destination !== "other-input") {
			expect(screen.queryByRole("region", { name: "Org-roam capture tool buffer" })).not.toBeInTheDocument()
			expect(sourceRuntime.source).toBe(rawA.slice(0, from) + `[[id:${id}][untouched]]` + rawA.slice(from + "untouched".length))
			expect(editor().contentDOM).toHaveFocus()
			expectHistory(1)
			routeUndo()
			expect(sourceRuntime.source).toBe(rawA)
		} else {
			expect(other).toHaveFocus()
			expect(sourceRuntime.source).toBe(rawA)
			expectHistory(0)
			expect(editor("Org-roam capture draft").state.sliceDoc()).toBe(draft)
			expect(editor("Org-roam capture draft").state.facet(EditorState.readOnly)).toBe(true)
			await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Dismiss (no rollback)" })) })
			expect(other).toHaveFocus()
		}
		expect(orgFileRepository.writeDocument).toHaveBeenCalledOnce()
	})
})

describe("configured Capture through the real Root and Source window", () => {
	it("expands sequential literal prompts and the exact Source region/annotation, then confirms a heading target without editing Source history", async () => {
		const targetBefore = "#+title: Work\r\n* Research\r\nintro\r\n** Inbox\r\nold\r\n"
		disk.set("configured/capture.org", { relativePath: "configured/capture.org", content: targetBefore, revision: "configured-1" })
		useSettings.setState({ orgCaptureConfigurationJson: JSON.stringify({
			version: 1, draftRecovery: false,
			templates: [{
				id: "review", label: "Review", entryType: "entry",
				target: { kind: "heading", relativePath: "configured/capture.org", headingPath: ["Research", "Inbox"] },
				source: "* %^{Title|Review}\n%i\n%a\n%^{Body|Literal}\n%?\n** Detail",
			}],
		}) })
		await setup()
		const from = rawA.indexOf("untouched")
		act(() => {
			editor().dispatch({ selection: {
				anchor: orgRemarkEditorOffset(editor().state, from),
				head: orgRemarkEditorOffset(editor().state, from + "untouched".length),
			} })
			editor().focus()
		})
		const runtime = controller.activeBufferRuntime!
		fireEvent.click(screen.getByRole("button", { name: "Quick capture" }))
		const chooser = screen.getByRole("combobox", { name: "Capture template:" })
		fireEvent.change(chooser, { target: { value: "review" } })
		await act(async () => fireEvent.keyDown(chooser, { key: "Enter" }))
		let prompt = screen.getByRole("combobox", { name: "Title" })
		fireEvent.change(prompt, { target: { value: "Title %U %(literal)" } })
		await act(async () => fireEvent.keyDown(prompt, { key: "Enter" }))
		prompt = screen.getByRole("combobox", { name: "Body" })
		fireEvent.change(prompt, { target: { value: "%^{not rescanned} body" } })
		await act(async () => fireEvent.keyDown(prompt, { key: "Enter" }))
		expect(screen.getByLabelText("Capture target preview")).toHaveTextContent("Research / Inbox")
		expect(disk.get("configured/capture.org")?.content).toBe(targetBefore)
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "Finish" })))
		expect(disk.get("configured/capture.org")?.content).toBe(targetBefore +
			"*** Title %U %(literal)\nuntouched\n[[file:../a.org::3][a.org:3]]\n%^{not rescanned} body\n\n**** Detail")
		expect(runtime.source).toBe(rawA)
		expectHistory(0)
		expect(editor().contentDOM).toHaveFocus()
	})

	it("freezes datetree date before prompts even if confirmation happens on a later calendar day", async () => {
		vi.setSystemTime(new Date(2026, 9, 7, 23, 59))
		useSettings.setState({ orgCaptureConfigurationJson: JSON.stringify({
			version: 1, draftRecovery: false,
			templates: [{
				id: "journal", label: "Journal", entryType: "entry",
				target: { kind: "datetree", relativePath: "dated/journal.org", headingPath: ["Journal"] },
				source: "* %^{Title}\n%u\n%?",
			}],
		}) })
		await setup()
		fireEvent.click(screen.getByRole("button", { name: "Quick capture" }))
		const chooser = screen.getByRole("combobox", { name: "Capture template:" })
		fireEvent.change(chooser, { target: { value: "journal" } })
		await act(async () => fireEvent.keyDown(chooser, { key: "Enter" }))
		vi.setSystemTime(new Date(2030, 0, 2, 10))
		const title = screen.getByRole("combobox", { name: "Title" })
		fireEvent.change(title, { target: { value: "Captured before midnight" } })
		await act(async () => fireEvent.keyDown(title, { key: "Enter" }))
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "Finish" })))
		expect(disk.get("dated/journal.org")?.content).toContain(
			"* Journal\n** 2026\n*** 2026-10 October\n**** 2026-10-07 Wednesday\n***** Captured before midnight\n[2026-10-07 Wed]",
		)
		expect(disk.get("dated/journal.org")?.content).not.toContain("2030")
		expect(controller.activeBufferRuntime?.source).toBe(rawA)
		expectHistory(0)
	})
})
