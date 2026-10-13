import { isolateHistory, redoDepth, undoDepth } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { render } from "@/test/application-providers"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgBufferRuntime, OrgBufferWindowHandle } from "@/flows/org-editor-runtime"
import { ORG_BACKLINKS_DEBOUNCE_MS } from "@/hooks/use-org-backlinks"
import { useOrgWorkspace, type OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { orgFileRepository } from "@/io/file/org-file.repository"
import type * as OrgFileRepositoryModule from "@/io/file/org-file.repository"
import type { OrgDocumentInterface, OrgFileError, OrgWorkspaceInterface } from "@/types/org"
import { OrgBacklinksContainer } from "./org-backlinks.container.fn"
import { OrgInspector } from "./org-inspector.view.fn"
import { OrgWorkspaceSidebar } from "./org-workspace-sidebar.view.fn"
import { ConfirmProvider } from "../ui"

// Production consumers, controller, flows, parser and canonical history; only host/file IO is replaced.
vi.mock("@tanstack/react-router", () => ({ useBlocker: vi.fn(), useNavigate: () => vi.fn() }))
vi.mock("@/io/event/org-window-close.adapter", () => ({ registerOrgWindowClose: () => () => undefined }))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({
	orgWorkspaceEventAdapter: { listen: async () => () => undefined },
}))
vi.mock("@/io/file/org-file.repository", async (importOriginal) => {
	const actual = await importOriginal<typeof OrgFileRepositoryModule>()
	const repository = {
		...actual.orgFileRepository,
		openDefaultWorkspace: vi.fn(), scanWorkspace: vi.fn(), readDocument: vi.fn(), writeDocument: vi.fn(),
		watchWorkspace: vi.fn(), unwatchWorkspace: vi.fn(), releaseWorkspace: vi.fn(),
	}
	return { ...actual, orgFileRepository: repository, watchOrgWorkspace: repository.watchWorkspace,
		unwatchOrgWorkspace: repository.unwatchWorkspace, releaseOrgWorkspace: repository.releaseWorkspace }
})

let controller: OrgWorkspaceController
let workspace: OrgWorkspaceInterface
let disk: Map<string, OrgDocumentInterface>
let grant = 0
const disposers: (() => void)[] = []
type Surface = "inspector" | "backlinks" | "sidebar"

function Harness({ surface, inspectorActive = true }: { readonly surface: Surface; readonly inspectorActive?: boolean }) {
	controller = useOrgWorkspace()
	if (surface === "sidebar") return <OrgWorkspaceSidebar
		controller={controller}
		isBusy={controller.isWorkspaceBlocked}
		tools={null}
		onCreateDiary={() => undefined}
		onHide={() => undefined}
		onShowEditor={() => undefined}
	/>
	return surface === "inspector"
		? <OrgInspector controller={controller} onClose={() => undefined} active={inspectorActive} />
		: <OrgBacklinksContainer controller={controller} />
}

function attach(runtime: OrgBufferRuntime) {
	const windowId = `query-window-${disposers.length}`
	const release = controller.registerBufferWindow(windowId, runtime.key.bufferId)
	let handle!: OrgBufferWindowHandle
	const view = new EditorView({
		state: EditorState.create({ doc: runtime.state.doc, extensions: runtime.historyFreeSourceExtensions }),
		dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions),
	})
	handle = runtime.attachWindow({ windowId, view })
	disposers.push(() => { release(); handle.detach(); view.destroy() })
	return { view, handle }
}

async function open(path: string) {
	await act(async () => { expect(await controller.openDocumentPath(path)).toBe(true) })
}
async function query() {
	// Drain publications/passive effects before advancing the newly scheduled debounce.
	await act(async () => {})
	await act(async () => vi.advanceTimersByTimeAsync(ORG_BACKLINKS_DEBOUNCE_MS))
	// An ACK may publish its pending workspace refresh during the first debounce.
	// Consume that publication's query without advancing into the external poll.
	await act(async () => vi.advanceTimersByTimeAsync(ORG_BACKLINKS_DEBOUNCE_MS))
}
async function setup(surface: Surface) {
	render(<Harness surface={surface} />, { wrapper: ConfirmProvider })
	await act(async () => { await controller.openDefaultWorkspace() })
	await open("b.org")
	fireEvent.click(screen.getByRole("button", { name: /Backlinks/ }))
}

const writeFailure: OrgFileError = {
	type: "ORG_FILE_ERROR", operation: "write", command: "write_org_document", message: "simulated save failure", cause: "denied",
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.clearAllMocks()
	window.localStorage.clear()
	disk = new Map([
		["a.org", { relativePath: "a.org", content: "* Persisted A\r\nNo links 😀\0", revision: "a-1" }],
		["b.org", { relativePath: "b.org", content: "* Target B\n", revision: "b-1" }],
	])
	workspace = {
		rootPath: "/synthetic-query-workspace", capabilityToken: `query-grant-${++grant}`, directories: [],
		documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
	}
	vi.mocked(orgFileRepository.openDefaultWorkspace).mockImplementation(() => async () => E.right(workspace))
	vi.mocked(orgFileRepository.scanWorkspace).mockImplementation(() => async () => E.right({
		...workspace,
		documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
	}))
	vi.mocked(orgFileRepository.readDocument).mockImplementation((input) => async () => E.right({ ...disk.get(input.relativePath)! }))
	vi.mocked(orgFileRepository.writeDocument).mockImplementation((input) => async () => {
		const saved = { relativePath: input.relativePath, content: input.content, revision: `${input.relativePath}-saved` }
		disk.set(input.relativePath, saved)
		return E.right({ relativePath: saved.relativePath, revision: saved.revision })
	})
	vi.mocked(orgFileRepository.watchWorkspace).mockReturnValue(async () => E.right("query-watch"))
	vi.mocked(orgFileRepository.unwatchWorkspace).mockReturnValue(async () => E.right(undefined))
	vi.mocked(orgFileRepository.releaseWorkspace).mockReturnValue(async () => E.right(undefined))
})
afterEach(() => {
	while (disposers.length) disposers.pop()!()
	cleanup()
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe.each<Surface>(["inspector", "backlinks"])("production %s working-source queries", (surface) => {
	it("shows a failed-save parked backlink and reacts to real parked edits without writes or history mutations", async () => {
		await setup(surface)
		await open("a.org")
		const runtime = controller.activeBufferRuntime!
		const { view, handle } = attach(runtime)
		const source = "* Parked working A\r\n[[file:b.org][Unsaved reference]]\r\n😀\0"
		act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source } }))
		vi.mocked(orgFileRepository.writeDocument).mockReturnValueOnce(async () => E.left(writeFailure))
		await act(async () => { await controller.saveDocument() })
		expect(controller.isDirty).toBe(true)
		expect(disk.get("a.org")!.content).not.toContain("[[file:b.org")
		await open("b.org")
		const history = undoDepth(runtime.state)
		const sourceGeneration = runtime.revision
		vi.mocked(orgFileRepository.readDocument).mockClear()
		vi.mocked(orgFileRepository.writeDocument).mockClear()
		await query()
		expect(screen.getByText("Parked working A")).toBeInTheDocument()
		expect(controller.activeDocument?.relativePath).toBe("b.org")
		expect(runtime.source).toBe(source)
		expect(runtime.revision).toBe(sourceGeneration)
		expect(undoDepth(runtime.state)).toBe(history)
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
		const removed = "* No reference\r\n😀\0"
		act(() => view.dispatch({
			annotations: isolateHistory.of("full"),
			changes: { from: 0, to: view.state.doc.length, insert: removed },
		}))
		const editedHistory = runtime.state
		const editedGeneration = runtime.revision
		expect(screen.queryByText("Parked working A")).not.toBeInTheDocument()
		await query()
		expect(screen.getByText(/No backlinks/)).toBeInTheDocument()
		expect(runtime.source).toBe(removed)
		expect(runtime.revision).toBe(editedGeneration)
		expect(runtime.state).toBe(editedHistory)
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()

		act(() => { expect(handle.undo()).toBe(true) })
		expect(runtime.source).toBe(source)
		const undoneHistory = runtime.state
		const undoneGeneration = runtime.revision
		expect(undoDepth(runtime.state)).toBe(history)
		expect(redoDepth(runtime.state)).toBe(1)
		await query()
		expect(screen.getByText("Parked working A")).toBeInTheDocument()
		expect(runtime.state).toBe(undoneHistory)
		expect(runtime.revision).toBe(undoneGeneration)
		act(() => { expect(handle.redo()).toBe(true) })
		expect(runtime.source).toBe(removed)
		const redoneHistory = runtime.state
		const redoneGeneration = runtime.revision
		await query()
		expect(screen.getByText(/No backlinks/)).toBeInTheDocument()
		expect(runtime.state).toBe(redoneHistory)
		expect(runtime.revision).toBe(redoneGeneration)
		expect(disk.get("a.org")!.content).toBe("* Persisted A\r\nNo links 😀\0")
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("never substitutes a captured save ACK for newer canonical parked source", async () => {
		await setup(surface)
		await open("a.org")
		const runtime = controller.activeBufferRuntime!
		const { view, handle } = attach(runtime)
		const captured = "* Captured reference\r\n[[file:b.org]]\r\n😀\0"
		const newer = "* Newer source without links\r\n😀\0"
		act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: captured } }))
		let resolve!: (value: E.Either<OrgFileError, { readonly relativePath: string; readonly revision: string }>) => void
		vi.mocked(orgFileRepository.writeDocument).mockImplementationOnce((input) => () => new Promise((settle) => {
			resolve = (value) => { disk.set("a.org", { relativePath: "a.org", content: input.content, revision: "a-saved" }); settle(value) }
		}))
		let saving!: Promise<boolean>
		act(() => { saving = controller.saveDocument() })
		act(() => view.dispatch({
			annotations: isolateHistory.of("full"),
			changes: { from: 0, to: view.state.doc.length, insert: newer },
		}))
		const newerHistory = runtime.state
		const newerGeneration = runtime.revision
		const incarnation = controller.liveBuffers.find((buffer) => buffer.runtime === runtime)!.runtimeIncarnation
		await act(async () => { resolve(E.right({ relativePath: "a.org", revision: "a-saved" })); await saving })
		expect(controller.activeDocument).toMatchObject({
			relativePath: "a.org", revision: "a-saved", content: captured,
		})
		expect(controller.content).toBe(newer)
		expect(controller.isDirty).toBe(true)
		expect(runtime.state).toBe(newerHistory)
		expect(runtime.revision).toBe(newerGeneration)
		await open("b.org")
		expect(controller.liveBuffers.filter((buffer) => buffer.document.relativePath === "a.org")).toHaveLength(1)
		expect(controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a.org")).toMatchObject({
			document: { relativePath: "a.org", revision: "a-saved", content: captured },
			content: newer,
			isDirty: true,
			sourceGeneration: newerGeneration,
		})
		expect(controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a.org")?.runtime).toBe(runtime)
		expect(controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a.org")?.runtimeIncarnation)
			.toBe(incarnation)
		vi.mocked(orgFileRepository.readDocument).mockClear()
		vi.mocked(orgFileRepository.writeDocument).mockClear()
		await query()
		expect(disk.get("a.org")!.content).toBe(captured)
		expect(runtime.source).toBe(newer)
		expect(screen.queryByText("Captured reference")).not.toBeInTheDocument()
		expect(screen.getByText(/No backlinks/)).toBeInTheDocument()
		expect(runtime.state).toBe(newerHistory)
		expect(runtime.revision).toBe(newerGeneration)
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()

		act(() => { expect(handle.undo()).toBe(true) })
		expect(runtime.source).toBe(captured)
		expect(controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a.org")?.isDirty).toBe(false)
		const undoneHistory = runtime.state
		const undoneGeneration = runtime.revision
		expect(undoDepth(runtime.state)).toBe(1)
		expect(redoDepth(runtime.state)).toBe(1)
		await query()
		expect(screen.getByText("Captured reference")).toBeInTheDocument()
		expect(runtime.state).toBe(undoneHistory)
		expect(runtime.revision).toBe(undoneGeneration)
		act(() => { expect(handle.redo()).toBe(true) })
		expect(runtime.source).toBe(newer)
		expect(controller.liveBuffers.find((buffer) => buffer.document.relativePath === "a.org")?.isDirty).toBe(true)
		const redoneHistory = runtime.state
		const redoneGeneration = runtime.revision
		expect(undoDepth(runtime.state)).toBe(2)
		expect(redoDepth(runtime.state)).toBe(0)
		await query()
		expect(screen.getByText(/No backlinks/)).toBeInTheDocument()
		expect(runtime.state).toBe(redoneHistory)
		expect(runtime.revision).toBe(redoneGeneration)
		expect(disk.get("a.org")!.content).toBe(captured)
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("prunes removed disk sources and rereads a restored path even at the same scan revision", async () => {
		disk.set("a.org", { relativePath: "a.org", revision: "a-1", content: "* Disk reference\n[[file:b.org]]" })
		await setup(surface)
		await query()
		expect(screen.getByText("Disk reference")).toBeInTheDocument()
		disk.delete("a.org")
		workspace = { ...workspace, documents: workspace.documents.filter(({ relativePath }) => relativePath !== "a.org") }
		await act(async () => { await controller.refreshWorkspace() })
		expect(screen.queryByText("Disk reference")).not.toBeInTheDocument()
		await query()
		expect(screen.getByText(/No backlinks/)).toBeInTheDocument()
		disk.set("a.org", { relativePath: "a.org", revision: "a-1", content: "* Restored reference\n[[file:b.org]]" })
		workspace = { ...workspace, documents: [...workspace.documents, { relativePath: "a.org", revision: "a-1" }] }
		await act(async () => { await controller.refreshWorkspace() })
		await query()
		expect(screen.getByText("Restored reference")).toBeInTheDocument()
		expect(screen.queryByText("Disk reference")).not.toBeInTheDocument()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("hides old grant rows immediately and ignores a superseded disk completion after same-root grant replacement", async () => {
		disk.set("a.org", { relativePath: "a.org", revision: "a-1", content: "* Old grant reference\n[[file:b.org]]" })
		await setup(surface)
		let resolve!: (value: E.Either<OrgFileError, OrgDocumentInterface>) => void
		vi.mocked(orgFileRepository.readDocument).mockImplementationOnce(() => () => new Promise((settle) => { resolve = settle }))
		await query()
		workspace = { ...workspace, capabilityToken: `replacement-${++grant}` }
		disk.set("a.org", { relativePath: "a.org", revision: "a-1", content: "* Current grant reference\n[[file:b.org]]" })
		await act(async () => { await controller.openDefaultWorkspace() })
		await open("b.org")
		expect(screen.queryByText("Old grant reference")).not.toBeInTheDocument()
		await query()
		expect(screen.getByText("Current grant reference")).toBeInTheDocument()
		await act(async () => { resolve(E.right({ relativePath: "a.org", revision: "a-1", content: "* Old grant reference\n[[file:b.org]]" })) })
		expect(screen.getByText("Current grant reference")).toBeInTheDocument()
		expect(screen.queryByText("Old grant reference")).not.toBeInTheDocument()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("opens a real same-file backlink at its parsed source line", async () => {
		disk.set("b.org", { relativePath: "b.org", revision: "b-1", content: "* Same-file reference\n[[file:b.org]]" })
		await setup(surface)
		await query()
		await act(async () => fireEvent.click(screen.getByRole("button", { name: /Same-file reference/ })))
		expect(controller.activeDocument?.relativePath).toBe("b.org")
		expect(controller.revealTarget).toMatchObject({ relativePath: "b.org", line: 2 })
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})
})

describe("production workspace tree actions", () => {
	it("uses current controller authority after Source edits and buffer switches, and adopts catalog refreshes", async () => {
		render(<Harness surface="sidebar" />, { wrapper: ConfirmProvider })
		await act(async () => { await controller.openDefaultWorkspace() })
		await open("b.org")
		const { view } = attach(controller.activeBufferRuntime!)
		act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: "working input\0😀" } }))
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "a.org" })))
		expect(controller.activeDocument?.relativePath).toBe("a.org")
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "b.org" })))
		expect(controller.activeDocument?.relativePath).toBe("b.org")
		expect(controller.content).toContain("working input\0😀")

		disk.set("renamed.org", { relativePath: "renamed.org", revision: "renamed-1", content: "* Catalog addition" })
		disk.delete("a.org")
		await act(async () => { await controller.refreshWorkspace() })
		expect(screen.queryByRole("button", { name: "a.org" })).not.toBeInTheDocument()
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "renamed.org" })))
		expect(controller.activeDocument?.relativePath).toBe("renamed.org")
		expect(controller.content).toBe("* Catalog addition")
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})
})

describe("production inspector tab freshness", () => {
	it("derives the selected tab from current canonical Source after edits, history, buffer switches and disk adoption", async () => {
		const original = "#+TITLE: Original\r\n* First heading\r\nbody\0😀"
		disk.set("b.org", { relativePath: "b.org", revision: "b-1", content: original })
		const mounted = render(<Harness surface="inspector" />, { wrapper: ConfirmProvider })
		await act(async () => { await controller.openDefaultWorkspace() })
		await open("b.org")
		const { view, handle } = attach(controller.activeBufferRuntime!)
		fireEvent.click(screen.getByRole("button", { name: "Properties" }))
		expect(screen.getByText("Original")).toBeInTheDocument()

		const edited = "#+TITLE: Edited\r\n* Changed heading\r\nbody\0😀"
		mounted.rerender(<Harness surface="inspector" inspectorActive={false} />)
		act(() => view.dispatch({
			annotations: isolateHistory.of("full"),
			changes: { from: 0, to: view.state.doc.length, insert: edited },
		}))
		mounted.rerender(<Harness surface="inspector" />)
		expect(screen.getByText("Edited")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Outline" }))
		expect(screen.getByRole("button", { name: "Changed heading" })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "First heading" })).not.toBeInTheDocument()
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "Changed heading" })))
		expect(controller.revealTarget).toMatchObject({ relativePath: "b.org", line: 2 })

		fireEvent.click(screen.getByRole("button", { name: "Properties" }))
		act(() => { expect(handle.undo()).toBe(true) })
		expect(screen.getByText("Original")).toBeInTheDocument()
		act(() => { expect(handle.redo()).toBe(true) })
		expect(screen.getByText("Edited")).toBeInTheDocument()
		await open("a.org")
		expect(screen.queryByText("Edited")).not.toBeInTheDocument()
		await open("b.org")
		expect(screen.getByText("Edited")).toBeInTheDocument()

		act(() => { expect(handle.undo()).toBe(true) })
		expect(controller.isDirty).toBe(false)
		disk.set("b.org", { relativePath: "b.org", revision: "b-2", content: "#+TITLE: Adopted\r\n* Disk heading\r\nbody\0😀" })
		await act(async () => { await controller.refreshWorkspace() })
		expect(screen.getByText("Adopted")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Outline" }))
		expect(screen.getByRole("button", { name: "Disk heading" })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Changed heading" })).not.toBeInTheDocument()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})
})

describe("production link navigation working-source queries", () => {
	it("opens an unsaved parked ID target without rereading or changing its source/history", async () => {
		render(<Harness surface="inspector" />, { wrapper: ConfirmProvider })
		await act(async () => { await controller.openDefaultWorkspace() })
		await open("b.org")
		const runtime = controller.activeBufferRuntime!
		const { view } = attach(runtime)
		const source = "* Unsaved target\n:PROPERTIES:\n:ID: parked-id\n:END:\n😀\0"
		act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source } }))
		await open("a.org")
		const history = undoDepth(runtime.state)
		const generation = runtime.revision
		vi.mocked(orgFileRepository.readDocument).mockClear()
		await act(async () => {
			expect(await controller.openOrgLink({ kind: "id", relativePath: null, value: "parked-id" })).toBe(true)
		})
		expect(controller.activeDocument?.relativePath).toBe("b.org")
		expect(runtime.source).toBe(source)
		expect(runtime.revision).toBe(generation)
		expect(undoDepth(runtime.state)).toBe(history)
		expect(disk.get("b.org")!.content).not.toContain("parked-id")
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("does not activate or reveal a parked target changed while an earlier disk source is pending", async () => {
		render(<Harness surface="inspector" />, { wrapper: ConfirmProvider })
		await act(async () => { await controller.openDefaultWorkspace() })
		await open("b.org")
		const runtime = controller.activeBufferRuntime!
		const { view } = attach(runtime)
		act(() => view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: "* Target\n:PROPERTIES:\n:ID: parked-id\n:END:" },
		}))
		await open("a.org")
		const previousReveal = controller.revealTarget
		disk.set("0.org", { relativePath: "0.org", revision: "0-1", content: "* Earlier disk source" })
		workspace = { ...workspace, documents: [...workspace.documents, { relativePath: "0.org", revision: "0-1" }] }
		let resolve!: (value: E.Either<OrgFileError, OrgDocumentInterface>) => void
		vi.mocked(orgFileRepository.readDocument).mockImplementationOnce(() => () => new Promise((settle) => { resolve = settle }))
		let opening!: Promise<boolean>
		await act(async () => {
			opening = controller.openOrgLink({ kind: "id", relativePath: null, value: "parked-id" })
		})
		act(() => view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: "* New canonical target without that ID" },
		}))
		await act(async () => {
			resolve(E.right(disk.get("0.org")!))
			expect(await opening).toBe(false)
		})
		expect(controller.activeDocument?.relativePath).toBe("a.org")
		expect(controller.revealTarget).toBe(previousReveal)
		expect(runtime.source).toBe("* New canonical target without that ID")
		expect(controller.error).toContain("target changed while resolving")
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})
})
