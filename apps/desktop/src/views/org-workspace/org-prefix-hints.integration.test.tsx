import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { ApplicationTestDocumentPane, render } from "@/test/application-providers"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"

// Deliberately includes CRLF and raw export markup: hints must never rewrite the buffer.
const source = "* Note :work:\r\n#+begin_export html\r\n<b>raw</b>\r\n#+end_export\r\n"
const path = "notes/note.org"

function fixture() {
	const updateContent = vi.fn()
	const saveDocument = vi.fn()
	const controller = {
		activeBufferId: path,
		activeBufferRuntime: null,
		activeDocument: { relativePath: path, content: source },
		workspace: { rootPath: "/workspace/one", documents: [] },
		content: source,
		isDirty: false,
		isLoading: false,
		isSaving: false,
		revealTarget: null,
		getBufferEffectState: () => ({ busy: false, loading: false, saving: false, readOnly: false }),
		updateContent,
		saveDocument,
		openOrgLink: vi.fn(),
	} as unknown as OrgWorkspaceController
	const pane = (current = controller) => (
		<ApplicationTestDocumentPane
			controller={current}
			isBusy={false}
			canGoBack={false}
			canGoForward={false}
			inspectorVisible
			sidebarVisible
			openDocumentPaths={[path]}
			onCloseTab={vi.fn()}
			onGoBack={vi.fn()}
			onGoForward={vi.fn()}
			onQuickOpen={vi.fn()}
			onSelectTab={vi.fn()}
		/>
	)
	const rendered = render(pane())
	const editor = screen.getByRole("textbox", { name: `Editing ${path}` })
	const view = EditorView.findFromDOM(editor)
	if (!view) throw new Error("Missing real CodeMirror editor")
	act(() => {
		view.dispatch({ selection: { anchor: 2 } })
		view.focus()
	})
	return {
		...rendered,
		editor,
		view,
		controller,
		updateContent,
		saveDocument,
		rerenderController: (current: OrgWorkspaceController) => rendered.rerender(pane(current)),
		assertUnchanged: () => {
			expect(view.state.sliceDoc()).toBe(source)
			expect(updateContent).not.toHaveBeenCalled()
			expect(saveDocument).not.toHaveBeenCalled()
		},
	}
}

const hint = () => screen.queryByRole("region", { name: "Which-Key" })
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const prefix = (editor: HTMLElement) => fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })

// No editor, Which-Key, minibuffer, or command-hook mocks: exercise the real boundaries.
describe("Org prefix hints through the document pane", () => {
	it("discovers nested Archive keys without focusing help, then opens explicit confirmation", async () => {
		const current = fixture()
		prefix(current.editor)
		advance(350)
		expect(hint()).toHaveTextContent("Extra commands")
		fireEvent.keyDown(current.editor, { ctrlKey: true, key: "x" })
		expect(hint()).not.toBeInTheDocument()
		advance(350)
		expect(hint()).toHaveTextContent("C-c C-x")
		expect(hint()).toHaveTextContent("Archive")
		expect(current.editor).toHaveFocus()
		await act(async () => { fireEvent.keyDown(current.editor, { ctrlKey: true, key: "a" }) })
		expect(hint()).not.toBeInTheDocument()
		expect(screen.getByRole("combobox", { name: "Archive subtree (yes/no):" })).toHaveFocus()
		current.assertUnchanged()
	})

	it("routes C-c C-w to Refile parameters, not browser tab close", async () => {
		const current = fixture()
		prefix(current.editor)
		await act(async () => { expect(fireEvent.keyDown(current.editor, { ctrlKey: true, key: "w" })).toBe(false) })
		expect(screen.getByRole("combobox", { name: "Refile to Org file:" })).toHaveFocus()
		current.assertUnchanged()
	})
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => {
		cleanup()
		vi.useRealTimers()
	})

	it("delays passive help until 350ms, keeps editor focus, and opens the Tags minibuffer", async () => {
		const f = fixture()
		expect(prefix(f.editor)).toBe(false)
		expect(hint()).toBeNull()
		advance(349)
		expect(hint()).toBeNull()
		advance(1)
		expect(hint()).toBeVisible()
		expect(hint()).toHaveTextContent("Edit tags")
		expect(f.editor).toHaveFocus()
		await act(async () => { expect(fireEvent.keyDown(f.editor, { ctrlKey: true, key: "q" })).toBe(false) })
		expect(hint()).toBeNull()
		expect(screen.getByRole("combobox", { name: "Tags:" })).toHaveFocus()
		f.assertUnchanged()
	})

	it.each([
		{ key: "Escape" },
		{ key: "g", ctrlKey: true },
	])("cancels prefix and Tags parameters without edits with $key", async (cancel) => {
		const f = fixture()
		prefix(f.editor)
		advance(350)
		expect(hint()).toBeVisible()
		expect(fireEvent.keyDown(f.editor, cancel)).toBe(false)
		expect(hint()).toBeNull()
		fireEvent.keyDown(f.editor, { ctrlKey: true, key: "q" })
		expect(screen.queryByRole("combobox")).toBeNull()
		prefix(f.editor)
		await act(async () => { fireEvent.keyDown(f.editor, { ctrlKey: true, key: "q" }) })
		const input = screen.getByRole("combobox", { name: "Tags:" })
		fireEvent.change(input, { target: { value: "changed" } })
		fireEvent.keyDown(input, cancel)
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(f.editor).toHaveFocus()
		advance(1200)
		expect(hint()).toBeNull()
		f.assertUnchanged()
	})

	it("leaves selected Ctrl-C to native copy without arming help", () => {
		const f = fixture()
		act(() => f.view.dispatch({ selection: { anchor: 2, head: 6 } }))
		expect(prefix(f.editor)).toBe(true)
		advance(350)
		expect(hint()).toBeNull()
		fireEvent.keyDown(f.editor, { ctrlKey: true, key: "q" })
		expect(screen.queryByRole("combobox")).toBeNull()
		advance(1200)
		expect(hint()).toBeNull()
		f.assertUnchanged()
	})

	it.each([
		"compositionstart",
		"composing keydown",
		"keyCode 229",
	])("clears a prefix on %s without mutation", (event) => {
		const f = fixture()
		prefix(f.editor)
		advance(350)
		expect(hint()).toBeVisible()
		if (event === "compositionstart") fireEvent.compositionStart(f.editor)
		else
			fireEvent.keyDown(f.editor, {
				key: "q",
				ctrlKey: true,
				isComposing: event === "composing keydown",
				keyCode: event === "keyCode 229" ? 229 : 0,
			})
		expect(hint()).toBeNull()
		if (event === "compositionstart") fireEvent.compositionEnd(f.editor)
		fireEvent.keyDown(f.editor, { ctrlKey: true, key: "q" })
		expect(screen.queryByRole("combobox")).toBeNull()
		advance(1200)
		f.assertUnchanged()
	})

	it.each(["blur", "mousedown"])("clears help and routing on %s", (event) => {
		const f = fixture()
		prefix(f.editor)
		advance(350)
		expect(hint()).toBeVisible()
		if (event === "blur") fireEvent.blur(f.editor)
		else fireEvent.mouseDown(f.editor, { button: 0 })
		expect(hint()).toBeNull()
		fireEvent.keyDown(f.editor, { ctrlKey: true, key: "q" })
		expect(screen.queryByRole("combobox")).toBeNull()
		advance(1200)
		f.assertUnchanged()
	})

	it("keeps the default prefix and help active after long idle, then routes the chord", async () => {
		const f = fixture()
		prefix(f.editor)
		advance(350)
		expect(hint()).toBeVisible()
		advance(60_000)
		expect(hint()).toBeVisible()
		expect(f.editor).toHaveFocus()
		await act(async () => { expect(fireEvent.keyDown(f.editor, { ctrlKey: true, key: "q" })).toBe(false) })
		expect(hint()).toBeNull()
		expect(screen.getByRole("combobox", { name: "Tags:" })).toHaveFocus()
		f.assertUnchanged()
	})

	it.each([
		"document content",
		"workspace root",
	])("clears pending reveal on same-path %s change", (change) => {
		const f = fixture()
		prefix(f.editor)
		advance(200)
		const content = change === "document content" ? source.replace("Note", "Other") : source
		f.rerenderController({
			...f.controller,
			content,
			activeDocument: { ...f.controller.activeDocument!, content },
			workspace: {
				...f.controller.workspace!,
				rootPath: change === "workspace root" ? "/workspace/two" : "/workspace/one",
			},
		})
		advance(150)
		expect(hint()).toBeNull()
		fireEvent.keyDown(f.editor, { ctrlKey: true, key: "q" })
		expect(screen.queryByRole("combobox")).toBeNull()
		advance(1200)
		expect(hint()).toBeNull()
		expect(f.view.state.sliceDoc()).toBe(content)
		expect(f.updateContent).not.toHaveBeenCalled()
	})

})
