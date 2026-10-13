import { undoDepth } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { ApplicationTestDocumentPane, render } from "@/test/application-providers"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgEditorSessionSnapshot } from "@/views/org-editor/org-editor.types"
import { useSettings } from "@/hooks/use-settings"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION } from "@/pipes/org/org-behavior-configuration.pipe"

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
const setup = (source = "* First\nbody\n* Second\nbody\n") => {
	const cache = new Map<string, OrgEditorSessionSnapshot>()
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
		activeDocument: { relativePath: "A.org", content: source },
		get content(): string { return controller.activeBufferRuntime?.source ?? "" },
		openBuffers: [{ bufferId: "A", relativePath: "A.org" }],
		updateContent: vi.fn(),
		saveDocument: vi.fn(),
		openOrgLink: vi.fn(),
		get isDirty(): boolean {
			const current = controller.activeBufferRuntime
			return !!current && current.source !== controller.activeDocument?.content
		},
		isLoading: false,
		getBufferEffectState: () => ({ busy: false, loading: false, saving: false, readOnly: false }),
	} as unknown as OrgWorkspaceController
	const pane = () => (
		<ApplicationTestDocumentPane
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
	useSettings.setState({ orgBehaviorConfigurationJson: "", orgKeymapConfigurationJson: "" })
})

describe("same-active-buffer document pane split", () => {
	it("shares canonical typing and undo, keeps independent cursor/modeline, and closes only the secondary view", async () => {
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
		await act(async () => { key(b, "z") })
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

	it("keeps parameter ownership on the source cursor and cancels rather than committing into a newly focused peer", async () => {
		const { runtime } = setup()
		const a = views()[0]
		act(() => {
			a.focus()
			a.dispatch({ selection: { anchor: 2 } })
		})
		fireEvent.click(screen.getByRole("button", { name: "Split editor" }))
		const b = views()[1]
		act(() => b.dispatch({ selection: { anchor: 18 } }))
		await act(async () => {
			key(a, "c")
			key(a, "q")
		})
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "primary" } })
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(runtime.source).toContain("* First :primary:")
		expect(runtime.source).not.toContain("* Second :primary:")
		expect(a.hasFocus).toBe(true)
		await act(async () => {
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
			activeDocument: { relativePath: "B.org", content: other.source },
			activeBufferRuntime: other,
		})
		mounted.rerender(pane())
		expect(views().map((v) => v.state.sliceDoc())).toEqual(["* B\n", "* B\n"])
		Object.assign(controller, {
			activeBufferId: "A",
			activeDocument: { relativePath: "A.org", content: source },
			activeBufferRuntime: runtime,
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
			const other = createOrgBufferRuntime({
				key: { workspaceSessionId: "grant", bufferId: "B" },
				source: "* B\n",
				canCommit: () => true,
				onCommit: vi.fn(),
				onError: vi.fn(),
			})
			Object.assign(controller, {
				activeBufferId: "B",
				activeDocument: { relativePath: "B.org", content: other.source },
				activeBufferRuntime: other,
			})
			Object.assign(controller, {
				activeBufferId: "A",
				activeDocument: { relativePath: "A.org", content: source },
				activeBufferRuntime: runtime,
			})
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
		Object.assign(controller, { activeBufferRuntime: next })
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
})

describe("main registry Source parameter cutover", () => {
	it.each(["remove-scheduled", "remove-deadline", "todo-state", "complete-repeating"] as const)("dispatches configured %s through the real canonical runtime", async command => {
		useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1, bindings: [
			{ scope: "org-source", key: "A-y", command },
		] }) })
		const source = "#+TODO: OPEN WAIT | FINISHED CANCELLED\r\n* WAIT First\r\nSCHEDULED: <2026-10-14 Wed +1w> DEADLINE: <2026-10-15 Thu ++2d>\r\nraw\0😀\n"
		const { runtime } = setup(source)
		const primary = views()[0]
		act(() => { primary.dispatch({ selection: { anchor: primary.state.doc.line(2).from + 2 } }); primary.focus() })
		fireEvent.keyDown(primary.contentDOM, { altKey: true, key: "y" })
		if (command === "todo-state") {
			const input = screen.getByRole("combobox")
			fireEvent.change(input, { target: { value: "OPEN" } })
			fireEvent.keyDown(input, { key: "Enter" })
		}
		await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull())
		if (command === "remove-scheduled" || command === "remove-deadline")
			expect(runtime.source).not.toContain(command === "remove-scheduled" ? "SCHEDULED:" : "DEADLINE:")
		else expect(runtime.source).toContain(command === "todo-state" ? "* OPEN First" : "* FINISHED First")
		if (command === "complete-repeating") {
			expect(runtime.source).toContain("<2026-10-14 Wed +0w>")
			expect(runtime.source).toContain("<2026-10-15 Thu ++0d>")
		}
		expect(runtime.source).toContain("raw\0😀\n")
		expect(primary.state.sliceDoc()).toBe(runtime.source)
		expect(undoDepth(runtime.state)).toBe(1)
		act(() => key(primary, "z"))
		expect(runtime.source).toBe(source)
	})

	it("uses the configured date policy for an absolute at-point timestamp through the main registry", async () => {
		useSettings.setState({
			orgKeymapConfigurationJson: JSON.stringify({ version: 1, bindings: [
				{ scope: "org-source", key: "A-y", command: "timestamp-inactive" },
			] }),
			orgBehaviorConfigurationJson: JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION,
				dateReader: { preferFuture: false, forceCompatibleYears: true } }),
		})
		const stamp = "<2026-10-14 Wed 10:00 +1w -2d>"
		const source = `* Heading\r\n${stamp}--<2026-10-15 Thu>\r\nraw\0😀\n`
		const { runtime } = setup(source)
		const primary = views()[0]
		act(() => { primary.dispatch({ selection: { anchor: primary.state.doc.line(2).from + 2 } }); primary.focus() })
		fireEvent.keyDown(primary.contentDOM, { altKey: true, key: "y" })
		const input = screen.getByRole("combobox", { name: /^Inactive timestamp\b/ })
		expect(input).toHaveValue(stamp)
		fireEvent.change(input, { target: { value: "2040-10-14" } })
		fireEvent.keyDown(input, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("combobox", { name: /^Inactive timestamp\b/ })).toBeNull())
		expect(runtime.source).toBe(source.replace(stamp, "[2037-10-14 10:00 +1w -2d]"))
		expect(undoDepth(runtime.state)).toBe(1)
		act(() => key(primary, "z"))
		expect(runtime.source).toBe(source)
	})
})
