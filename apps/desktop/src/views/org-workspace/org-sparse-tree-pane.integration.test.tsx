import { redoDepth, undoDepth } from "@codemirror/commands"
import { EditorSelection } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { orgSparseTreeField } from "../org-editor/org-sparse-tree.extension"
import { OrgDocumentPane } from "./org-document-pane.view.fn"

const source = "* DONE Hidden\nhidden body\n* TODO Visible\nvisible body"
const makeRuntime = (sourceText = source) =>
	createOrgBufferRuntime({
		canCommit: () => true,
		key: { bufferId: "note.org", workspaceSessionId: "G1" },
		onCommit: vi.fn(),
		source: sourceText,
	})
type Capture = (command: "sparse-tree" | "clear-sparse-tree") => (() => void) | null
const originRef: { current: Capture | null } = { current: null }
const props = (
	runtime: ReturnType<typeof makeRuntime>,
	grant = "G1",
	execute?: (() => void) | null,
) => ({
	canGoBack: false,
	canGoForward: false,
	controller: {
		activeBufferId: "note.org",
		activeBufferRuntime: runtime,
		activeDocument: { content: runtime.source, relativePath: "note.org", revision: "one" },
		content: runtime.source,
		isDirty: false,
		liveBuffers: [
			{
				bufferId: "note.org",
				content: runtime.source,
				document: { relativePath: "note.org" },
				isDirty: false,
				runtime,
			},
		],
		openOrgLink: vi.fn(),
		saveDocument: vi.fn(),
		updateContent: vi.fn(),
		workspace: {
			capabilityToken: grant,
			documents: [{ relativePath: "note.org" }],
			rootPath: "/workspace",
		},
		workspaceSessionId: "G1",
	} as unknown as OrgWorkspaceController,
	inspectorVisible: false,
	isBusy: false,
	onCloseTab: vi.fn(),
	onGoBack: vi.fn(),
	onGoForward: vi.fn(),
	onQuickOpen: vi.fn(),
	onSelectTab: vi.fn(),
	onShowInspector: vi.fn(),
	onShowSidebar: vi.fn(),
	openDocumentPaths: ["note.org"],
	sidebarVisible: true,
	viewCommandOriginRef: originRef,
	viewCommandRequest:
		execute === undefined
			? null
			: {
					bufferId: "note.org",
					command: "sparse-tree" as const,
					execute,
					id: 1,
					workspaceSessionId: "G1",
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
		fireEvent.keyDown(input, { isComposing: true, key: "Enter" })
		expect(screen.getByRole("combobox")).toBe(input)
		fireEvent.compositionEnd(input)
		const consumed = createEvent.keyDown(input, { cancelable: true, key: "Enter" })
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
	it("bound catalog complex queries remain independent and invalid match retains the origin view", () => {
		const raw =
			"#+FILETAGS: :file:\n* Parent :work:\nparent BODY\n** TODO Visible\nvisible BODY\n** DONE Hidden :blocked:\nhidden BODY\n* TODO Outside\noutside BODY"
		const runtime = makeRuntime(raw)
		const mounted = render(<OrgDocumentPane {...props(runtime)} />)
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		act(() => views()[0].focus())
		const execute = originRef.current!("sparse-tree")!
		mounted.rerender(<OrgDocumentPane {...props(runtime, "G1", execute)} />)
		submit('match: itag:work AND (todo OR text:"Hidden") AND NOT tag:blocked')
		const origin = views()[0].state.field(orgSparseTreeField)!
		expect(origin.plan.matchedHeadingStarts).toEqual([raw.indexOf("** TODO Visible")])
		expect(views()[0].contentDOM.textContent).toContain("visible BODY")
		expect(views()[0].contentDOM.textContent).not.toContain("hidden BODY")
		expect(views()[0].contentDOM.textContent).not.toContain("outside BODY")
		expect(views()[1].state.field(orgSparseTreeField)).toBeNull()
		act(() => views()[1].focus())
		const peerCommand = originRef.current!("sparse-tree")!
		act(() => peerCommand())
		submit('match: itag:file AND (tag:blocked OR text:"Outside") AND NOT todo')
		const peer = views()[1].state.field(orgSparseTreeField)!
		expect(peer.plan.matchedHeadingStarts).toEqual([raw.indexOf("** DONE Hidden")])
		expect(views()[0].state.field(orgSparseTreeField)).toBe(origin)
		expect(views()[1].contentDOM.textContent).toContain("hidden BODY")
		expect(views()[1].contentDOM.textContent).not.toContain("visible BODY")
		act(() => views()[1].focus())
		act(() => originRef.current!("sparse-tree")!())
		submit("match: todo AND (")
		expect(screen.getByRole("combobox", { name: /^Sparse tree/ })).toBeInTheDocument()
		expect(views()[1].state.field(orgSparseTreeField)).toBe(peer)
		expect(views()[0].state.field(orgSparseTreeField)).toBe(origin)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
		expect(runtime.source).toBe(raw)
		expect(runtime.revision).toBe(0)
		expect(undoDepth(runtime.state) + redoDepth(runtime.state)).toBe(0)
		for (const view of views()) expect(view.state.sliceDoc()).toBe(raw)
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
