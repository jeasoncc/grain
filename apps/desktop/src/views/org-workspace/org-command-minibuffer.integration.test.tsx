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
	refileSubtree = vi
		.fn<OrgWorkspaceController["refileSubtree"]>()
		.mockResolvedValue({ kind: "success" }),
	archiveSubtree = vi
		.fn<OrgWorkspaceController["archiveSubtree"]>()
		.mockResolvedValue({ kind: "success" }),
}: {
	source?: string
	path?: string
	revision?: string
	busy?: boolean
	root?: string
	refileSubtree?: OrgWorkspaceController["refileSubtree"]
	archiveSubtree?: OrgWorkspaceController["archiveSubtree"]
}) => {
	const [content, setContent] = useState(source)
	const controller = {
		content,
		activeDocument: { relativePath: path, revision, content },
		workspace: {
			rootPath: root,
			documents: [
				{ relativePath: path },
				{ relativePath: "inbox.org" },
				{ relativePath: "projects/work.org" },
			],
		},
		refileSubtree,
		archiveSubtree,
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

const openPlanning = (kind: "SCHEDULED" | "DEADLINE") => {
	const editor = screen.getByRole("textbox")
	fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
	fireEvent.keyDown(editor, { ctrlKey: true, key: kind === "SCHEDULED" ? "s" : "d" })
	return screen.getByRole("combobox", {
		name: kind === "SCHEDULED" ? "Schedule (YYYY-MM-DD):" : "Deadline (YYYY-MM-DD):",
	})
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

describe("property minibuffer transactions", () => {
	it("validates, updates locally, and undoes in one transaction", () => {
		const source = "* Note\r\n:PROPERTIES:\r\n:ID: abc\r\n:END:\r\nbody"
		render(<Harness source={source} />)
		const view = viewFromEditor()
		act(() => view.dispatch({ selection: { anchor: 2 } }))
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "p" })
		const input = screen.getByRole("combobox", { name: "Property (KEY=VALUE):" })
		expect(input).toHaveValue("ID=abc")
		expect(screen.queryByRole("dialog")).toBeNull()
		fireEvent.change(input, { target: { value: "BAD KEY=x" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.getByRole("alert")).toHaveTextContent("KEY=VALUE")
		expect(view.state.sliceDoc()).toBe(source)
		fireEvent.change(input, { target: { value: "ID=中文=value" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(view.state.sliceDoc()).toBe(source.replace("abc", "中文=value"))
		expect(editor).toHaveFocus()
		act(() => {
			undo(view)
		})
		expect(view.state.sliceDoc()).toBe(source)
		expect(view.state.selection.main.head).toBe(2)
	})
	it("refuses a damaged drawer rather than overwriting an existing key", () => {
		const source = "* Note\n:PROPERTIES:\n:ID: abc\n** Child"
		render(<Harness source={source} />)
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "p" })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(screen.getByText(/missing :END:/)).toBeVisible()
		expect(viewFromEditor().state.sliceDoc()).toBe(source)
	})
})

describe("planning minibuffer transactions", () => {
	it.each([
		"SCHEDULED",
		"DEADLINE",
	] as const)("opens %s without a modal, validates, commits, and isolates undo", (kind) => {
		const source = `* Note\r\n${kind}: <2026-09-27 Sun 10:30 +1w>\r\nbody`
		render(<Harness source={source} />)
		const view = viewFromEditor()
		act(() => view.dispatch({ selection: { anchor: 2 } }))
		const input = openPlanning(kind)
		expect(input).toHaveValue("2026-09-27")
		expect(screen.queryByRole("dialog")).toBeNull()
		fireEvent.change(input, { target: { value: "2026-02-29" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.getByRole("alert")).toHaveTextContent("real calendar date")
		expect(view.state.sliceDoc()).toBe(source)
		fireEvent.change(input, { target: { value: "2026-10-01" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(view.state.sliceDoc()).toBe(source.replace("2026-09-27 Sun", "2026-10-01"))
		expect(screen.getByRole("textbox")).toHaveFocus()
		act(() => {
			undo(view)
		})
		expect(view.state.sliceDoc()).toBe(source)
		expect(view.state.selection.main.head).toBe(2)
		act(() => {
			redo(view)
		})
		expect(view.state.sliceDoc()).toContain("2026-10-01 10:30 +1w")
	})

	it("allows no-op accept without stripping timestamp details", () => {
		const source = "* Note\nSCHEDULED: <2026-09-30 Wed 10:30 +1w>"
		render(<Harness source={source} />)
		fireEvent.keyDown(openPlanning("SCHEDULED"), { key: "Enter" })
		expect(viewFromEditor().state.sliceDoc()).toBe(source)
		expect(screen.getByText("Schedule unchanged")).toBeVisible()
	})

	it("keeps a planning prompt across revision-only saves and refuses stale content", () => {
		const { rerender } = render(<Harness />)
		const input = openPlanning("DEADLINE")
		fireEvent.change(input, { target: { value: "2026-10-01" } })
		rerender(<Harness revision="saved" />)
		expect(input).toHaveFocus()
		const view = viewFromEditor()
		act(() =>
			view.dispatch({ changes: { from: view.state.doc.length, insert: "\nExternal edit" } }),
		)
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.getByRole("alert")).toHaveTextContent("content changed")
		expect(view.state.sliceDoc()).not.toContain("DEADLINE:")
	})

	it.each([
		"mouse",
		"keyboard",
	])("hands off %s menu focus to the planning minibuffer", async (mode) => {
		render(<Harness />)
		const trigger = screen.getByRole("button", { name: "Note actions" })
		if (mode === "mouse") fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
		else fireEvent.keyDown(trigger, { key: "ArrowDown" })
		const item = await screen.findByRole("menuitem", { name: /^Schedule/ })
		if (mode === "mouse") fireEvent.click(item)
		else fireEvent.keyDown(item, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
		await waitFor(() => expect(screen.getByRole("combobox")).toHaveFocus())
	})
})

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

const openTransfer = (kind: "refile" | "archive") => {
	const editor = screen.getByRole("textbox")
	fireEvent.keyDown(
		editor,
		kind === "refile"
			? { ctrlKey: true, shiftKey: true, key: "r" }
			: { ctrlKey: true, altKey: true, key: "a" },
	)
	return screen.getByRole("combobox", {
		name: kind === "refile" ? "Refile to Org file:" : "Archive subtree (yes/no):",
	})
}

describe("subtree transfer bottom sessions", () => {
	it("completes targets excluding the source and reports unsafe targets inline", async () => {
		const refileSubtree = vi
			.fn<OrgWorkspaceController["refileSubtree"]>()
			.mockResolvedValue({ kind: "success" })
		render(<Harness refileSubtree={refileSubtree} />)
		const view = viewFromEditor()
		const source = view.state.sliceDoc()
		const input = openTransfer("refile")
		expect(screen.queryByRole("dialog")).toBeNull()
		fireEvent.change(input, { target: { value: "" } })
		expect(screen.getByRole("option", { name: "inbox.org" })).toBeVisible()
		expect(screen.getByRole("option", { name: "projects/work.org" })).toBeVisible()
		expect(screen.queryByRole("option", { name: "note.org" })).toBeNull()
		fireEvent.change(input, { target: { value: "../outside.org" } })
		fireEvent.keyDown(input, { key: "Enter" })
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent("safe workspace-relative"),
		)
		expect(screen.getByRole("combobox")).toBe(input)
		expect(refileSubtree).not.toHaveBeenCalled()
		expect(view.state.sliceDoc()).toBe(source)
	})

	it("retains revision-only sessions and rejects changed source before effects", async () => {
		const refileSubtree = vi
			.fn<OrgWorkspaceController["refileSubtree"]>()
			.mockResolvedValue({ kind: "success" })
		const { rerender } = render(<Harness refileSubtree={refileSubtree} />)
		const input = openTransfer("refile")
		rerender(<Harness revision="saved" refileSubtree={refileSubtree} />)
		expect(screen.getByRole("combobox")).toBe(input)
		expect(input).toHaveFocus()
		const view = viewFromEditor()
		act(() =>
			view.dispatch({ changes: { from: view.state.doc.length, insert: "\nExternal edit" } }),
		)
		const changed = view.state.sliceDoc()
		fireEvent.keyDown(input, { key: "Enter" })
		await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("content changed"))
		expect(refileSubtree).not.toHaveBeenCalled()
		expect(view.state.sliceDoc()).toBe(changed)
	})

	it.each([
		"refile",
		"archive",
	] as const)("locks duplicate Enter and Escape during deferred %s", async (kind) => {
		let resolve!: (outcome: { kind: "success" }) => void
		const effect = vi.fn(
			() =>
				new Promise<{ kind: "success" }>((done) => {
					resolve = done
				}),
		)
		render(<Harness refileSubtree={effect} archiveSubtree={effect} />)
		const input = openTransfer(kind)
		if (kind === "archive") fireEvent.change(input, { target: { value: "yes" } })
		fireEvent.keyDown(input, { key: "Enter" })
		fireEvent.keyDown(input, { key: "Enter" })
		fireEvent.keyDown(input, { key: "Escape" })
		expect(screen.getByRole("combobox")).toBe(input)
		expect(effect).toHaveBeenCalledOnce()
		await act(async () => {
			resolve({ kind: "success" })
		})
		await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull())
		expect(screen.getByRole("textbox")).toHaveFocus()
	})

	it.each([
		"partial",
		"rejected",
	] as const)("retires a %s transfer and preserves the source without retry", async (kind) => {
		const refileSubtree = vi
			.fn<OrgWorkspaceController["refileSubtree"]>()
			.mockResolvedValue({ kind, message: "Reread both documents before retrying." })
		render(<Harness refileSubtree={refileSubtree} />)
		const view = viewFromEditor()
		const source = view.state.sliceDoc()
		const input = openTransfer("refile")
		fireEvent.keyDown(input, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull())
		expect(screen.getByText("Reread both documents before retrying.")).toBeVisible()
		fireEvent.keyDown(input, { key: "Enter" })
		expect(refileSubtree).toHaveBeenCalledExactlyOnceWith(0, "inbox.org")
		expect(view.state.sliceDoc()).toBe(source)
	})

	it.each(["default", "cancel", "yes"])("archive %s requires explicit consent", async (choice) => {
		const archiveSubtree = vi
			.fn<OrgWorkspaceController["archiveSubtree"]>()
			.mockResolvedValue({ kind: "success" })
		render(<Harness archiveSubtree={archiveSubtree} />)
		const source = viewFromEditor().state.sliceDoc()
		const input = openTransfer("archive")
		expect(input).toHaveValue("no")
		expect(screen.queryByRole("dialog")).toBeNull()
		if (choice === "yes") fireEvent.change(input, { target: { value: "yes" } })
		fireEvent.keyDown(input, { key: choice === "cancel" ? "Escape" : "Enter" })
		await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull())
		if (choice === "yes") expect(archiveSubtree).toHaveBeenCalledExactlyOnceWith(0)
		else expect(archiveSubtree).not.toHaveBeenCalled()
		expect(viewFromEditor().state.sliceDoc()).toBe(source)
	})
})
