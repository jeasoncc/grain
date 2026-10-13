import { redo, undo } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { ApplicationTestDocumentPane, render } from "@/test/application-providers"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgRefileTargetOutcome, OrgWorkspaceController } from "@/hooks/use-org-workspace"
import * as orgClock from "@/utils/org-date-clock"
import { OrgCalendarReader } from "./org-calendar-reader.view.fn"

const readyTarget = (relativePath = "inbox.org") => ({
	kind: "ready" as const,
	snapshot: { relativePath, revision: "target-one", source: "", headings: [] },
})

const rangeRects = Object.getOwnPropertyDescriptor(Range.prototype, "getClientRects")
const rangeBounds = Object.getOwnPropertyDescriptor(Range.prototype, "getBoundingClientRect")
beforeEach(() => {
	// jsdom has no layout; replace only CM's browser Range geometry boundary.
	Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] })
	Object.defineProperty(Range.prototype, "getBoundingClientRect", {
		configurable: true,
		value: () => new DOMRect(),
	})
})
afterEach(() => {
	cleanup()
	for (const [key, descriptor] of [
		["getClientRects", rangeRects],
		["getBoundingClientRect", rangeBounds],
	] as const) {
		if (descriptor) Object.defineProperty(Range.prototype, key, descriptor)
		else Reflect.deleteProperty(Range.prototype, key)
	}
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
		getBufferEffectState: (bufferId: string) => bufferId === path
			? { busy, loading: false, saving: false, readOnly: busy }
			: null,
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
		<ApplicationTestDocumentPane
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
			openDocumentPaths={[path]}
		/>
	)
}

const openPlanning = (kind: "SCHEDULED" | "DEADLINE") => {
	const editor = screen.getByRole("textbox")
	fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
	fireEvent.keyUp(window, { ctrlKey: true, key: "c" })
	fireEvent.keyDown(editor, { ctrlKey: true, key: kind === "SCHEDULED" ? "s" : "d" })
	fireEvent.keyUp(window, { ctrlKey: true, key: kind === "SCHEDULED" ? "s" : "d" })
	return screen.getByRole("combobox", {
		name: kind === "SCHEDULED" ? /^Schedule \(/ : /^Deadline \(/,
	})
}

const beginTags = () => {
	const editor = screen.getByRole("textbox")
	fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
	fireEvent.keyUp(window, { ctrlKey: true, key: "c" })
	fireEvent.keyDown(editor, { ctrlKey: true, key: "q" })
	fireEvent.keyUp(window, { ctrlKey: true, key: "q" })
}
const openTags = () => {
	beginTags()
	return screen.getByRole("combobox", { name: "Tags:" })
}
const viewFromEditor = () => {
	const view = EditorView.findFromDOM(screen.getByRole("textbox"))
	if (!view) throw new Error("No editor")
	return view
}

describe("parameter origin revision and cancellation", () => {
	it("restores the exact origin selection and scroll on cancellation without history", async () => {
		render(<Harness source={"* Note :old:\nbody"} />)
		const view = viewFromEditor()
		act(() => view.dispatch({ selection: { anchor: 2, head: 6 } }))
		// C-c with a selection is native copy, not an Org prefix. Use the real
		// toolbar command to capture the full nonempty originating selection.
		fireEvent.pointerDown(screen.getByRole("button", { name: "Note actions" }), {
			button: 0,
			ctrlKey: false,
		})
		const item = await screen.findByRole("menuitem", { name: /Heading tags/ })
		view.scrollDOM.scrollTop = 31
		view.scrollDOM.scrollLeft = 7
		fireEvent.click(item)
		await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
		const input = screen.getByRole("combobox", { name: "Tags:" })
		await waitFor(() => expect(input).toHaveFocus())
		fireEvent.change(input, { target: { value: "draft" } })
		act(() => view.dispatch({ selection: { anchor: 8 } }))
		view.scrollDOM.scrollTop = 0
		view.scrollDOM.scrollLeft = 0
		fireEvent.keyDown(input, { key: "Escape" })
		expect(view.state.selection.main).toMatchObject({ anchor: 2, head: 6 })
		expect(view.scrollDOM.scrollTop).toBe(31)
		expect(view.scrollDOM.scrollLeft).toBe(7)
		expect(screen.getByRole("textbox")).toHaveFocus()
		expect(view.state.sliceDoc()).toBe("* Note :old:\nbody")
		expect(undo(view)).toBe(false)
		expect(redo(view)).toBe(false)
	})

	it("retires parameters after a same-source edit/undo ABA and permits a fresh command", async () => {
		const source = "* Note :old:\nbody"
		render(<Harness source={source} />)
		const view = viewFromEditor()
		await act(async () => { beginTags() })
		expect(screen.getByRole("combobox", { name: "Tags:" })).toBeInTheDocument()
		await act(async () => {
			view.dispatch({ changes: { from: view.state.doc.length, insert: "!" } })
			undo(view)
		})
		expect(view.state.sliceDoc()).toBe(source)
		expect(screen.queryByRole("combobox", { name: "Tags:" })).toBeNull()
		await act(async () => { beginTags() })
		const input = screen.getByRole("combobox", { name: "Tags:" })
		await act(async () => {
			fireEvent.change(input, { target: { value: "fresh" } })
			fireEvent.keyDown(input, { key: "Enter" })
			fireEvent.keyUp(window, { key: "Enter" })
		})
		expect(view.state.sliceDoc()).toBe("* Note :fresh:\nbody")
		expect(screen.queryByRole("combobox")).toBeNull()
	})
})

describe("parameter disk revision ownership", () => {
	it.each(["tags", "scheduled"] as const)("accepts %s after a revision-only save with the same input host", (command) => {
		const source = "* Note :old:\nbody"
		const { rerender } = render(<Harness source={source} />)
		const view = viewFromEditor()
		const input = command === "tags" ? openTags() : openPlanning("SCHEDULED")
		fireEvent.change(input, { target: { value: command === "tags" ? "fresh" : "2026-10-06" } })
		rerender(<Harness source={source} revision="saved-on-disk" />)
		expect(screen.getByRole("region", { name: "Minibuffer" })).toContainElement(input)
		expect(input).toHaveFocus()
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(view.state.sliceDoc()).toBe(command === "tags"
			? "* Note :fresh:\nbody"
			: "* Note :old:\nSCHEDULED: <2026-10-06>\nbody")
		act(() => { expect(undo(view)).toBe(true) })
		expect(view.state.sliceDoc()).toBe(source)
		expect(undo(view)).toBe(false)
	})
})

describe("planning clock reentrancy", () => {
	it("refuses an accept-time source ABA without applying stale planning input", () => {
		const source = "* Note\nbody"
		let view: EditorView | null = null
		const clock = vi.spyOn(orgClock, "systemOrgNow").mockReturnValue(new Date(2026, 9, 5, 12))
		try {
			render(<Harness source={source} />)
			view = viewFromEditor()
			const input = openPlanning("SCHEDULED")
			clock.mockImplementation(() => {
				view!.dispatch({ changes: { from: view!.state.doc.length, insert: "!" } })
				undo(view!)
				return new Date(2026, 9, 5, 12)
			})
			fireEvent.change(input, { target: { value: "tomorrow" } })
			fireEvent.keyDown(input, { key: "Enter" })
			expect(view.state.sliceDoc()).toBe(source)
			expect(screen.queryByRole("combobox")).toBeNull()
		} finally {
			clock.mockRestore()
		}
	})
})

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
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(screen.getByRole("alert")).toBeVisible()
		fireEvent.change(input, { target: { value: 'match: todo:TODO AND itag:work AND NOT text:"Other"' } })
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(editor).toHaveFocus()
		expect(view.contentDOM.textContent).not.toContain("other body")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { key: "/" })
		const invalid = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(invalid, { target: { value: "match: todo:TODO AND (" } })
		await act(async () => { fireEvent.keyDown(invalid, { key: "Enter" }) })
		expect(screen.getByRole("alert")).toBeVisible()
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
	it("validates, updates locally, and undoes in one transaction", async () => {
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
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(screen.getByRole("alert")).toBeVisible()
		expect(view.state.sliceDoc()).toBe(source)
		fireEvent.change(input, { target: { value: "ID=中文=value" } })
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
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
		expect(viewFromEditor().state.sliceDoc()).toBe(source)
		expect(undo(viewFromEditor())).toBe(false)
	})
})

describe("planning minibuffer transactions", () => {
	it.each([
		["SCHEDULED", "invalid Date"],
		["DEADLINE", "invalid Date"],
		["SCHEDULED", "throw"],
		["DEADLINE", "throw"],
	] as const)("rejects %s preparation with a %s clock before allocating or editing", (kind, failure) => {
		vi.spyOn(orgClock, "systemOrgNow").mockImplementation(() => {
			if (failure === "throw") throw new Error("Clock unavailable")
			return new Date(Number.NaN)
		})
		try {
			const source = "* Note\r\nbody"
			const readRefileTarget = mockReadRefileTarget()
			render(<Harness source={source} readRefileTarget={readRefileTarget} />)
			const view = viewFromEditor()
			for (let attempt = 0; attempt < 2; attempt++) {
				const editor = screen.getByRole("textbox")
				fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
				fireEvent.keyDown(editor, { ctrlKey: true, key: kind === "SCHEDULED" ? "s" : "d" })
				expect(screen.getByRole("alert")).toBeVisible()
				expect(screen.queryByRole("combobox")).toBeNull()
			}
			expect(readRefileTarget).not.toHaveBeenCalled()
			expect(view.state.sliceDoc()).toBe(source)
			expect(undo(view)).toBe(false)
			expect(redo(view)).toBe(false)
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
	] as const)("opens %s without a modal, validates, commits, and isolates undo", async (kind) => {
		const source = `* Note\r\n${kind}: <2026-09-27 Sun 10:30 +1w>\r\nbody`
		render(<Harness source={source} />)
		const view = viewFromEditor()
		act(() => view.dispatch({ selection: { anchor: 2 } }))
		const input = openPlanning(kind)
		expect(screen.queryByRole("dialog")).toBeNull()
		fireEvent.change(input, { target: { value: "2026-02-29" } })
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(screen.getByRole("alert")).toBeVisible()
		expect(view.state.sliceDoc()).toBe(source)
		fireEvent.change(input, { target: { value: "2026-10-01" } })
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
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

	it("edits both calendar range clocks independently in one raw transaction", async () => {
		const source = "* Note\r\nSCHEDULED: <2026-10-01 Thu 08:00-10:30 .+1m --2d>--<2026-10-02 Fri 11:00>\r\nbody"
		render(<Harness source={source} />)
		const view = viewFromEditor()
		const input = openPlanning("SCHEDULED")
		fireEvent.change(screen.getByLabelText("End time"), { target: { value: "10:45" } })
		fireEvent.change(screen.getByLabelText("Range end time"), { target: { value: "12:00" } })
		expect(view.state.sliceDoc()).toBe(source)
		expect(undo(view)).toBe(false)
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(view.state.sliceDoc()).toBe(source.replace(
			"<2026-10-01 Thu 08:00-10:30 .+1m --2d>--<2026-10-02 Fri 11:00>",
			"<2026-10-01 08:00-10:45 .+1m --2d>--<2026-10-02 12:00>",
		))
		act(() => { expect(undo(view)).toBe(true) })
		expect(view.state.sliceDoc()).toBe(source)
		expect(undo(view)).toBe(false)
	})
	it("projects repeater maximum, independent endpoint cookies and explicit removal into one canonical edit", async () => {
		const source = "* Note\r\nSCHEDULED: <2026-10-01 Thu 08:00 +1w/2w -3d>--<2026-10-02 Fri 11:00 +1m/2m --2d>\r\nbody"
		render(<Harness source={source} />)
		const view = viewFromEditor()
		const input = openPlanning("SCHEDULED")
		fireEvent.change(screen.getByLabelText("Repeater mode"), { target: { value: "++" } })
		expect(screen.getByLabelText("Repeat maximum interval")).toHaveValue(2)
		fireEvent.change(screen.getByLabelText("Repeat maximum interval"), { target: { value: "3" } })
		fireEvent.change(screen.getByLabelText("Repeat maximum unit"), { target: { value: "m" } })
		fireEvent.change(screen.getByLabelText("Range end repeater mode"), { target: { value: ".+" } })
		expect(screen.getByLabelText("Range end repeat maximum interval")).toHaveValue(2)
		fireEvent.change(screen.getByLabelText("Range end repeat maximum interval"), { target: { value: "4" } })
		fireEvent.change(screen.getByLabelText("Range end warning mode"), { target: { value: "" } })
		fireEvent.change(screen.getByLabelText("Warning mode"), { target: { value: "" } })
		expect(view.state.sliceDoc()).toBe(source)
		expect(undo(view)).toBe(false)
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(view.state.sliceDoc()).toBe(source.replace(
			"<2026-10-01 Thu 08:00 +1w/2w -3d>--<2026-10-02 Fri 11:00 +1m/2m --2d>",
			"<2026-10-01 08:00 ++1w/3m>--<2026-10-02 11:00 .+1m/4m>",
		))
		act(() => { expect(undo(view)).toBe(true) })
		expect(view.state.sliceDoc()).toBe(source)
		expect(undo(view)).toBe(false)
	})
	it("keeps invalid maximum drafts editable and cancellation leaves raw Source untouched", () => {
		const source = "* Note\nSCHEDULED: <2026-10-01 Thu +1w/2w>"
		render(<Harness source={source} />)
		const view = viewFromEditor()
		openPlanning("SCHEDULED")
		fireEvent.change(screen.getByLabelText("Repeat maximum interval"), { target: { value: "0" } })
		expect(screen.getByRole("button", { name: "Accept" })).toBeDisabled()
		expect(screen.getByLabelText("Repeat maximum interval")).toHaveValue(0)
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
		expect(view.state.sliceDoc()).toBe(source)
		expect(undo(view)).toBe(false)
	})
	it("accepts a fresh GTK repeat-marked Calendar Enter but not the same held key in its replacement reader", async () => {
		const clock = vi.spyOn(orgClock, "systemOrgNow").mockReturnValue(new Date(2026, 9, 10, 10, 5))
		try {
			const source = "* Note\r\nraw\0😀"
			render(<Harness source={source} />)
			const view = viewFromEditor()
			const input = openPlanning("SCHEDULED")
			fireEvent.change(input, { target: { value: "11:00+2" } })
			await act(async () => { fireEvent.keyDown(input, { key: "Enter", code: "Enter", repeat: true }) })
			expect(screen.queryByRole("combobox")).toBeNull()
			const scheduled = view.state.sliceDoc()
			expect(scheduled).toContain("11:00-13:00")
			expect(scheduled).toContain("\r\nraw\0😀")
			const replacement = openPlanning("DEADLINE")
			fireEvent.change(replacement, { target: { value: "2026-10-12" } })
			await act(async () => { fireEvent.keyDown(replacement, { key: "Enter", code: "Enter", repeat: true }) })
			expect(replacement).toBeInTheDocument()
			expect(view.state.sliceDoc()).toBe(scheduled)
			fireEvent.keyUp(window, { key: "Enter", code: "Enter" })
			await act(async () => { fireEvent.keyDown(replacement, { key: "Enter", code: "Enter", repeat: true }) })
			fireEvent.keyUp(window, { key: "Enter", code: "Enter" })
			expect(screen.queryByRole("combobox")).toBeNull()
			expect(view.state.sliceDoc()).toContain("DEADLINE:")
			act(() => { expect(undo(view)).toBe(true) })
			expect(view.state.sliceDoc()).toBe(scheduled)
			act(() => { expect(undo(view)).toBe(true) })
			expect(view.state.sliceDoc()).toBe(source)
			expect(undo(view)).toBe(false)
		} finally { clock.mockRestore() }
	})
	it("makes forced years visible for both prompt endpoints without invoking source callbacks", () => {
		const onChange = vi.fn(), onAccept = vi.fn(), onCancel = vi.fn()
		render(<OrgCalendarReader value="<2040-01-01>--<2050-01-02>" context={{ today: "2026-10-10", policy: { preferFuture: true, forceCompatibleYears: true } }} onChange={onChange} onAccept={onAccept} onCancel={onCancel} />)
		expect(screen.getByText(/Year forced from 2040 to 2037/)).toBeVisible()
		expect(screen.getByText(/Range end year forced from 2050 to 2037/)).toBeVisible()
		expect(screen.getByLabelText("End time")).toBeDisabled()
		expect(onChange).not.toHaveBeenCalled()
		expect(onAccept).not.toHaveBeenCalled()
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
		const changedState = view.state
		expect(screen.queryByRole("combobox")).toBeNull()
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(view.state.sliceDoc()).not.toContain("DEADLINE:")
		expect(view.state).toBe(changedState)
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
		await waitFor(() => expect(screen.getByRole("combobox", { name: /^Schedule \(/ })).toHaveFocus())
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
		const changedState = view.state
		expect(screen.queryByRole("combobox")).toBeNull()
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(view.state.sliceDoc()).not.toContain(":work:")
		expect(view.state).toBe(changedState)
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

	it("rejects busy submission, then permits retry after a revision-only save", async () => {
		const { rerender } = render(<Harness />)
		const input = openTags()
		fireEvent.change(input, { target: { value: "work" } })
		rerender(<Harness busy />)
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(screen.getByRole("alert")).toBeVisible()
		rerender(<Harness revision="saved" />)
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(viewFromEditor().state.sliceDoc()).toContain(":work:")
	})

	it("cancels on workspace switch with the same relative path", () => {
		const { rerender } = render(<Harness />)
		openTags()
		rerender(<Harness root="/other" />)
		expect(screen.queryByRole("combobox")).toBeNull()
	})

	it("refuses a preamble invocation without opening a useless form or changing source", () => {
		const source = "#+title: Preamble\n\n* Heading"
		render(<Harness source={source} />)
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "q" })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(viewFromEditor().state.sliceDoc()).toBe(source)
		expect(undo(viewFromEditor())).toBe(false)
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
	expect(heading).toHaveFocus()
	return heading
}

const acceptRefileHeading = async (heading: HTMLElement) => {
	const source = viewFromEditor().state.sliceDoc()
	fireEvent.keyDown(heading, { key: "Enter" })
	const confirmation = await screen.findByRole("combobox", { name: "Confirm Refile (yes/no):" })
	expect(screen.getByLabelText("Refile insertion preview")).toBeVisible()
	expect(viewFromEditor().state.sliceDoc()).toBe(source)
	expect(undo(viewFromEditor())).toBe(false)
	fireEvent.change(confirmation, { target: { value: "yes" } })
	return confirmation
}

describe("subtree transfer bottom sessions", () => {
	it("previews a same-file raw move and commits one canonical undo only after confirmation", async () => {
		const source = "* Note\r\nbody\0\r\n* Destination\r\nkeep\r\n"
		const readRefileTarget = mockReadRefileTarget()
		const refileSubtree = vi.fn<OrgWorkspaceController["refileSubtree"]>()
		render(<Harness source={source} readRefileTarget={readRefileTarget} refileSubtree={refileSubtree} />)
		const view = viewFromEditor()
		const file = openTransfer("refile")
		fireEvent.change(file, { target: { value: "note.org" } })
		const heading = await acceptRefileFile(file)
		fireEvent.change(heading, { target: { value: "Destination [line 3]" } })
		const confirmation = await acceptRefileHeading(heading)
		expect(readRefileTarget).not.toHaveBeenCalled()
		expect(refileSubtree).not.toHaveBeenCalled()
		await act(async () => { fireEvent.keyDown(confirmation, { key: "Enter" }) })
		expect(view.state.sliceDoc()).toBe("* Destination\r\nkeep\r\n** Note\r\nbody\0\r\n")
		act(() => { expect(undo(view)).toBe(true) })
		expect(view.state.sliceDoc()).toBe(source)
		expect(undo(view)).toBe(false)
		expect(refileSubtree).not.toHaveBeenCalled()
	})

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
		const confirmation = await acceptRefileHeading(heading)
		fireEvent.keyDown(confirmation, { key: "Enter", repeat: true })
		expect(refileSubtree).not.toHaveBeenCalled()
		fireEvent.keyDown(confirmation, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull())
		expect(refileSubtree).toHaveBeenCalledTimes(1)
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
		const changedState = view.state
		expect(screen.queryByRole("combobox")).toBeNull()
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(refileSubtree).not.toHaveBeenCalled()
		expect(view.state.sliceDoc()).toBe(changed)
		expect(view.state).toBe(changedState)
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
			input = await acceptRefileHeading(input)
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
		const input = await acceptRefileHeading(await acceptRefileFile(openTransfer("refile")))
		expect(refileSubtree).not.toHaveBeenCalled()
		fireEvent.keyDown(input, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull())
		expect(screen.getByText("Reread both documents before retrying.")).toBeVisible()
		fireEvent.keyDown(input, { key: "Enter" })
		expect(refileSubtree).toHaveBeenCalledTimes(1)
		expect(view.state.sliceDoc()).toBe(source)
	})

	it("completes duplicate heading labels by keyboard without moving the source cursor", async () => {
		const readRefileTarget = mockReadRefileTarget().mockResolvedValue({
			kind: "ready",
			snapshot: {
				relativePath: "inbox.org",
				revision: "target-heading-revision",
				source: "* Title\n* Title\n",
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
		expect(refileSubtree).not.toHaveBeenCalled()
		fireEvent.change(input, { target: { value: "Title" } })
		expect(screen.getByRole("option", { name: "Title [line 1]" })).toBeVisible()
		expect(screen.getByRole("option", { name: "Title [line 2]" })).toBeVisible()
		fireEvent.keyDown(input, { key: "ArrowDown" })
		fireEvent.keyDown(input, { key: "Tab" })
		expect(input).toHaveValue("Title [line 2]")
		const confirmation = await acceptRefileHeading(input)
		expect(refileSubtree).not.toHaveBeenCalled()
		fireEvent.keyDown(confirmation, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull())
		expect(refileSubtree).toHaveBeenCalledTimes(1)
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

	it("retires a deferred target lookup on source ABA and cannot replace a fresh parameter session", async () => {
		const pending = Promise.withResolvers<OrgRefileTargetOutcome>()
		const readRefileTarget = mockReadRefileTarget().mockReturnValue(pending.promise)
		const refileSubtree = vi.fn<OrgWorkspaceController["refileSubtree"]>()
		render(<Harness readRefileTarget={readRefileTarget} refileSubtree={refileSubtree} />)
		const view = viewFromEditor()
		const source = view.state.sliceDoc()
		fireEvent.keyDown(openTransfer("refile"), { key: "Enter" })
		expect(readRefileTarget).toHaveBeenCalledOnce()
		act(() => {
			view.dispatch({ changes: { from: view.state.doc.length, insert: "!" } })
			undo(view)
		})
		expect(view.state.sliceDoc()).toBe(source)
		expect(readRefileTarget.mock.calls[0][1]?.aborted).toBe(true)
		expect(screen.queryByRole("combobox")).toBeNull()
		const fresh = openTags()
		fireEvent.change(fresh, { target: { value: "keep draft" } })
		await act(async () => pending.resolve(readyTarget()))
		expect(screen.getByRole("combobox", { name: "Tags:" })).toBe(fresh)
		expect(fresh).toHaveValue("keep draft")
		expect(fresh).toHaveFocus()
		expect(refileSubtree).not.toHaveBeenCalled()
		expect(view.state.sliceDoc()).toBe(source)
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
		const changedState = view.state
		expect(screen.queryByRole("combobox")).toBeNull()
		fireEvent.keyDown(heading, { key: "Enter" })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(refileSubtree).not.toHaveBeenCalled()
		expect(readRefileTarget).toHaveBeenCalledOnce()
		expect(view.state).toBe(changedState)
	})

	it("retires a changed-target outcome without retrying the old snapshot", async () => {
		const readRefileTarget = mockReadRefileTarget()
		const refileSubtree = vi.fn<OrgWorkspaceController["refileSubtree"]>().mockResolvedValue({
			kind: "rejected",
			message: "The target changed. Reopen refile for a fresh selection.",
		})
		render(<Harness readRefileTarget={readRefileTarget} refileSubtree={refileSubtree} />)
		const heading = await acceptRefileFile(openTransfer("refile"))
		const confirmation = await acceptRefileHeading(heading)
		expect(refileSubtree).not.toHaveBeenCalled()
		fireEvent.keyDown(confirmation, { key: "Enter" })
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
