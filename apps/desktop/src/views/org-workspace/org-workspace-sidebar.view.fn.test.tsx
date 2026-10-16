import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgBufferWindowHandle } from "@/flows/org-editor-runtime"
import { useOrgWorkspace, type OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { orgFileRepository } from "@/io/file/org-file.repository"
import type * as OrgFileRepositoryModule from "@/io/file/org-file.repository"
import { render } from "@/test/application-providers"
import type { OrgDocumentInterface, OrgWorkspaceInterface } from "@/types/org"
import { ConfirmProvider } from "../ui"
import { OrgWorkspaceSidebar } from "./org-workspace-sidebar.view.fn"

// Production navigation, file operations, Source and history; only host/file IO is replaced.
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
		moveDocument: vi.fn(), deleteDocument: vi.fn(), createDirectory: vi.fn(), revealWorkspacePath: vi.fn(),
		watchWorkspace: vi.fn(), unwatchWorkspace: vi.fn(), releaseWorkspace: vi.fn(),
	}
	return {
		...actual, orgFileRepository: repository, moveOrgDocument: repository.moveDocument,
		deleteOrgDocument: repository.deleteDocument, watchOrgWorkspace: repository.watchWorkspace,
		unwatchOrgWorkspace: repository.unwatchWorkspace, releaseOrgWorkspace: repository.releaseWorkspace,
		createOrgDirectory: repository.createDirectory, writeOrgDocument: repository.writeDocument,
	}
})

let controller: OrgWorkspaceController
let workspace: OrgWorkspaceInterface
let disk: Map<string, OrgDocumentInterface>
let grant = 0
const disposers: (() => void)[] = []
const treeKey = "grain:org-tree:/sidebar-navigation"
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard")

function Harness({ sidebar = true, busy = false }: { readonly sidebar?: boolean; readonly busy?: boolean }) {
	controller = useOrgWorkspace()
	return sidebar ? <OrgWorkspaceSidebar
		controller={controller}
		isBusy={busy || controller.isWorkspaceBlocked}
		tools={null}
		onFocusEditor={() => undefined}
		onHide={() => undefined}
		onShowEditor={() => undefined}
	/> : null
}

async function setup(sidebar = true) {
	const mounted = render(<Harness sidebar={sidebar} />, { wrapper: ConfirmProvider })
	await act(async () => { await controller.openDefaultWorkspace() })
	return mounted
}

async function open(path: string) {
	await act(async () => { expect(await controller.openDocumentPath(path)).toBe(true) })
}

async function menu(trigger: string, action: string) {
	fireEvent.keyDown(screen.getByRole("button", { name: trigger }), { key: "ArrowDown" })
	fireEvent.click(await screen.findByRole("menuitem", { name: action }))
}

function attachSource() {
	const runtime = controller.activeBufferRuntime!
	const windowId = `sidebar-source-${disposers.length}`
	const release = controller.registerBufferWindow(windowId, runtime.key.bufferId)
	let handle!: OrgBufferWindowHandle
	const view = new EditorView({
		state: EditorState.create({ doc: runtime.state.doc, extensions: runtime.historyFreeSourceExtensions }),
		dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions),
	})
	handle = runtime.attachWindow({ windowId, view })
	disposers.push(() => { release(); handle.detach(); view.destroy() })
	return { runtime, view, handle }
}

beforeEach(() => {
	vi.clearAllMocks()
	window.localStorage.clear()
	disk = new Map([
		["root.org", { relativePath: "root.org", content: "* Root\n", revision: "root-1" }],
		["archive/old.org", { relativePath: "archive/old.org", content: "* Old\n", revision: "old-1" }],
		["projects/book/overview.org", { relativePath: "projects/book/overview.org", content: "* Overview\nbody\n", revision: "overview-1" }],
	])
	workspace = {
		rootPath: "/sidebar-navigation", capabilityToken: `sidebar-grant-${++grant}`,
		directories: ["archive", "projects", "projects/book"],
		documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
	}
	vi.mocked(orgFileRepository.openDefaultWorkspace).mockReturnValue(async () => E.right(workspace))
	vi.mocked(orgFileRepository.scanWorkspace).mockImplementation(() => async () => E.right({
		...workspace, documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
	}))
	vi.mocked(orgFileRepository.readDocument).mockImplementation((input) => async () => E.right({ ...disk.get(input.relativePath)! }))
	vi.mocked(orgFileRepository.watchWorkspace).mockReturnValue(async () => E.right("sidebar-watch"))
	vi.mocked(orgFileRepository.unwatchWorkspace).mockReturnValue(async () => E.right(undefined))
	vi.mocked(orgFileRepository.releaseWorkspace).mockReturnValue(async () => E.right(undefined))
	vi.mocked(orgFileRepository.revealWorkspacePath).mockReturnValue(async () => E.right(undefined))
	vi.mocked(orgFileRepository.createDirectory).mockImplementation((input) => async () => {
		workspace = { ...workspace, directories: [...workspace.directories, input.relativePath] }
		return E.right(undefined)
	})
	vi.mocked(orgFileRepository.writeDocument).mockImplementation((input) => async () => {
		if (disk.has(input.relativePath)) return E.left({
			type: "ORG_FILE_ERROR", operation: "write", command: "write_org_document", message: "occupied",
			cause: { kind: "creation-collision", relativePath: input.relativePath, noWrite: true },
		})
		const document = { relativePath: input.relativePath, revision: "created-1", content: input.content }
		disk.set(input.relativePath, document)
		return E.right({ relativePath: document.relativePath, revision: document.revision })
	})
	vi.mocked(orgFileRepository.moveDocument).mockImplementation((input) => async () => {
		const source = disk.get(input.sourceRelativePath)!
		const moved = { ...source, relativePath: input.targetRelativePath, revision: "moved-1" }
		disk.delete(input.sourceRelativePath)
		disk.set(moved.relativePath, moved)
		return E.right({ relativePath: moved.relativePath, revision: moved.revision })
	})
	vi.mocked(orgFileRepository.deleteDocument).mockImplementation((input) => async () => {
		disk.delete(input.relativePath)
		return E.right({ relativePath: ".grain/recovery/deleted.org", sourceRelativePath: input.relativePath, kind: "delete" as const, object: "original" as const })
	})
})

afterEach(() => {
	while (disposers.length) disposers.pop()!()
	cleanup()
	vi.restoreAllMocks()
	if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard)
	else Reflect.deleteProperty(navigator, "clipboard")
})

describe("workspace sidebar navigation", () => {
	it("starts compact and reveals a newly active ancestor chain only once", async () => {
		await setup()
		expect(screen.getByRole("treeitem", { name: "archive" })).toHaveAttribute("aria-expanded", "false")
		expect(screen.getByRole("treeitem", { name: "projects" })).toHaveAttribute("aria-expanded", "false")
		expect(screen.queryByRole("treeitem", { name: "projects/book/overview.org" })).not.toBeInTheDocument()
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
			return this.getAttribute("aria-current") === "page"
				? { top: 180, bottom: 212 } as DOMRect
				: { top: 0, bottom: 100 } as DOMRect
		})
		await open("projects/book/overview.org")
		expect(screen.getByRole("treeitem", { name: "projects" })).toHaveAttribute("aria-expanded", "true")
		expect(screen.getByRole("treeitem", { name: "projects/book" })).toHaveAttribute("aria-expanded", "true")
		expect(screen.getByRole("treeitem", { name: "projects/book/overview.org" })).toHaveAttribute("aria-current", "page")
		expect(screen.getByRole("treeitem", { name: "archive" })).toHaveAttribute("aria-expanded", "false")
		const viewport = screen.getByRole("complementary", { name: "Workspace files" }).querySelector(".overflow-auto")!
		expect(viewport.scrollTop).toBe(112)
		fireEvent.click(screen.getByRole("treeitem", { name: "projects" }))
		const { view } = attachSource()
		view.scrollDOM.scrollTop = 37
		act(() => view.dispatch({ changes: { from: 0, insert: "Unsaved input\n" } }))
		expect(screen.getByRole("treeitem", { name: "projects" })).toHaveAttribute("aria-expanded", "false")
		expect(viewport.scrollTop).toBe(112)
		expect(view.scrollDOM.scrollTop).toBe(37)
		await open("root.org")
		await open("projects/book/overview.org")
		expect(screen.getByRole("treeitem", { name: "projects/book/overview.org" })).toHaveAttribute("aria-current", "page")
		expect(view.scrollDOM.scrollTop).toBe(37)
	})

	it("restores saved expansion, including an intentionally collapsed active file, across sidebar mounts", async () => {
		window.localStorage.setItem(treeKey, "[]")
		const mounted = await setup()
		expect(screen.getByRole("treeitem", { name: "archive/old.org" })).toBeInTheDocument()
		await open("projects/book/overview.org")
		fireEvent.click(screen.getByRole("treeitem", { name: "projects" }))
		mounted.rerender(<Harness sidebar={false} />)
		mounted.rerender(<Harness />)
		expect(screen.getByRole("treeitem", { name: "projects" })).toHaveAttribute("aria-expanded", "false")
		expect(screen.getByRole("treeitem", { name: "archive/old.org" })).toBeInTheDocument()
		await menu("Workspace root actions", "Reveal active file")
		expect(screen.getByRole("treeitem", { name: "projects/book/overview.org" })).toHaveAttribute("aria-current", "page")
	})

	it.each([false, true])("scrolls to the actual active file on mount with saved expansion: %s", async (savedExpansion) => {
		const mounted = await setup(false)
		await open("projects/book/overview.org")
		if (savedExpansion) window.localStorage.setItem(treeKey, "[]")
		const { view, runtime } = attachSource()
		view.scrollDOM.scrollTop = 37
		const state = runtime.state
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
			return this.getAttribute("aria-current") === "page"
				? { top: 180, bottom: 212 } as DOMRect
				: { top: 0, bottom: 100 } as DOMRect
		})
		mounted.rerender(<Harness />)
		expect(screen.getByRole("treeitem", { name: "projects/book/overview.org" })).toHaveAttribute("aria-current", "page")
		expect(screen.getByRole("treeitem", { name: "archive" })).toHaveAttribute("aria-expanded", String(savedExpansion))
		const viewport = screen.getByRole("complementary", { name: "Workspace files" }).querySelector(".overflow-auto")!
		expect(viewport.scrollTop).toBe(112)
		expect(view.scrollDOM.scrollTop).toBe(37)
		expect(runtime.state).toBe(state)
	})

	it("reveals through a nonmatching filter and scrolls only the file viewport without changing Source or history", async () => {
		await setup()
		await open("projects/book/overview.org")
		const { runtime, view, handle } = attachSource()
		act(() => view.dispatch({ changes: { from: 0, insert: "Working 😀\n" }, selection: { anchor: 4 } }))
		const state = runtime.state
		const revision = runtime.revision
		const sourceSelection = view.state.selection
		const sourceScrollTop = view.scrollDOM.scrollTop
		const revealTarget = controller.revealTarget
		fireEvent.click(screen.getByRole("treeitem", { name: "projects" }))
		fireEvent.change(screen.getByRole("textbox", { name: "Filter workspace files" }), { target: { value: "no-such-file" } })
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
			return this.getAttribute("aria-current") === "page"
				? { top: 180, bottom: 212 } as DOMRect
				: { top: 0, bottom: 100 } as DOMRect
		})
		await menu("Workspace root actions", "Reveal active file")
		const row = screen.getByRole("treeitem", { name: "projects/book/overview.org" })
		const viewport = row.closest("aside")!.querySelector(".overflow-auto")!
		expect(screen.getByRole("textbox", { name: "Filter workspace files" })).toHaveValue("")
		expect(viewport.scrollTop).toBe(112)
		expect(view.scrollDOM.scrollTop).toBe(sourceScrollTop)
		expect(view.state.selection).toBe(sourceSelection)
		expect(runtime.state).toBe(state)
		expect(runtime.revision).toBe(revision)
		expect(controller.revealTarget).toBe(revealTarget)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
		act(() => { expect(handle.undo()).toBe(true) })
		expect(runtime.source).toBe("* Overview\nbody\n")
		act(() => { expect(handle.redo()).toBe(true) })
		expect(runtime.source).toBe("Working 😀\n* Overview\nbody\n")
	})

	it("collapses all folders persistently and retains a matching reveal filter", async () => {
		const mounted = await setup()
		await open("projects/book/overview.org")
		fireEvent.change(screen.getByRole("textbox", { name: "Filter workspace files" }), { target: { value: "overview" } })
		await menu("Workspace root actions", "Reveal active file")
		expect(screen.getByRole("textbox", { name: "Filter workspace files" })).toHaveValue("overview")
		await menu("Workspace root actions", "Collapse all")
		expect(screen.getByRole("textbox", { name: "Filter workspace files" })).toHaveValue("")
		expect(screen.getByRole("treeitem", { name: "projects" })).toHaveAttribute("aria-expanded", "false")
		expect(screen.getByRole("treeitem", { name: "archive" })).toHaveAttribute("aria-expanded", "false")
		mounted.rerender(<Harness sidebar={false} />)
		mounted.rerender(<Harness />)
		expect(screen.getByRole("treeitem", { name: "projects" })).toHaveAttribute("aria-expanded", "false")
		fireEvent.click(screen.getByRole("treeitem", { name: "archive" }))
		await act(async () => fireEvent.click(screen.getByRole("treeitem", { name: "archive/old.org" })))
		await waitFor(() => expect(controller.activeDocument?.relativePath).toBe("archive/old.org"))
		expect(screen.getByRole("treeitem", { name: "archive/old.org" })).toHaveAttribute("aria-current", "page")
	})

	it("filters from the tree keyboard, opens a matching file, and returns without replacing parked dirty history", async () => {
		await setup()
		await open("projects/book/overview.org")
		const { runtime, view, handle } = attachSource()
		act(() => view.dispatch({ changes: { from: 0, insert: "Keep this draft\n" } }))
		const state = runtime.state
		const root = screen.getByRole("treeitem", { name: "root.org" })
		act(() => root.focus())
		fireEvent.keyDown(root, { key: "f", ctrlKey: true })
		fireEvent.keyUp(root, { key: "f", ctrlKey: true })
		const filter = screen.getByRole("textbox", { name: "Filter workspace files" })
		expect(filter).toHaveFocus()
		fireEvent.change(filter, { target: { value: "old" } })
		await act(async () => fireEvent.keyDown(filter, { key: "Enter", isComposing: true, keyCode: 229 }))
		expect(filter).toHaveFocus()
		expect(controller.activeDocument?.relativePath).toBe("projects/book/overview.org")
		fireEvent.keyDown(filter, { key: "ArrowDown", shiftKey: true })
		expect(filter).toHaveFocus()
		fireEvent.keyDown(filter, { key: "ArrowDown" })
		expect(screen.getByRole("treeitem", { name: "archive/old.org" })).toHaveFocus()
		expect(controller.activeDocument?.relativePath).toBe("projects/book/overview.org")
		act(() => filter.focus())
		await act(async () => fireEvent.keyDown(filter, { key: "Enter" }))
		await waitFor(() => expect(controller.activeDocument?.relativePath).toBe("archive/old.org"))
		expect(runtime.state).toBe(state)
		act(() => filter.focus())
		fireEvent.keyDown(filter, { key: "Escape" })
		expect(filter).toHaveValue("")
		expect(filter).toHaveFocus()
		fireEvent.keyDown(filter, { key: "Escape" })
		expect(screen.getByRole("treeitem", { name: "archive/old.org" })).toHaveFocus()
		act(() => { expect(handle.undo()).toBe(true) })
		expect(runtime.source).toBe("* Overview\nbody\n")
	})

	it("suggests unoccupied creation targets and reveals a new directory through an unrelated filter", async () => {
		disk.set("untitled.org", { relativePath: "untitled.org", revision: "existing", content: "* Keep existing\n" })
		workspace = {
			...workspace,
			directories: [...workspace.directories, "notes", "new-folder", "new-folder-2"],
			documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
		}
		await setup()
		await menu("Workspace root actions", "New Org file…")
		let input = await screen.findByRole("combobox", { name: "Workspace-relative path" })
		const documentPath = (input as HTMLInputElement).value
		expect(disk.has(documentPath)).toBe(false)
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		await waitFor(() => expect(controller.activeDocument?.relativePath).toBe(documentPath))
		expect(disk.get("untitled.org")?.content).toBe("* Keep existing\n")
		fireEvent.change(screen.getByRole("textbox", { name: "Filter workspace files" }), { target: { value: "not-a-match" } })
		await menu("Workspace root actions", "New directory…")
		input = await screen.findByRole("combobox", { name: "Workspace-relative path" })
		const directoryPath = (input as HTMLInputElement).value
		expect(workspace.directories).not.toContain(directoryPath)
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		await waitFor(() => expect(screen.getByRole("treeitem", { name: directoryPath })).toHaveFocus())
		expect(screen.getByRole("textbox", { name: "Filter workspace files" })).toHaveValue("")
		expect(controller.activeDocument?.relativePath).toBe(documentPath)
	})

	it("uses F2 and confirmed Delete on the selected file while F5 publishes external files without replacing Source", async () => {
		await setup()
		await open("projects/book/overview.org")
		const { runtime, view } = attachSource()
		act(() => view.dispatch({ changes: { from: 0, insert: "Draft survives\n" } }))
		const state = runtime.state
		act(() => screen.getByRole("treeitem", { name: "root.org" }).focus())
		fireEvent.keyDown(document.activeElement!, { key: "F2" })
		fireEvent.keyUp(document.activeElement!, { key: "F2" })
		const input = await screen.findByRole("combobox", { name: "New filename" })
		fireEvent.change(input, { target: { value: "keyboard.org" } })
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		await waitFor(() => expect(screen.getByRole("treeitem", { name: "keyboard.org" })).toHaveFocus())
		fireEvent.keyDown(document.activeElement!, { key: "Delete" })
		fireEvent.keyUp(document.activeElement!, { key: "Delete" })
		const confirmation = await screen.findByRole("dialog", { name: "Delete this file?" })
		expect(within(confirmation).getByRole("button", { name: "Cancel" })).toHaveFocus()
		await act(async () => fireEvent.click(within(confirmation).getByRole("button", { name: "Cancel" })))
		expect(disk.get("keyboard.org")?.content).toBe("* Root\n")
		disk.set("external.org", { relativePath: "external.org", revision: "external", content: "* External\n" })
		act(() => screen.getByRole("treeitem", { name: "keyboard.org" }).focus())
		await act(async () => fireEvent.keyDown(document.activeElement!, { key: "F5" }))
		fireEvent.keyUp(document.activeElement!, { key: "F5" })
		expect(await screen.findByRole("treeitem", { name: "external.org" })).toBeInTheDocument()
		expect(controller.activeDocument?.relativePath).toBe("projects/book/overview.org")
		expect(runtime.state).toBe(state)
	})

	it("renames and deletes an unopened selected file without replacing dirty Source or its history", async () => {
		await setup()
		await open("projects/book/overview.org")
		const { runtime, view, handle } = attachSource()
		act(() => view.dispatch({ changes: { from: 0, insert: "Working 😀\n" }, selection: { anchor: 4 } }))
		const state = runtime.state
		const selection = view.state.selection
		vi.mocked(orgFileRepository.readDocument).mockClear()
		await menu("Actions for root.org", "Rename…")
		const input = await screen.findByRole("combobox", { name: "New filename" })
		fireEvent.change(input, { target: { value: "  renamed-root.org  " } })
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		await waitFor(() => expect(disk.has("renamed-root.org")).toBe(true))
		expect(disk.has("root.org")).toBe(false)
		expect(controller.activeDocument?.relativePath).toBe("projects/book/overview.org")
		expect(runtime.state).toBe(state)
		await waitFor(() => expect(screen.getByRole("treeitem", { name: "renamed-root.org" })).toHaveFocus())
		await menu("Actions for renamed-root.org", "Delete…")
		const confirmation = await screen.findByRole("dialog", { name: "Delete this file?" })
		expect(confirmation).toHaveTextContent("renamed-root.org")
		await act(async () => fireEvent.click(within(confirmation).getByRole("button", { name: "Cancel" })))
		expect(disk.has("renamed-root.org")).toBe(true)
		await menu("Actions for renamed-root.org", "Delete…")
		await act(async () => fireEvent.click(within(screen.getByRole("dialog", { name: "Delete this file?" })).getByRole("button", { name: "Delete" })))
		await waitFor(() => expect(disk.has("renamed-root.org")).toBe(false))
		expect([...disk.keys()].sort()).toEqual(["archive/old.org", "projects/book/overview.org"])
		expect(controller.workspace?.originalRecoveries).toContainEqual({
			relativePath: ".grain/recovery/deleted.org", sourceRelativePath: "renamed-root.org", kind: "delete", object: "original",
		})
		expect(orgFileRepository.deleteDocument).toHaveBeenCalledWith(expect.objectContaining({
			relativePath: "renamed-root.org", expectedRevision: "moved-1",
		}))
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(runtime.state).toBe(state)
		expect(view.state.selection).toBe(selection)
		act(() => { expect(handle.undo()).toBe(true) })
		expect(runtime.source).toBe("* Overview\nbody\n")
	})

	it("uses ordinary tree navigation, ignores letters, and cancels a directory-targeted reader", async () => {
		await setup()
		await open("projects/book/overview.org")
		const { runtime, view, handle } = attachSource()
		act(() => view.dispatch({ changes: { from: 0, insert: "中文 😀\n" }, selection: { anchor: 3 } }))
		const state = runtime.state
		const selection = view.state.selection
		vi.mocked(orgFileRepository.readDocument).mockClear()
		const press = (key: string, shiftKey = false) => {
			fireEvent.keyDown(document.activeElement!, { key, shiftKey })
			fireEvent.keyUp(document.activeElement!, { key, shiftKey })
		}
		act(() => screen.getByRole("treeitem", { name: "root.org" }).focus())
		for (const key of ["j", "k", "h", "l", "g", "G", "c", "d", "r", "?"]) press(key)
		expect(screen.getByRole("treeitem", { name: "root.org" })).toHaveFocus()
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		press("ArrowUp")
		expect(screen.getByRole("treeitem", { name: "projects/book/overview.org" })).toHaveFocus()
		press("ArrowLeft")
		expect(screen.getByRole("treeitem", { name: "projects/book" })).toHaveFocus()
		press("ArrowLeft")
		expect(screen.getByRole("treeitem", { name: "projects/book" })).toHaveAttribute("aria-expanded", "false")
		press("ArrowLeft")
		expect(screen.getByRole("treeitem", { name: "projects" })).toHaveFocus()
		press("Home")
		expect(screen.getByRole("treeitem", { name: "archive" })).toHaveFocus()
		press("End")
		expect(screen.getByRole("treeitem", { name: "root.org" })).toHaveFocus()
		press("Home"); press("F10", true)
		fireEvent.click(await screen.findByRole("menuitem", { name: "New Org file…" }))
		const input = await screen.findByRole("combobox", { name: "Workspace-relative path" })
		expect(input).toHaveValue("archive/untitled.org")
		press("Escape")
		await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument())
		expect(screen.getByRole("treeitem", { name: "archive" })).toHaveFocus()
		expect(controller.activeDocument?.relativePath).toBe("projects/book/overview.org")
		expect(runtime.state).toBe(state)
		expect(view.state.selection).toBe(selection)
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
		act(() => { expect(handle.undo()).toBe(true) })
		expect(runtime.source).toBe("* Overview\nbody\n")
	})

	it("right-clicks a file without opening Source and restores row focus after Escape or the keyboard menu key", async () => {
		await setup()
		await open("projects/book/overview.org")
		const runtime = controller.activeBufferRuntime!
		const state = runtime.state
		const row = screen.getByRole("treeitem", { name: "root.org" })
		fireEvent.contextMenu(row, { clientX: 140, clientY: 210 })
		expect(await screen.findByRole("menuitem", { name: "Move to…" })).toBeInTheDocument()
		expect(row).toHaveAttribute("aria-selected", "true")
		expect(controller.activeDocument?.relativePath).toBe("projects/book/overview.org")
		fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
		await waitFor(() => expect(row).toHaveFocus())
		fireEvent.keyDown(row, { key: "ContextMenu" })
		fireEvent.click(await screen.findByRole("menuitem", { name: "Copy Org link" }))
		expect(runtime.state).toBe(state)
		await waitFor(() => expect(row).toHaveFocus())
	})

	it("targets directories for creation and expansion without offering unsupported mutations", async () => {
		await setup()
		const row = screen.getByRole("treeitem", { name: "archive" })
		fireEvent.contextMenu(row)
		expect(screen.queryByRole("menuitem", { name: "Rename…" })).not.toBeInTheDocument()
		expect(screen.queryByRole("menuitem", { name: "Delete…" })).not.toBeInTheDocument()
		fireEvent.click(await screen.findByRole("menuitem", { name: "Expand" }))
		expect(row).toHaveAttribute("aria-expanded", "true")
		await menu("Actions for archive", "New directory…")
		const input = await screen.findByRole("combobox", { name: "Workspace-relative path" })
		const directoryPath = (input as HTMLInputElement).value
		expect(directoryPath.startsWith("archive/")).toBe(true)
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		await waitFor(() => expect(controller.workspace?.directories).toContain(directoryPath))
		await menu("Actions for archive", "Collapse")
		expect(row).toHaveAttribute("aria-expanded", "false")
	})

	it.each(["viewport", "title", "button"] as const)("keeps %s actions explicitly rooted after selecting a directory", async (entry) => {
		await setup()
		act(() => screen.getByRole("treeitem", { name: "projects" }).focus())
		if (entry === "button") fireEvent.keyDown(screen.getByRole("button", { name: "Workspace root actions" }), { key: "ArrowDown" })
		else fireEvent.contextMenu(entry === "viewport" ? screen.getByLabelText("Workspace file viewport") : screen.getByRole("heading", { name: "Files" }))
		fireEvent.click(await screen.findByRole("menuitem", { name: "New Org file…" }))
		const input = await screen.findByRole("combobox", { name: "Workspace-relative path" })
		expect(input).toHaveValue("untitled.org")
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		await waitFor(() => expect(disk.has("untitled.org")).toBe(true))
		expect(disk.has("projects/untitled.org")).toBe(false)
	})

	it("keeps the filter's native text context menu", async () => {
		await setup()
		fireEvent.contextMenu(screen.getByRole("textbox", { name: "Filter workspace files" }))
		expect(screen.queryByRole("menu")).not.toBeInTheDocument()
	})

	it("renames only the captured basename, retaining validation and failed operation input", async () => {
		await setup()
		fireEvent.click(screen.getByRole("treeitem", { name: "archive" }))
		await menu("Actions for archive/old.org", "Rename…")
		const input = await screen.findByRole("combobox", { name: "New filename" })
		expect(input).toHaveValue("old.org")
		for (const value of ["../escape.org", "root.org/new.org", "bad\\new.org", "..", "not-org.txt"]) {
			fireEvent.change(input, { target: { value } })
			await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
			expect(input).toHaveValue(value)
		}
		expect(orgFileRepository.moveDocument).not.toHaveBeenCalled()
		vi.mocked(orgFileRepository.moveDocument).mockReturnValueOnce(async () => E.left({
			type: "ORG_FILE_ERROR", operation: "move", command: "move_org_document", message: "occupied", cause: null,
		}))
		fireEvent.change(input, { target: { value: "renamed.org" } })
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		expect(input).toHaveValue("renamed.org")
		expect(screen.getByRole("alert")).toBeInTheDocument()
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		await waitFor(() => expect(disk.has("archive/renamed.org")).toBe(true))
		expect(disk.has("renamed.org")).toBe(false)
		await waitFor(() => expect(screen.getByRole("treeitem", { name: "archive/renamed.org" })).toHaveFocus())
	})

	it("moves to existing directories and explicit root while retaining the filename and unrelated dirty history", async () => {
		await setup()
		await open("projects/book/overview.org")
		const { runtime, view, handle } = attachSource()
		act(() => view.dispatch({ changes: { from: 0, insert: "Dirty unrelated\n" } }))
		const state = runtime.state
		await menu("Actions for root.org", "Move to…")
		let input = await screen.findByRole("combobox", { name: "Destination directory" })
		expect(input).toHaveValue("/")
		expect(screen.getByRole("option", { name: /Workspace root/ })).toBeInTheDocument()
		fireEvent.change(input, { target: { value: "archive" } })
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		await waitFor(() => expect(disk.has("archive/root.org")).toBe(true))
		await waitFor(() => expect(screen.getByRole("treeitem", { name: "archive/root.org" })).toHaveFocus())
		await menu("Actions for archive/root.org", "Move to…")
		input = await screen.findByRole("combobox", { name: "Destination directory" })
		fireEvent.change(input, { target: { value: "/" } })
		fireEvent.keyDown(input, { key: "Tab" })
		expect(input).toHaveValue("/")
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		await waitFor(() => expect(disk.has("root.org")).toBe(true))
		expect(runtime.state).toBe(state)
		expect(controller.activeDocument?.relativePath).toBe("projects/book/overview.org")
		act(() => { expect(handle.undo()).toBe(true) })
		expect(runtime.source).toBe("* Overview\nbody\n")
	})

	it("retains failed creation input and disables unavailable menu actions with a reason", async () => {
		const mounted = await setup()
		await menu("Workspace root actions", "New Org file…")
		const input = await screen.findByRole("combobox", { name: "Workspace-relative path" })
		fireEvent.change(input, { target: { value: "root.org" } })
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		expect(input).toHaveValue("root.org")
		expect(screen.getByRole("alert")).toBeInTheDocument()
		fireEvent.keyDown(input, { key: "Escape" })
		mounted.rerender(<Harness busy />)
		fireEvent.contextMenu(screen.getByRole("treeitem", { name: "root.org" }))
		const rename = await screen.findByRole("menuitem", { name: "Rename…" })
		expect(rename).toHaveAttribute("aria-disabled", "true")
		fireEvent.click(rename)
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(orgFileRepository.moveDocument).not.toHaveBeenCalled()
	})

	it("rejects a menu whose captured file revision changed", async () => {
		await setup()
		fireEvent.contextMenu(screen.getByRole("treeitem", { name: "root.org" }))
		await screen.findByRole("menuitem", { name: "Rename…" })
		disk.set("root.org", { ...disk.get("root.org")!, revision: "external-2" })
		await act(async () => controller.refreshWorkspace())
		const rename = screen.getByRole("menuitem", { name: "Rename…" })
		expect(rename).toHaveAttribute("aria-disabled", "true")
		fireEvent.click(rename)
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(orgFileRepository.moveDocument).not.toHaveBeenCalled()
	})

	it("retains a failed move destination and never creates a missing destination directory", async () => {
		await setup()
		await menu("Actions for root.org", "Move to…")
		const input = await screen.findByRole("combobox", { name: "Destination directory" })
		fireEvent.change(input, { target: { value: "missing-directory" } })
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		expect(input).toHaveValue("missing-directory")
		expect(orgFileRepository.moveDocument).not.toHaveBeenCalled()
		expect(orgFileRepository.createDirectory).not.toHaveBeenCalled()
		vi.mocked(orgFileRepository.moveDocument).mockReturnValueOnce(async () => E.left({
			type: "ORG_FILE_ERROR", operation: "move", command: "move_org_document", message: "occupied", cause: null,
		}))
		fireEvent.change(input, { target: { value: "archive" } })
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		expect(input).toHaveValue("archive")
		expect(screen.getByRole("alert")).toBeInTheDocument()
		expect(disk.has("root.org")).toBe(true)
		fireEvent.keyDown(input, { key: "Escape" })
		await waitFor(() => expect(screen.getByRole("treeitem", { name: "root.org" })).toHaveFocus())
	})

	it("retains a failed directory reader until cancelled", async () => {
		await setup()
		vi.mocked(orgFileRepository.createDirectory).mockReturnValueOnce(async () => E.left({
			type: "ORG_FILE_ERROR", operation: "createDirectory", command: "create_org_directory", message: "denied", cause: null,
		}))
		await menu("Workspace root actions", "New directory…")
		const input = await screen.findByRole("combobox", { name: "Workspace-relative path" })
		fireEvent.change(input, { target: { value: "unwritable-directory" } })
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		expect(input).toHaveValue("unwritable-directory")
		expect(screen.getByRole("alert")).toBeInTheDocument()
		fireEvent.keyDown(input, { key: "Escape" })
		await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument())
	})

	it("disables dirty-file relocation without blocking opening or confirmed deletion", async () => {
		await setup()
		await open("root.org")
		const { runtime, view, handle } = attachSource()
		act(() => view.dispatch({ changes: { from: 0, insert: "Unsaved draft\n" } }))
		const state = runtime.state
		fireEvent.contextMenu(screen.getByRole("treeitem", { name: "root.org" }))
		expect(await screen.findByRole("menuitem", { name: "Rename…" })).toHaveAttribute("aria-disabled", "true")
		expect(screen.getByRole("menuitem", { name: "Move to…" })).toHaveAttribute("aria-disabled", "true")
		expect(screen.getByRole("menuitem", { name: "Open" })).not.toHaveAttribute("aria-disabled", "true")
		fireEvent.click(screen.getByRole("menuitem", { name: "Delete…" }))
		const confirmation = await screen.findByRole("dialog", { name: "Delete this file?" })
		await act(async () => fireEvent.click(within(confirmation).getByRole("button", { name: "Cancel" })))
		expect(disk.get("root.org")?.content).toBe("* Root\n")
		expect(runtime.state).toBe(state)
		act(() => { expect(handle.undo()).toBe(true) })
		expect(runtime.source).toBe("* Root\n")
	})

	it("rejects a rename reader after newer target Source input", async () => {
		await setup()
		await open("root.org")
		await menu("Actions for root.org", "Rename…")
		const input = await screen.findByRole("combobox", { name: "New filename" })
		act(() => controller.updateContent("Newer source while collecting a name"))
		fireEvent.change(input, { target: { value: "new.org" } })
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		expect(input).toHaveValue("new.org")
		expect(orgFileRepository.moveDocument).not.toHaveBeenCalled()
		expect(controller.content).toBe("Newer source while collecting a name")
		expect(controller.isDirty).toBe(true)
	})

	it("expands with ArrowRight and opens only the focused file with Enter", async () => {
		await setup()
		const directory = screen.getByRole("treeitem", { name: "archive" })
		act(() => directory.focus())
		fireEvent.keyDown(directory, { key: "ArrowRight" })
		expect(directory).toHaveAttribute("aria-expanded", "true")
		fireEvent.keyDown(directory, { key: "ArrowRight" })
		const file = screen.getByRole("treeitem", { name: "archive/old.org" })
		expect(file).toHaveFocus()
		await act(async () => fireEvent.keyDown(file, { key: "Enter" }))
		await waitFor(() => expect(controller.activeDocument?.relativePath).toBe("archive/old.org"))
	})

	it("keeps the captured deletion target when another file becomes active during confirmation", async () => {
		await setup()
		await open("projects/book/overview.org")
		await menu("Actions for root.org", "Delete…")
		const confirmation = await screen.findByRole("dialog", { name: "Delete this file?" })
		await open("archive/old.org")
		const runtime = controller.activeBufferRuntime!
		const state = runtime.state
		expect(confirmation).toHaveTextContent("root.org")
		await act(async () => fireEvent.click(within(confirmation).getByRole("button", { name: "Delete" })))
		await waitFor(() => expect(disk.has("root.org")).toBe(false))
		expect([...disk.keys()].sort()).toEqual(["archive/old.org", "projects/book/overview.org"])
		expect(controller.activeDocument?.relativePath).toBe("archive/old.org")
		expect(controller.activeBufferRuntime).toBe(runtime)
		expect(runtime.state).toBe(state)
	})

	it("rejects an old clean-file confirmation if that unopened file acquires newer editor input", async () => {
		await setup()
		await open("projects/book/overview.org")
		await menu("Actions for root.org", "Delete…")
		const confirmation = await screen.findByRole("dialog", { name: "Delete this file?" })
		await open("root.org")
		act(() => controller.updateContent("Newer unsaved root input"))
		const runtime = controller.activeBufferRuntime!
		const state = runtime.state
		await act(async () => fireEvent.click(within(confirmation).getByRole("button", { name: "Delete" })))
		expect(orgFileRepository.deleteDocument).not.toHaveBeenCalled()
		expect(disk.get("root.org")?.content).toBe("* Root\n")
		expect(runtime.state).toBe(state)
		expect(controller.content).toBe("Newer unsaved root input")
		expect(controller.isDirty).toBe(true)
	})

	it("retains dirty Source when the single deletion confirmation is cancelled", async () => {
		await setup()
		await open("root.org")
		const { runtime, view } = attachSource()
		act(() => view.dispatch({ changes: { from: 0, insert: "Unsaved input\n" } }))
		const state = runtime.state
		await menu("Actions for root.org", "Delete…")
		const confirmation = await screen.findByRole("dialog", { name: "Delete this file?" })
		expect(disk.has("root.org")).toBe(true)
		await act(async () => fireEvent.click(within(confirmation).getByRole("button", { name: "Cancel" })))
		expect(disk.has("root.org")).toBe(true)
		expect(runtime.state).toBe(state)
		expect(controller.activeDocument?.relativePath).toBe("root.org")
		expect(controller.isDirty).toBe(true)
	})

	it("keeps clipboard failures visible without altering the active document", async () => {
		await setup()
		await open("root.org")
		Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } })
		const source = controller.activeBufferRuntime!.state
		await menu("Actions for root.org", "Copy relative path")
		expect(await screen.findByRole("alert")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Dismiss file feedback" }))
		expect(screen.queryByRole("alert")).not.toBeInTheDocument()
		expect(controller.activeBufferRuntime!.state).toBe(source)
	})
})
