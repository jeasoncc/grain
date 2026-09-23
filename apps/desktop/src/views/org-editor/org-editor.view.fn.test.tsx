import { foldCode } from "@codemirror/language"
import { EditorView } from "@codemirror/view"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { OrgEditor } from "./org-editor.view.fn"

function getEditorView(): EditorView {
	const content = screen.getByRole("textbox")
	const view = EditorView.findFromDOM(content)
	if (!view) {
		throw new Error("CodeMirror view was not created")
	}
	return view
}

describe("OrgEditor", () => {
	it("keeps Org source as raw text and reports document edits", () => {
		const onChange = vi.fn()
		render(
			<OrgEditor
				value={"* Heading\n#+begin_export html\n<b>raw</b>\n#+end_export"}
				onChange={onChange}
				onSave={vi.fn()}
				ariaLabel="Raw Org editor"
			/>,
		)

		const view = getEditorView()
		expect(view.state.doc.toString()).toBe(
			"* Heading\n#+begin_export html\n<b>raw</b>\n#+end_export",
		)

		view.dispatch({ changes: { from: view.state.doc.length, insert: "\n** Child" } })
		expect(onChange).toHaveBeenLastCalledWith(
			"* Heading\n#+begin_export html\n<b>raw</b>\n#+end_export\n** Child",
		)
	})

	it("preserves CRLF line endings when editing", () => {
		const onChange = vi.fn()
		const source = "* Heading\r\nbody\r\n"
		render(<OrgEditor value={source} onChange={onChange} onSave={vi.fn()} />)

		const view = getEditorView()
		expect(view.state.sliceDoc()).toBe(source)
		view.dispatch({ changes: { from: view.state.doc.length, insert: "next" } })
		expect(onChange).toHaveBeenLastCalledWith(`${source}next`)
	})

	it("moves CRLF subtrees without introducing duplicate carriage returns", () => {
		const onChange = vi.fn()
		const source = "* One\r\nbody\r\n* Two\r\nbody two\r\n"
		render(<OrgEditor value={source} onChange={onChange} onSave={vi.fn()} />)
		const view = getEditorView()
		view.dispatch({ selection: { anchor: 0 } })
		fireEvent.keyDown(screen.getByRole("textbox"), { altKey: true, key: "ArrowDown" })
		expect(onChange).toHaveBeenLastCalledWith("* Two\r\nbody two\r\n* One\r\nbody\r\n")
		expect(onChange.mock.lastCall?.[0]).not.toContain("\r\r\n")
	})

	it("highlights core Org syntax without changing the source", () => {
		const source = "#+title: Test\n* TODO Heading :work:\n:PROPERTIES:\n:ID: note-1\n:END:"
		render(<OrgEditor value={source} onChange={vi.fn()} onSave={vi.fn()} />)

		expect(document.querySelector(".cm-org-directive")).not.toBeNull()
		expect(document.querySelector(".cm-org-heading")).not.toBeNull()
		expect(document.querySelector(".cm-org-todo")).not.toBeNull()
		expect(document.querySelector(".cm-org-tags")).not.toBeNull()
		expect(document.querySelector(".cm-org-property")).not.toBeNull()
		expect(getEditorView().state.doc.toString()).toBe(source)
	})

	it("folds an Org subtree without changing its text", () => {
		const source = "* Parent\nbody\n** Child\nchild body\n* Sibling\nsibling body"
		const onChange = vi.fn()
		render(<OrgEditor value={source} onChange={onChange} onSave={vi.fn()} />)

		const view = getEditorView()
		expect(document.querySelector(".cm-foldGutter")).not.toBeNull()
		expect(foldCode(view)).toBe(true)

		expect(document.querySelector(".cm-foldPlaceholder")).not.toBeNull()
		expect(view.state.doc.toString()).toBe(source)
		expect(onChange).not.toHaveBeenCalled()
	})

	it("applies external values without echoing onChange", () => {
		const onChange = vi.fn()
		const { rerender } = render(
			<OrgEditor value="first" onChange={onChange} onSave={vi.fn()} ariaLabel="Org editor" />,
		)

		rerender(
			<OrgEditor value="second" onChange={onChange} onSave={vi.fn()} ariaLabel="Org editor" />,
		)

		expect(getEditorView().state.doc.toString()).toBe("second")
		expect(onChange).not.toHaveBeenCalled()
	})

	it("adopts externally changed line endings without duplicating carriage returns", () => {
		const onChange = vi.fn()
		const { rerender } = render(
			<OrgEditor value={"* One\nbody\n"} onChange={onChange} onSave={vi.fn()} />,
		)

		rerender(<OrgEditor value={"* One\r\nbody\r\n"} onChange={onChange} onSave={vi.fn()} />)
		const view = getEditorView()
		expect(view.state.sliceDoc()).toBe("* One\r\nbody\r\n")
		view.dispatch({ changes: { from: view.state.doc.length, insert: "next" } })
		expect(onChange).toHaveBeenLastCalledWith("* One\r\nbody\r\nnext")
	})

	it("reveals a requested one-based source line", () => {
		const { rerender } = render(
			<OrgEditor value={"one\ntwo\nthree"} onChange={vi.fn()} onSave={vi.fn()} />,
		)
		rerender(
			<OrgEditor
				value={"one\ntwo\nthree"}
				onChange={vi.fn()}
				onSave={vi.fn()}
				revealTarget={{ line: 3, requestId: 1 }}
			/>,
		)
		expect(getEditorView().state.selection.main.head).toBe(8)
	})

	it("dispatches refile and archive shortcuts with the current cursor", () => {
		const onRefileSubtree = vi.fn()
		const onArchiveSubtree = vi.fn()
		render(
			<OrgEditor
				value={"intro\r\n* One\r\nbody"}
				onChange={vi.fn()}
				onSave={vi.fn()}
				onRefileSubtree={onRefileSubtree}
				onArchiveSubtree={onArchiveSubtree}
			/>,
		)
		const view = getEditorView()
		view.dispatch({ selection: { anchor: view.state.doc.line(2).from + 2 } })
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "r", shiftKey: true })
		fireEvent.keyDown(editor, { altKey: true, ctrlKey: true, key: "a" })
		expect(onRefileSubtree).toHaveBeenCalledWith(9)
		expect(onArchiveSubtree).toHaveBeenCalledWith(9)
	})

	it("binds Mod-s, exposes its label, and supports read-only updates", () => {
		const onSave = vi.fn()
		const { rerender } = render(
			<OrgEditor value="* Note" onChange={vi.fn()} onSave={onSave} ariaLabel="Editing note.org" />,
		)

		const editable = screen.getByRole("textbox", { name: "Editing note.org" })
		fireEvent.keyDown(editable, { ctrlKey: true, key: "s" })
		expect(onSave).toHaveBeenCalledOnce()

		rerender(
			<OrgEditor
				value="* Note"
				onChange={vi.fn()}
				onSave={onSave}
				readOnly
				ariaLabel="Read-only note.org"
			/>,
		)

		expect(screen.getByRole("textbox", { name: "Read-only note.org" })).toHaveAttribute(
			"contenteditable",
			"false",
		)
	})
})
