import { redo, undo } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import * as parameterSession from "@/flows/org-command/parameter-session"
import * as orgClock from "@/utils/org-date-clock"
import { OrgDocumentPane } from "./org-document-pane.view.fn"

const readyTarget = (relativePath = "inbox.org") => ({
	kind: "ready" as const,
	snapshot: { relativePath, revision: "target-one", headings: [] },
})

const mockReadRefileTarget = () =>
	vi
		.fn<OrgWorkspaceController["readRefileTarget"]>()
		.mockImplementation(async (path) => readyTarget(path))

const Harness = ({
	source = "* Note :old:\n** Child :grain:",
	path = "note.org",
	revision = "one",
	busy = false,
	root = "/workspace",
	readRefileTarget = mockReadRefileTarget(),
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
	readRefileTarget?: OrgWorkspaceController["readRefileTarget"]
	refileSubtree?: OrgWorkspaceController["refileSubtree"]
	archiveSubtree?: OrgWorkspaceController["archiveSubtree"]
}) => {
	const [content, setContent] = useState(source)
	const controller = {
		content,
		activeBufferId: path,
		activeBufferRuntime: null,
		activeDocument: { relativePath: path, revision, content },
		workspace: {
			rootPath: root,
			documents: [
				{ relativePath: path },
				{ relativePath: "inbox.org" },
				{ relativePath: "projects/work.org" },
			],
		},
		readRefileTarget,
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
		name: kind === "SCHEDULED" ? /^Schedule \(YYYY-MM-DD/ : /^Deadline \(YYYY-MM-DD/,
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

describe("sparse tree command vertical slice", () => {
	it.each([
		["todo:待", "todo:待機"],
		["tag:研", "tag:研究"],
	])("Tab completes %s to an actual source query through the shared minibuffer", (prefix, query) => {
		const source = "#+TODO: 待機 | 終了\n* 待機 Work :研究:\n* 終了 Other :other:"
		render(<Harness source={source} />)
		const view = viewFromEditor()
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { key: "/" })
		const input = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(input, { target: { value: prefix } })
		fireEvent.keyDown(input, { key: "Tab" })
		expect(input).toHaveValue(query)
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(screen.queryByRole("alert")).toBeNull()
		expect(view.state.doc.toString()).toBe(source)
		expect(undo(view)).toBe(false)
	})
	it("routes C-c / through shared minibuffer without editing or adding undo history, then clears from the menu", async () => {
		const source = "Preamble\n* TODO Work :work:\nbody\n* DONE Other\nother body"
		render(<Harness source={source} />)
		const view = viewFromEditor()
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { key: "/" })
		const input = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(input, { target: { value: "tag:" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.getByRole("alert")).toHaveTextContent("tag:NAME")
		fireEvent.change(input, { target: { value: 'match: todo AND itag:work AND NOT text:"Other"' } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(editor).toHaveFocus()
		expect(view.contentDOM.textContent).not.toContain("other body")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { key: "/" })
		const invalid = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(invalid, { target: { value: "match: todo AND (" } })
		fireEvent.keyDown(invalid, { key: "Enter" })
		expect(screen.getByRole("alert")).toHaveTextContent("128 nodes")
		expect(view.contentDOM.textContent).not.toContain("other body")
		expect(screen.queryByRole("dialog")).toBeNull()
		fireEvent.keyDown(invalid, { key: "Escape" })
		expect(view.state.doc.toString()).toBe(source)
		expect(undo(view)).toBe(false)
		fireEvent.pointerDown(screen.getByRole("button", { name: "Note actions" }), {
			button: 0,
			ctrlKey: false,
		})
		fireEvent.click(await screen.findByRole("menuitem", { name: "Clear sparse tree" }))
		expect(view.state.doc.toString()).toBe(source)
		expect(screen.getByText("Sparse tree cleared")).toBeInTheDocument()
	})
})

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
		["SCHEDULED", "invalid Date"],
		["DEADLINE", "invalid Date"],
		["SCHEDULED", "throw"],
		["DEADLINE", "throw"],
	] as const)("rejects %s preparation with a %s clock before allocating or editing", (kind, failure) => {
		const original = parameterSession.createParameterSession
		const begin = vi.fn()
		vi.spyOn(parameterSession, "createParameterSession").mockImplementation(() => {
			const core = original()
			return {
				...core,
				begin: (...args: Parameters<typeof core.begin>) => {
					begin()
					return core.begin(...args)
				},
			}
		})
		const clock = vi.spyOn(orgClock, "systemOrgNow").mockImplementation(() => {
			if (failure === "throw") throw new Error("Clock unavailable")
			return new Date(Number.NaN)
		})
		try {
			const source = "* Note\r\nbody"
			const readRefileTarget = mockReadRefileTarget()
			render(<Harness source={source} readRefileTarget={readRefileTarget} />)
			const view = viewFromEditor()
			const state = view.state
			for (let attempt = 0; attempt < 2; attempt++) {
				const editor = screen.getByRole("textbox")
				fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
				fireEvent.keyDown(editor, { ctrlKey: true, key: kind === "SCHEDULED" ? "s" : "d" })
				expect(
					screen.getByText("Cannot read a valid local calendar day from the clock."),
				).toBeVisible()
				expect(screen.queryByRole("combobox")).toBeNull()
				expect(view.state).toBe(state)
			}
			expect(clock).toHaveBeenCalledTimes(2)
			expect(begin).not.toHaveBeenCalled()
			expect(readRefileTarget).not.toHaveBeenCalled()
			expect(view.state.sliceDoc()).toBe(source)
			expect(undo(view)).toBe(false)
			expect(redo(view)).toBe(false)
		} finally {
			vi.restoreAllMocks()
		}
	})

	it.each([
		"SCHEDULED",
		"DEADLINE",
	] as const)("opens existing %s ISO date without consulting a throwing clock", (kind) => {
		const clock = vi.spyOn(orgClock, "systemOrgNow").mockImplementation(() => {
			throw new Error("Clock must not be read")
		})
		try {
			const source = `* Note\r\n${kind}: <2026-09-27 Sun 10:30 +1w>\r\nbody`
			render(<Harness source={source} />)
			const view = viewFromEditor()
			expect(openPlanning(kind)).toHaveValue("2026-09-27")
			expect(clock).not.toHaveBeenCalled()
			expect(view.state.sliceDoc()).toBe(source)
			expect(undo(view)).toBe(false)
			fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
		} finally {
			vi.restoreAllMocks()
		}
	})

	it.each([
		["SCHEDULED", "tomorrow"],
		["DEADLINE", "明天"],
	] as const)("resolves %s relative input %s at accept across midnight with one undo", (kind, alias) => {
		vi.useFakeTimers({ toFake: ["Date"] })
		try {
			vi.setSystemTime(new Date(2026, 8, 30, 23, 59))
			const source = `* Note\r\n${kind}: <2026-09-27 Sun 10:30 +1w>\r\nbody`
			render(<Harness source={source} />)
			const view = viewFromEditor()
			act(() => view.dispatch({ selection: { anchor: 2 } }))
			const input = openPlanning(kind)
			fireEvent.change(input, { target: { value: alias } })
			vi.setSystemTime(new Date(2026, 9, 1, 0, 1))
			fireEvent.keyDown(input, { key: "Enter" })
			expect(view.state.sliceDoc()).toBe(source.replace("2026-09-27 Sun", "2026-10-02"))
			expect(screen.queryByRole("combobox")).toBeNull()
			expect(screen.getByRole("textbox")).toHaveFocus()
			act(() => {
				expect(undo(view)).toBe(true)
			})
			expect(view.state.sliceDoc()).toBe(source)
			expect(view.state.selection.main.head).toBe(2)
			expect(undo(view)).toBe(false)
			act(() => {
				expect(redo(view)).toBe(true)
			})
			expect(view.state.sliceDoc()).toContain("2026-10-02 10:30 +1w")
		} finally {
			vi.useRealTimers()
		}
	})

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

const acceptRefileFile = async (input: HTMLElement) => {
	fireEvent.keyDown(input, { key: "Enter" })
	const heading = await screen.findByRole("combobox", { name: "Refile under heading:" })
	expect(heading).toHaveValue("(file root)")
	expect(heading).toHaveFocus()
	return heading
}

describe("subtree transfer bottom sessions", () => {
	it("does not confirm file root from a held Enter crossing the fast file lookup phase", async () => {
		const refileSubtree = vi
			.fn<OrgWorkspaceController["refileSubtree"]>()
			.mockResolvedValue({ kind: "success" })
		render(<Harness refileSubtree={refileSubtree} />)
		const file = openTransfer("refile")
		fireEvent.keyDown(file, { key: "Enter" })
		fireEvent.keyDown(file, { key: "Enter", repeat: true })
		const heading = await screen.findByRole("combobox", { name: "Refile under heading:" })
		expect(heading).toHaveValue("(file root)")
		expect(fireEvent.keyDown(heading, { key: "Enter", repeat: true })).toBe(false)
		expect(refileSubtree).not.toHaveBeenCalled()
		fireEvent.keyDown(heading, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull())
		expect(refileSubtree).toHaveBeenCalledExactlyOnceWith(0, "inbox.org", {
			expectedTargetRevision: "target-one",
		})
	})

	it("completes targets including the exact source and reports unsafe targets inline", async () => {
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
		expect(screen.getByRole("option", { name: "note.org" })).toBeVisible()
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
		let input = openTransfer(kind)
		if (kind === "refile") {
			input = await acceptRefileFile(input)
			expect(effect).not.toHaveBeenCalled()
		} else fireEvent.change(input, { target: { value: "yes" } })
		fireEvent.keyDown(input, { key: "Enter" })
		fireEvent.keyDown(input, { key: "Enter" })
		fireEvent.keyDown(input, { key: "Escape" })
		fireEvent.keyDown(input, { ctrlKey: true, key: "g" })
		fireEvent.click(screen.getByRole("button", { name: "Cancel minibuffer" }))
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
		const input = await acceptRefileFile(openTransfer("refile"))
		expect(refileSubtree).not.toHaveBeenCalled()
		fireEvent.keyDown(input, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull())
		expect(screen.getByText("Reread both documents before retrying.")).toBeVisible()
		fireEvent.keyDown(input, { key: "Enter" })
		expect(refileSubtree).toHaveBeenCalledExactlyOnceWith(0, "inbox.org", {
			expectedTargetRevision: "target-one",
		})
		expect(view.state.sliceDoc()).toBe(source)
	})

	it("completes duplicate heading labels by keyboard and passes the snapshot identity", async () => {
		const readRefileTarget = mockReadRefileTarget().mockResolvedValue({
			kind: "ready",
			snapshot: {
				relativePath: "inbox.org",
				revision: "target-heading-revision",
				headings: [
					{ from: 0, heading: "* Title", level: 1, outlinePath: "Title", lineNumber: 1 },
					{ from: 8, heading: "* Title", level: 1, outlinePath: "Title", lineNumber: 2 },
				],
			},
		})
		const refileSubtree = vi
			.fn<OrgWorkspaceController["refileSubtree"]>()
			.mockResolvedValue({ kind: "success" })
		render(<Harness readRefileTarget={readRefileTarget} refileSubtree={refileSubtree} />)
		const view = viewFromEditor()
		const source = view.state.sliceDoc()
		act(() => view.dispatch({ selection: { anchor: source.indexOf("** Child") + 3 } }))
		const cursor = view.state.selection.main.head
		const input = await acceptRefileFile(openTransfer("refile"))
		expect(readRefileTarget).toHaveBeenCalledExactlyOnceWith("inbox.org", expect.any(AbortSignal))
		expect(refileSubtree).not.toHaveBeenCalled()
		fireEvent.change(input, { target: { value: "Title" } })
		expect(screen.getByRole("option", { name: "Title [line 1]" })).toBeVisible()
		expect(screen.getByRole("option", { name: "Title [line 2]" })).toBeVisible()
		fireEvent.keyDown(input, { key: "ArrowDown" })
		fireEvent.keyDown(input, { key: "Tab" })
		expect(input).toHaveValue("Title [line 2]")
		fireEvent.keyDown(input, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull())
		expect(refileSubtree).toHaveBeenCalledExactlyOnceWith(cursor, "inbox.org", {
			expectedTargetRevision: "target-heading-revision",
			targetHeading: { from: 8, heading: "* Title" },
		})
		expect(view.state.sliceDoc()).toBe(source)
		expect(view.state.selection.main.head).toBe(cursor)
		expect(screen.getByRole("textbox")).toHaveFocus()
	})

	it("cancels a deferred file read immediately without closing a newer session on late completion", async () => {
		let resolve!: (outcome: ReturnType<typeof readyTarget>) => void
		const readRefileTarget = mockReadRefileTarget().mockImplementation(
			() =>
				new Promise((done) => {
					resolve = done
				}),
		)
		const refileSubtree = vi.fn<OrgWorkspaceController["refileSubtree"]>()
		render(<Harness readRefileTarget={readRefileTarget} refileSubtree={refileSubtree} />)
		const input = openTransfer("refile")
		fireEvent.keyDown(input, { key: "Enter" })
		expect(readRefileTarget).toHaveBeenCalledOnce()
		fireEvent.keyDown(input, { ctrlKey: true, key: "g" })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(screen.getByRole("textbox")).toHaveFocus()
		expect(readRefileTarget.mock.calls[0][1]?.aborted).toBe(true)
		const newer = openTags()
		fireEvent.change(newer, { target: { value: "newer" } })
		await act(async () => resolve(readyTarget()))
		expect(screen.getByRole("combobox", { name: "Tags:" })).toBe(newer)
		expect(newer).toHaveValue("newer")
		expect(newer).toHaveFocus()
		expect(refileSubtree).not.toHaveBeenCalled()
	})

	it("ignores IME Enter in both phases and cancels heading selection without effects", async () => {
		const readRefileTarget = mockReadRefileTarget()
		const refileSubtree = vi.fn<OrgWorkspaceController["refileSubtree"]>()
		render(<Harness readRefileTarget={readRefileTarget} refileSubtree={refileSubtree} />)
		const file = openTransfer("refile")
		fireEvent.keyDown(file, { key: "Enter", keyCode: 229 })
		fireEvent.compositionStart(file)
		fireEvent.keyDown(file, { key: "Enter" })
		fireEvent.compositionEnd(file)
		expect(readRefileTarget).not.toHaveBeenCalled()
		const heading = await acceptRefileFile(file)
		fireEvent.keyDown(heading, { key: "Enter", keyCode: 229 })
		fireEvent.keyDown(heading, { key: "Enter", isComposing: true })
		fireEvent.compositionStart(heading)
		fireEvent.keyDown(heading, { key: "Enter" })
		fireEvent.compositionEnd(heading)
		expect(refileSubtree).not.toHaveBeenCalled()
		fireEvent.keyDown(heading, { ctrlKey: true, key: "g" })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(screen.getByRole("textbox")).toHaveFocus()
	})

	it("guards the original source after heading lookup while retaining revision-only saves", async () => {
		const readRefileTarget = mockReadRefileTarget()
		const refileSubtree = vi.fn<OrgWorkspaceController["refileSubtree"]>()
		const { rerender } = render(
			<Harness readRefileTarget={readRefileTarget} refileSubtree={refileSubtree} />,
		)
		const heading = await acceptRefileFile(openTransfer("refile"))
		rerender(
			<Harness
				revision="saved"
				readRefileTarget={readRefileTarget}
				refileSubtree={refileSubtree}
			/>,
		)
		expect(heading).toHaveFocus()
		const view = viewFromEditor()
		act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: "\nChanged" } }))
		fireEvent.keyDown(heading, { key: "Enter" })
		await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("content changed"))
		expect(refileSubtree).not.toHaveBeenCalled()
		expect(readRefileTarget).toHaveBeenCalledOnce()
	})

	it("retires a changed-target outcome without retrying the old snapshot", async () => {
		const readRefileTarget = mockReadRefileTarget()
		const refileSubtree = vi.fn<OrgWorkspaceController["refileSubtree"]>().mockResolvedValue({
			kind: "rejected",
			message: "The target changed. Reopen refile for a fresh selection.",
		})
		render(<Harness readRefileTarget={readRefileTarget} refileSubtree={refileSubtree} />)
		const heading = await acceptRefileFile(openTransfer("refile"))
		fireEvent.keyDown(heading, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull())
		expect(screen.getByText(/The target changed/)).toBeVisible()
		fireEvent.keyDown(heading, { key: "Enter" })
		expect(readRefileTarget).toHaveBeenCalledOnce()
		expect(refileSubtree).toHaveBeenCalledOnce()
		expect(screen.getByRole("textbox")).toHaveFocus()
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
