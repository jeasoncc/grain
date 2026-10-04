import { undoDepth, redoDepth } from "@codemirror/commands"
import { EditorSelection } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { orgSparseTreeField } from "../org-editor/org-sparse-tree.extension"
import { OrgDocumentPane } from "./org-document-pane.view.fn"

const source = "* DONE Hidden\nhidden body\n* TODO Visible\nvisible body"
const makeRuntime = () =>
	createOrgBufferRuntime({
		source,
		canCommit: () => true,
		onCommit: vi.fn(),
		key: { bufferId: "note.org", workspaceSessionId: "G1" },
	})
type Capture = (command: "sparse-tree" | "clear-sparse-tree") => (() => void) | null
const originRef: { current: Capture | null } = { current: null }
const props = (
	runtime: ReturnType<typeof makeRuntime>,
	grant = "G1",
	execute?: (() => void) | null,
) => ({
	controller: {
		content: source,
		activeBufferId: "note.org",
		activeBufferRuntime: runtime,
		activeDocument: { relativePath: "note.org", revision: "one", content: source },
		workspaceSessionId: "G1",
		workspace: {
			rootPath: "/workspace",
			capabilityToken: grant,
			documents: [{ relativePath: "note.org" }],
		},
		liveBuffers: [
			{
				bufferId: "note.org",
				document: { relativePath: "note.org" },
				content: source,
				runtime,
				isDirty: false,
			},
		],
		updateContent: vi.fn(),
		saveDocument: vi.fn(),
		openOrgLink: vi.fn(),
		isDirty: false,
	} as unknown as OrgWorkspaceController,
	isBusy: false,
	canGoBack: false,
	canGoForward: false,
	inspectorVisible: false,
	sidebarVisible: true,
	onCloseTab: vi.fn(),
	onGoBack: vi.fn(),
	onGoForward: vi.fn(),
	onQuickOpen: vi.fn(),
	onSelectTab: vi.fn(),
	onShowInspector: vi.fn(),
	onShowSidebar: vi.fn(),
	openDocumentPaths: ["note.org"],
	viewCommandOriginRef: originRef,
	viewCommandRequest:
		execute === undefined
			? null
			: {
					id: 1,
					command: "sparse-tree" as const,
					bufferId: "note.org",
					workspaceSessionId: "G1",
					execute,
				},
})
const views = () =>
	screen.getAllByRole("textbox", { name: /^Editing/ }).map((node) => EditorView.findFromDOM(node)!)
async function menu(name: string) {
	fireEvent.pointerDown(screen.getByRole("button", { name: "Note actions" }), {
		button: 0,
		ctrlKey: false,
	})
	fireEvent.click(await screen.findByRole("menuitem", { name: new RegExp(`^${name}`) }))
}
function submit(query = "todo") {
	const input = screen.getByRole("combobox", { name: /^Sparse tree/ })
	// A keyboard accept is owned by the focused minibuffer, not menu-close body focus.
	input.focus()
	fireEvent.change(input, { target: { value: query } })
	fireEvent.keyDown(input, { key: "Enter" })
}
describe("production pane sparse origin ownership", () => {
	afterEach(() => {
		cleanup()
		originRef.current = null
	})
	it("toolbar relocates a hidden caret and Clear restores the entire origin selection", async () => {
		const runtime = makeRuntime()
		render(<OrgDocumentPane {...props(runtime)} />)
		const view = views()[0]
		const original = EditorSelection.single(2, 12)
		act(() => {
			view.dispatch({ selection: original })
			view.focus()
		})
		await menu("Sparse tree")
		submit()
		expect(view.state.selection.main.head).toBe(source.indexOf("* TODO Visible"))
		expect(view.state.field(orgSparseTreeField)!.restoreSelection!.toJSON()).toEqual(
			original.toJSON(),
		)
		expect(view.contentDOM).toHaveFocus()
		await menu("Clear sparse tree")
		expect(view.state.selection.toJSON()).toEqual(original.toJSON())
		expect(view.state.sliceDoc()).toBe(source)
		expect(runtime.source).toBe(source)
		expect(undoDepth(view.state) + redoDepth(view.state)).toBe(0)
	})
	it("ignores IME/consumed/repeated acceptance, cancels without mutation, and reports no matches", async () => {
		const runtime = makeRuntime()
		render(<OrgDocumentPane {...props(runtime)} />)
		const view = views()[0]
		act(() => view.focus())
		await menu("Sparse tree")
		const input = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(input, { target: { value: "todo" } })
		fireEvent.compositionStart(input)
		fireEvent.keyDown(input, { key: "Enter", isComposing: true })
		expect(screen.getByRole("combobox")).toBe(input)
		fireEvent.compositionEnd(input)
		const consumed = createEvent.keyDown(input, { key: "Enter", cancelable: true })
		consumed.preventDefault()
		fireEvent(input, consumed)
		expect(screen.getByRole("combobox")).toBe(input)
		fireEvent.keyDown(input, { key: "Escape" })
		expect(view.state.field(orgSparseTreeField)).toBeNull()
		expect(view.contentDOM).toHaveFocus()
		await menu("Sparse tree")
		const next = screen.getByRole("combobox")
		submit("text:not present")
		fireEvent.keyDown(next, { key: "Enter", repeat: true })
		expect(
			screen.getByText("No sparse-tree matches; the whole document remains visible."),
		).toBeInTheDocument()
		expect(view.state.field(orgSparseTreeField)?.hiddenRanges).toEqual([])
		expect(view.state.sliceDoc()).toBe(source)
		expect(view.contentDOM).toHaveFocus()
	})
	it("bound catalog command applies only to its origin window", () => {
		const runtime = makeRuntime()
		const mounted = render(<OrgDocumentPane {...props(runtime)} />)
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		act(() => views()[0].focus())
		const execute = originRef.current!("sparse-tree")!
		mounted.rerender(<OrgDocumentPane {...props(runtime, "G1", execute)} />)
		submit()
		expect(views()[0].state.field(orgSparseTreeField)?.query).toEqual({ kind: "todo" })
		expect(views()[1].state.field(orgSparseTreeField)).toBeNull()
		act(() => views()[1].focus())
		const peerCommand = originRef.current!("sparse-tree")!
		act(() => peerCommand())
		submit("text:Hidden")
		expect(views()[0].state.field(orgSparseTreeField)?.query).toEqual({ kind: "todo" })
		expect(views()[1].state.field(orgSparseTreeField)?.query).toEqual({
			kind: "text",
			literal: "Hidden",
		})
		expect(runtime.source).toBe(source)
	})
	it.each([
		"peer focus",
		"close",
		"reincarnation",
		"G2",
	])("rejects deferred catalog origin after %s", (change) => {
		const runtime = makeRuntime()
		const mounted = render(<OrgDocumentPane {...props(runtime)} />)
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		act(() => views()[1].focus())
		const execute = originRef.current!("sparse-tree")!
		if (change === "peer focus") act(() => views()[0].focus())
		if (change === "close")
			fireEvent.click(screen.getByRole("button", { name: "Close editor split" }))
		mounted.rerender(
			<OrgDocumentPane
				{...props(
					change === "reincarnation" ? makeRuntime() : runtime,
					change === "G2" ? "G2" : "G1",
					execute,
				)}
			/>,
		)
		expect(screen.queryByRole("combobox", { name: /^Sparse tree/ })).toBeNull()
		for (const view of views()) expect(view.state.field(orgSparseTreeField)).toBeNull()
	})
})
