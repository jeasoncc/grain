import { undoDepth } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgEditorSessionSnapshot } from "@/views/org-editor/org-editor.types"
import { OrgDocumentPane } from "./org-document-pane.view.fn"

const key = (view: EditorView, key: string) =>
	fireEvent.keyDown(view.contentDOM, {
		ctrlKey: true,
		key,
		keyCode: key.toUpperCase().charCodeAt(0),
	})
const views = () =>
	screen
		.getAllByRole("textbox", { name: /^Editing / })
		.map((element) => EditorView.findFromDOM(element)!)
const setup = () => {
	const cache = new Map<string, OrgEditorSessionSnapshot>()
	const source = "* First\nbody\n* Second\nbody\n"
	const runtime = createOrgBufferRuntime({
		key: { workspaceSessionId: "grant", bufferId: "A" },
		source,
		canCommit: () => true,
		onCommit: vi.fn(),
		onError: vi.fn(),
	})
	const controller = {
		workspaceSessionId: "grant",
		activeBufferId: "A",
		activeBufferRuntime: runtime,
		workspace: { rootPath: "/workspace", capabilityToken: "token" },
		activeDocument: { relativePath: "A.org" },
		content: source,
		openBuffers: [{ bufferId: "A", relativePath: "A.org" }],
		updateContent: vi.fn(),
		saveDocument: vi.fn(),
		openOrgLink: vi.fn(),
		isDirty: false,
		isLoading: false,
	} as unknown as OrgWorkspaceController
	const pane = () => (
		<OrgDocumentPane
			controller={controller}
			isBusy={false}
			canGoBack={false}
			canGoForward={false}
			inspectorVisible
			sidebarVisible
			onCloseTab={vi.fn()}
			onGoBack={vi.fn()}
			onGoForward={vi.fn()}
			onQuickOpen={vi.fn()}
			onSelectTab={vi.fn()}
			onShowInspector={vi.fn()}
			onShowSidebar={vi.fn()}
			openDocumentPaths={[controller.activeDocument!.relativePath]}
			editorSessionCache={cache}
		/>
	)
	const mounted = render(pane())
	return { controller, runtime, cache, mounted, pane, source }
}

afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
})

describe("same-active-buffer document pane split", () => {
	it("shares canonical typing and undo, keeps independent cursor/modeline, and closes only the secondary view", () => {
		const { runtime, cache, source } = setup()
		const primary = views()[0]
		act(() => {
			primary.focus()
			primary.dispatch({ selection: { anchor: 0 } })
		})
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		const [a, b] = views()
		expect(a).toBe(primary)
		expect(screen.getAllByRole("button", { name: "Save document" })).toHaveLength(1)
		act(() => {
			b.dispatch({ selection: { anchor: source.length } })
		})
		expect(screen.getByText("Ln 1")).toBeTruthy()
		act(() => b.focus())
		expect(screen.getByText("Ln 5")).toBeTruthy()
		act(() => a.dispatch({ selection: { anchor: 8 } }))
		expect(screen.getByText("Ln 5")).toBeTruthy()
		act(() =>
			b.dispatch({ changes: { from: source.length, insert: "more" }, userEvent: "input.type" }),
		)
		expect(a.state.sliceDoc()).toBe(b.state.sliceDoc())
		expect(undoDepth(runtime.state)).toBe(1)
		act(() => key(b, "z"))
		expect(runtime.source).toBe(source)
		fireEvent.click(screen.getByRole("button", { name: "Close editor split" }))
		expect(views()).toEqual([a])
		expect(a.hasFocus).toBe(true)
		expect(runtime.closed).toBe(false)
		expect(cache.has("grant\u0000A:window:secondary")).toBe(true)
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		expect(views()[1].state.selection.main.head).toBe(source.length)
	})

	it("shows passive Which-Key only for the focused window and clears it on focus handoff", async () => {
		setup()
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		const [a, b] = views()
		act(() => a.focus())
		act(() => key(a, "c"))
		await waitFor(() => expect(screen.getByRole("region", { name: "Which-Key" })).toBeTruthy())
		expect(screen.getByRole("region", { name: "Which-Key" }).textContent).toContain("C-c")
		expect(document.activeElement).toBe(a.contentDOM)
		act(() => b.focus())
		expect(screen.queryByRole("region", { name: "Which-Key" })).toBeNull()
		act(() => key(b, "c"))
		act(() => key(b, "x"))
		await waitFor(() => expect(screen.getByRole("region", { name: "Which-Key" })).toBeTruthy())
		expect(screen.getByRole("region", { name: "Which-Key" }).textContent).toContain("C-c C-x")
		expect(document.activeElement).toBe(b.contentDOM)
	})

	it("keeps parameter ownership on the source cursor and cancels rather than committing into a newly focused peer", () => {
		const { runtime } = setup()
		const a = views()[0]
		act(() => {
			a.focus()
			a.dispatch({ selection: { anchor: 2 } })
		})
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		const b = views()[1]
		act(() => b.dispatch({ selection: { anchor: 18 } }))
		act(() => {
			key(a, "c")
			key(a, "q")
		})
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "primary" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(runtime.source).toContain("* First :primary:")
		expect(runtime.source).not.toContain("* Second :primary:")
		expect(a.hasFocus).toBe(true)
		act(() => {
			key(a, "c")
			key(a, "q")
		})
		expect(screen.getByRole("combobox")).toBeTruthy()
		act(() => b.focus())
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(b.hasFocus).toBe(true)
	})

	it("parks each window on A/B handoff and uses grant-scoped stable window IDs", () => {
		const { controller, runtime, mounted, pane, source } = setup()
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		const [a, b] = views()
		act(() => {
			a.dispatch({ selection: { anchor: 2 } })
			b.dispatch({ selection: { anchor: 15 } })
			b.focus()
		})
		const other = createOrgBufferRuntime({
			key: { workspaceSessionId: "grant", bufferId: "B" },
			source: "* B\n",
			canCommit: () => true,
			onCommit: vi.fn(),
			onError: vi.fn(),
		})
		Object.assign(controller, {
			activeBufferId: "B",
			activeDocument: { relativePath: "B.org" },
			activeBufferRuntime: other,
			content: other.source,
		})
		mounted.rerender(pane())
		expect(views().map((v) => v.state.sliceDoc())).toEqual(["* B\n", "* B\n"])
		Object.assign(controller, {
			activeBufferId: "A",
			activeDocument: { relativePath: "A.org" },
			activeBufferRuntime: runtime,
			content: source,
		})
		mounted.rerender(pane())
		expect(views().map((v) => v.state.selection.main.head)).toEqual([2, 15])
		expect(runtime.closed).toBe(false)
		expect(other.closed).toBe(false)
	})

	it("never restores stale window selection across a new grant", () => {
		const { controller, mounted, pane, cache, source } = setup()
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		const [a, b] = views()
		act(() => {
			a.dispatch({ selection: { anchor: 4 } })
			b.dispatch({ selection: { anchor: 18 } })
		})
		const next = createOrgBufferRuntime({
			key: { workspaceSessionId: "new-grant", bufferId: "A" },
			source,
			canCommit: () => true,
			onCommit: vi.fn(),
			onError: vi.fn(),
		})
		Object.assign(controller, { workspaceSessionId: "new-grant", activeBufferRuntime: next })
		mounted.rerender(pane())
		expect(views().map((view) => view.state.selection.main.head)).toEqual([0, 0])
		expect(cache.has("grant\u0000A:window:secondary")).toBe(true)
	})

	it.each([
		"same source",
		"append",
		"replacement",
		"A-B-A",
	])("remounts both projections on same-buffer incarnation replacement: %s", (scenario) => {
		const { controller, runtime, mounted, pane, cache, source } = setup()
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		const oldViews = views()
		act(() => oldViews[0].dispatch({ changes: { from: source.length, insert: "edit" } }))
		const previous = runtime.source
		if (scenario === "A-B-A") {
			// Both controller changes happen before React sees another frame.
			Object.assign(controller, { activeBufferId: "B", content: "* B\n" })
			Object.assign(controller, { activeBufferId: "A", content: previous })
		}
		const nextSource =
			scenario === "append"
				? `${previous} appended`
				: scenario === "replacement"
					? "* Replacement\n"
					: previous
		const onCommit = vi.fn()
		const next = createOrgBufferRuntime({
			key: { workspaceSessionId: "grant", bufferId: "A" },
			source: nextSource,
			canCommit: () => true,
			onCommit,
			onError: vi.fn(),
		})
		Object.assign(controller, { activeBufferRuntime: next, content: nextSource })
		mounted.rerender(pane())
		const newViews = views()
		expect(newViews[0]).not.toBe(oldViews[0])
		expect(newViews[1]).not.toBe(oldViews[1])
		expect(newViews.map((v) => v.state.sliceDoc())).toEqual([nextSource, nextSource])
		expect(next.revision).toBe(0)
		expect(undoDepth(next.state)).toBe(0)
		expect(cache.get("grant\u0000A")?.runtimeOwner).toBe(runtime)
		act(() => key(newViews[0], "z"))
		expect(next.source).toBe(nextSource)
		act(() => {
			expect(() =>
				newViews[1].dispatch({ changes: { from: next.state.doc.length, insert: "new" } }),
			).not.toThrow()
		})
		expect(onCommit).toHaveBeenCalledOnce()
		expect(runtime.source).toBe(previous)
		expect(newViews[0].state.sliceDoc()).toBe(`${nextSource}new`)
	})

	it("disables splitting for legacy controllers without a runtime", () => {
		const { controller, mounted, pane } = setup()
		Object.assign(controller, { activeBufferRuntime: null })
		mounted.rerender(pane())
		expect(screen.getByRole("button", { name: "Split editor" }).hasAttribute("disabled")).toBe(true)
		expect(views()).toHaveLength(1)
	})
})
