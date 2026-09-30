import { redo, undo } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { OrgDocumentPane } from "./org-document-pane.view.fn"

const Harness = ({
	source = "* Note :old:\n** Child :grain:",
	path = "note.org",
	revision = "one",
	busy = false,
	root = "/workspace",
}: {
	source?: string
	path?: string
	revision?: string
	busy?: boolean
	root?: string
}) => {
	const [content, setContent] = useState(source)
	const controller = {
		content,
		activeDocument: { relativePath: path, revision, content },
		workspace: { rootPath: root },
		updateContent: setContent,
		isDirty: content !== source,
		isLoading: false,
		isSaving: false,
		saveDocument: vi.fn(),
		openOrgLink: vi.fn(),
		revealTarget: null,
	} as unknown as OrgWorkspaceController
	return (
		<OrgDocumentPane
			controller={controller}
			isBusy={busy}
			canGoBack={false}
			canGoForward={false}
			inspectorVisible={false}
			sidebarVisible
			onCloseTab={vi.fn()}
			onGoBack={vi.fn()}
			onGoForward={vi.fn()}
			onQuickOpen={vi.fn()}
			onSelectTab={vi.fn()}
			onShowInspector={vi.fn()}
			onShowSidebar={vi.fn()}
			openDocumentPaths={[path]}
		/>
	)
}

const openTags = () => {
	const editor = screen.getByRole("textbox")
	fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
	fireEvent.keyDown(editor, { ctrlKey: true, key: "q" })
	return screen.getByRole("combobox", { name: "Tags:" })
}
const viewFromEditor = () => {
	const view = EditorView.findFromDOM(screen.getByRole("textbox"))
	if (!view) throw new Error("No editor")
	return view
}

describe("Tags command vertical slice", () => {
	it("commits through one buffer transaction, restores focus, and supports one undo", () => {
		const source = "* Note :old:\r\n** Child :grain:"
		render(<Harness source={source} />)
		const view = viewFromEditor()
		act(() => view.dispatch({ selection: { anchor: 2 } }))
		const input = openTags()
		expect(input).toHaveValue("old")
		expect(screen.queryByRole("dialog")).toBeNull()
		fireEvent.change(input, { target: { value: "project-work 中文" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(view.state.sliceDoc()).toBe("* Note :project-work:中文:\r\n** Child :grain:")
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(screen.getByRole("textbox")).toHaveFocus()
		act(() => {
			undo(view)
		})
		expect(view.state.sliceDoc()).toBe(source)
		expect(view.state.selection.main.head).toBe(2)
		act(() => {
			redo(view)
		})
		expect(view.state.sliceDoc()).toContain(":project-work:中文:")
	})

	it("cancels without modifying the buffer", () => {
		render(<Harness />)
		const view = viewFromEditor()
		const original = view.state.sliceDoc()
		const input = openTags()
		fireEvent.change(input, { target: { value: "changed" } })
		fireEvent.keyDown(input, { key: "Escape" })
		expect(view.state.sliceDoc()).toBe(original)
		expect(screen.getByRole("textbox")).toHaveFocus()
	})

	it("survives revision-only autosave updates and rejects changed content", () => {
		const { rerender } = render(<Harness />)
		const input = openTags()
		fireEvent.change(input, { target: { value: "work" } })
		rerender(<Harness revision="two" />)
		expect(screen.getByRole("combobox")).toHaveValue("work")
		const view = viewFromEditor()
		act(() =>
			view.dispatch({ changes: { from: view.state.doc.length, insert: " externally changed" } }),
		)
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.getByRole("alert")).toHaveTextContent("content changed")
		expect(view.state.sliceDoc()).not.toContain(":work:")
	})

	it("closes the session on buffer switch and explains a preamble invocation", () => {
		const { rerender } = render(<Harness />)
		openTags()
		rerender(<Harness path="other.org" />)
		expect(screen.queryByRole("combobox")).toBeNull()
	})

	it.each([
		"mouse",
		"keyboard",
	])("keeps %s menu-launched minibuffer focus after the menu closes", async (mode) => {
		render(<Harness />)
		const trigger = screen.getByRole("button", { name: "Note actions" })
		if (mode === "mouse") fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
		else fireEvent.keyDown(trigger, { key: "ArrowDown" })
		const item = await screen.findByRole("menuitem", { name: /Heading tags/ })
		if (mode === "mouse") fireEvent.click(item)
		else fireEvent.keyDown(item, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
		await waitFor(() => expect(screen.getByRole("combobox")).toHaveFocus())
	})

	it("rejects busy submission, then permits retry after a revision-only save", () => {
		const { rerender } = render(<Harness />)
		const input = openTags()
		fireEvent.change(input, { target: { value: "work" } })
		rerender(<Harness busy />)
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.getByRole("alert")).toHaveTextContent("saving or loading")
		rerender(<Harness revision="saved" />)
		fireEvent.keyDown(input, { key: "Enter" })
		expect(viewFromEditor().state.sliceDoc()).toContain(":work:")
	})

	it("cancels on workspace switch with the same relative path", () => {
		const { rerender } = render(<Harness />)
		openTags()
		rerender(<Harness root="/other" />)
		expect(screen.queryByRole("combobox")).toBeNull()
	})

	it("reports missing heading instead of opening a useless form", () => {
		render(<Harness source="#+title: Preamble\n\n* Heading" />)
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "q" })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(screen.getByText("The cursor does not belong to an Org heading.")).toBeInTheDocument()
	})
})
